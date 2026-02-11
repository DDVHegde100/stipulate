import { describe, it, expect } from 'vitest';
import { groupForMcc, loadCategoryGroups } from '../category-groups.js';
import { loadMccDatabase } from '../resolver-core.js';

describe('MCC category groups', () => {
  it('loads category group metadata', () => {
    const groups = loadCategoryGroups();
    expect(groups.groups.length).toBeGreaterThanOrEqual(8);
  });

  it('maps dining MCC to dining group', () => {
    const group = groupForMcc('5812');
    expect(group?.id).toBe('dining');
  });

  it('loads expanded MCC database with 400+ entries', () => {
    expect(loadMccDatabase().length).toBeGreaterThanOrEqual(400);
  });
});
