import type { SelectOption } from 'naive-ui';

import type { CategoryNode } from '@/types/taxonomy';

export type FlatCategory = Omit<CategoryNode, 'children'> & {
  depth: number;
};

const getChildCategories = (category: CategoryNode) => category.children.filter((child) => child.parentId === category.id);

const dedupeById = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;

    seen.add(item.id);
    return true;
  });
};

export const flattenCategoryTree = (items: CategoryNode[], depth = 0, seen = new Set<string>()): FlatCategory[] => {
  return items.flatMap((item) => {
    if (seen.has(item.id)) return [];

    seen.add(item.id);
    const children = getChildCategories(item);
    const { children: _children, ...category } = item;
    return [{ ...category, depth }, ...flattenCategoryTree(children, depth + 1, seen)];
  });
};

export const getRootCategories = (categories: CategoryNode[]) => {
  const childIds = new Set<string>();
  const collectChildIds = (category: CategoryNode) => {
    category.children.forEach((child) => {
      if (childIds.has(child.id)) return;

      childIds.add(child.id);
      collectChildIds(child);
    });
  };

  categories.forEach(collectChildIds);
  return categories.filter((category) => !category.parentId || !childIds.has(category.id));
};

const collectBlockedCategoryIds = (category: FlatCategory, categories: FlatCategory[]) => {
  const blockedIds = new Set([category.id]);
  let hasChanges = true;

  while (hasChanges) {
    hasChanges = false;
    categories.forEach((item) => {
      if (item.parentId && blockedIds.has(item.parentId) && !blockedIds.has(item.id)) {
        blockedIds.add(item.id);
        hasChanges = true;
      }
    });
  }

  return blockedIds;
};

export const buildCategoryOptions = (categories: FlatCategory[], editingId: string | null): SelectOption[] => {
  const uniqueCategories = dedupeById(categories);
  const blockedIds = editingId
    ? collectBlockedCategoryIds(uniqueCategories.find((category) => category.id === editingId) ?? ({ id: editingId } as FlatCategory), uniqueCategories)
    : new Set<string>();

  const options = uniqueCategories
    .filter((category) => !blockedIds.has(category.id))
    .map((category) => ({
      label: `${'—'.repeat(category.depth)} ${category.name}`,
      value: category.id,
    }));

  return [{ label: '无父级', value: '' }, ...options];
};
