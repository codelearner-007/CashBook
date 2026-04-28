/**
 * API Layer — CashBook
 * All functions call the real FastAPI backend.
 * The Axios interceptor attaches the Supabase JWT automatically.
 */

import axios from 'axios';
import { supabase } from './supabase';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

// 401 → session has expired; sign out so AuthGuard redirects to login.
// 403 → user is deactivated or lacks permission; same outcome.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      await supabase.auth.signOut();
    }
    return Promise.reject(error);
  },
);


// ── Books ──────────────────────────────────────────────────────────────────────

/** GET /api/v1/books */
export const apiGetBooks = async () => {
  return (await api.get('/api/v1/books')).data;
};

/** POST /api/v1/books */
export const apiCreateBook = async (name, currency = 'PKR') => {
  return (await api.post('/api/v1/books', { name, currency })).data;
};

/** PUT /api/v1/books/:bookId */
export const apiUpdateBook = async (bookId, payload) => {
  return (await api.put(`/api/v1/books/${bookId}`, payload)).data;
};

/** DELETE /api/v1/books/:bookId */
export const apiDeleteBook = async (bookId) => {
  await api.delete(`/api/v1/books/${bookId}`);
};


// ── Profile ────────────────────────────────────────────────────────────────────

/** GET /api/v1/profile */
export const apiGetProfile = async () => {
  return (await api.get('/api/v1/profile')).data;
};

/** PUT /api/v1/profile */
export const apiUpdateProfile = async (payload) => {
  return (await api.put('/api/v1/profile', payload)).data;
};


// ── Entries ────────────────────────────────────────────────────────────────────

/** GET /api/v1/books/:bookId/entries */
export const apiGetEntries = async (bookId, params = {}) => {
  return (await api.get(`/api/v1/books/${bookId}/entries`, { params })).data;
};

/** GET /api/v1/books/:bookId/summary */
export const apiGetSummary = async (bookId) => {
  return (await api.get(`/api/v1/books/${bookId}/summary`)).data;
};

/** POST /api/v1/books/:bookId/entries */
export const apiCreateEntry = async (bookId, payload) => {
  return (await api.post(`/api/v1/books/${bookId}/entries`, payload)).data;
};

/** PUT /api/v1/books/:bookId/entries/:entryId */
export const apiUpdateEntry = async (bookId, entryId, payload) => {
  return (await api.put(`/api/v1/books/${bookId}/entries/${entryId}`, payload)).data;
};

/** DELETE /api/v1/books/:bookId/entries/:entryId */
export const apiDeleteEntry = async (bookId, entryId) => {
  await api.delete(`/api/v1/books/${bookId}/entries/${entryId}`);
};


// ── Admin (superadmin only) ────────────────────────────────────────────────────

/** GET /api/v1/admin/users */
export const apiGetAllUsers = async () => {
  return (await api.get('/api/v1/admin/users')).data;
};

/** PATCH /api/v1/admin/users/:userId/status */
export const apiToggleUserStatus = async (userId, is_active) => {
  return (await api.patch(`/api/v1/admin/users/${userId}/status`, { is_active })).data;
};

/** GET /api/v1/admin/users/:userId/books */
export const apiGetUserBooks = async (userId) => {
  return (await api.get(`/api/v1/admin/users/${userId}/books`)).data;
};
