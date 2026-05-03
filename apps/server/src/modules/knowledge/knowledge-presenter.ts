import type { Attachment, Category, Comment, KnowledgeFavorite, KnowledgeItem, KnowledgeLike, KnowledgeTag, Tag, User } from '@prisma/client';

export type KnowledgeWithRelations = KnowledgeItem & {
  category: Category;
  author: Pick<User, 'id' | 'username' | 'displayName'>;
  tags: Array<KnowledgeTag & { tag: Tag }>;
  likes?: KnowledgeLike[];
  favorites?: KnowledgeFavorite[];
  comments?: Comment[];
  attachments?: Attachment[];
};

export const toKnowledgeSummary = (knowledge: KnowledgeWithRelations) => ({
  id: knowledge.id,
  title: knowledge.title,
  summary: knowledge.summary,
  status: knowledge.status,
  category: {
    id: knowledge.category.id,
    name: knowledge.category.name,
  },
  tags: knowledge.tags.map(({ tag }) => ({
    id: tag.id,
    name: tag.name,
    normalizedName: tag.normalizedName,
  })),
  author: {
    id: knowledge.author.id,
    username: knowledge.author.username,
    displayName: knowledge.author.displayName,
  },
  isPinned: knowledge.isPinned,
  viewCount: knowledge.viewCount,
  likeCount: knowledge.likes?.length ?? 0,
  favoriteCount: knowledge.favorites?.length ?? 0,
  commentCount: knowledge.comments?.length ?? 0,
  publishedAt: knowledge.publishedAt,
  archivedAt: knowledge.archivedAt,
  createdAt: knowledge.createdAt,
  updatedAt: knowledge.updatedAt,
});

export const toKnowledgeDetail = (knowledge: KnowledgeWithRelations, currentUserId?: string) => ({
  ...toKnowledgeSummary(knowledge),
  content: knowledge.content,
  attachments: (knowledge.attachments ?? []).map((attachment) => ({
    id: attachment.id,
    originalName: attachment.originalName,
    fileSize: attachment.fileSize,
    mimeType: attachment.mimeType,
    usageType: attachment.usageType,
    status: attachment.status,
    extension: attachment.extension,
    url: `/api/files/${attachment.id}/preview`,
    previewUrl: `/api/files/${attachment.id}/preview`,
    downloadUrl: `/api/files/${attachment.id}/download`,
  })),
  likedByMe: Boolean(currentUserId && knowledge.likes?.some((like) => like.userId === currentUserId)),
  favoritedByMe: Boolean(currentUserId && knowledge.favorites?.some((favorite) => favorite.userId === currentUserId)),
});
