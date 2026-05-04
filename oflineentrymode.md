Here's a practical, production-ready way to achieve offline-first cash book entries in your React Native app (with Supabase + FastAPI backend). The goal is: users create cash-in/cash-out entries (with customers, suppliers, categories) even without internet, and everything syncs reliably to the cloud when online.
1. Core Architecture (Offline-First / Local-First)
Don't write entries directly to Supabase when offline — that will fail or require complex queuing on every API call.
Instead, adopt this pattern:

Local Database (source of truth when offline or for speed): Store all data (Books, Entries, Customers, Suppliers, Categories, Balances) locally.
Backend (Supabase Postgres + your FastAPI): Single source of truth for multi-device/cloud sync.
Sync Layer: Automatically push local changes to backend + pull remote changes when online.

Recommended Tech Stack Additions:



































LayerRecommendationWhyLocal DBWatermelonDB (with Expo SQLite) or PowerSyncBest balance for React Native + relational data + built-in sync protocolSyncWatermelonDB sync (custom) or PowerSync (easier for Supabase)Handles conflicts, incremental sync, timestampsNetwork Detection@react-native-community/netinfoTrigger sync on reconnectState/UIReact Query / TanStack Query + local DB observersOptimistic updates + cachingBackendSupabase (Postgres) + FastAPI (if needed for complex logic)Supabase for auth, RLS, realtime; FastAPI for custom endpoints
Top Recommendations (2026 context):

Easiest & Recommended for your use case: PowerSync + Supabase. It gives you a local SQLite that syncs bidirectionally with your Supabase Postgres with minimal boilerplate. Great for relational data like cash books, entries, parties (customers/suppliers), and categories.
Very popular & flexible: WatermelonDB. Supabase even has an official blog post on it. You define models once and implement pullChanges / pushChanges.
Simpler custom route (if you want to avoid heavy libs): Use Expo SQLite + manual sync queue (table for pending operations) + background sync with expo-task-manager or AppState listeners.

For a daily-use cash book with many entries, relational links (book → entries, entry → customer/category), and calculated balances, WatermelonDB or PowerSync are much better than raw AsyncStorage or manual queuing.
2. Database Schema Design (Key Tables)
Design these in Supabase Postgres (and mirror in your local DB):

users (handled by Supabase Auth)
books (id, user_id, name, description, created_at, updated_at)
entries (id, book_id, type: 'cash_in' | 'cash_out', amount, date, description, customer_id, supplier_id, category_id, synced_at or version/timestamp for conflict resolution)
customers (id, user_id, name, contact, balance, ...)
suppliers (similar)
categories (id, user_id, name, type: 'income' | 'expense', ...)

Add these helpful columns on all syncable tables:

created_at, updated_at
server_id or use UUID as primary key everywhere (recommended)
For Watermelon: last_pulled_at logic + _changed flags

Balances: Never store as single column if possible. Calculate on-the-fly (SUM(amount)) for books, customers, suppliers. Or maintain a denormalized current_balance and update it atomically via triggers/RPCs in Supabase.
On the Books list screen: Fetch all books + compute SUM(entries) across them for total net balance (or cache it).
3. How Offline Entries Work

User creates entry offline:
Write directly to local DB (WatermelonDB model or PowerSync SQLite).
UI updates instantly (optimistic update).
Mark the record as "pending sync" (Watermelon does this automatically; in custom queue you add a sync_status: 'pending').

When online (NetInfo detects connection + on app foreground):
Run sync:
Push: Send new/updated local entries (and related masters: customers, categories, etc.) to backend.
Pull: Fetch changes from backend since last sync timestamp.

Use incremental sync (only changed records) for performance.

Backend registration:
Your FastAPI or Supabase Edge Functions / direct PostgREST can receive the changes.
For Watermelon: Implement pushChanges that calls your API or Supabase RPCs.
After successful push, update local records with synced = true or server timestamps.

Book Detail Page:
Always read from local DB first (fast).
Show a small "Syncing..." indicator when background sync is happening.
When online and synced, data matches backend.


4. Implementation Outline
Option A: WatermelonDB (Popular, Good Control)

Install: watermelondb, @nozbe/watermelondb adapter for SQLite.
Define models (Book, Entry, Customer, etc.) with relations.
Implement synchronize() with pullChanges and pushChanges:TypeScriptawait synchronize({
  database,
  pullChanges: async ({ lastPulledAt }) => {
    // Call Supabase/FastAPI with lastPulledAt → get changes
    const { data } = await supabase.rpc('pull_changes', { last_pulled_at: lastPulledAt });
    return { changes: data.changes, timestamp: data.timestamp };
  },
  pushChanges: async ({ changes }) => {
    // Send to your FastAPI or Supabase RPC
    await api.post('/sync/push', { changes });
  }
});
Trigger sync on reconnect, app open, after mutations, etc.

