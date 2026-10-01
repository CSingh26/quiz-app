import yauzl from "yauzl";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_EXPANDED_BYTES = 25 * 1024 * 1024;
export type ArchiveBudget = { bytes: number; entries: number };
export type ArchiveFile = { name: string; bytes: Buffer };

// No archive entry is ever written to the filesystem. Budgets include Office
// containers encountered inside a top-level ZIP, so nesting cannot reset limits.
export async function readArchive(
  input: Buffer,
  budget: ArchiveBudget,
): Promise<ArchiveFile[]> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      input,
      { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
      (openError, zip) => {
        if (openError || !zip)
          return reject(new Error("Invalid ZIP container"));
        const output: ArchiveFile[] = [],
          names = new Set<string>();
        let settled = false;
        const fail = (reason: unknown) => {
          if (!settled) {
            settled = true;
            zip.close();
            reject(
              reason instanceof Error ? reason : new Error("Invalid archive"),
            );
          }
        };
        zip.on("error", fail);
        zip.on("end", () => {
          if (!settled) {
            settled = true;
            resolve(output);
          }
        });
        zip.on("entry", (entry: yauzl.Entry) => {
          try {
            const name = entry.fileName;
            const parts = name.replace(/\/$/, "").split("/");
            if (
              !name ||
              name.length > 500 ||
              /[\\\u0000-\u001f]/.test(name) ||
              name.startsWith("/") ||
              /^[a-z]:/i.test(name) ||
              parts.some((p) => p === ".." || p === "." || !p)
            )
              throw new Error("Unsafe archive path");
            if (names.has(name.toLowerCase()))
              throw new Error("Duplicate archive entry");
            names.add(name.toLowerCase());
            if (++budget.entries > 100)
              throw new Error("Archive contains more than 100 entries");
            const mode = (entry.externalFileAttributes >>> 16) & 0xf000;
            if (mode && mode !== 0x8000 && mode !== 0x4000)
              throw new Error("Archive links and special files are forbidden");
            if (entry.generalPurposeBitFlag & 1)
              throw new Error("Encrypted archives are unsupported");
            if (![0, 8].includes(entry.compressionMethod))
              throw new Error("Unsupported archive compression");
            if (
              entry.uncompressedSize > MAX_EXPANDED_BYTES ||
              entry.uncompressedSize > Math.max(1, entry.compressedSize) * 100
            )
              throw new Error("Archive decompression limit exceeded");
            if (name.endsWith("/")) {
              zip.readEntry();
              return;
            }
            zip.openReadStream(entry, (error, stream) => {
              if (error || !stream)
                return fail(new Error("Cannot read archive entry"));
              const chunks: Buffer[] = [];
              let size = 0;
              stream.on("error", fail);
              stream.on("data", (chunk: Buffer) => {
                size += chunk.length;
                budget.bytes += chunk.length;
                if (
                  budget.bytes > MAX_EXPANDED_BYTES ||
                  size > Math.max(1, entry.compressedSize) * 100
                ) {
                  stream.destroy();
                  fail(
                    new Error("Archive actual decompression limit exceeded"),
                  );
                  return;
                }
                chunks.push(chunk);
              });
              stream.on("end", () => {
                if (!settled) {
                  output.push({ name, bytes: Buffer.concat(chunks) });
                  zip.readEntry();
                }
              });
            });
          } catch (error) {
            fail(error);
          }
        });
        zip.readEntry();
      },
    );
  });
}
