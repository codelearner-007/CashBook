/**
 * API Layer — CashBook
 *
 * HOW TO CONNECT THE BACKEND:
 * 1. Uncomment the axios block at the top
 * 2. In each function, replace `return MOCK_*` with the commented `return api.*` call
 * 3. Delete the MOCK_DATA block at the bottom
 *
 * Every function maps 1-to-1 with a FastAPI endpoint (shown in the JSDoc).
 * Admin-only functions require a superadmin JWT — enforced server-side via RLS + role check.
 */

// ─── Uncomment when backend is ready ─────────────────────────────────────────
// import axios from 'axios';
// import { supabase } from './supabase';
//
// export const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL });
//
// api.interceptors.request.use(async (config) => {
//   const { data } = await supabase.auth.getSession();
//   if (data.session?.access_token) {
//     config.headers.Authorization = `Bearer ${data.session.access_token}`;
//   }
//   return config;
// });
// ─────────────────────────────────────────────────────────────────────────────

import { useAuthStore } from '../store/authStore';

const getCurrentUserId = () => useAuthStore.getState().user?.id ?? 'u1';


// ── Books ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/books
 * Returns all books for the authenticated user with net_balance computed.
 */
export const apiGetBooks = async () => {
  // return (await api.get('/api/v1/books')).data;
  const userId = getCurrentUserId();
  const userBooks = ALL_MOCK_BOOKS.filter(b => b.user_id === userId);
  return userBooks.map(book => {
    const entries = ALL_MOCK_ENTRIES.filter(e => e.book_id === book.id);
    const net_balance = entries.reduce(
      (sum, e) => (e.type === 'in' ? sum + e.amount : sum - e.amount), 0
    );
    const latest = entries.length > 0
      ? entries.reduce((a, b) =>
          `${a.entry_date}T${a.entry_time}` >= `${b.entry_date}T${b.entry_time}` ? a : b
        )
      : null;
    const last_entry_at = latest ? `${latest.entry_date}T${latest.entry_time}:00` : null;
    return { ...book, net_balance, last_entry_at };
  });
};

/**
 * POST /api/v1/books
 * Body: { name, currency }
 */
export const apiCreateBook = async (name, currency = 'PKR') => {
  // return (await api.post('/api/v1/books', { name, currency })).data;
  const userId = getCurrentUserId();
  return {
    id: Date.now().toString(),
    user_id: userId,
    name,
    currency,
    created_at: new Date().toISOString(),
    net_balance: 0,
  };
};

/**
 * DELETE /api/v1/books/:bookId
 */
export const apiDeleteBook = async (bookId) => {
  // await api.delete(`/api/v1/books/${bookId}`);
};


// ── Profile ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/profile
 * Returns the authenticated user's profile.
 */
export const apiGetProfile = async () => {
  // return (await api.get('/api/v1/profile')).data;
  const userId = getCurrentUserId();
  const user = MOCK_USERS.find(u => u.id === userId);
  return user ?? MOCK_USERS[0];
};

/**
 * PUT /api/v1/profile
 * Body: { full_name, phone }
 */
export const apiUpdateProfile = async (payload) => {
  // return (await api.put('/api/v1/profile', payload)).data;
  const profile = await apiGetProfile();
  return { ...profile, ...payload };
};


// ── Entries ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/books/:bookId/entries
 */
export const apiGetEntries = async (bookId) => {
  // return (await api.get(`/api/v1/books/${bookId}/entries`)).data;
  return ALL_MOCK_ENTRIES.filter(e => e.book_id === bookId);
};

/**
 * GET /api/v1/books/:bookId/summary
 * Returns { total_in, total_out, net_balance }
 */
export const apiGetSummary = async (bookId) => {
  // return (await api.get(`/api/v1/books/${bookId}/summary`)).data;
  const entries = ALL_MOCK_ENTRIES.filter(e => e.book_id === bookId);
  const total_in  = entries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0);
  const total_out = entries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0);
  return { total_in, total_out, net_balance: total_in - total_out };
};

/**
 * POST /api/v1/books/:bookId/entries
 * Body: { type, amount, remark, category, payment_mode, contact_name, entry_date, entry_time }
 */
export const apiCreateEntry = async (bookId, payload) => {
  // return (await api.post(`/api/v1/books/${bookId}/entries`, payload)).data;
  const userId = getCurrentUserId();
  return {
    id: Date.now().toString(),
    book_id: bookId,
    user_id: userId,
    created_at: new Date().toISOString(),
    ...payload,
  };
};

/**
 * PUT /api/v1/books/:bookId/entries/:entryId
 * Body: { type, amount, remark, category, payment_mode, contact_name, entry_date, entry_time }
 */
export const apiUpdateEntry = async (bookId, entryId, payload) => {
  // return (await api.put(`/api/v1/books/${bookId}/entries/${entryId}`, payload)).data;
  const idx = ALL_MOCK_ENTRIES.findIndex(e => e.id === entryId);
  if (idx !== -1) Object.assign(ALL_MOCK_ENTRIES[idx], payload);
  return { ...ALL_MOCK_ENTRIES[idx] };
};

/**
 * DELETE /api/v1/books/:bookId/entries/:entryId
 */
export const apiDeleteEntry = async (bookId, entryId) => {
  // await api.delete(`/api/v1/books/${bookId}/entries/${entryId}`);
};


// ── Admin — Users (superadmin only) ──────────────────────────────────────────

/**
 * GET /api/v1/admin/users
 * Returns all users with stats (book count, entry count, storage estimate).
 * Supabase: query `profiles` table with service role; RLS policy checks role = 'superadmin'.
 *
 * Real implementation (server-side):
 *   const { data } = await supabaseAdmin.from('profiles').select('*');
 *   // join with books count + storage bucket usage
 */
export const apiGetAllUsers = async () => {
  // return (await api.get('/api/v1/admin/users')).data;
  return MOCK_USERS
    .filter(u => u.role !== 'superadmin')
    .map(u => {
      const userBooks   = ALL_MOCK_BOOKS.filter(b => b.user_id === u.id);
      const userEntries = ALL_MOCK_ENTRIES.filter(e => e.user_id === u.id);
      // storage estimate: 0.5 KB per entry + 0.2 MB base per user
      const storage_mb  = parseFloat((0.2 + userEntries.length * 0.0005).toFixed(2));
      return {
        ...u,
        book_count:  userBooks.length,
        entry_count: userEntries.length,
        storage_mb,
      };
    });
};

/**
 * PATCH /api/v1/admin/users/:userId/status
 * Body: { is_active: boolean }
 * Toggles a user's active status.
 *
 * Real implementation:
 *   const { data } = await supabaseAdmin
 *     .from('profiles')
 *     .update({ is_active })
 *     .eq('id', userId);
 */
