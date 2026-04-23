/**
 * API Layer — CashBook
 *
 * HOW TO CONNECT THE BACKEND:
 * 1. Uncomment the axios block at the top
 * 2. In each function, replace `return MOCK_*` with the commented `return api.*` call
 * 3. Delete the MOCK_DATA block at the bottom
 *
 * Every function maps 1-to-1 with a FastAPI endpoint (shown in the JSDoc).
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


// ── Books ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/books
 * Returns all books for the authenticated user with net_balance computed.
 */
export const apiGetBooks = async () => {
  // return (await api.get('/api/v1/books')).data;
  return MOCK_BOOKS.map(book => {
    const entries = MOCK_ENTRIES.filter(e => e.book_id === book.id);
    const net_balance = entries.reduce(
      (sum, e) => (e.type === 'in' ? sum + e.amount : sum - e.amount), 0
    );
    return { ...book, net_balance };
  });
};

/**
 * POST /api/v1/books
 * Body: { name, currency }
 */
export const apiCreateBook = async (name, currency = 'PKR') => {
  // return (await api.post('/api/v1/books', { name, currency })).data;
  return {
    id: Date.now().toString(),
    user_id: 'u1',
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
  return MOCK_PROFILE;
};

/**
 * PUT /api/v1/profile
 * Body: { full_name, phone }
 */
export const apiUpdateProfile = async (payload) => {
  // return (await api.put('/api/v1/profile', payload)).data;
  return { ...MOCK_PROFILE, ...payload };
};


// ── Entries ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/books/:bookId/entries
 */
export const apiGetEntries = async (bookId) => {
  // return (await api.get(`/api/v1/books/${bookId}/entries`)).data;
  return MOCK_ENTRIES.filter(e => e.book_id === bookId);
};

/**
 * GET /api/v1/books/:bookId/summary
 * Returns { total_in, total_out, net_balance }
 */
export const apiGetSummary = async (bookId) => {
  // return (await api.get(`/api/v1/books/${bookId}/summary`)).data;
  const entries = MOCK_ENTRIES.filter(e => e.book_id === bookId);
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
  return {
    id: Date.now().toString(),
    book_id: bookId,
    user_id: 'u1',
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
  const idx = MOCK_ENTRIES.findIndex(e => e.id === entryId);
  if (idx !== -1) Object.assign(MOCK_ENTRIES[idx], payload);
  return { ...MOCK_ENTRIES[idx] };
};

/**
 * DELETE /api/v1/books/:bookId/entries/:entryId
 */
export const apiDeleteEntry = async (bookId, entryId) => {
  // await api.delete(`/api/v1/books/${bookId}/entries/${entryId}`);
};


// ── Mock Data (delete this block when backend is connected) ───────────────────

const MOCK_PROFILE = {
  id: 'u1',
  full_name: 'Farhan Ahmad',
  email: 'farhan@example.com',
  phone: null,
  avatar_url: null,
  email_verified: true,
};

const MOCK_BOOKS = [
  { id: 'b1', user_id: 'u1', name: 'Main Business',      currency: 'PKR', created_at: '2025-08-01T00:00:00Z' },
  { id: 'b2', user_id: 'u1', name: 'Personal Expenses',  currency: 'PKR', created_at: '2025-08-15T00:00:00Z' },
  { id: 'b3', user_id: 'u1', name: 'Retail Shop',        currency: 'PKR', created_at: '2025-09-01T00:00:00Z' },
  { id: 'b4', user_id: 'u1', name: 'Freelance Projects', currency: 'PKR', created_at: '2025-09-20T00:00:00Z' },
  { id: 'b5', user_id: 'u1', name: 'Property Rental',    currency: 'PKR', created_at: '2025-10-05T00:00:00Z' },
  { id: 'b6', user_id: 'u1', name: 'Investment Fund',    currency: 'PKR', created_at: '2025-11-01T00:00:00Z' },
  { id: 'b7', user_id: 'u1', name: 'Food Stall',         currency: 'PKR', created_at: '2025-12-10T00:00:00Z' },
  { id: 'b8', user_id: 'u1', name: 'Online Store',       currency: 'PKR', created_at: '2026-01-15T00:00:00Z' },
];

const MOCK_ENTRIES = [
  // ── b1: Main Business ────────────────────────────────────────────────────────
  { id: 'b1e1',  book_id: 'b1', user_id: 'u1', type: 'in',  amount: 85000,  remark: 'Client payment – Alpha Corp',    category: 'Sales',     payment_mode: 'online', entry_date: '2026-04-18', entry_time: '10:00', created_at: '2026-04-18T10:00:00Z' },
  { id: 'b1e2',  book_id: 'b1', user_id: 'u1', type: 'out', amount: 12500,  remark: 'Staff salaries',                 category: 'Salary',    payment_mode: 'online', entry_date: '2026-04-17', entry_time: '09:00', created_at: '2026-04-17T09:00:00Z' },
  { id: 'b1e3',  book_id: 'b1', user_id: 'u1', type: 'in',  amount: 42000,  remark: 'Product sale – bulk order',      category: 'Sales',     payment_mode: 'cash',   entry_date: '2026-04-16', entry_time: '14:30', created_at: '2026-04-16T14:30:00Z' },
  { id: 'b1e4',  book_id: 'b1', user_id: 'u1', type: 'out', amount: 8900,   remark: 'Office rent – April',            category: 'Rent',      payment_mode: 'online', entry_date: '2026-04-15', entry_time: '11:00', created_at: '2026-04-15T11:00:00Z' },
  { id: 'b1e5',  book_id: 'b1', user_id: 'u1', type: 'in',  amount: 27500,  remark: 'Advance from Beta Ltd',          category: 'Sales',     payment_mode: 'cheque', entry_date: '2026-04-14', entry_time: '16:00', created_at: '2026-04-14T16:00:00Z' },
  { id: 'b1e6',  book_id: 'b1', user_id: 'u1', type: 'out', amount: 3400,   remark: 'Utility bills',                  category: 'Bills',     payment_mode: 'online', entry_date: '2026-04-13', entry_time: '08:30', created_at: '2026-04-13T08:30:00Z' },
  { id: 'b1e7',  book_id: 'b1', user_id: 'u1', type: 'in',  amount: 61000,  remark: 'Service contract – Q2',          category: 'Services',  payment_mode: 'online', entry_date: '2026-04-12', entry_time: '12:00', created_at: '2026-04-12T12:00:00Z' },
  { id: 'b1e8',  book_id: 'b1', user_id: 'u1', type: 'out', amount: 5600,   remark: 'Office supplies',                category: 'Shopping',  payment_mode: 'cash',   entry_date: '2026-04-11', entry_time: '10:15', created_at: '2026-04-11T10:15:00Z' },
  { id: 'b1e9',  book_id: 'b1', user_id: 'u1', type: 'in',  amount: 19500,  remark: 'Maintenance contract renewal',   category: 'Services',  payment_mode: 'online', entry_date: '2026-04-10', entry_time: '15:00', created_at: '2026-04-10T15:00:00Z' },
  { id: 'b1e10', book_id: 'b1', user_id: 'u1', type: 'out', amount: 2200,   remark: 'Fuel & transport',               category: 'Fuel',      payment_mode: 'cash',   entry_date: '2026-04-09', entry_time: '07:45', created_at: '2026-04-09T07:45:00Z' },

  // ── b2: Personal Expenses ─────────────────────────────────────────────────────
  { id: 'b2e1',  book_id: 'b2', user_id: 'u1', type: 'in',  amount: 55000,  remark: 'Monthly salary received',        category: 'Salary',    payment_mode: 'online', entry_date: '2026-04-01', entry_time: '09:00', created_at: '2026-04-01T09:00:00Z' },
  { id: 'b2e2',  book_id: 'b2', user_id: 'u1', type: 'out', amount: 14000,  remark: 'House rent – April',             category: 'Rent',      payment_mode: 'cash',   entry_date: '2026-04-02', entry_time: '10:00', created_at: '2026-04-02T10:00:00Z' },
  { id: 'b2e3',  book_id: 'b2', user_id: 'u1', type: 'out', amount: 6800,   remark: 'Grocery shopping',               category: 'Food',      payment_mode: 'cash',   entry_date: '2026-04-05', entry_time: '18:30', created_at: '2026-04-05T18:30:00Z' },
  { id: 'b2e4',  book_id: 'b2', user_id: 'u1', type: 'in',  amount: 8000,   remark: 'Bonus payment',                  category: 'Salary',    payment_mode: 'online', entry_date: '2026-04-08', entry_time: '11:00', created_at: '2026-04-08T11:00:00Z' },
  { id: 'b2e5',  book_id: 'b2', user_id: 'u1', type: 'out', amount: 3500,   remark: 'Electricity & internet bills',   category: 'Bills',     payment_mode: 'online', entry_date: '2026-04-10', entry_time: '14:00', created_at: '2026-04-10T14:00:00Z' },
  { id: 'b2e6',  book_id: 'b2', user_id: 'u1', type: 'in',  amount: 12000,  remark: 'Freelance side income',          category: 'Services',  payment_mode: 'online', entry_date: '2026-04-12', entry_time: '20:00', created_at: '2026-04-12T20:00:00Z' },
  { id: 'b2e7',  book_id: 'b2', user_id: 'u1', type: 'out', amount: 4200,   remark: 'Dining out & entertainment',     category: 'Food',      payment_mode: 'cash',   entry_date: '2026-04-14', entry_time: '21:00', created_at: '2026-04-14T21:00:00Z' },
  { id: 'b2e8',  book_id: 'b2', user_id: 'u1', type: 'out', amount: 1800,   remark: 'Fuel refill',                    category: 'Fuel',      payment_mode: 'cash',   entry_date: '2026-04-16', entry_time: '07:30', created_at: '2026-04-16T07:30:00Z' },
  { id: 'b2e9',  book_id: 'b2', user_id: 'u1', type: 'in',  amount: 5000,   remark: 'Cash gift received',             category: 'Other',     payment_mode: 'cash',   entry_date: '2026-04-18', entry_time: '13:00', created_at: '2026-04-18T13:00:00Z' },
  { id: 'b2e10', book_id: 'b2', user_id: 'u1', type: 'out', amount: 9500,   remark: 'Clothing & accessories',         category: 'Shopping',  payment_mode: 'online', entry_date: '2026-04-19', entry_time: '17:00', created_at: '2026-04-19T17:00:00Z' },

  // ── b3: Retail Shop ───────────────────────────────────────────────────────────
  { id: 'b3e1',  book_id: 'b3', user_id: 'u1', type: 'in',  amount: 32000,  remark: 'Daily sales – week 1',           category: 'Sales',     payment_mode: 'cash',   entry_date: '2026-04-07', entry_time: '20:00', created_at: '2026-04-07T20:00:00Z' },
  { id: 'b3e2',  book_id: 'b3', user_id: 'u1', type: 'out', amount: 18000,  remark: 'Stock replenishment',            category: 'Shopping',  payment_mode: 'online', entry_date: '2026-04-08', entry_time: '10:00', created_at: '2026-04-08T10:00:00Z' },
  { id: 'b3e3',  book_id: 'b3', user_id: 'u1', type: 'in',  amount: 41500,  remark: 'Daily sales – week 2',           category: 'Sales',     payment_mode: 'cash',   entry_date: '2026-04-14', entry_time: '20:00', created_at: '2026-04-14T20:00:00Z' },
  { id: 'b3e4',  book_id: 'b3', user_id: 'u1', type: 'out', amount: 7000,   remark: 'Shop rent – April',              category: 'Rent',      payment_mode: 'cash',   entry_date: '2026-04-15', entry_time: '09:00', created_at: '2026-04-15T09:00:00Z' },
  { id: 'b3e5',  book_id: 'b3', user_id: 'u1', type: 'out', amount: 2500,   remark: 'Electricity & water',            category: 'Bills',     payment_mode: 'cash',   entry_date: '2026-04-16', entry_time: '11:00', created_at: '2026-04-16T11:00:00Z' },
  { id: 'b3e6',  book_id: 'b3', user_id: 'u1', type: 'in',  amount: 38000,  remark: 'Daily sales – week 3',           category: 'Sales',     payment_mode: 'cash',   entry_date: '2026-04-21', entry_time: '20:00', created_at: '2026-04-21T20:00:00Z' },
  { id: 'b3e7',  book_id: 'b3', user_id: 'u1', type: 'out', amount: 4800,   remark: 'Packaging & supplies',           category: 'Shopping',  payment_mode: 'cash',   entry_date: '2026-04-17', entry_time: '10:30', created_at: '2026-04-17T10:30:00Z' },
  { id: 'b3e8',  book_id: 'b3', user_id: 'u1', type: 'in',  amount: 6500,   remark: 'Special order deposit',          category: 'Sales',     payment_mode: 'online', entry_date: '2026-04-19', entry_time: '15:00', created_at: '2026-04-19T15:00:00Z' },
  { id: 'b3e9',  book_id: 'b3', user_id: 'u1', type: 'out', amount: 3200,   remark: 'Staff wages – part-time',        category: 'Salary',    payment_mode: 'cash',   entry_date: '2026-04-20', entry_time: '18:00', created_at: '2026-04-20T18:00:00Z' },
  { id: 'b3e10', book_id: 'b3', user_id: 'u1', type: 'in',  amount: 11000,  remark: 'Wholesale order received',       category: 'Sales',     payment_mode: 'cheque', entry_date: '2026-04-21', entry_time: '12:00', created_at: '2026-04-21T12:00:00Z' },

  // ── b4: Freelance Projects ────────────────────────────────────────────────────
  { id: 'b4e1',  book_id: 'b4', user_id: 'u1', type: 'in',  amount: 75000,  remark: 'Website project – Milestone 1', category: 'Services',  payment_mode: 'online', entry_date: '2026-04-03', entry_time: '14:00', created_at: '2026-04-03T14:00:00Z' },
  { id: 'b4e2',  book_id: 'b4', user_id: 'u1', type: 'out', amount: 9000,   remark: 'Hosting & domain renewal',       category: 'Bills',     payment_mode: 'online', entry_date: '2026-04-04', entry_time: '10:00', created_at: '2026-04-04T10:00:00Z' },
  { id: 'b4e3',  book_id: 'b4', user_id: 'u1', type: 'in',  amount: 48000,  remark: 'App design project payment',     category: 'Services',  payment_mode: 'online', entry_date: '2026-04-09', entry_time: '16:00', created_at: '2026-04-09T16:00:00Z' },
  { id: 'b4e4',  book_id: 'b4', user_id: 'u1', type: 'out', amount: 5500,   remark: 'Software subscriptions',         category: 'Bills',     payment_mode: 'online', entry_date: '2026-04-10', entry_time: '09:00', created_at: '2026-04-10T09:00:00Z' },
  { id: 'b4e5',  book_id: 'b4', user_id: 'u1', type: 'in',  amount: 30000,  remark: 'Logo & branding work',           category: 'Services',  payment_mode: 'online', entry_date: '2026-04-13', entry_time: '11:30', created_at: '2026-04-13T11:30:00Z' },
  { id: 'b4e6',  book_id: 'b4', user_id: 'u1', type: 'out', amount: 7800,   remark: 'Equipment purchase – mic & cam', category: 'Shopping',  payment_mode: 'online', entry_date: '2026-04-14', entry_time: '15:00', created_at: '2026-04-14T15:00:00Z' },
  { id: 'b4e7',  book_id: 'b4', user_id: 'u1', type: 'in',  amount: 22000,  remark: 'SEO & content project',          category: 'Services',  payment_mode: 'online', entry_date: '2026-04-17', entry_time: '13:00', created_at: '2026-04-17T13:00:00Z' },
  { id: 'b4e8',  book_id: 'b4', user_id: 'u1', type: 'out', amount: 2800,   remark: 'Internet & coworking fee',       category: 'Bills',     payment_mode: 'online', entry_date: '2026-04-18', entry_time: '08:00', created_at: '2026-04-18T08:00:00Z' },
  { id: 'b4e9',  book_id: 'b4', user_id: 'u1', type: 'in',  amount: 15000,  remark: 'Maintenance retainer – client',  category: 'Services',  payment_mode: 'online', entry_date: '2026-04-20', entry_time: '10:00', created_at: '2026-04-20T10:00:00Z' },
  { id: 'b4e10', book_id: 'b4', user_id: 'u1', type: 'out', amount: 3000,   remark: 'Stock photo licenses',           category: 'Shopping',  payment_mode: 'online', entry_date: '2026-04-21', entry_time: '14:00', created_at: '2026-04-21T14:00:00Z' },

  // ── b5: Property Rental ───────────────────────────────────────────────────────
  { id: 'b5e1',  book_id: 'b5', user_id: 'u1', type: 'in',  amount: 45000,  remark: 'Rent received – Unit A',         category: 'Rent',      payment_mode: 'online', entry_date: '2026-04-01', entry_time: '10:00', created_at: '2026-04-01T10:00:00Z' },
  { id: 'b5e2',  book_id: 'b5', user_id: 'u1', type: 'in',  amount: 38000,  remark: 'Rent received – Unit B',         category: 'Rent',      payment_mode: 'online', entry_date: '2026-04-01', entry_time: '11:00', created_at: '2026-04-01T11:00:00Z' },
  { id: 'b5e3',  book_id: 'b5', user_id: 'u1', type: 'out', amount: 14000,  remark: 'Property maintenance',           category: 'Other',     payment_mode: 'cash',   entry_date: '2026-04-05', entry_time: '09:00', created_at: '2026-04-05T09:00:00Z' },
  { id: 'b5e4',  book_id: 'b5', user_id: 'u1', type: 'out', amount: 8500,   remark: 'Property tax payment',           category: 'Bills',     payment_mode: 'online', entry_date: '2026-04-08', entry_time: '14:00', created_at: '2026-04-08T14:00:00Z' },
  { id: 'b5e5',  book_id: 'b5', user_id: 'u1', type: 'in',  amount: 22000,  remark: 'Rent received – Unit C',         category: 'Rent',      payment_mode: 'cash',   entry_date: '2026-04-10', entry_time: '10:00', created_at: '2026-04-10T10:00:00Z' },
  { id: 'b5e6',  book_id: 'b5', user_id: 'u1', type: 'out', amount: 6200,   remark: 'Plumbing & electrical repairs',  category: 'Other',     payment_mode: 'cash',   entry_date: '2026-04-12', entry_time: '11:00', created_at: '2026-04-12T11:00:00Z' },
  { id: 'b5e7',  book_id: 'b5', user_id: 'u1', type: 'out', amount: 3800,   remark: 'Security guard salary',          category: 'Salary',    payment_mode: 'cash',   entry_date: '2026-04-15', entry_time: '09:00', created_at: '2026-04-15T09:00:00Z' },
  { id: 'b5e8',  book_id: 'b5', user_id: 'u1', type: 'in',  amount: 17000,  remark: 'Parking fee collection',         category: 'Other',     payment_mode: 'cash',   entry_date: '2026-04-16', entry_time: '18:00', created_at: '2026-04-16T18:00:00Z' },
  { id: 'b5e9',  book_id: 'b5', user_id: 'u1', type: 'out', amount: 4500,   remark: 'Common area utility bills',      category: 'Bills',     payment_mode: 'online', entry_date: '2026-04-18', entry_time: '10:00', created_at: '2026-04-18T10:00:00Z' },
  { id: 'b5e10', book_id: 'b5', user_id: 'u1', type: 'in',  amount: 9000,   remark: 'Late rent penalty – tenant',     category: 'Rent',      payment_mode: 'cash',   entry_date: '2026-04-20', entry_time: '15:00', created_at: '2026-04-20T15:00:00Z' },

  // ── b6: Investment Fund ───────────────────────────────────────────────────────
  { id: 'b6e1',  book_id: 'b6', user_id: 'u1', type: 'in',  amount: 200000, remark: 'Stock dividend received',        category: 'Other',     payment_mode: 'online', entry_date: '2026-04-02', entry_time: '09:00', created_at: '2026-04-02T09:00:00Z' },
  { id: 'b6e2',  book_id: 'b6', user_id: 'u1', type: 'out', amount: 150000, remark: 'Mutual fund purchase',           category: 'Other',     payment_mode: 'online', entry_date: '2026-04-03', entry_time: '10:00', created_at: '2026-04-03T10:00:00Z' },
  { id: 'b6e3',  book_id: 'b6', user_id: 'u1', type: 'in',  amount: 85000,  remark: 'Bond coupon payment',            category: 'Other',     payment_mode: 'online', entry_date: '2026-04-07', entry_time: '09:30', created_at: '2026-04-07T09:30:00Z' },
  { id: 'b6e4',  book_id: 'b6', user_id: 'u1', type: 'out', amount: 25000,  remark: 'Brokerage & management fees',    category: 'Bills',     payment_mode: 'online', entry_date: '2026-04-10', entry_time: '10:00', created_at: '2026-04-10T10:00:00Z' },
  { id: 'b6e5',  book_id: 'b6', user_id: 'u1', type: 'in',  amount: 320000, remark: 'Partial asset liquidation',      category: 'Other',     payment_mode: 'online', entry_date: '2026-04-12', entry_time: '11:00', created_at: '2026-04-12T11:00:00Z' },
  { id: 'b6e6',  book_id: 'b6', user_id: 'u1', type: 'out', amount: 280000, remark: 'New equity investment',          category: 'Other',     payment_mode: 'online', entry_date: '2026-04-14', entry_time: '10:00', created_at: '2026-04-14T10:00:00Z' },
  { id: 'b6e7',  book_id: 'b6', user_id: 'u1', type: 'in',  amount: 42000,  remark: 'Profit share – partnership',     category: 'Other',     payment_mode: 'online', entry_date: '2026-04-16', entry_time: '14:00', created_at: '2026-04-16T14:00:00Z' },
  { id: 'b6e8',  book_id: 'b6', user_id: 'u1', type: 'out', amount: 12000,  remark: 'Portfolio advisory fee',         category: 'Bills',     payment_mode: 'online', entry_date: '2026-04-17', entry_time: '09:00', created_at: '2026-04-17T09:00:00Z' },
  { id: 'b6e9',  book_id: 'b6', user_id: 'u1', type: 'in',  amount: 58000,  remark: 'Real estate fund payout',        category: 'Other',     payment_mode: 'online', entry_date: '2026-04-19', entry_time: '10:00', created_at: '2026-04-19T10:00:00Z' },
  { id: 'b6e10', book_id: 'b6', user_id: 'u1', type: 'out', amount: 30000,  remark: 'Treasury bill purchase',         category: 'Other',     payment_mode: 'online', entry_date: '2026-04-21', entry_time: '10:00', created_at: '2026-04-21T10:00:00Z' },

  // ── b7: Food Stall ────────────────────────────────────────────────────────────
  { id: 'b7e1',  book_id: 'b7', user_id: 'u1', type: 'in',  amount: 8500,   remark: 'Daily sales – Mon',              category: 'Sales',     payment_mode: 'cash',   entry_date: '2026-04-14', entry_time: '21:00', created_at: '2026-04-14T21:00:00Z' },
  { id: 'b7e2',  book_id: 'b7', user_id: 'u1', type: 'out', amount: 3200,   remark: 'Raw ingredients purchase',       category: 'Food',      payment_mode: 'cash',   entry_date: '2026-04-14', entry_time: '07:00', created_at: '2026-04-14T07:00:00Z' },
  { id: 'b7e3',  book_id: 'b7', user_id: 'u1', type: 'in',  amount: 9200,   remark: 'Daily sales – Tue',              category: 'Sales',     payment_mode: 'cash',   entry_date: '2026-04-15', entry_time: '21:00', created_at: '2026-04-15T21:00:00Z' },
  { id: 'b7e4',  book_id: 'b7', user_id: 'u1', type: 'out', amount: 2800,   remark: 'Gas cylinder refill',            category: 'Fuel',      payment_mode: 'cash',   entry_date: '2026-04-15', entry_time: '08:00', created_at: '2026-04-15T08:00:00Z' },
  { id: 'b7e5',  book_id: 'b7', user_id: 'u1', type: 'in',  amount: 11000,  remark: 'Daily sales – Wed (event day)',  category: 'Sales',     payment_mode: 'cash',   entry_date: '2026-04-16', entry_time: '21:00', created_at: '2026-04-16T21:00:00Z' },
  { id: 'b7e6',  book_id: 'b7', user_id: 'u1', type: 'out', amount: 1500,   remark: 'Stall location fee',             category: 'Rent',      payment_mode: 'cash',   entry_date: '2026-04-16', entry_time: '10:00', created_at: '2026-04-16T10:00:00Z' },
  { id: 'b7e7',  book_id: 'b7', user_id: 'u1', type: 'in',  amount: 7800,   remark: 'Daily sales – Thu',              category: 'Sales',     payment_mode: 'cash',   entry_date: '2026-04-17', entry_time: '21:00', created_at: '2026-04-17T21:00:00Z' },
  { id: 'b7e8',  book_id: 'b7', user_id: 'u1', type: 'out', amount: 3800,   remark: 'Helper wages – weekly',          category: 'Salary',    payment_mode: 'cash',   entry_date: '2026-04-17', entry_time: '22:00', created_at: '2026-04-17T22:00:00Z' },
  { id: 'b7e9',  book_id: 'b7', user_id: 'u1', type: 'in',  amount: 13500,  remark: 'Daily sales – Fri (weekend)',    category: 'Sales',     payment_mode: 'cash',   entry_date: '2026-04-18', entry_time: '21:00', created_at: '2026-04-18T21:00:00Z' },
  { id: 'b7e10', book_id: 'b7', user_id: 'u1', type: 'out', amount: 4100,   remark: 'Packaging & disposables',        category: 'Shopping',  payment_mode: 'cash',   entry_date: '2026-04-18', entry_time: '09:00', created_at: '2026-04-18T09:00:00Z' },

  // ── b8: Online Store ──────────────────────────────────────────────────────────
  { id: 'b8e1',  book_id: 'b8', user_id: 'u1', type: 'in',  amount: 24500,  remark: 'Orders – week 1 payouts',        category: 'Sales',     payment_mode: 'online', entry_date: '2026-04-07', entry_time: '12:00', created_at: '2026-04-07T12:00:00Z' },
  { id: 'b8e2',  book_id: 'b8', user_id: 'u1', type: 'out', amount: 11000,  remark: 'Product inventory restock',      category: 'Shopping',  payment_mode: 'online', entry_date: '2026-04-08', entry_time: '10:00', created_at: '2026-04-08T10:00:00Z' },
  { id: 'b8e3',  book_id: 'b8', user_id: 'u1', type: 'in',  amount: 31000,  remark: 'Orders – week 2 payouts',        category: 'Sales',     payment_mode: 'online', entry_date: '2026-04-14', entry_time: '12:00', created_at: '2026-04-14T12:00:00Z' },
  { id: 'b8e4',  book_id: 'b8', user_id: 'u1', type: 'out', amount: 6500,   remark: 'Platform & transaction fees',    category: 'Bills',     payment_mode: 'online', entry_date: '2026-04-14', entry_time: '14:00', created_at: '2026-04-14T14:00:00Z' },
  { id: 'b8e5',  book_id: 'b8', user_id: 'u1', type: 'out', amount: 4200,   remark: 'Courier & shipping costs',       category: 'Other',     payment_mode: 'online', entry_date: '2026-04-15', entry_time: '09:00', created_at: '2026-04-15T09:00:00Z' },
  { id: 'b8e6',  book_id: 'b8', user_id: 'u1', type: 'in',  amount: 18000,  remark: 'Sponsored listing revenue',      category: 'Services',  payment_mode: 'online', entry_date: '2026-04-16', entry_time: '10:00', created_at: '2026-04-16T10:00:00Z' },
  { id: 'b8e7',  book_id: 'b8', user_id: 'u1', type: 'out', amount: 7800,   remark: 'Digital ads spend',              category: 'Other',     payment_mode: 'online', entry_date: '2026-04-17', entry_time: '11:00', created_at: '2026-04-17T11:00:00Z' },
  { id: 'b8e8',  book_id: 'b8', user_id: 'u1', type: 'in',  amount: 42000,  remark: 'Orders – week 3 payouts',        category: 'Sales',     payment_mode: 'online', entry_date: '2026-04-21', entry_time: '12:00', created_at: '2026-04-21T12:00:00Z' },
  { id: 'b8e9',  book_id: 'b8', user_id: 'u1', type: 'out', amount: 3500,   remark: 'Customer refunds issued',        category: 'Other',     payment_mode: 'online', entry_date: '2026-04-20', entry_time: '14:00', created_at: '2026-04-20T14:00:00Z' },
  { id: 'b8e10', book_id: 'b8', user_id: 'u1', type: 'in',  amount: 9800,   remark: 'Affiliate commission income',    category: 'Services',  payment_mode: 'online', entry_date: '2026-04-21', entry_time: '16:00', created_at: '2026-04-21T16:00:00Z' },
];
