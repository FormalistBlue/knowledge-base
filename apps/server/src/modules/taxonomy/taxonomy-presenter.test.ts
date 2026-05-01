import { describe, expect, it } from 'vitest';

import { makeActiveCategoryKey, makeDeletedCategoryKey, normalizeCategoryParentId, normalizeTagName } from './taxonomy-presenter.js';

describe('taxonomy normalization', () => {
  it('normalizes blank category parent ids to the root sentinel', () => {
    expect(normalizeCategoryParentId(null)).toBe('__ROOT__');
    expect(normalizeCategoryParentId(undefined)).toBe('__ROOT__');
    expect(normalizeCategoryParentId('')).toBe('__ROOT__');
    expect(normalizeCategoryParentId('parent-id')).toBe('parent-id');
  });

  it('normalizes tag names for case-insensitive uniqueness', () => {
    expect(normalizeTagName('  Vue3  ')).toBe('vue3');
  });

  it('builds active and deleted category keys for database uniqueness', () => {
    expect(makeActiveCategoryKey(null, '  前端  ')).toBe('__ROOT__:前端');
    expect(makeActiveCategoryKey('parent-1', 'Vue3')).toBe('parent-1:vue3');
    expect(makeDeletedCategoryKey('category-1')).toBe('deleted:category-1');
  });
});
