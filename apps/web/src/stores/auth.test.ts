import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '@/api/auth';
import { useAuthStore } from './auth';

vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

const mockedAuthApi = vi.mocked(authApi);

const user = {
  id: 'user-1',
  username: 'admin',
  displayName: '管理员',
  role: 'ADMIN' as const,
  status: 'ACTIVE' as const,
  tokenVersion: 0,
  lastLoginAt: null,
  createdAt: '2026-04-30T00:00:00.000Z',
  updatedAt: '2026-04-30T00:00:00.000Z',
};

describe('auth store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('logs in and persists token to localStorage', async () => {
    mockedAuthApi.login.mockResolvedValue({ token: 'token-1', user });
    const store = useAuthStore();

    await store.login({ username: 'admin', password: 'password' });

    expect(store.token).toBe('token-1');
    expect(store.currentUser?.username).toBe('admin');
    expect(store.isAuthenticated).toBe(true);
    expect(localStorage.getItem('kb_token')).toBe('token-1');
  });

  it('restores current user from persisted token', async () => {
    localStorage.setItem('kb_token', 'token-1');
    mockedAuthApi.me.mockResolvedValue({ user });
    const store = useAuthStore();

    await store.fetchMe();

    expect(store.token).toBe('token-1');
    expect(store.currentUser?.role).toBe('ADMIN');
  });

  it('clears token and current user when logout is called', async () => {
    mockedAuthApi.logout.mockResolvedValue({ success: true });
    const store = useAuthStore();
    store.setSession('token-1', user);

    await store.logout();

    expect(store.token).toBeNull();
    expect(store.currentUser).toBeNull();
    expect(localStorage.getItem('kb_token')).toBeNull();
  });
});
