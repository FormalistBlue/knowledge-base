import { http, type ApiResponse } from './http';
import type {
  KnowledgeDetail,
  KnowledgeHomeResult,
  KnowledgeListParams,
  KnowledgeListResult,
  KnowledgePayload,
  KnowledgeStatus,
  KnowledgeSummary,
} from '@/types/knowledge';

const toQueryParams = (params: KnowledgeListParams = {}) => ({
  ...params,
  tagIds: params.tagIds?.join(','),
  includeChildren: params.includeChildren === undefined ? undefined : String(params.includeChildren),
  onlyMine: params.onlyMine === undefined ? undefined : String(params.onlyMine),
});

export const knowledgeApi = {
  async list(params: KnowledgeListParams = {}): Promise<KnowledgeListResult> {
    const response = await http.get<unknown, ApiResponse<KnowledgeListResult>>('/knowledge', { params: toQueryParams(params) });
    return response.data;
  },

  async home(): Promise<KnowledgeHomeResult> {
    const response = await http.get<unknown, ApiResponse<KnowledgeHomeResult>>('/knowledge/home');
    return response.data;
  },

  async detail(id: string): Promise<KnowledgeDetail> {
    const response = await http.get<unknown, ApiResponse<{ knowledge: KnowledgeDetail }>>(`/knowledge/${id}`);
    return response.data.knowledge;
  },

  async create(payload: KnowledgePayload): Promise<KnowledgeDetail> {
    const response = await http.post<unknown, ApiResponse<{ knowledge: KnowledgeDetail }>>('/knowledge', payload);
    return response.data.knowledge;
  },

  async update(id: string, payload: KnowledgePayload): Promise<KnowledgeDetail> {
    const response = await http.put<unknown, ApiResponse<{ knowledge: KnowledgeDetail }>>(`/knowledge/${id}`, payload);
    return response.data.knowledge;
  },

  async updateStatus(id: string, status: KnowledgeStatus): Promise<KnowledgeDetail> {
    const response = await http.patch<unknown, ApiResponse<{ knowledge: KnowledgeDetail }>>(`/knowledge/${id}/status`, { status });
    return response.data.knowledge;
  },

  async delete(id: string): Promise<void> {
    await http.delete<unknown, ApiResponse<{ id: string }>>(`/knowledge/${id}`);
  },

  async pin(id: string, isPinned: boolean): Promise<KnowledgeSummary> {
    const response = await http.patch<unknown, ApiResponse<{ knowledge: KnowledgeSummary }>>(`/admin/knowledge/${id}/pin`, { isPinned });
    return response.data.knowledge;
  },
};
