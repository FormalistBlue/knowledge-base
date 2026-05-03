import { describe, expect, it } from 'vitest';

import { buildCategoryOptions, flattenCategoryTree, getRootCategories } from './admin-taxonomy-utils';
import type { CategoryNode } from '@/types/taxonomy';

const category = (partial: Partial<CategoryNode> & Pick<CategoryNode, 'id' | 'name'>): CategoryNode => ({
  id: partial.id,
  name: partial.name,
  parentId: partial.parentId ?? null,
  sortOrder: partial.sortOrder ?? 0,
  createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
  updatedAt: partial.updatedAt ?? '2026-01-01T00:00:00.000Z',
  children: partial.children ?? [],
});

describe('admin taxonomy utils', () => {
  it('flattens only real tree children so duplicated nested payloads are not shown twice', () => {
    const child = category({ id: 'child', name: '子分类', parentId: 'root' });
    const root = category({ id: 'root', name: '根分类', children: [child] });
    const duplicatedPayload = [root, child];

    const flat = flattenCategoryTree(getRootCategories(duplicatedPayload));

    expect(flat.map((item) => item.id)).toEqual(['root', 'child']);
    expect(flat.map((item) => item.depth)).toEqual([0, 1]);
  });

  it('deduplicates categories even when the same child is present under multiple roots', () => {
    const child = category({ id: 'child', name: '子分类', parentId: 'root' });
    const root = category({ id: 'root', name: '根分类', children: [child] });
    const accidentalRootCopy = category({ id: 'other-root', name: '另一组', children: [child] });

    const flat = flattenCategoryTree(getRootCategories([root, accidentalRootCopy, child]));

    expect(flat.map((item) => item.id)).toEqual(['root', 'child', 'other-root']);
  });

  it('excludes the current editing category and its descendants from parent options', () => {
    const root = category({ id: 'root', name: '根分类' });
    const child = category({ id: 'child', name: '子分类', parentId: 'root' });
    const grandchild = category({ id: 'grandchild', name: '孙分类', parentId: 'child' });
    const sibling = category({ id: 'sibling', name: '同级分类' });
    const options = buildCategoryOptions([
      { ...root, depth: 0 },
      { ...child, depth: 1 },
      { ...grandchild, depth: 2 },
      { ...sibling, depth: 0 },
    ], 'child');

    expect(options.map((option) => option.value)).toEqual(['', 'root', 'sibling']);
  });
});
