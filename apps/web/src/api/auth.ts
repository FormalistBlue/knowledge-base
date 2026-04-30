import { http, type ApiResponse } from './http';
import type { CurrentUser, LoginPayload, LoginResult } from '@/types/auth';

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
};