export const apiToggleUserStatus = async (userId, is_active) => {
  // return (await api.patch(`/api/v1/admin/users/${userId}/status`, { is_active })).data;
  const idx = MOCK_USERS.findIndex(u => u.id === userId);
  if (idx !== -1) MOCK_USERS[idx].is_active = is_active;
  return MOCK_USERS[idx];
};

/**
 * GET /api/v1/admin/users/:userId/books
 * Returns books for a specific user (admin view).
 *
 * Real implementation:
 *   const { data } = await supabaseAdmin
 *     .from('books')
 *     .select('*')
 *     .eq('user_id', userId);
 */
export const apiGetUserBooks = async (userId) => {
  // return (await api.get(`/api/v1/admin/users/${userId}/books`)).data;
  return ALL_MOCK_BOOKS.filter(b => b.user_id === userId).map(book => {
    const entries = ALL_MOCK_ENTRIES.filter(e => e.book_id === book.id);
    const net_balance = entries.reduce(
      (sum, e) => (e.type === 'in' ? sum + e.amount : sum - e.amount), 0
    );
    const latest = entries.length > 0
      ? entries.reduce((a, b) =>
          `${a.entry_date}T${a.entry_time}` >= `${b.entry_date}T${b.entry_time}` ? a : b
        )
      : null;
    const last_entry_at = latest ? `${latest.entry_date}T${latest.entry_time}:00` : null;
    return { ...book, net_balance, last_entry_at };
  });
};

/**
 * GET /api/v1/admin/login-as
 * Returns all users available to log in as (for mock/dev only).
 */
export const apiGetLoginUsers = async () => {
  // In production this endpoint does not exist — auth is via Supabase OAuth/Email.
  return MOCK_USERS;
};


// ── Mock Data (delete this block when backend is connected) ───────────────────

export const MOCK_USERS = [
  {
    id: 'u1',
    full_name: 'Farhan Ahmad',
    email: 'farhan@example.com',
    avatar_url: null,
    role: 'superadmin',
    is_active: true,
    created_at: '2025-08-01T00:00:00Z',
  },
  {
    id: 'u2',
    full_name: 'Ali Hassan',
    email: 'ali@example.com',
    avatar_url: null,
    role: 'user',
    is_active: true,
    created_at: '2025-09-10T00:00:00Z',
  },
  {
    id: 'u3',
    full_name: 'Sara Khan',
    email: 'sara@example.com',
    avatar_url: null,
    role: 'user',
    is_active: true,
    created_at: '2025-10-05T00:00:00Z',
  },
  {
    id: 'u4',
    full_name: 'Ahmed Raza',
    email: 'ahmed@example.com',
    avatar_url: null,
    role: 'user',
    is_active: false,
    created_at: '2025-11-15T00:00:00Z',
  },
  {
    id: 'u5',
    full_name: 'Zara Malik',
    email: 'zara@example.com',
    avatar_url: null,
    role: 'user',
    is_active: true,
    created_at: '2026-01-20T00:00:00Z',
  },
];

// ── All Books ─────────────────────────────────────────────────────────────────

const ALL_MOCK_BOOKS = [
  // u1: Farhan (super admin) — 8 books
  { id: 'b1', user_id: 'u1', name: 'Main Business',      currency: 'PKR', created_at: '2025-08-01T00:00:00Z' },
  { id: 'b2', user_id: 'u1', name: 'Personal Expenses',  currency: 'PKR', created_at: '2025-08-15T00:00:00Z' },
  { id: 'b3', user_id: 'u1', name: 'Retail Shop',        currency: 'PKR', created_at: '2025-09-01T00:00:00Z' },
  { id: 'b4', user_id: 'u1', name: 'Freelance Projects', currency: 'PKR', created_at: '2025-09-20T00:00:00Z' },
  { id: 'b5', user_id: 'u1', name: 'Property Rental',    currency: 'PKR', created_at: '2025-10-05T00:00:00Z' },
  { id: 'b6', user_id: 'u1', name: 'Investment Fund',    currency: 'PKR', created_at: '2025-11-01T00:00:00Z' },
  { id: 'b7', user_id: 'u1', name: 'Food Stall',         currency: 'PKR', created_at: '2025-12-10T00:00:00Z' },
  { id: 'b8', user_id: 'u1', name: 'Online Store',       currency: 'PKR', created_at: '2026-01-15T00:00:00Z' },

  // u2: Ali Hassan — 4 books
  { id: 'ab1', user_id: 'u2', name: 'Monthly Budget',    currency: 'PKR', created_at: '2025-09-10T00:00:00Z' },
  { id: 'ab2', user_id: 'u2', name: 'Business Account',  currency: 'PKR', created_at: '2025-10-01T00:00:00Z' },
  { id: 'ab3', user_id: 'u2', name: 'Savings Tracker',   currency: 'PKR', created_at: '2025-11-01T00:00:00Z' },
  { id: 'ab4', user_id: 'u2', name: 'Travel Fund',       currency: 'PKR', created_at: '2026-01-01T00:00:00Z' },

  // u3: Sara Khan — 3 books
  { id: 'sb1', user_id: 'u3', name: 'Home Expenses',     currency: 'PKR', created_at: '2025-10-05T00:00:00Z' },
  { id: 'sb2', user_id: 'u3', name: 'Boutique Sales',    currency: 'PKR', created_at: '2025-11-20T00:00:00Z' },
  { id: 'sb3', user_id: 'u3', name: 'Wedding Savings',   currency: 'PKR', created_at: '2026-02-01T00:00:00Z' },

  // u4: Ahmed Raza — 2 books (inactive user)
  { id: 'rb1', user_id: 'u4', name: 'Shop Cash Book',    currency: 'PKR', created_at: '2025-11-15T00:00:00Z' },
  { id: 'rb2', user_id: 'u4', name: 'Personal Account',  currency: 'PKR', created_at: '2025-12-01T00:00:00Z' },

  // u5: Zara Malik — 5 books
  { id: 'zb1', user_id: 'u5', name: 'Salon Income',      currency: 'PKR', created_at: '2026-01-20T00:00:00Z' },
  { id: 'zb2', user_id: 'u5', name: 'Supply Expenses',   currency: 'PKR', created_at: '2026-01-25T00:00:00Z' },
  { id: 'zb3', user_id: 'u5', name: 'Home Budget',       currency: 'PKR', created_at: '2026-02-05T00:00:00Z' },
  { id: 'zb4', user_id: 'u5', name: 'Online Orders',     currency: 'PKR', created_at: '2026-02-15T00:00:00Z' },
  { id: 'zb5', user_id: 'u5', name: 'Staff Wages',       currency: 'PKR', created_at: '2026-03-01T00:00:00Z' },
];

// ── All Entries ───────────────────────────────────────────────────────────────

