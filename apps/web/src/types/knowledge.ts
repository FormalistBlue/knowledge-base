import type { UserRole } from './auth';
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
  attachments: Array<{
    id: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    usageType: string;
  }>;
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
};

export type KnowledgeListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: string;
  tagIds?: string[];
  status?: KnowledgeStatus;
  sortBy?: 'publishedAt' | 'viewCount' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  onlyMine?: boolean;
};

export type KnowledgeListResult = {
  items: KnowledgeSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
