export interface TimingResult<T> {
  result: T;
  duration: number;
}

function now(): number {
  return Date.now();
}

export function measureTime<T>(fn: () => T): TimingResult<T> {
  const start = now();
  const result = fn();
  const duration = now() - start;
  return {result, duration};
}

export async function measureTimeAsync<T>(fn: () => Promise<T>): Promise<TimingResult<T>> {
  const start = now();
  const result = await fn();
  const duration = now() - start;
  return {result, duration};
}

export function assertPerformance(name: string, fn: () => void, maxMs: number): void {
  const {duration} = measureTime(fn);
  if (duration > maxMs) {
    throw new Error(
      `Performance assertion failed for "${name}": took ${duration.toFixed(2)}ms, expected <${maxMs}ms`,
    );
  }
}

export async function assertPerformanceAsync(
  name: string,
  fn: () => Promise<void>,
  maxMs: number,
): Promise<void> {
  const {duration} = await measureTimeAsync(fn);
  if (duration > maxMs) {
    throw new Error(
      `Performance assertion failed for "${name}": took ${duration.toFixed(2)}ms, expected <${maxMs}ms`,
    );
  }
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export function runBenchmark(
  name: string,
  fn: () => void,
  iterations = 100,
): BenchmarkResult {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < Math.min(10, iterations); i++) {
    fn();
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = now();
    fn();
    times.push(now() - start);
  }

  times.sort((a, b) => a - b);

  const totalMs = times.reduce((sum, t) => sum + t, 0);
  const avgMs = totalMs / iterations;
  const minMs = times[0] ?? 0;
  const maxMs = times[times.length - 1] ?? 0;
  const p50Ms = times[Math.floor(iterations * 0.5)] ?? 0;
  const p95Ms = times[Math.floor(iterations * 0.95)] ?? 0;
  const p99Ms = times[Math.floor(iterations * 0.99)] ?? 0;

  return {
    name,
    iterations,
    totalMs,
    avgMs,
    minMs,
    maxMs,
    p50Ms,
    p95Ms,
    p99Ms,
  };
}

export function formatBenchmarkResult(result: BenchmarkResult): string {
  return `${result.name}:
  Iterations: ${result.iterations}
  Avg: ${result.avgMs.toFixed(2)}ms
  Min: ${result.minMs.toFixed(2)}ms
  Max: ${result.maxMs.toFixed(2)}ms
  P50: ${result.p50Ms.toFixed(2)}ms
  P95: ${result.p95Ms.toFixed(2)}ms
  P99: ${result.p99Ms.toFixed(2)}ms`;
}
