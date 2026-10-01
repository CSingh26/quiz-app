import test from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import {
  extractMaterial,
  chunkSections,
} from "../../src/server/ingestion/extract";
import { scanPolicy } from "../../src/server/ingestion/storage";

function crc32(bytes: Buffer) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(
  entries: {
    name: string;
    text: string;
    mode?: number;
    encrypted?: boolean;
    compress?: boolean;
  }[],
) {
  const locals: Buffer[] = [],
    central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name),
      raw = Buffer.from(entry.text),
      data = entry.compress ? deflateRawSync(raw) : raw,
      crc = crc32(raw);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(entry.encrypted ? 1 : 0, 6);
    h.writeUInt16LE(entry.compress ? 8 : 0, 8);
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(raw.length, 22);
    h.writeUInt16LE(name.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50);
    c.writeUInt16LE(0x314, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(entry.encrypted ? 1 : 0, 8);
    c.writeUInt16LE(entry.compress ? 8 : 0, 10);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(data.length, 20);
    c.writeUInt32LE(raw.length, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(((entry.mode ?? 0o100644) << 16) >>> 0, 38);
    c.writeUInt32LE(offset, 42);
    locals.push(h, name, data);
    central.push(c, name);
    offset += h.length + name.length + data.length;
  }
  const dir = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}

test("text and CSV extraction keep useful section and row provenance", async () => {
  const text = await extractMaterial(
    "notes.md",
    Buffer.from("# Cells\nCells contain DNA.\n\n# Energy\nATP stores energy."),
  );
  assert.match(text[0].label, /Cells/);
  assert.match(text[1].text, /ATP/);
  const csv = await extractMaterial(
    "data.csv",
    Buffer.from('name,description\n"ATP","energy, stored"\n'),
  );
  assert.match(csv[1].text, /energy, stored/);
  assert.match(csv[1].label, /row/i);
});
test("safe Office containers extract documents, slides and worksheet strings", async () => {
  const doc = await extractMaterial(
    "notes.docx",
    zip([
      { name: "[Content_Types].xml", text: "<Types/>" },
      {
        name: "word/document.xml",
        text: "<w:document><w:body><w:p><w:r><w:t>Cell nucleus</w:t></w:r></w:p></w:body></w:document>",
      },
    ]),
  );
  assert.match(doc[0].text, /Cell nucleus/);
  const ppt = await extractMaterial(
    "talk.pptx",
    zip([
      { name: "[Content_Types].xml", text: "<Types/>" },
      {
        name: "ppt/slides/slide1.xml",
        text: "<p:sld><a:t>Mitochondria</a:t></p:sld>",
      },
    ]),
  );
  assert.match(ppt[0].label, /slide 1/i);
  assert.match(ppt[0].text, /Mitochondria/);
  const xlsx = await extractMaterial(
    "table.xlsx",
    zip([
      { name: "[Content_Types].xml", text: "<Types/>" },
      {
        name: "xl/sharedStrings.xml",
        text: "<sst><si><t>Oxygen</t></si></sst>",
      },
      {
        name: "xl/worksheets/sheet1.xml",
        text: '<worksheet><sheetData><row r="1"><c t="s"><v>0</v></c></row></sheetData></worksheet>',
      },
    ]),
  );
  assert.match(xlsx[0].text, /Oxygen/);
  assert.match(xlsx[0].label, /sheet/i);
});
test("archive parser rejects traversal, symlinks, encryption and nested archives", async () => {
  for (const entry of [
    { name: "../secret.txt", text: "x" },
    { name: "link.txt", text: "target", mode: 0o120777 },
    { name: "private.txt", text: "x", encrypted: true },
    { name: "nested.zip", text: "PK\u0003\u0004" },
  ]) {
    await assert.rejects(() => extractMaterial("bundle.zip", zip([entry])));
  }
});
test("archive parser bounds entry count and decompression ratio", async () => {
  await assert.rejects(() =>
    extractMaterial(
      "bundle.zip",
      zip(
        Array.from({ length: 101 }, (_, i) => ({
          name: `${i}.txt`,
          text: "x",
        })),
      ),
    ),
  );
  await assert.rejects(() =>
    extractMaterial(
      "bundle.zip",
      zip([{ name: "bomb.txt", text: "x".repeat(200000), compress: true }]),
    ),
  );
});
test("actual total decompression budget is shared by every archive entry", async () => {
  let state = 41;
  let base = "";
  for (let i = 0; i < 20000; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    base += String.fromCharCode(33 + ((state >>> 0) % 90));
  }
  const compressed = zip(
    Array.from({ length: 27 }, (_, i) => ({
      name: `${i}.txt`,
      text: base.repeat(50),
      compress: true,
    })),
  );
  assert.ok(compressed.length < 10 * 1024 * 1024);
  await assert.rejects(
    () => extractMaterial("expanded.zip", compressed),
    /decompression/,
  );
});
test("PDF extraction returns actual page text and rejects malformed PDFs", async () => {
  const content = "BT /F1 12 Tf 20 50 Td (Cell metabolism uses ATP.) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 100] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.map((n) => `${String(n).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const sections = await extractMaterial("lecture.pdf", Buffer.from(pdf));
  assert.equal(sections[0].label, "page 1");
  assert.match(sections[0].text, /Cell metabolism uses ATP/);
  await assert.rejects(() =>
    extractMaterial("not.pdf", Buffer.from("not a PDF")),
  );
});
test("Office parsing rejects entities, external relationships and macros", async () => {
  for (const part of [
    {
      name: "word/document.xml",
      text: '<!DOCTYPE x [<!ENTITY bad SYSTEM "file:///etc/passwd">]><w:t>&bad;</w:t>',
    },
    {
      name: "word/_rels/document.xml.rels",
      text: '<Relationships><Relationship TargetMode="External" Target="https://example.com"/></Relationships>',
    },
    { name: "word/vbaProject.bin", text: "macro" },
  ]) {
    await assert.rejects(() =>
      extractMaterial(
        "bad.docx",
        zip([{ name: "[Content_Types].xml", text: "<Types/>" }, part]),
      ),
    );
  }
});
test("binary text, oversized input and malformed CSV fail explicitly", async () => {
  await assert.rejects(() =>
    extractMaterial("bad.txt", Buffer.from([0, 1, 2])),
  );
  await assert.rejects(() =>
    extractMaterial("large.txt", Buffer.alloc(10 * 1024 * 1024 + 1, 65)),
  );
  await assert.rejects(() =>
    extractMaterial("bad.csv", Buffer.from('a,b\n"never closed')),
  );
});
test("chunks retain provenance and fit a bounded context", () => {
  const chunks = chunkSections([
    { label: "page 4", text: "Useful sentence. ".repeat(600) },
  ]);
  assert.ok(chunks.length > 1);
  assert.ok(
    chunks.every((c) => c.text.length <= 1800 && c.label.startsWith("page 4")),
  );
});
test("production scan policy cannot be bypassed while local bypass is explicit", () => {
  assert.throws(() =>
    scanPolicy({ NODE_ENV: "production", ALLOW_UNSCANNED_UPLOADS: "true" }),
  );
  assert.throws(() => scanPolicy({ NODE_ENV: "development" }));
  assert.equal(
    scanPolicy({ NODE_ENV: "development", ALLOW_UNSCANNED_UPLOADS: "true" })
      .mode,
    "development_bypass",
  );
});
