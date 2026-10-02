/** Bound probe responses without queueing more work behind a stalled dependency. */
export function createReadinessProbe(
  check: () => Promise<unknown>,
  timeoutMs = 2000,
): () => Promise<boolean> {
  let inFlight: Promise<boolean> | undefined;
  return () => {
    if (inFlight) return inFlight;
    inFlight = new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs);
      timer.unref();
      // A timeout does not cancel a database query. Keep sharing the failed
      // result until the underlying operation settles, then allow a fresh check.
      const finish = (ready: boolean) => {
        clearTimeout(timer);
        inFlight = undefined;
        resolve(ready);
      };
      Promise.resolve()
        .then(check)
        .then(
          () => finish(true),
          () => finish(false),
        );
    });
    return inFlight;
  };
}
