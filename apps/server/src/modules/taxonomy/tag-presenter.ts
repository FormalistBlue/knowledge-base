import type { Tag } from '@prisma/client';

export { normalizeTagName } from './taxonomy-presenter.js';

export const toTagResponse = (tag: Tag) => ({
  id: tag.id,
  name: tag.name,
  normalizedName: tag.normalizedName,
  createdById: tag.createdById,
  createdAt: tag.createdAt,
  updatedAt: tag.updatedAt,
});
