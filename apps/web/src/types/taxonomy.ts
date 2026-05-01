export type CategoryNode = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  children: CategoryNode[];
};

export type CategoryPayload = {
  name: string;
  parentId?: string | null;
  sortOrder?: number;
};

export type TagItem = {
  id: string;
  name: string;
  normalizedName: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TagPayload = {
  name: string;
};
