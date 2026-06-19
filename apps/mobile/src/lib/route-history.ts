import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@stipulate/route_history';
const MAX_ENTRIES = 50;

export interface RouteHistoryEntry {
  merchantName: string;
  mcc: string;
  amountMinor: number;
  bestCardId: string | null;
  rewardMinor: number;
  routedAt: string;
}

export async function getRouteHistory(): Promise<RouteHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RouteHistoryEntry[];
  } catch {
    return [];
  }
}

export async function recordRouteHistory(entry: Omit<RouteHistoryEntry, 'routedAt'>): Promise<void> {
  const history = await getRouteHistory();
  const next = [{ ...entry, routedAt: new Date().toISOString() }, ...history].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function estimateMissedRewards(history: RouteHistoryEntry[]): number {
  return history.reduce((sum, entry) => {
    if (entry.rewardMinor > 0) return sum;
    return sum + Math.round(entry.amountMinor * 0.02);
  }, 0);
}
