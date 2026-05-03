import { describe, expect, it } from 'vitest';

import { getStatusFilterParam, statusOptions } from './admin-knowledge-filters';

describe('admin knowledge filters', () => {
  it('uses a non-empty sentinel for the all-status filter option', () => {
    expect(statusOptions).toEqual(expect.arrayContaining([expect.objectContaining({ label: '全部状态', value: 'ALL' })]));
  });

  it('omits status when all statuses are selected', () => {
    expect(getStatusFilterParam('ALL')).toBeUndefined();
    expect(getStatusFilterParam('PUBLISHED')).toBe('PUBLISHED');
  });
});
