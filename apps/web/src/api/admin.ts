import { http, type ApiResponse } from './http';
import type { AdminStatsOverview, AuditLogListParams, AuditLogListResult } from '@/types/admin';

export const adminStatsApi = {
  async overview(): Promise<AdminStatsOverview> {
    const response = await http.get<unknown, ApiResponse<{ overview: AdminStatsOverview }>>('/admin/stats/overview');
    return response.data.overview;
  },
};

export const adminAuditApi = {
  async list(params: AuditLogListParams = {}): Promise<AuditLogListResult> {
    const response = await http.get<unknown, ApiResponse<AuditLogListResult>>('/admin/audit-logs', { params });
    return response.data;
  },
};
