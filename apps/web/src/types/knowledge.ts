import type { UserRole } from './auth';
import type { UploadedFile } from './files';
import type { TagItem } from './taxonomy';

export type KnowledgeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type KnowledgeCategory = {
  id: string;
  name: string;
};

export type KnowledgeAuthor = {
  id: string;
  username: string;
  displayName: string;
  role?: UserRole;
};

export type KnowledgeSummary = {
  id: string;
  title: string;
  summary: string;
  status: KnowledgeStatus;
  category: KnowledgeCategory;
  tags: TagItem[];
  author: KnowledgeAuthor;
  isPinned: boolean;
  viewCount: number;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeDetail = KnowledgeSummary & {
  content: string;
  attachments: UploadedFile[];
  likedByMe: boolean;
  favoritedByMe: boolean;
};

export type KnowledgePayload = {
  title: string;
  summary: string;
  content: string;
  status: Extract<KnowledgeStatus, 'DRAFT' | 'PUBLISHED'>;
  categoryId: string;
  tagIds: string[];
  attachmentIds: string[];
};

export type KnowledgeListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: string;
  includeChildren?: boolean;
  tagIds?: string[];
  status?: KnowledgeStatus;
  publishedFrom?: string;
  publishedTo?: string;
  sortBy?: 'publishedAt' | 'viewCount' | 'updatedAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  onlyMine?: boolean;
};

export type KnowledgeFavoritesParams = {
  page?: number;
  pageSize?: number;
};

export type KnowledgeListResult = {
  items: KnowledgeSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type KnowledgeHomeCategory = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  knowledgeCount: number;
};

export type KnowledgeHomeTag = TagItem & {
  knowledgeCount: number;
};

export type KnowledgeHomeResult = {
  pinned: KnowledgeSummary[];
  latest: KnowledgeSummary[];
  popular: KnowledgeSummary[];
  categories: KnowledgeHomeCategory[];
  tags: KnowledgeHomeTag[];
};