const ALL_MOCK_ENTRIES = [
  // ── u1/b1: Main Business ─────────────────────────────────────────────────────
  { id: 'b1e1',  book_id: 'b1', user_id: 'u1', type: 'in',  amount: 85000, remark: 'Client payment – Alpha Corp',    category: 'Sales',    payment_mode: 'online', contact_name: 'Alpha Corp',    entry_date: '2026-04-27', entry_time: '10:00', created_at: '2026-04-27T10:00:00Z' },
  { id: 'b1e2',  book_id: 'b1', user_id: 'u1', type: 'out', amount: 12500, remark: 'Staff salaries – April',         category: 'Salary',   payment_mode: 'online', contact_name: null,            entry_date: '2026-04-27', entry_time: '09:00', created_at: '2026-04-27T09:00:00Z' },
  { id: 'b1e3',  book_id: 'b1', user_id: 'u1', type: 'in',  amount: 42000, remark: 'Service contract – Beta Ltd',   category: 'Services', payment_mode: 'cheque', contact_name: 'Beta Ltd',      entry_date: '2026-04-26', entry_time: '14:30', created_at: '2026-04-26T14:30:00Z' },
  { id: 'b1e4',  book_id: 'b1', user_id: 'u1', type: 'out', amount: 3200,  remark: 'Lunch & team meal',              category: 'Food',     payment_mode: 'cash',   contact_name: null,            entry_date: '2026-04-26', entry_time: '13:00', created_at: '2026-04-26T13:00:00Z' },
  { id: 'b1e5',  book_id: 'b1', user_id: 'u1', type: 'in',  amount: 27500, remark: 'Advance from Gamma Tech',       category: 'Sales',    payment_mode: 'cash',   contact_name: 'Gamma Tech',    entry_date: '2026-04-25', entry_time: '16:00', created_at: '2026-04-25T16:00:00Z' },
  { id: 'b1e6',  book_id: 'b1', user_id: 'u1', type: 'out', amount: 8900,  remark: 'Office rent – April',           category: 'Rent',     payment_mode: 'other',  contact_name: 'City Landlord', entry_date: '2026-04-24', entry_time: '11:00', created_at: '2026-04-24T11:00:00Z' },
  { id: 'b1e7',  book_id: 'b1', user_id: 'u1', type: 'out', amount: 3400,  remark: 'Electricity & internet',        category: 'Bills',    payment_mode: 'online', contact_name: null,            entry_date: '2026-04-23', entry_time: '08:30', created_at: '2026-04-23T08:30:00Z' },
  { id: 'b1e8',  book_id: 'b1', user_id: 'u1', type: 'in',  amount: 61000, remark: 'Project milestone – Delta Inc', category: 'Services', payment_mode: 'online', contact_name: 'Delta Inc',     entry_date: '2026-04-22', entry_time: '12:00', created_at: '2026-04-22T12:00:00Z' },
  { id: 'b1e9',  book_id: 'b1', user_id: 'u1', type: 'out', amount: 5600,  remark: 'Office supplies & stationery',  category: 'Shopping', payment_mode: 'cash',   contact_name: null,            entry_date: '2026-04-21', entry_time: '10:15', created_at: '2026-04-21T10:15:00Z' },
  { id: 'b1e10', book_id: 'b1', user_id: 'u1', type: 'out', amount: 2200,  remark: 'Fuel & transport',              category: 'Fuel',     payment_mode: 'cash',   contact_name: null,            entry_date: '2026-04-15', entry_time: '07:45', created_at: '2026-04-15T07:45:00Z' },
  { id: 'b1e11', book_id: 'b1', user_id: 'u1', type: 'in',  amount: 19500, remark: 'Support contract – Alpha Corp', category: 'Services', payment_mode: 'online', contact_name: 'Alpha Corp',    entry_date: '2026-04-10', entry_time: '15:00', created_at: '2026-04-10T15:00:00Z' },
  { id: 'b1e12', book_id: 'b1', user_id: 'u1', type: 'in',  amount: 15000, remark: 'Product sale – Gamma Tech',     category: 'Sales',    payment_mode: 'other',  contact_name: 'Gamma Tech',    entry_date: '2026-04-05', entry_time: '14:00', created_at: '2026-04-05T14:00:00Z' },
  { id: 'b1e13', book_id: 'b1', user_id: 'u1', type: 'in',  amount: 33000, remark: 'Consulting fee – Beta Ltd',     category: 'Services', payment_mode: 'cheque', contact_name: 'Beta Ltd',      entry_date: '2026-03-28', entry_time: '11:00', created_at: '2026-03-28T11:00:00Z' },
  { id: 'b1e14', book_id: 'b1', user_id: 'u1', type: 'out', amount: 4800,  remark: 'Software & tool licenses',      category: 'Bills',    payment_mode: 'online', contact_name: null,            entry_date: '2026-03-20', entry_time: '09:00', created_at: '2026-03-20T09:00:00Z' },
  { id: 'b1e15', book_id: 'b1', user_id: 'u1', type: 'out', amount: 9200,  remark: 'Equipment purchase',            category: 'Shopping', payment_mode: 'online', contact_name: null,            entry_date: '2026-03-10', entry_time: '10:00', created_at: '2026-03-10T10:00:00Z' },
  { id: 'b1e16', book_id: 'b1', user_id: 'u1', type: 'in',  amount: 7500,  remark: 'Misc income – Delta Inc',       category: 'Other',    payment_mode: 'cash',   contact_name: 'Delta Inc',     entry_date: '2026-02-18', entry_time: '16:00', created_at: '2026-02-18T16:00:00Z' },
  { id: 'b1e17', book_id: 'b1', user_id: 'u1', type: 'out', amount: 6500,  remark: 'Team outing & food',            category: 'Food',     payment_mode: 'cash',   contact_name: null,            entry_date: '2026-02-05', entry_time: '20:00', created_at: '2026-02-05T20:00:00Z' },
  { id: 'b1e18', book_id: 'b1', user_id: 'u1', type: 'out', amount: 3800,  remark: 'Courier & logistics',           category: 'Other',    payment_mode: 'cash',   contact_name: null,            entry_date: '2026-01-22', entry_time: '11:00', created_at: '2026-01-22T11:00:00Z' },

  // ── u1/b2: Personal Expenses ──────────────────────────────────────────────────
  { id: 'b2e1',  book_id: 'b2', user_id: 'u1', type: 'in',  amount: 55000, remark: 'Monthly salary received',      category: 'Salary',   payment_mode: 'online', entry_date: '2026-04-01', entry_time: '09:00', created_at: '2026-04-01T09:00:00Z' },
  { id: 'b2e2',  book_id: 'b2', user_id: 'u1', type: 'out', amount: 14000, remark: 'House rent – April',           category: 'Rent',     payment_mode: 'cash',   entry_date: '2026-04-02', entry_time: '10:00', created_at: '2026-04-02T10:00:00Z' },
  { id: 'b2e3',  book_id: 'b2', user_id: 'u1', type: 'out', amount: 6800,  remark: 'Grocery shopping',             category: 'Food',     payment_mode: 'cash',   entry_date: '2026-04-05', entry_time: '18:30', created_at: '2026-04-05T18:30:00Z' },
  { id: 'b2e4',  book_id: 'b2', user_id: 'u1', type: 'in',  amount: 8000,  remark: 'Bonus payment',                category: 'Salary',   payment_mode: 'online', entry_date: '2026-04-08', entry_time: '11:00', created_at: '2026-04-08T11:00:00Z' },
  { id: 'b2e5',  book_id: 'b2', user_id: 'u1', type: 'out', amount: 3500,  remark: 'Electricity & internet bills', category: 'Bills',    payment_mode: 'online', entry_date: '2026-04-10', entry_time: '14:00', created_at: '2026-04-10T14:00:00Z' },
  { id: 'b2e6',  book_id: 'b2', user_id: 'u1', type: 'in',  amount: 12000, remark: 'Freelance side income',        category: 'Services', payment_mode: 'online', entry_date: '2026-04-12', entry_time: '20:00', created_at: '2026-04-12T20:00:00Z' },
  { id: 'b2e7',  book_id: 'b2', user_id: 'u1', type: 'out', amount: 4200,  remark: 'Dining out & entertainment',   category: 'Food',     payment_mode: 'cash',   entry_date: '2026-04-14', entry_time: '21:00', created_at: '2026-04-14T21:00:00Z' },
  { id: 'b2e8',  book_id: 'b2', user_id: 'u1', type: 'out', amount: 1800,  remark: 'Fuel refill',                  category: 'Fuel',     payment_mode: 'cash',   entry_date: '2026-04-16', entry_time: '07:30', created_at: '2026-04-16T07:30:00Z' },
  { id: 'b2e9',  book_id: 'b2', user_id: 'u1', type: 'in',  amount: 5000,  remark: 'Cash gift received',           category: 'Other',    payment_mode: 'cash',   entry_date: '2026-04-18', entry_time: '13:00', created_at: '2026-04-18T13:00:00Z' },
  { id: 'b2e10', book_id: 'b2', user_id: 'u1', type: 'out', amount: 9500,  remark: 'Clothing & accessories',       category: 'Shopping', payment_mode: 'online', entry_date: '2026-04-19', entry_time: '17:00', created_at: '2026-04-19T17:00:00Z' },

  // ── u1/b3: Retail Shop ────────────────────────────────────────────────────────
  { id: 'b3e1',  book_id: 'b3', user_id: 'u1', type: 'in',  amount: 32000, remark: 'Daily sales – week 1',         category: 'Sales',    payment_mode: 'cash',   entry_date: '2026-04-07', entry_time: '20:00', created_at: '2026-04-07T20:00:00Z' },
  { id: 'b3e2',  book_id: 'b3', user_id: 'u1', type: 'out', amount: 18000, remark: 'Stock replenishment',          category: 'Shopping', payment_mode: 'online', entry_date: '2026-04-08', entry_time: '10:00', created_at: '2026-04-08T10:00:00Z' },
  { id: 'b3e3',  book_id: 'b3', user_id: 'u1', type: 'in',  amount: 41500, remark: 'Daily sales – week 2',         category: 'Sales',    payment_mode: 'cash',   entry_date: '2026-04-14', entry_time: '20:00', created_at: '2026-04-14T20:00:00Z' },
  { id: 'b3e4',  book_id: 'b3', user_id: 'u1', type: 'out', amount: 7000,  remark: 'Shop rent – April',            category: 'Rent',     payment_mode: 'cash',   entry_date: '2026-04-15', entry_time: '09:00', created_at: '2026-04-15T09:00:00Z' },
  { id: 'b3e5',  book_id: 'b3', user_id: 'u1', type: 'out', amount: 2500,  remark: 'Electricity & water',          category: 'Bills',    payment_mode: 'cash',   entry_date: '2026-04-16', entry_time: '11:00', created_at: '2026-04-16T11:00:00Z' },
  { id: 'b3e6',  book_id: 'b3', user_id: 'u1', type: 'in',  amount: 38000, remark: 'Daily sales – week 3',         category: 'Sales',    payment_mode: 'cash',   entry_date: '2026-04-21', entry_time: '20:00', created_at: '2026-04-21T20:00:00Z' },
  { id: 'b3e7',  book_id: 'b3', user_id: 'u1', type: 'out', amount: 4800,  remark: 'Packaging & supplies',         category: 'Shopping', payment_mode: 'cash',   entry_date: '2026-04-17', entry_time: '10:30', created_at: '2026-04-17T10:30:00Z' },
  { id: 'b3e8',  book_id: 'b3', user_id: 'u1', type: 'in',  amount: 6500,  remark: 'Special order deposit',        category: 'Sales',    payment_mode: 'online', entry_date: '2026-04-19', entry_time: '15:00', created_at: '2026-04-19T15:00:00Z' },
  { id: 'b3e9',  book_id: 'b3', user_id: 'u1', type: 'out', amount: 3200,  remark: 'Staff wages – part-time',      category: 'Salary',   payment_mode: 'cash',   entry_date: '2026-04-20', entry_time: '18:00', created_at: '2026-04-20T18:00:00Z' },
  { id: 'b3e10', book_id: 'b3', user_id: 'u1', type: 'in',  amount: 11000, remark: 'Wholesale order received',     category: 'Sales',    payment_mode: 'cheque', entry_date: '2026-04-21', entry_time: '12:00', created_at: '2026-04-21T12:00:00Z' },

  // ── u1/b4: Freelance Projects ─────────────────────────────────────────────────
  { id: 'b4e1',  book_id: 'b4', user_id: 'u1', type: 'in',  amount: 75000, remark: 'Website project – Milestone 1', category: 'Services', payment_mode: 'online', entry_date: '2026-04-03', entry_time: '14:00', created_at: '2026-04-03T14:00:00Z' },
  { id: 'b4e2',  book_id: 'b4', user_id: 'u1', type: 'out', amount: 9000,  remark: 'Hosting & domain renewal',      category: 'Bills',    payment_mode: 'online', entry_date: '2026-04-04', entry_time: '10:00', created_at: '2026-04-04T10:00:00Z' },
  { id: 'b4e3',  book_id: 'b4', user_id: 'u1', type: 'in',  amount: 48000, remark: 'App design project payment',    category: 'Services', payment_mode: 'online', entry_date: '2026-04-09', entry_time: '16:00', created_at: '2026-04-09T16:00:00Z' },
  { id: 'b4e4',  book_id: 'b4', user_id: 'u1', type: 'out', amount: 5500,  remark: 'Software subscriptions',        category: 'Bills',    payment_mode: 'online', entry_date: '2026-04-10', entry_time: '09:00', created_at: '2026-04-10T09:00:00Z' },
  { id: 'b4e5',  book_id: 'b4', user_id: 'u1', type: 'in',  amount: 30000, remark: 'Logo & branding work',          category: 'Services', payment_mode: 'online', entry_date: '2026-04-13', entry_time: '11:30', created_at: '2026-04-13T11:30:00Z' },
  { id: 'b4e6',  book_id: 'b4', user_id: 'u1', type: 'out', amount: 7800,  remark: 'Equipment purchase – mic & cam',category: 'Shopping', payment_mode: 'online', entry_date: '2026-04-14', entry_time: '15:00', created_at: '2026-04-14T15:00:00Z' },
  { id: 'b4e7',  book_id: 'b4', user_id: 'u1', type: 'in',  amount: 22000, remark: 'SEO & content project',         category: 'Services', payment_mode: 'online', entry_date: '2026-04-17', entry_time: '13:00', created_at: '2026-04-17T13:00:00Z' },
  { id: 'b4e8',  book_id: 'b4', user_id: 'u1', type: 'out', amount: 2800,  remark: 'Internet & coworking fee',      category: 'Bills',    payment_mode: 'online', entry_date: '2026-04-18', entry_time: '08:00', created_at: '2026-04-18T08:00:00Z' },
  { id: 'b4e9',  book_id: 'b4', user_id: 'u1', type: 'in',  amount: 15000, remark: 'Maintenance retainer – client', category: 'Services', payment_mode: 'online', entry_date: '2026-04-20', entry_time: '10:00', created_at: '2026-04-20T10:00:00Z' },
  { id: 'b4e10', book_id: 'b4', user_id: 'u1', type: 'out', amount: 3000,  remark: 'Stock photo licenses',          category: 'Shopping', payment_mode: 'online', entry_date: '2026-04-21', entry_time: '14:00', created_at: '2026-04-21T14:00:00Z' },

  // ── u1/b5: Property Rental ────────────────────────────────────────────────────
  { id: 'b5e1',  book_id: 'b5', user_id: 'u1', type: 'in',  amount: 45000, remark: 'Rent received – Unit A',       category: 'Rent',     payment_mode: 'online', entry_date: '2026-04-01', entry_time: '10:00', created_at: '2026-04-01T10:00:00Z' },
  { id: 'b5e2',  book_id: 'b5', user_id: 'u1', type: 'in',  amount: 38000, remark: 'Rent received – Unit B',       category: 'Rent',     payment_mode: 'online', entry_date: '2026-04-01', entry_time: '11:00', created_at: '2026-04-01T11:00:00Z' },
  { id: 'b5e3',  book_id: 'b5', user_id: 'u1', type: 'out', amount: 14000, remark: 'Property maintenance',         category: 'Other',    payment_mode: 'cash',   entry_date: '2026-04-05', entry_time: '09:00', created_at: '2026-04-05T09:00:00Z' },
  { id: 'b5e4',  book_id: 'b5', user_id: 'u1', type: 'out', amount: 8500,  remark: 'Property tax payment',         category: 'Bills',    payment_mode: 'online', entry_date: '2026-04-08', entry_time: '14:00', created_at: '2026-04-08T14:00:00Z' },
  { id: 'b5e5',  book_id: 'b5', user_id: 'u1', type: 'in',  amount: 22000, remark: 'Rent received – Unit C',       category: 'Rent',     payment_mode: 'cash',   entry_date: '2026-04-10', entry_time: '10:00', created_at: '2026-04-10T10:00:00Z' },
  { id: 'b5e6',  book_id: 'b5', user_id: 'u1', type: 'out', amount: 6200,  remark: 'Plumbing & electrical repairs', category: 'Other',   payment_mode: 'cash',   entry_date: '2026-04-12', entry_time: '11:00', created_at: '2026-04-12T11:00:00Z' },
  { id: 'b5e7',  book_id: 'b5', user_id: 'u1', type: 'out', amount: 3800,  remark: 'Security guard salary',        category: 'Salary',   payment_mode: 'cash',   entry_date: '2026-04-15', entry_time: '09:00', created_at: '2026-04-15T09:00:00Z' },
  { id: 'b5e8',  book_id: 'b5', user_id: 'u1', type: 'in',  amount: 17000, remark: 'Parking fee collection',       category: 'Other',    payment_mode: 'cash',   entry_date: '2026-04-16', entry_time: '18:00', created_at: '2026-04-16T18:00:00Z' },
  { id: 'b5e9',  book_id: 'b5', user_id: 'u1', type: 'out', amount: 4500,  remark: 'Common area utility bills',    category: 'Bills',    payment_mode: 'online', entry_date: '2026-04-18', entry_time: '10:00', created_at: '2026-04-18T10:00:00Z' },
  { id: 'b5e10', book_id: 'b5', user_id: 'u1', type: 'in',  amount: 9000,  remark: 'Late rent penalty – tenant',   category: 'Rent',     payment_mode: 'cash',   entry_date: '2026-04-20', entry_time: '15:00', created_at: '2026-04-20T15:00:00Z' },

  // ── u1/b6: Investment Fund ────────────────────────────────────────────────────
  { id: 'b6e1',  book_id: 'b6', user_id: 'u1', type: 'in',  amount: 200000,remark: 'Stock dividend received',      category: 'Other',    payment_mode: 'online', entry_date: '2026-04-02', entry_time: '09:00', created_at: '2026-04-02T09:00:00Z' },
  { id: 'b6e2',  book_id: 'b6', user_id: 'u1', type: 'out', amount: 150000,remark: 'Mutual fund purchase',         category: 'Other',    payment_mode: 'online', entry_date: '2026-04-03', entry_time: '10:00', created_at: '2026-04-03T10:00:00Z' },
  { id: 'b6e3',  book_id: 'b6', user_id: 'u1', type: 'in',  amount: 85000, remark: 'Bond coupon payment',          category: 'Other',    payment_mode: 'online', entry_date: '2026-04-07', entry_time: '09:30', created_at: '2026-04-07T09:30:00Z' },
  { id: 'b6e4',  book_id: 'b6', user_id: 'u1', type: 'out', amount: 25000, remark: 'Brokerage & management fees',  category: 'Bills',    payment_mode: 'online', entry_date: '2026-04-10', entry_time: '10:00', created_at: '2026-04-10T10:00:00Z' },
  { id: 'b6e5',  book_id: 'b6', user_id: 'u1', type: 'in',  amount: 320000,remark: 'Partial asset liquidation',   category: 'Other',    payment_mode: 'online', entry_date: '2026-04-12', entry_time: '11:00', created_at: '2026-04-12T11:00:00Z' },
  { id: 'b6e6',  book_id: 'b6', user_id: 'u1', type: 'out', amount: 280000,remark: 'New equity investment',        category: 'Other',    payment_mode: 'online', entry_date: '2026-04-14', entry_time: '10:00', created_at: '2026-04-14T10:00:00Z' },
  { id: 'b6e7',  book_id: 'b6', user_id: 'u1', type: 'in',  amount: 42000, remark: 'Profit share – partnership',   category: 'Other',    payment_mode: 'online', entry_date: '2026-04-16', entry_time: '14:00', created_at: '2026-04-16T14:00:00Z' },
  { id: 'b6e8',  book_id: 'b6', user_id: 'u1', type: 'out', amount: 12000, remark: 'Portfolio advisory fee',       category: 'Bills',    payment_mode: 'online', entry_date: '2026-04-17', entry_time: '09:00', created_at: '2026-04-17T09:00:00Z' },
  { id: 'b6e9',  book_id: 'b6', user_id: 'u1', type: 'in',  amount: 58000, remark: 'Real estate fund payout',      category: 'Other',    payment_mode: 'online', entry_date: '2026-04-19', entry_time: '10:00', created_at: '2026-04-19T10:00:00Z' },
  { id: 'b6e10', book_id: 'b6', user_id: 'u1', type: 'out', amount: 30000, remark: 'Treasury bill purchase',       category: 'Other',    payment_mode: 'online', entry_date: '2026-04-21', entry_time: '10:00', created_at: '2026-04-21T10:00:00Z' },

  // ── u1/b7: Food Stall ─────────────────────────────────────────────────────────
  { id: 'b7e1',  book_id: 'b7', user_id: 'u1', type: 'in',  amount: 8500,  remark: 'Daily sales – Mon',            category: 'Sales',    payment_mode: 'cash',   entry_date: '2026-04-14', entry_time: '21:00', created_at: '2026-04-14T21:00:00Z' },
  { id: 'b7e2',  book_id: 'b7', user_id: 'u1', type: 'out', amount: 3200,  remark: 'Raw ingredients purchase',     category: 'Food',     payment_mode: 'cash',   entry_date: '2026-04-14', entry_time: '07:00', created_at: '2026-04-14T07:00:00Z' },
  { id: 'b7e3',  book_id: 'b7', user_id: 'u1', type: 'in',  amount: 9200,  remark: 'Daily sales – Tue',            category: 'Sales',    payment_mode: 'cash',   entry_date: '2026-04-15', entry_time: '21:00', created_at: '2026-04-15T21:00:00Z' },
  { id: 'b7e4',  book_id: 'b7', user_id: 'u1', type: 'out', amount: 2800,  remark: 'Gas cylinder refill',          category: 'Fuel',     payment_mode: 'cash',   entry_date: '2026-04-15', entry_time: '08:00', created_at: '2026-04-15T08:00:00Z' },
  { id: 'b7e5',  book_id: 'b7', user_id: 'u1', type: 'in',  amount: 11000, remark: 'Daily sales – Wed (event day)',category: 'Sales',    payment_mode: 'cash',   entry_date: '2026-04-16', entry_time: '21:00', created_at: '2026-04-16T21:00:00Z' },
  { id: 'b7e6',  book_id: 'b7', user_id: 'u1', type: 'out', amount: 1500,  remark: 'Stall location fee',           category: 'Rent',     payment_mode: 'cash',   entry_date: '2026-04-16', entry_time: '10:00', created_at: '2026-04-16T10:00:00Z' },
  { id: 'b7e7',  book_id: 'b7', user_id: 'u1', type: 'in',  amount: 7800,  remark: 'Daily sales – Thu',            category: 'Sales',    payment_mode: 'cash',   entry_date: '2026-04-17', entry_time: '21:00', created_at: '2026-04-17T21:00:00Z' },
  { id: 'b7e8',  book_id: 'b7', user_id: 'u1', type: 'out', amount: 3800,  remark: 'Helper wages – weekly',        category: 'Salary',   payment_mode: 'cash',   entry_date: '2026-04-17', entry_time: '22:00', created_at: '2026-04-17T22:00:00Z' },
  { id: 'b7e9',  book_id: 'b7', user_id: 'u1', type: 'in',  amount: 13500, remark: 'Daily sales – Fri (weekend)',  category: 'Sales',    payment_mode: 'cash',   entry_date: '2026-04-18', entry_time: '21:00', created_at: '2026-04-18T21:00:00Z' },
  { id: 'b7e10', book_id: 'b7', user_id: 'u1', type: 'out', amount: 4100,  remark: 'Packaging & disposables',      category: 'Shopping', payment_mode: 'cash',   entry_date: '2026-04-18', entry_time: '09:00', created_at: '2026-04-18T09:00:00Z' },

  // ── u1/b8: Online Store ───────────────────────────────────────────────────────
  { id: 'b8e1',  book_id: 'b8', user_id: 'u1', type: 'in',  amount: 24500, remark: 'Orders – week 1 payouts',      category: 'Sales',    payment_mode: 'online', entry_date: '2026-04-07', entry_time: '12:00', created_at: '2026-04-07T12:00:00Z' },
  { id: 'b8e2',  book_id: 'b8', user_id: 'u1', type: 'out', amount: 11000, remark: 'Product inventory restock',    category: 'Shopping', payment_mode: 'online', entry_date: '2026-04-08', entry_time: '10:00', created_at: '2026-04-08T10:00:00Z' },
  { id: 'b8e3',  book_id: 'b8', user_id: 'u1', type: 'in',  amount: 31000, remark: 'Orders – week 2 payouts',      category: 'Sales',    payment_mode: 'online', entry_date: '2026-04-14', entry_time: '12:00', created_at: '2026-04-14T12:00:00Z' },
  { id: 'b8e4',  book_id: 'b8', user_id: 'u1', type: 'out', amount: 6500,  remark: 'Platform & transaction fees',  category: 'Bills',    payment_mode: 'online', entry_date: '2026-04-14', entry_time: '14:00', created_at: '2026-04-14T14:00:00Z' },
  { id: 'b8e5',  book_id: 'b8', user_id: 'u1', type: 'out', amount: 4200,  remark: 'Courier & shipping costs',     category: 'Other',    payment_mode: 'online', entry_date: '2026-04-15', entry_time: '09:00', created_at: '2026-04-15T09:00:00Z' },
  { id: 'b8e6',  book_id: 'b8', user_id: 'u1', type: 'in',  amount: 18000, remark: 'Sponsored listing revenue',    category: 'Services', payment_mode: 'online', entry_date: '2026-04-16', entry_time: '10:00', created_at: '2026-04-16T10:00:00Z' },
  { id: 'b8e7',  book_id: 'b8', user_id: 'u1', type: 'out', amount: 7800,  remark: 'Digital ads spend',            category: 'Other',    payment_mode: 'online', entry_date: '2026-04-17', entry_time: '11:00', created_at: '2026-04-17T11:00:00Z' },
  { id: 'b8e8',  book_id: 'b8', user_id: 'u1', type: 'in',  amount: 42000, remark: 'Orders – week 3 payouts',      category: 'Sales',    payment_mode: 'online', entry_date: '2026-04-21', entry_time: '12:00', created_at: '2026-04-21T12:00:00Z' },
  { id: 'b8e9',  book_id: 'b8', user_id: 'u1', type: 'out', amount: 3500,  remark: 'Customer refunds issued',      category: 'Other',    payment_mode: 'online', entry_date: '2026-04-20', entry_time: '14:00', created_at: '2026-04-20T14:00:00Z' },
  { id: 'b8e10', book_id: 'b8', user_id: 'u1', type: 'in',  amount: 9800,  remark: 'Affiliate commission income',  category: 'Services', payment_mode: 'online', entry_date: '2026-04-21', entry_time: '16:00', created_at: '2026-04-21T16:00:00Z' },

  // ── u2: Ali Hassan ────────────────────────────────────────────────────────────
  { id: 'ab1e1', book_id: 'ab1', user_id: 'u2', type: 'in',  amount: 65000, remark: 'Monthly salary',              category: 'Salary',   payment_mode: 'online', entry_date: '2026-04-01', entry_time: '09:00', created_at: '2026-04-01T09:00:00Z' },
  { id: 'ab1e2', book_id: 'ab1', user_id: 'u2', type: 'out', amount: 18000, remark: 'House rent – April',          category: 'Rent',     payment_mode: 'cash',   entry_date: '2026-04-03', entry_time: '10:00', created_at: '2026-04-03T10:00:00Z' },
  { id: 'ab1e3', book_id: 'ab1', user_id: 'u2', type: 'out', amount: 7500,  remark: 'Groceries & food',            category: 'Food',     payment_mode: 'cash',   entry_date: '2026-04-07', entry_time: '18:00', created_at: '2026-04-07T18:00:00Z' },
  { id: 'ab1e4', book_id: 'ab1', user_id: 'u2', type: 'out', amount: 4200,  remark: 'Utility bills',               category: 'Bills',    payment_mode: 'online', entry_date: '2026-04-10', entry_time: '11:00', created_at: '2026-04-10T11:00:00Z' },
  { id: 'ab2e1', book_id: 'ab2', user_id: 'u2', type: 'in',  amount: 95000, remark: 'Business revenue – March',    category: 'Sales',    payment_mode: 'online', entry_date: '2026-04-02', entry_time: '10:00', created_at: '2026-04-02T10:00:00Z' },
  { id: 'ab2e2', book_id: 'ab2', user_id: 'u2', type: 'out', amount: 35000, remark: 'Staff salaries',              category: 'Salary',   payment_mode: 'online', entry_date: '2026-04-05', entry_time: '09:00', created_at: '2026-04-05T09:00:00Z' },
  { id: 'ab2e3', book_id: 'ab2', user_id: 'u2', type: 'out', amount: 12000, remark: 'Office supplies',             category: 'Shopping', payment_mode: 'cash',   entry_date: '2026-04-12', entry_time: '14:00', created_at: '2026-04-12T14:00:00Z' },
  { id: 'ab3e1', book_id: 'ab3', user_id: 'u2', type: 'in',  amount: 15000, remark: 'Monthly savings deposit',     category: 'Other',    payment_mode: 'online', entry_date: '2026-04-01', entry_time: '08:00', created_at: '2026-04-01T08:00:00Z' },
  { id: 'ab3e2', book_id: 'ab3', user_id: 'u2', type: 'in',  amount: 5000,  remark: 'Bonus savings',               category: 'Other',    payment_mode: 'online', entry_date: '2026-04-15', entry_time: '10:00', created_at: '2026-04-15T10:00:00Z' },
  { id: 'ab4e1', book_id: 'ab4', user_id: 'u2', type: 'in',  amount: 10000, remark: 'Travel fund deposit',         category: 'Other',    payment_mode: 'online', entry_date: '2026-04-01', entry_time: '09:00', created_at: '2026-04-01T09:00:00Z' },
  { id: 'ab4e2', book_id: 'ab4', user_id: 'u2', type: 'out', amount: 3500,  remark: 'Flight booking deposit',      category: 'Other',    payment_mode: 'online', entry_date: '2026-04-18', entry_time: '15:00', created_at: '2026-04-18T15:00:00Z' },

  // ── u3: Sara Khan ─────────────────────────────────────────────────────────────
  { id: 'sb1e1', book_id: 'sb1', user_id: 'u3', type: 'in',  amount: 45000, remark: 'Husband salary',              category: 'Salary',   payment_mode: 'online', entry_date: '2026-04-01', entry_time: '09:00', created_at: '2026-04-01T09:00:00Z' },
  { id: 'sb1e2', book_id: 'sb1', user_id: 'u3', type: 'out', amount: 12000, remark: 'House rent',                  category: 'Rent',     payment_mode: 'cash',   entry_date: '2026-04-02', entry_time: '10:00', created_at: '2026-04-02T10:00:00Z' },
  { id: 'sb1e3', book_id: 'sb1', user_id: 'u3', type: 'out', amount: 8500,  remark: 'Monthly groceries',           category: 'Food',     payment_mode: 'cash',   entry_date: '2026-04-05', entry_time: '12:00', created_at: '2026-04-05T12:00:00Z' },
  { id: 'sb1e4', book_id: 'sb1', user_id: 'u3', type: 'out', amount: 3200,  remark: 'School fees',                 category: 'Bills',    payment_mode: 'online', entry_date: '2026-04-08', entry_time: '09:00', created_at: '2026-04-08T09:00:00Z' },
  { id: 'sb2e1', book_id: 'sb2', user_id: 'u3', type: 'in',  amount: 55000, remark: 'Boutique weekly sales',       category: 'Sales',    payment_mode: 'cash',   entry_date: '2026-04-07', entry_time: '20:00', created_at: '2026-04-07T20:00:00Z' },
  { id: 'sb2e2', book_id: 'sb2', user_id: 'u3', type: 'out', amount: 22000, remark: 'New stock purchase',          category: 'Shopping', payment_mode: 'online', entry_date: '2026-04-09', entry_time: '11:00', created_at: '2026-04-09T11:00:00Z' },
  { id: 'sb2e3', book_id: 'sb2', user_id: 'u3', type: 'in',  amount: 38000, remark: 'Online orders payout',        category: 'Sales',    payment_mode: 'online', entry_date: '2026-04-14', entry_time: '16:00', created_at: '2026-04-14T16:00:00Z' },
  { id: 'sb2e4', book_id: 'sb2', user_id: 'u3', type: 'out', amount: 5000,  remark: 'Shop rent – April',           category: 'Rent',     payment_mode: 'cash',   entry_date: '2026-04-15', entry_time: '09:00', created_at: '2026-04-15T09:00:00Z' },
  { id: 'sb3e1', book_id: 'sb3', user_id: 'u3', type: 'in',  amount: 20000, remark: 'Wedding savings – April',     category: 'Other',    payment_mode: 'online', entry_date: '2026-04-01', entry_time: '09:00', created_at: '2026-04-01T09:00:00Z' },
  { id: 'sb3e2', book_id: 'sb3', user_id: 'u3', type: 'out', amount: 8000,  remark: 'Catering advance',            category: 'Other',    payment_mode: 'cash',   entry_date: '2026-04-10', entry_time: '14:00', created_at: '2026-04-10T14:00:00Z' },

  // ── u4: Ahmed Raza (inactive) ─────────────────────────────────────────────────
  { id: 'rb1e1', book_id: 'rb1', user_id: 'u4', type: 'in',  amount: 28000, remark: 'Shop daily sales',            category: 'Sales',    payment_mode: 'cash',   entry_date: '2026-03-15', entry_time: '20:00', created_at: '2026-03-15T20:00:00Z' },
  { id: 'rb1e2', book_id: 'rb1', user_id: 'u4', type: 'out', amount: 12000, remark: 'Stock purchase',              category: 'Shopping', payment_mode: 'cash',   entry_date: '2026-03-16', entry_time: '10:00', created_at: '2026-03-16T10:00:00Z' },
  { id: 'rb1e3', book_id: 'rb1', user_id: 'u4', type: 'out', amount: 5000,  remark: 'Shop rent',                   category: 'Rent',     payment_mode: 'cash',   entry_date: '2026-03-20', entry_time: '09:00', created_at: '2026-03-20T09:00:00Z' },
  { id: 'rb2e1', book_id: 'rb2', user_id: 'u4', type: 'in',  amount: 35000, remark: 'Personal salary',             category: 'Salary',   payment_mode: 'online', entry_date: '2026-03-01', entry_time: '09:00', created_at: '2026-03-01T09:00:00Z' },
  { id: 'rb2e2', book_id: 'rb2', user_id: 'u4', type: 'out', amount: 14000, remark: 'House rent',                  category: 'Rent',     payment_mode: 'cash',   entry_date: '2026-03-03', entry_time: '10:00', created_at: '2026-03-03T10:00:00Z' },
  { id: 'rb2e3', book_id: 'rb2', user_id: 'u4', type: 'out', amount: 6000,  remark: 'Groceries',                   category: 'Food',     payment_mode: 'cash',   entry_date: '2026-03-08', entry_time: '18:00', created_at: '2026-03-08T18:00:00Z' },

  // ── u5: Zara Malik ────────────────────────────────────────────────────────────
  { id: 'zb1e1', book_id: 'zb1', user_id: 'u5', type: 'in',  amount: 72000, remark: 'Salon weekly revenue',        category: 'Sales',    payment_mode: 'cash',   entry_date: '2026-04-07', entry_time: '20:00', created_at: '2026-04-07T20:00:00Z' },
  { id: 'zb1e2', book_id: 'zb1', user_id: 'u5', type: 'in',  amount: 85000, remark: 'Salon weekly revenue – 2',    category: 'Sales',    payment_mode: 'cash',   entry_date: '2026-04-14', entry_time: '20:00', created_at: '2026-04-14T20:00:00Z' },
  { id: 'zb1e3', book_id: 'zb1', user_id: 'u5', type: 'in',  amount: 91000, remark: 'Salon weekly revenue – 3',    category: 'Sales',    payment_mode: 'cash',   entry_date: '2026-04-21', entry_time: '20:00', created_at: '2026-04-21T20:00:00Z' },
  { id: 'zb2e1', book_id: 'zb2', user_id: 'u5', type: 'out', amount: 25000, remark: 'Beauty supplies restock',     category: 'Shopping', payment_mode: 'online', entry_date: '2026-04-05', entry_time: '11:00', created_at: '2026-04-05T11:00:00Z' },
  { id: 'zb2e2', book_id: 'zb2', user_id: 'u5', type: 'out', amount: 18000, remark: 'Equipment maintenance',       category: 'Other',    payment_mode: 'cash',   entry_date: '2026-04-12', entry_time: '14:00', created_at: '2026-04-12T14:00:00Z' },
  { id: 'zb2e3', book_id: 'zb2', user_id: 'u5', type: 'out', amount: 8500,  remark: 'Electricity & utilities',     category: 'Bills',    payment_mode: 'online', entry_date: '2026-04-16', entry_time: '10:00', created_at: '2026-04-16T10:00:00Z' },
  { id: 'zb3e1', book_id: 'zb3', user_id: 'u5', type: 'in',  amount: 40000, remark: 'Monthly home budget',         category: 'Other',    payment_mode: 'online', entry_date: '2026-04-01', entry_time: '09:00', created_at: '2026-04-01T09:00:00Z' },
  { id: 'zb3e2', book_id: 'zb3', user_id: 'u5', type: 'out', amount: 14000, remark: 'House rent',                  category: 'Rent',     payment_mode: 'cash',   entry_date: '2026-04-02', entry_time: '10:00', created_at: '2026-04-02T10:00:00Z' },
  { id: 'zb3e3', book_id: 'zb3', user_id: 'u5', type: 'out', amount: 9000,  remark: 'Groceries & household',       category: 'Food',     payment_mode: 'cash',   entry_date: '2026-04-06', entry_time: '17:00', created_at: '2026-04-06T17:00:00Z' },
  { id: 'zb4e1', book_id: 'zb4', user_id: 'u5', type: 'in',  amount: 34000, remark: 'Online product orders',       category: 'Sales',    payment_mode: 'online', entry_date: '2026-04-08', entry_time: '12:00', created_at: '2026-04-08T12:00:00Z' },
  { id: 'zb4e2', book_id: 'zb4', user_id: 'u5', type: 'out', amount: 11000, remark: 'Product inventory',           category: 'Shopping', payment_mode: 'online', entry_date: '2026-04-10', entry_time: '10:00', created_at: '2026-04-10T10:00:00Z' },
  { id: 'zb4e3', book_id: 'zb4', user_id: 'u5', type: 'in',  amount: 28000, remark: 'Online orders – week 2',      category: 'Sales',    payment_mode: 'online', entry_date: '2026-04-15', entry_time: '12:00', created_at: '2026-04-15T12:00:00Z' },
  { id: 'zb5e1', book_id: 'zb5', user_id: 'u5', type: 'out', amount: 55000, remark: 'Staff wages – 4 employees',   category: 'Salary',   payment_mode: 'online', entry_date: '2026-04-27', entry_time: '09:00', created_at: '2026-04-27T09:00:00Z' },
  { id: 'zb5e2', book_id: 'zb5', user_id: 'u5', type: 'out', amount: 28000, remark: 'Staff wages – March',         category: 'Salary',   payment_mode: 'online', entry_date: '2026-03-27', entry_time: '09:00', created_at: '2026-03-27T09:00:00Z' },
];