Option B: PowerSync (Easiest for Supabase)

PowerSync sits between your local SQLite and Supabase Postgres.
You write SQL queries against local DB.
It handles upload queue + replication automatically.
You define sync rules (what data this user can see).
Excellent for your multi-book, multi-party setup.

Option C: Lightweight Custom (if you want minimal new libs)

Use Expo SQLite + Zustand or Redux for state.
Create a pending_operations table.
Every write: insert to local tables + log operation (insert/update/delete) in queue.
On reconnect: process queue (retry with exponential backoff).
Use react-query with offline mutation cache.

5. Additional Important Points

Authentication Offline: Supabase session should persist via AsyncStorage. On app start without internet, use the cached session. Refresh token when online.
Conflicts: Use updated_at + last-write-wins, or more advanced (e.g., vector clocks or user-resolved). For cash books, last-write-wins is usually acceptable if you show last synced time.
Masters (Customers/Suppliers/Categories): Sync them too. Allow creating new ones offline.
Balances: Compute in queries or use Supabase views/materialized views + triggers. On local DB, you can use reactive queries.
UI Feedback: Show "Offline mode — entries saved locally" + pending count badge. "Synced" status per book or globally.
Background Sync: Use expo-task-manager for periodic sync when app is backgrounded (limited on iOS).
Performance: With hundreds/thousands of daily entries, SQLite + proper indexes will feel instant.

6. Suggested Next Steps

Decide between PowerSync (less code) vs WatermelonDB (more control, free).
Start by adding a local DB and mirroring your main entities.
Implement one flow end-to-end: Create cash-out entry offline → see it in book detail → go online → sync → verify in Supabase.
Add NetInfo listener + sync trigger.
Handle RLS (Row Level Security) carefully so users only see their own books/entries.

This pattern is used successfully in many expense/cash management apps. It gives users a smooth daily experience even in areas with poor connectivity (common in places like Pakistan).
If you tell me whether you're using Expo or bare React Native, and how complex your relations are, I can give more specific code snippets or schema examples. Also let me know if you prefer sticking closer to your current FastAPI layer or leaning more into Supabase.
Would you like me to sketch the WatermelonDB models or the sync queue schema?1.1s

<!-- /............................................. -->

Here's a practical, production-ready way to achieve offline-first cash book entries in your React Native app (with Supabase + FastAPI backend). The goal is: users create cash-in/cash-out entries (with customers, suppliers, categories) even without internet, and everything syncs reliably to the cloud when online.
1. Core Architecture (Offline-First / Local-First)
Don't write entries directly to Supabase when offline — that will fail or require complex queuing on every API call.
Instead, adopt this pattern:

Local Database (source of truth when offline or for speed): Store all data (Books, Entries, Customers, Suppliers, Categories, Balances) locally.
Backend (Supabase Postgres + your FastAPI): Single source of truth for multi-device/cloud sync.
Sync Layer: Automatically push local changes to backend + pull remote changes when online.

Recommended Tech Stack Additions:



































LayerRecommendationWhyLocal DBWatermelonDB (with Expo SQLite) or PowerSyncBest balance for React Native + relational data + built-in sync protocolSyncWatermelonDB sync (custom) or PowerSync (easier for Supabase)Handles conflicts, incremental sync, timestampsNetwork Detection@react-native-community/netinfoTrigger sync on reconnectState/UIReact Query / TanStack Query + local DB observersOptimistic updates + cachingBackendSupabase (Postgres) + FastAPI (if needed for complex logic)Supabase for auth, RLS, realtime; FastAPI for custom endpoints
Top Recommendations (2026 context):

Easiest & Recommended for your use case: PowerSync + Supabase. It gives you a local SQLite that syncs bidirectionally with your Supabase Postgres with minimal boilerplate. Great for relational data like cash books, entries, parties (customers/suppliers), and categories.
Very popular & flexible: WatermelonDB. Supabase even has an official blog post on it. You define models once and implement pullChanges / pushChanges.
Simpler custom route (if you want to avoid heavy libs): Use Expo SQLite + manual sync queue (table for pending operations) + background sync with expo-task-manager or AppState listeners.

For a daily-use cash book with many entries, relational links (book → entries, entry → customer/category), and calculated balances, WatermelonDB or PowerSync are much better than raw AsyncStorage or manual queuing.
2. Database Schema Design (Key Tables)
Design these in Supabase Postgres (and mirror in your local DB):

