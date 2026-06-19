export interface RouteHistoryEntry {
  id: string;
  merchant: string;
  mcc: string;
  amountMinor: number;
  bestCardId: string;
  rewardMinor: number;
  usedBestCard: boolean;
  createdAt: string;
}

const HISTORY_KEY = 'stipulate_route_history';

export function getRouteHistory(): RouteHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as RouteHistoryEntry[];
  } catch {
    return [];
  }
}

export function recordRouteHistory(entry: Omit<RouteHistoryEntry, 'id' | 'createdAt'>): void {
  const history = getRouteHistory();
  history.unshift({
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export function estimateMissedRewards(history: RouteHistoryEntry[]): number {
  return history
    .filter((h) => !h.usedBestCard)
    .reduce((sum, h) => sum + h.rewardMinor, 0);
}
