const target = process.argv[2];
try {
  const response = await fetch(target, { signal: AbortSignal.timeout(4000) });
  process.exitCode = response.ok ? 0 : 1;
} catch { process.exitCode = 1; }
