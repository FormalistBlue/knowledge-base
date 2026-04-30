import { defineStore } from 'pinia';

import { authApi } from '@/api/auth';
import { clearStoredToken, getStoredToken, setStoredToken } from '@/api/http';
import type { CurrentUser, LoginPayload } from '@/types/auth';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getStoredToken() as string | null,
    currentUser: null as CurrentUser | null,
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.currentUser),
    isAdmin: (state) => state.currentUser?.role === 'ADMIN',
  },
  actions: {
    setSession(token: string, user: CurrentUser) {
      this.token = token;
      this.currentUser = user;
      setStoredToken(token);
    },
    clearSession() {
      this.token = null;
      this.currentUser = null;
      clearStoredToken();
    },
    async login(payload: LoginPayload) {
      this.loading = true;
      try {
        const result = await authApi.login(payload);
        this.setSession(result.token, result.user);
        return result.user;
      } finally {
        this.loading = false;
      }
    },
    async fetchMe() {
      if (!this.token) {
        this.clearSession();
        return null;
      }

      this.loading = true;
      try {
        const result = await authApi.me();
        this.currentUser = result.user;
        return result.user;
      } catch (error) {
        this.clearSession();
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async logout() {
      try {
        if (this.token) {
          await authApi.logout();
        }
      } finally {
        this.clearSession();
      }
    },
  },
});
