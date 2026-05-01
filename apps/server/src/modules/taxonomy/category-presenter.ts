import type { Category } from '@prisma/client';

export type CategoryNode = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  children: CategoryNode[];
};

export const toCategoryNode = (category: Category): CategoryNode => ({
  id: category.id,
  name: category.name,
  parentId: category.parentId,
  sortOrder: category.sortOrder,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
  children: [],
});

export const buildCategoryTree = (categories: Category[]): CategoryNode[] => {
  const nodes = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const category of categories) {
    nodes.set(category.id, toCategoryNode(category));
  }

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: CategoryNode[]) => {
    items.sort((first, second) => first.sortOrder - second.sortOrder || first.createdAt.getTime() - second.createdAt.getTime());
    for (const item of items) {
      sortNodes(item.children);
    }
  };

  sortNodes(roots);
  return roots;
};
