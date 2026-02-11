import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SpendingCategory } from '@stipulate/schema';

const GROUPS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../data/mcc-category-groups.json',
);

export interface MccCategoryGroup {
  id: string;
  label: string;
  categories: SpendingCategory[];
  mccRanges: string[];
}

export interface MccCategoryGroupsFile {
  version: string;
  groups: MccCategoryGroup[];
}

/** Load category group metadata. */
export function loadCategoryGroups(): MccCategoryGroupsFile {
  const raw = readFileSync(GROUPS_PATH, 'utf-8');
  return JSON.parse(raw) as MccCategoryGroupsFile;
}

/** Parse MCC range string like "5812-5814" or "5411". */
function mccInRange(mcc: string, rangeSpec: string): boolean {
  const code = parseInt(mcc, 10);
  if (Number.isNaN(code)) return false;

  if (rangeSpec.includes('-')) {
    const [start, end] = rangeSpec.split('-').map((s) => parseInt(s, 10));
    return code >= start! && code <= end!;
  }

  return mcc === rangeSpec;
}

/** Find category group for an MCC code. */
export function groupForMcc(mcc: string): MccCategoryGroup | undefined {
  const { groups } = loadCategoryGroups();
  return groups.find((group) => group.mccRanges.some((range) => mccInRange(mcc, range)));
}

/** List all MCC codes belonging to a spending category via group metadata. */
export function categoriesInGroup(groupId: string): SpendingCategory[] {
  const group = loadCategoryGroups().groups.find((g) => g.id === groupId);
  return group?.categories ?? [];
}
