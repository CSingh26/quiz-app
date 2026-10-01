// Dedicated, memory-bounded extraction process invoked only by the job worker.
import { open } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { MAX_FILE_BYTES } from "./archive";
import { extractMaterial, chunkSections } from "./extract";
async function main() {
  const [file, name] = process.argv.slice(2);
  if (
    !file ||
    !name ||
    !path.isAbsolute(file) ||
    path.basename(file) !== "material.bin" ||
    !path.basename(path.dirname(file)).startsWith("quizbee-material-")
  )
    throw new Error("Missing or invalid extraction input");
  console.log = (...args: unknown[]) => console.error(...args);
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  let bytes: Buffer;
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 1 || stat.size > MAX_FILE_BYTES)
      throw new Error("Invalid stored material");
    bytes = await handle.readFile();
    if (bytes.length !== stat.size)
      throw new Error("Stored material changed during extraction");
  } finally {
    await handle.close();
  }
  process.stdout.write(
    JSON.stringify(chunkSections(await extractMaterial(name, bytes))),
  );
}
main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Extraction failed"}\n`,
  );
  process.exitCode = 1;
});
