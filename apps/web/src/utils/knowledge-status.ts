import type { KnowledgeStatus } from '@/types/knowledge';

export const knowledgeStatusLabels: Record<KnowledgeStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
};

export const getKnowledgeStatusLabel = (status: KnowledgeStatus) => knowledgeStatusLabels[status] ?? status;

export const getKnowledgeStatusTagType = (status: KnowledgeStatus) => {
  if (status === 'PUBLISHED') return 'success';
  if (status === 'ARCHIVED') return 'warning';
  return 'default';
};
