import type { Tag } from '@prisma/client';

export const normalizeTagName = (name: string) => name.trim().toLowerCase();

export const toTagResponse = (tag: Tag) => ({
  id: tag.id,
  name: tag.name,
  normalizedName: tag.normalizedName,
  createdById: tag.createdById,
  createdAt: tag.createdAt,
  updatedAt: tag.updatedAt,
});