users (handled by Supabase Auth)
books (id, user_id, name, description, created_at, updated_at)
entries (id, book_id, type: 'cash_in' | 'cash_out', amount, date, description, customer_id, supplier_id, category_id, synced_at or version/timestamp for conflict resolution)
customers (id, user_id, name, contact, balance, ...)
suppliers (similar)
categories (id, user_id, name, type: 'income' | 'expense', ...)

Add these helpful columns on all syncable tables:

created_at, updated_at
server_id or use UUID as primary key everywhere (recommended)
For Watermelon: last_pulled_at logic + _changed flags

Balances: Never store as single column if possible. Calculate on-the-fly (SUM(amount)) for books, customers, suppliers. Or maintain a denormalized current_balance and update it atomically via triggers/RPCs in Supabase.
On the Books list screen: Fetch all books + compute SUM(entries) across them for total net balance (or cache it).
3. How Offline Entries Work

User creates entry offline:
Write directly to local DB (WatermelonDB model or PowerSync SQLite).
UI updates instantly (optimistic update).
Mark the record as "pending sync" (Watermelon does this automatically; in custom queue you add a sync_status: 'pending').

When online (NetInfo detects connection + on app foreground):
Run sync:
Push: Send new/updated local entries (and related masters: customers, categories, etc.) to backend.
Pull: Fetch changes from backend since last sync timestamp.

Use incremental sync (only changed records) for performance.

Backend registration:
Your FastAPI or Supabase Edge Functions / direct PostgREST can receive the changes.
For Watermelon: Implement pushChanges that calls your API or Supabase RPCs.
After successful push, update local records with synced = true or server timestamps.

Book Detail Page:
Always read from local DB first (fast).
Show a small "Syncing..." indicator when background sync is happening.
When online and synced, data matches backend.


4. Implementation Outline
Option A: WatermelonDB (Popular, Good Control)

Install: watermelondb, @nozbe/watermelondb adapter for SQLite.
Define models (Book, Entry, Customer, etc.) with relations.
Implement synchronize() with pullChanges and pushChanges:TypeScriptawait synchronize({
  database,
  pullChanges: async ({ lastPulledAt }) => {
    // Call Supabase/FastAPI with lastPulledAt → get changes
    const { data } = await supabase.rpc('pull_changes', { last_pulled_at: lastPulledAt });
    return { changes: data.changes, timestamp: data.timestamp };
  },
  pushChanges: async ({ changes }) => {
    // Send to your FastAPI or Supabase RPC
    await api.post('/sync/push', { changes });
  }
});
Trigger sync on reconnect, app open, after mutations, etc.

Option B: PowerSync (Easiest for Supabase)

PowerSync sits between your local SQLite and Supabase Postgres.
You write SQL queries against local DB.
It handles upload queue + replication automatically.
You define sync rules (what data this user can see).
Excellent for your multi-book, multi-party setup.

Option C: Lightweight Custom (if you want minimal new libs)

Use Expo SQLite + Zustand or Redux for state.
Create a pending_operations table.
Every write: insert to local tables + log operation (insert/update/delete) in queue.
On reconnect: process queue (retry with exponential backoff).
Use react-query with offline mutation cache.

5. Additional Important Points

Authentication Offline: Supabase session should persist via AsyncStorage. On app start without internet, use the cached session. Refresh token when online.
Conflicts: Use updated_at + last-write-wins, or more advanced (e.g., vector clocks or user-resolved). For cash books, last-write-wins is usually acceptable if you show last synced time.
Masters (Customers/Suppliers/Categories): Sync them too. Allow creating new ones offline.
Balances: Compute in queries or use Supabase views/materialized views + triggers. On local DB, you can use reactive queries.
UI Feedback: Show "Offline mode — entries saved locally" + pending count badge. "Synced" status per book or globally.
Background Sync: Use expo-task-manager for periodic sync when app is backgrounded (limited on iOS).
Performance: With hundreds/thousands of daily entries, SQLite + proper indexes will feel instant.

6. Suggested Next Steps

Decide between PowerSync (less code) vs WatermelonDB (more control, free).
Start by adding a local DB and mirroring your main entities.
Implement one flow end-to-end: Create cash-out entry offline → see it in book detail → go online → sync → verify in Supabase.
Add NetInfo listener + sync trigger.
Handle RLS (Row Level Security) carefully so users only see their own books/entries.

This pattern is used successfully in many expense/cash management apps. It gives users a smooth daily experience even in areas with poor connectivity (common in places like Pakistan).
If you tell me whether you're using Expo or bare React Native, and how complex your relations are, I can give more specific code snippets or schema examples. Also let me know if you prefer sticking closer to your current FastAPI layer or leaning more into Supabase.
Would you like me to sketch the WatermelonDB models or the sync queue schema?WatermelonDB model or PowerSync SQLite).
is this free and how to setupHere's a clear and honest comparison + setup guide for your React Native cash book app (using Supabase + FastAPI).
1. Pricing (as of 2026)


























