/** In-memory sliding-window latency tracker for SLO monitoring. */

export interface SloSnapshot {
  routeP50Ms: number;
  routeP95Ms: number;
  routeP99Ms: number;
  routeSampleCount: number;
  routeSloBreaches: number;
  lastBreachAt: string | null;
}

const ROUTE_P99_LIMIT_MS = parseFloat(process.env.ROUTE_P99_SLO_MS ?? '20');
const MAX_SAMPLES = 500;

const routeLatencies: number[] = [];
let routeSloBreaches = 0;
let lastBreachAt: string | null = null;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

/** Record a routing request latency sample. */
export function recordRouteLatency(durationMs: number): void {
  routeLatencies.push(durationMs);
  if (routeLatencies.length > MAX_SAMPLES) {
    routeLatencies.shift();
  }

  const sorted = [...routeLatencies].sort((a, b) => a - b);
  const p99 = percentile(sorted, 99);
  if (p99 > ROUTE_P99_LIMIT_MS && durationMs > ROUTE_P99_LIMIT_MS) {
    routeSloBreaches++;
    lastBreachAt = new Date().toISOString();
  }
}

/** Current routing SLO snapshot. */
export function getSloSnapshot(): SloSnapshot {
  const sorted = [...routeLatencies].sort((a, b) => a - b);
  return {
    routeP50Ms: Math.round(percentile(sorted, 50) * 100) / 100,
    routeP95Ms: Math.round(percentile(sorted, 95) * 100) / 100,
    routeP99Ms: Math.round(percentile(sorted, 99) * 100) / 100,
    routeSampleCount: routeLatencies.length,
    routeSloBreaches,
    lastBreachAt,
  };
}

export function getRouteP99LimitMs(): number {
  return ROUTE_P99_LIMIT_MS;
}

/** Reset tracker — tests only. */
export function resetSloTracker(): void {
  routeLatencies.length = 0;
  routeSloBreaches = 0;
  lastBreachAt = null;
}
