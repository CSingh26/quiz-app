import path from "node:path";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { readArchive, MAX_FILE_BYTES, type ArchiveBudget } from "./archive";

export type Section = { text: string; label: string };
export const SUPPORTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".csv",
  ".xlsx",
  ".pptx",
  ".zip",
];
const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  processEntities: false,
  parseTagValue: false,
  trimValues: false,
});
type XML = Record<string, unknown>;
const array = (value: unknown): unknown[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
const object = (value: unknown): XML =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as XML)
    : {};
function allText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (Array.isArray(value)) return value.map(allText).join(" ");
  return Object.entries(object(value))
    .filter(([key]) => !key.startsWith("@_"))
    .map(([, v]) => allText(v))
    .join(" ");
}
function elements(value: unknown, tag: string): unknown[] {
  if (Array.isArray(value)) return value.flatMap((v) => elements(v, tag));
  return Object.entries(object(value)).flatMap(([key, child]) =>
    key === tag ? array(child) : elements(child, tag),
  );
}
function parseXml(bytes: Buffer): XML {
  const text = decodeText(bytes);
  if (
    /<!\s*(?:DOCTYPE|ENTITY)/i.test(text) ||
    /TargetMode\s*=\s*["']External["']/i.test(text)
  )
    throw new Error("Office entities and external relationships are forbidden");
  if (XMLValidator.validate(text) !== true)
    throw new Error("Malformed Office XML");
  return parser.parse(text) as XML;
}
function decodeText(bytes: Buffer): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("Text must use UTF-8 encoding");
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))
    throw new Error("Binary content is not a text document");
  return text.replace(/\r\n?/g, "\n");
}
function csvSections(text: string): Section[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === '"' && cell === "" && !closed) quoted = true;
    else if (c === "," || c === "\n") {
      row.push(cell);
      cell = "";
      closed = false;
      if (c === "\n") {
        rows.push(row);
        row = [];
      }
    } else {
      if (closed || c === '"') throw new Error("Malformed CSV quoting");
      cell += c;
    }
    if (row.length > 1000 || rows.length > 100000)
      throw new Error("CSV row or column limit exceeded");
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows
    .filter((r) => r.some(Boolean))
    .map((r, i) => ({ label: `rows ${i + 1}`, text: r.join(" | ") }));
}
function textSections(name: string, text: string): Section[] {
  if (path.extname(name).toLowerCase() === ".csv") return csvSections(text);
  const sections: Section[] = [];
  let label = "section 1",
    lines: string[] = [];
  const flush = () => {
    if (lines.join("\n").trim())
      sections.push({ label, text: lines.join("\n").trim() });
    lines = [];
  };
  for (const line of text.split("\n")) {
    const heading = /^#{1,6}\s+(.+)/.exec(line);
    if (heading) {
      flush();
      label = `section: ${heading[1].slice(0, 160)}`;
    } else lines.push(line);
  }
  flush();
  return sections;
}

