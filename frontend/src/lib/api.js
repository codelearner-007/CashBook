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

/** POST /api/v1/upload/avatar — multipart upload, returns { avatar_url } */
export const apiUploadAvatar = async (uri, mimeType = 'image/jpeg') => {
  const filename = uri.split('/').pop() || 'avatar.jpg';
  const formData = new FormData();
  formData.append('file', { uri, type: mimeType, name: filename });
  return (await api.post('/api/v1/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data;
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

/** DELETE /api/v1/books/:bookId/entries — deletes ALL entries in a book */
export const apiDeleteAllEntries = async (bookId) => {
  await api.delete(`/api/v1/books/${bookId}/entries`);
};


// ── Customers ─────────────────────────────────────────────────────────────────

/** GET /api/v1/books/:bookId/customers */
export const apiGetCustomers = async (bookId) =>
  (await api.get(`/api/v1/books/${bookId}/customers`)).data;

/** POST /api/v1/books/:bookId/customers */
export const apiCreateCustomer = async (bookId, payload) =>
  (await api.post(`/api/v1/books/${bookId}/customers`, payload)).data;

/** GET /api/v1/books/:bookId/customers/:id */
export const apiGetCustomer = async (bookId, contactId) =>
  (await api.get(`/api/v1/books/${bookId}/customers/${contactId}`)).data;

/** PUT /api/v1/books/:bookId/customers/:id */
export const apiUpdateCustomer = async (bookId, contactId, payload) =>
  (await api.put(`/api/v1/books/${bookId}/customers/${contactId}`, payload)).data;

/** DELETE /api/v1/books/:bookId/customers/:id */
export const apiDeleteCustomer = async (bookId, contactId) =>
  api.delete(`/api/v1/books/${bookId}/customers/${contactId}`);

/** GET /api/v1/books/:bookId/customers/:id/entries */
export const apiGetCustomerEntries = async (bookId, contactId) =>
  (await api.get(`/api/v1/books/${bookId}/customers/${contactId}/entries`)).data;


// ── Suppliers ─────────────────────────────────────────────────────────────────

/** GET /api/v1/books/:bookId/suppliers */
export const apiGetSuppliers = async (bookId) =>
  (await api.get(`/api/v1/books/${bookId}/suppliers`)).data;

/** POST /api/v1/books/:bookId/suppliers */
export const apiCreateSupplier = async (bookId, payload) =>
  (await api.post(`/api/v1/books/${bookId}/suppliers`, payload)).data;

/** GET /api/v1/books/:bookId/suppliers/:id */
export const apiGetSupplier = async (bookId, contactId) =>
  (await api.get(`/api/v1/books/${bookId}/suppliers/${contactId}`)).data;

/** PUT /api/v1/books/:bookId/suppliers/:id */
export const apiUpdateSupplier = async (bookId, contactId, payload) =>
  (await api.put(`/api/v1/books/${bookId}/suppliers/${contactId}`, payload)).data;

/** DELETE /api/v1/books/:bookId/suppliers/:id */
export const apiDeleteSupplier = async (bookId, contactId) =>
  api.delete(`/api/v1/books/${bookId}/suppliers/${contactId}`);

/** GET /api/v1/books/:bookId/suppliers/:id/entries */
export const apiGetSupplierEntries = async (bookId, contactId) =>
  (await api.get(`/api/v1/books/${bookId}/suppliers/${contactId}/entries`)).data;


// ── Categories ────────────────────────────────────────────────────────────────

/** GET /api/v1/books/:bookId/categories */
export const apiGetCategories = async (bookId) =>
  (await api.get(`/api/v1/books/${bookId}/categories`)).data;

/** POST /api/v1/books/:bookId/categories */
export const apiCreateCategory = async (bookId, payload) =>
  (await api.post(`/api/v1/books/${bookId}/categories`, payload)).data;

/** PUT /api/v1/books/:bookId/categories/:categoryId */
export const apiUpdateCategory = async (bookId, categoryId, payload) =>
  (await api.put(`/api/v1/books/${bookId}/categories/${categoryId}`, payload)).data;

/** DELETE /api/v1/books/:bookId/categories/:categoryId */
export const apiDeleteCategory = async (bookId, categoryId) =>
  api.delete(`/api/v1/books/${bookId}/categories/${categoryId}`);

/** GET /api/v1/books/:bookId/categories/:categoryId/entries */
export const apiGetCategoryEntries = async (bookId, categoryId) =>
  (await api.get(`/api/v1/books/${bookId}/categories/${categoryId}/entries`)).data;


// ── Payment Modes ─────────────────────────────────────────────────────────────

/** GET /api/v1/books/:bookId/payment-modes */
export const apiGetPaymentModes = async (bookId) =>
  (await api.get(`/api/v1/books/${bookId}/payment-modes`)).data;

/** POST /api/v1/books/:bookId/payment-modes */
export const apiCreatePaymentMode = async (bookId, payload) =>
  (await api.post(`/api/v1/books/${bookId}/payment-modes`, payload)).data;

/** PUT /api/v1/books/:bookId/payment-modes/:modeId */
export const apiUpdatePaymentMode = async (bookId, modeId, payload) =>
  (await api.put(`/api/v1/books/${bookId}/payment-modes/${modeId}`, payload)).data;

/** DELETE /api/v1/books/:bookId/payment-modes/:modeId */
export const apiDeletePaymentMode = async (bookId, modeId) =>
  api.delete(`/api/v1/books/${bookId}/payment-modes/${modeId}`);


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
