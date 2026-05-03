import type { KnowledgeListParams, KnowledgeStatus } from '@/types/knowledge';

export type StatusFilterValue = KnowledgeStatus | 'ALL';

export const statusOptions = [
  { label: '全部状态', value: 'ALL' },
  { label: '草稿', value: 'DRAFT' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已归档', value: 'ARCHIVED' },
];

export const getStatusFilterParam = (status: StatusFilterValue | null): KnowledgeListParams['status'] => (status && status !== 'ALL' ? status : undefined);
