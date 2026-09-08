/**
 * Lightweight performance measurement utilities.
 * Zero overhead in production bundles.
 */

export function measurePerformance<T>(name: string, fn: () => T): T {
  if (import.meta.env.DEV) {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    if (duration > 5) {
      console.debug(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
    }
    return result;
  }
  return fn();
}

export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (import.meta.env.DEV) {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    if (duration > 10) {
      console.debug(`[Perf:Async] ${name}: ${duration.toFixed(2)}ms`);
    }
    return result;
  }
  return fn();
}