async function officeSections(
  name: string,
  bytes: Buffer,
  budget: ArchiveBudget,
): Promise<Section[]> {
  const entries = await readArchive(bytes, budget),
    documents = new Map<string, XML>();
  if (!entries.some((e) => e.name === "[Content_Types].xml"))
    throw new Error("Invalid Office container");
  for (const entry of entries) {
    if (
      /(?:vbaProject|activeX|embeddings|\.exe$|\.dll$|\.bin$)/i.test(entry.name)
    )
      throw new Error(
        "Office macros and embedded executable content are forbidden",
      );
    if (/\.(?:xml|rels)$/i.test(entry.name))
      documents.set(entry.name, parseXml(entry.bytes));
  }
  const extension = path.extname(name).toLowerCase();
  if (extension === ".docx") {
    const document = documents.get("word/document.xml");
    if (!document) throw new Error("DOCX document part missing");
    return elements(document, "p").map((p, i) => ({
      label: `section ${i + 1}`,
      text: elements(p, "t").map(allText).join(" "),
    }));
  }
  if (extension === ".pptx") {
    return [...documents]
      .filter(([key]) => /^ppt\/slides\/slide\d+\.xml$/.test(key))
      .sort(
        ([a], [b]) =>
          Number(a.match(/slide(\d+)/)?.[1]) -
          Number(b.match(/slide(\d+)/)?.[1]),
      )
      .map(([key, value]) => ({
        label: `slide ${key.match(/slide(\d+)/)?.[1]}`,
        text: elements(value, "t").map(allText).join("\n"),
      }));
  }
  const shared = elements(documents.get("xl/sharedStrings.xml"), "si").map(
    (value) => elements(value, "t").map(allText).join(""),
  );
  return [...documents]
    .filter(([key]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(key))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .flatMap(([key, value]) =>
      elements(value, "row").map((raw, index) => {
        const row = object(raw);
        const values = array(row.c).map((cell) => {
          const c = object(cell),
            v = allText(c.v);
          if (c["@_t"] === "s") return shared[Number(v)] ?? "";
          if (c["@_t"] === "inlineStr")
            return elements(c.is, "t").map(allText).join("");
          return v;
        });
        return {
          label: `sheet ${key.match(/sheet(\d+)/)?.[1]}, row ${row["@_r"] ?? index + 1}`,
          text: values.join(" | "),
        };
      }),
    );
}

async function extract(
  name: string,
  bytes: Buffer,
  budget: ArchiveBudget,
  inArchive: boolean,
): Promise<Section[]> {
  if (bytes.length > MAX_FILE_BYTES)
    throw new Error("An individual document exceeds 10 MB");
  const extension = path.extname(name).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(extension))
    throw new Error("Unsupported document type");
  if (extension === ".zip") {
    if (inArchive) throw new Error("Nested ZIP archives are forbidden");
    const entries = await readArchive(bytes, budget),
      sections: Section[] = [];
    for (const entry of entries) {
      const extracted = await extract(entry.name, entry.bytes, budget, true);
      sections.push(
        ...extracted.map((s) => ({
          ...s,
          label: `${entry.name} · ${s.label}`,
        })),
      );
    }
    return sections;
  }
  if ([".docx", ".xlsx", ".pptx"].includes(extension))
    return officeSections(name, bytes, budget);
  if (extension === ".pdf") {
    if (!bytes.subarray(0, 8).toString("ascii").startsWith("%PDF-"))
      throw new Error("Invalid PDF signature");
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    // Current PDF.js removed the eval option/eval-based font compiler. We only
    // request text; no document actions, scripting, rendering or external URLs.
    const task = pdfjs.getDocument({
      data: new Uint8Array(bytes),
      useSystemFonts: false,
      disableFontFace: true,
      stopAtErrors: true,
      maxImageSize: 0,
      verbosity: 0,
    });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 500) throw new Error("PDF exceeds 500 pages");
      const sections: Section[] = [];
      for (let page = 1; page <= pdf.numPages; page++) {
        const content = await (await pdf.getPage(page)).getTextContent();
        sections.push({
          label: `page ${page}`,
          text: content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" "),
        });
      }
      return sections;
    } finally {
      await task.destroy();
    }
  }
  return textSections(name, decodeText(bytes));
}
export async function extractMaterial(
  name: string,
  bytes: Buffer,
): Promise<Section[]> {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES)
    throw new Error("Files must contain between 1 byte and 10 MB");
  const result = (await extract(name, bytes, { bytes: 0, entries: 0 }, false))
    .map((s) => ({ ...s, text: s.text.trim() }))
    .filter((s) => s.text);
  if (!result.length)
    throw new Error(
      "No readable text found. Scanned images require OCR, which is not configured.",
    );
  if (result.reduce((n, s) => n + s.text.length, 0) > 5_000_000)
    throw new Error("Extracted text exceeds 5 million characters");
  return result;
}
export function chunkSections(
  sections: Section[],
): (Section & { position: number })[] {
  const chunks: (Section & { position: number })[] = [];
  for (const section of sections) {
    const text = section.text.replace(/[ \t]+/g, " ").trim();
    for (let offset = 0; offset < text.length; offset += 1600) {
      chunks.push({
        text: text.slice(offset, offset + 1800),
        label: section.label.slice(0, 200),
        position: chunks.length,
      });
      if (chunks.length > 4000)
        throw new Error("Material exceeds 4000 source chunks");
      if (offset + 1800 >= text.length) break;
    }
  }
  return chunks;
}
