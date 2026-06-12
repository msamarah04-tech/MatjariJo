import { User } from '@/lib/types';
import { apiFetch } from './client';

export type AuthResponse = {
  token: string;
  refreshToken: string;
  user: User;
};

export const login = (identifier: string, password: string) => apiFetch<AuthResponse>('/auth/login', {
  method: 'POST',
  body: JSON.stringify(identifier.includes('@') ? { email: identifier, password } : { username: identifier, password }),
});

export const me = (token?: string | null) => apiFetch<{ user: User }>('/auth/me', { token });

export const logout = () => apiFetch<{ ok: true }>('/auth/logout', { method: 'POST', credentials: 'include' });

// Exchanges the refresh token (httpOnly cookie when same-site, body fallback otherwise)
// for a fresh access token. Used transparently by the API client on a 401.
export const refreshSession = (refreshToken?: string | null) => apiFetch<AuthResponse>('/auth/refresh', {
  method: 'POST',
  credentials: 'include',
  skipAuthRefresh: true,
  body: JSON.stringify(refreshToken ? { refreshToken } : {}),
});

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiFetch<AuthResponse>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

export const forgotPassword = (email: string) =>
  apiFetch<{ ok: boolean }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuthRefresh: true,
  });

export const resetPassword = (token: string, password: string) =>
  apiFetch<{ ok: boolean }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
    skipAuthRefresh: true,
  });
