import type { SelectOption } from 'naive-ui';

import type { CategoryNode } from '@/types/taxonomy';

export type FlatCategory = Omit<CategoryNode, 'children'> & {
  children: CategoryNode[];
  depth: number;
};

const getChildCategories = (category: CategoryNode) => category.children.filter((child) => child.parentId === category.id);

export const flattenCategoryTree = (items: CategoryNode[], depth = 0, seen = new Set<string>()): FlatCategory[] => {
  return items.flatMap((item) => {
    if (seen.has(item.id)) return [];

    seen.add(item.id);
    const children = getChildCategories(item);
    return [{ ...item, children, depth }, ...flattenCategoryTree(children, depth + 1, seen)];
  });
};

export const getRootCategories = (categories: CategoryNode[]) => {
  const childIds = new Set(categories.flatMap((category) => category.children.map((child) => child.id)));
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
  const blockedIds = editingId
    ? collectBlockedCategoryIds(categories.find((category) => category.id === editingId) ?? ({ id: editingId } as FlatCategory), categories)
    : new Set<string>();

  const options = categories
    .filter((category) => !blockedIds.has(category.id))
    .map((category) => ({
      label: `${'—'.repeat(category.depth)} ${category.name}`,
      value: category.id,
    }));

  return [{ label: '无父级', value: '' }, ...options];
};
