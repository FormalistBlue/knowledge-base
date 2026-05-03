import type { SelectOption } from 'naive-ui';

import type { CategoryNode } from '@/types/taxonomy';

export type FlatCategory = Omit<CategoryNode, 'children'> & {
  children: CategoryNode[];
  depth: number;
};

const getChildCategories = (category: CategoryNode) => category.children.filter((child) => child.parentId === category.id);

export const flattenCategoryTree = (items: CategoryNode[], depth = 0): FlatCategory[] => {
  return items.flatMap((item) => {
    const children = getChildCategories(item);
    return [{ ...item, children, depth }, ...flattenCategoryTree(children, depth + 1)];
  });
};

export const getRootCategories = (categories: CategoryNode[]) => categories.filter((category) => !category.parentId);

export const buildCategoryOptions = (categories: FlatCategory[], editingId: string | null): SelectOption[] => [
  { label: '无父级', value: '' },
  ...categories
    .filter((category) => category.id !== editingId)
    .map((category) => ({
      label: `${'—'.repeat(category.depth)} ${category.name}`,
      value: category.id,
    })),
];
