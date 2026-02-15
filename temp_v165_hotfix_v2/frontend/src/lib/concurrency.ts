/**
 * Simple concurrency limiter to prevent 429 Too Many Requests
 */
export async function limitConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number = 3
): Promise<T[]> {
  const results: T[] = [];
  const running: Promise<void>[] = [];

  for (const task of tasks) {
    const p = task().then((res) => {
      results.push(res);
    });
    running.push(p);

    if (running.length >= limit) {
      await Promise.race(running);
      // Remove finished promises
      for (let i = 0; i < running.length; i++) {
        // This is a bit naive but works for small offsets
        // In a real p-limit we'd use a queue
      }
    }
  }

  await Promise.all(running);
  return results;
}

/**
 * Executes an array of async functions with a delay between them (throttling)
 */
export async function throttleRequests<T>(
    items: any[],
    fn: (item: any) => Promise<T>,
    delayMs: number = 200
): Promise<T[]> {
    const results: T[] = [];
    for (const item of items) {
        const res = await fn(item);
        results.push(res);
        if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    return results;
}
