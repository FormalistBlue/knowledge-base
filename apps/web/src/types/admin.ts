import type { CurrentUser, UserRole } from './auth';

export type AdminStatsOverview = {
  knowledge: {
    total: number;
    published: number;
    draft: number;
    archived: number;
  };
  users: {
    total: number;
    active: number;
    disabled: number;
    admins: number;
  };
  totalViews: number;
  attachments: {
    total: number;
    totalSize: number;
  };
  comments: number;
  categories: number;
  tags: number;
};

export type AuditAction =
  | 'CREATE_USER'
  | 'DISABLE_USER'
  | 'ENABLE_USER'
  | 'RESET_PASSWORD'
  | 'DELETE_KNOWLEDGE'
  | 'PIN_KNOWLEDGE'
  | 'UPDATE_KNOWLEDGE_CATEGORY'
  | 'UPDATE_KNOWLEDGE_TAGS'
  | 'DELETE_COMMENT'
  | 'DELETE_CATEGORY'
  | 'DELETE_TAG';

export type AuditLogItem = {
  id: string;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: Pick<CurrentUser, 'id' | 'username' | 'displayName'> & { role: UserRole };
};

export type AuditLogListResult = {
  items: AuditLogItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AuditLogListParams = {
  page?: number;
  pageSize?: number;
  action?: AuditAction;
  actorId?: string;
  targetType?: string;
  keyword?: string;
  createdFrom?: string;
  createdTo?: string;
};
