import type { KnowledgeAuthor } from './knowledge';

export type CommentItem = {
  id: string;
  knowledgeId: string;
  parentId: string | null;
  content: string;
  user: KnowledgeAuthor;
  createdAt: string;
  updatedAt: string;
  replies: CommentItem[];
};

export type NotificationType = 'KNOWLEDGE_COMMENTED' | 'COMMENT_REPLIED' | 'PASSWORD_RESET' | 'KNOWLEDGE_UPDATED_BY_ADMIN';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedType: string | null;
  relatedId: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

export type NotificationListResult = {
  items: NotificationItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unreadCount: number;
};

export type AdminCommentItem = CommentItem & {
  knowledge: {
    id: string;
    title: string;
  };
};

export type AdminCommentListResult = {
  items: AdminCommentItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