ToolCore LibrarySync ServiceCost for Most UsersNotesWatermelonDBCompletely Free (MIT license)You build the sync yourself (to Supabase)Free (only your Supabase costs)Open source, no extra feesPowerSyncFree SDKPowerSync Cloud serviceFree Starter plan (up to 2 GB data synced/month)
Pro starts ~$49/monthVery generous free tier for small-medium apps
Verdict on Cost:

Both are free to start and sufficient for most cash book apps (even with hundreds of users and daily entries).
WatermelonDB = 100% free forever (you control everything).
PowerSync = Easier sync but has usage limits on the free plan. If your app grows big (many users or very high sync volume), you may need to upgrade.

For a daily usable cash book in Pakistan (where internet can be flaky), both work well. Most developers choose WatermelonDB when they want full control and zero extra cost.
2. Which One Should You Choose?

Choose WatermelonDB if:
You want completely free solution.
You don't mind writing ~100-200 lines of sync code.
You prefer more control over conflict resolution.
Your app has complex relations (books ↔ entries ↔ customers/suppliers/categories).

Choose PowerSync if:
You want the easiest and fastest setup for offline sync with Supabase.
You prefer writing SQL queries on the client instead of defining models.
You're okay with a managed sync service (and possible future paid plan).


My recommendation for you: Start with WatermelonDB.
It’s very popular with Supabase + React Native, has good community examples, and there’s an official-ish Supabase blog post showing how to do it. It fits your use case perfectly (multiple books, many entries, parties, categories).
3. How to Setup WatermelonDB (Step-by-Step)
Step 1: Installation
Assuming you're using Expo (most common):
Bashnpx expo install @nozbe/watermelondb
npx expo install @nozbe/watermelondb/adapters/sqlite

# For Supabase
npm install @supabase/supabase-js

# Babel plugin for decorators (important)
npm install --save-dev @babel/plugin-proposal-decorators
If you're on bare React Native, also run pod install (iOS) and add JitPack for Android.
Add to your babel.config.js:
JavaScriptmodule.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }]
  ]
};
Important: WatermelonDB requires custom development build (not Expo Go). Use npx expo run:android or npx expo run:ios.
Step 2: Define Your Models (This is the core)
Create a folder src/database/ and define models like this:
TypeScript// src/database/models/Book.ts
import { Model, field, relation, text, date } from '@nozbe/watermelondb';
import { children } from '@nozbe/watermelondb/decorators';

export default class Book extends Model {
  static table = 'books';

  @text('name') name!: string;
  @field('user_id') userId!: string;
  @date('created_at') createdAt!: Date;

  @children('entries') entries;   // relation to entries
}

// Similarly create models for:
- Entry (with type: 'cash_in' | 'cash_out', amount, date, description, customer_id, etc.)
- Customer
- Supplier
- Category
Step 3: Setup Database + Schema
TypeScript// src/database/index.ts
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import Book from './models/Book';
import Entry from './models/Entry';
// ... import other models

const adapter = new SQLiteAdapter({
  schema,
  // migrations if needed
});

export const database = new Database({
  adapter,
  modelClasses: [Book, Entry, Customer, Supplier, Category],
});
Step 4: Implement Sync (The Most Important Part)
You need to create a synchronize() function:
TypeScriptimport { synchronize } from '@nozbe/watermelondb/sync';

async function syncDatabase() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      // Call your Supabase / FastAPI to get changes since lastPulledAt
      const { data } = await supabase.rpc('pull_changes', {
        last_pulled_at: lastPulledAt || 0,
        user_id: currentUserId
      });

      return {
        changes: data.changes,
        timestamp: data.timestamp
      };
    },

    pushChanges: async ({ changes, lastPulledAt }) => {
      // Send local changes (new/updated/deleted entries, customers, etc.) to backend
      await api.post('/sync/push', { changes });   // or use Supabase RPC
    },
  });
}
You can trigger this sync when:

App comes to foreground
Internet reconnects (NetInfo)
After user creates an entry

Quick Advice Before You Start

First implement WatermelonDB without sync (just local CRUD for books + entries). Test if the UI feels fast.
Then add the sync layer.
Use UUIDs as primary keys everywhere.
Add updated_at column on all tables for proper sync.

Would you like me to give you:

The full schema (schema.ts) for your cash book (books, entries, customers, etc.)?
A ready-made sync example with Supabase RPC?
Or PowerSync setup instead (if you prefer simpler sync)?

Just tell me:

Are you using Expo or bare React Native?
Do you want to go with WatermelonDB or try PowerSync?

I’ll give you the exact code/files you need.1.4s