import type { KnowledgeListParams, KnowledgeStatus } from '@/types/knowledge';
import { getKnowledgeStatusLabel } from '@/utils/knowledge-status';

export type StatusFilterValue = KnowledgeStatus | 'ALL';

export const statusOptions = [
  { label: '全部状态', value: 'ALL' },
  { label: getKnowledgeStatusLabel('DRAFT'), value: 'DRAFT' },
  { label: getKnowledgeStatusLabel('PUBLISHED'), value: 'PUBLISHED' },
  { label: getKnowledgeStatusLabel('ARCHIVED'), value: 'ARCHIVED' },
];

export const getStatusFilterParam = (status: StatusFilterValue | null): KnowledgeListParams['status'] => (status && status !== 'ALL' ? status : undefined);
