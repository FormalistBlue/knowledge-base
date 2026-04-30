import axios, { AxiosError } from 'axios';

const TOKEN_STORAGE_KEY = 'kb_token';

export type ApiResponse<T> = {
  code: 0;
  message: string;
  data: T;
};

export type ApiError = {
  code: string;
  message: string;
  details: unknown | null;
};

export const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

export const setStoredToken = (token: string) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const http = axios.create({
  baseURL: '/api',
  timeout: 15_000,
});

http.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<ApiError>) => {
    const apiError = error.response?.data;

    if (apiError?.code === 'UNAUTHORIZED' || apiError?.code === 'TOKEN_REVOKED') {
      clearStoredToken();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(
      apiError ?? {
        code: 'NETWORK_ERROR',
        message: '网络请求失败，请稍后重试',
        details: null,
      },
    );
  },
);
