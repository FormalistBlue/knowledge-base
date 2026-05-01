import { http, type ApiResponse } from './http';
import type { AdminCommentListResult, CommentItem, NotificationItem, NotificationListResult } from '@/types/interactions';

export const commentsApi = {
  async list(knowledgeId: string): Promise<CommentItem[]> {
    const response = await http.get<unknown, ApiResponse<{ items: CommentItem[] }>>(`/knowledge/${knowledgeId}/comments`);
    return response.data.items;
  },

  async create(knowledgeId: string, payload: { content: string; parentId?: string }): Promise<CommentItem> {
    const response = await http.post<unknown, ApiResponse<{ comment: CommentItem }>>(`/knowledge/${knowledgeId}/comments`, payload);
    return response.data.comment;
  },

  async delete(id: string): Promise<void> {
    await http.delete<unknown, ApiResponse<{ id: string }>>(`/comments/${id}`);
  },
};

export const notificationsApi = {
  async list(params: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}): Promise<NotificationListResult> {
    const response = await http.get<unknown, ApiResponse<NotificationListResult>>('/notifications', {
      params: {
        ...params,
        unreadOnly: params.unreadOnly === undefined ? undefined : String(params.unreadOnly),
      },
    });
    return response.data;
  },

  async markRead(id: string): Promise<NotificationItem> {
    const response = await http.patch<unknown, ApiResponse<{ notification: NotificationItem }>>(`/notifications/${id}/read`);
    return response.data.notification;
  },

  async markAllRead(): Promise<void> {
    await http.patch<unknown, ApiResponse<{ success: boolean }>>('/notifications/read-all');
  },

  async delete(id: string): Promise<void> {
    await http.delete<unknown, ApiResponse<{ id: string }>>(`/notifications/${id}`);
  },
};

export const adminCommentsApi = {
  async list(params: { page?: number; pageSize?: number; keyword?: string } = {}): Promise<AdminCommentListResult> {
    const response = await http.get<unknown, ApiResponse<AdminCommentListResult>>('/admin/comments', { params });
    return response.data;
  },
};
