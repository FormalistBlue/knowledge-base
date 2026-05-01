export const ROOT_CATEGORY_PARENT_ID = '__ROOT__';

export const normalizeCategoryName = (name: string) => name.trim().toLowerCase();

export const normalizeCategoryParentId = (parentId: string | null | undefined) => {
  return parentId?.trim() || ROOT_CATEGORY_PARENT_ID;
};

export const makeActiveCategoryKey = (parentId: string | null | undefined, name: string) => {
  return `${normalizeCategoryParentId(parentId)}:${normalizeCategoryName(name)}`;
};

export const makeDeletedCategoryKey = (categoryId: string) => `deleted:${categoryId}`;

export const normalizeTagName = (name: string) => name.trim().toLowerCase();
