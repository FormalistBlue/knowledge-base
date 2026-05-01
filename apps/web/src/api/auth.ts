import { http, type ApiResponse } from './http';
import type { CreateUserPayload, CurrentUser, LoginPayload, LoginResult, UserListResult, UserStatus } from '@/types/auth';

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    const response = await http.post<unknown, ApiResponse<LoginResult>>('/auth/login', payload);
    return response.data;
  },

  async logout(): Promise<{ success: boolean }> {
    const response = await http.post<unknown, ApiResponse<{ success: boolean }>>('/auth/logout');
    return response.data;
  },

  async me(): Promise<{ user: CurrentUser }> {
    const response = await http.get<unknown, ApiResponse<{ user: CurrentUser }>>('/auth/me');
    return response.data;
  },

  async listUsers(params: { page?: number; pageSize?: number; keyword?: string; role?: string; status?: UserStatus } = {}): Promise<UserListResult> {
    const response = await http.get<unknown, ApiResponse<UserListResult>>('/admin/users', { params });
    return response.data;
  },

  async createUser(payload: CreateUserPayload): Promise<CurrentUser> {
    const response = await http.post<unknown, ApiResponse<{ user: CurrentUser }>>('/admin/users', payload);
    return response.data.user;
  },

  async updateUserStatus(id: string, status: UserStatus): Promise<CurrentUser> {
    const response = await http.patch<unknown, ApiResponse<{ user: CurrentUser }>>(`/admin/users/${id}/status`, { status });
    return response.data.user;
  },

  async resetUserPassword(id: string, newPassword: string): Promise<CurrentUser> {
    const response = await http.post<unknown, ApiResponse<{ user: CurrentUser }>>(`/admin/users/${id}/reset-password`, { newPassword });
    return response.data.user;
  },
};
