// Dedicated, memory-bounded extraction process invoked only by the job worker.
import { localStorage } from "./storage";
import { extractMaterial, chunkSections } from "./extract";
async function main() {
  const [key, name] = process.argv.slice(2);
  if (!key || !name) throw new Error("Missing extraction input");
  console.log = (...args: unknown[]) => console.error(...args);
  const bytes = await localStorage.read(key);
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
