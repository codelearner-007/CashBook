# CashBook — Subscription Plan & Remaining Development Roadmap

> **This is the single source of truth** for what the subscription system looks like and what remains to be built before launch.
> Plans are finalized. Sequence below is the order of implementation.

---

## Finalized Subscription Plans

### Feature Matrix

| Feature | Free | Pro | Business |
|---|---|---|---|
| Books | 3 | 15 | Unlimited |
| Entries | Unlimited | Unlimited | Unlimited |
| Storage | Local only | Cloud sync | Cloud sync |
| Multi-device | No | Yes | Yes |
| PDF / Excel Export | No | Yes | Yes |
| Customers & Suppliers | View only | Full access | Full access |
| Categories | View only | Full access | Full access |
| Reports | View only (no download / share) | Full access | Full access |
| Shared Books (Team) | No | Yes | Yes |
| Backup History | No | 7 days | 30 days |
| Guest Access | No | No | Up to 10 guests (View / Edit / Full — owner sets per guest) |

### Pricing

| Plan | Monthly | Yearly | Yearly Savings |
|---|---|---|---|
| Free | $0 | $0 | — |
| Pro | $4.99 / mo | $44.99 / yr | ~25% off |
| Business | $9.99 / mo | $89.99 / yr | ~25% off |

### Guest Access Permission Levels (Business only)

| Permission | View entries | Add entries | Edit / Delete | Manage books & categories |
|---|---|---|---|---|
| View only | Yes | No | No | No |
| Edit | Yes | Yes | Yes | No |
| Full | Yes | Yes | Yes | Yes |

---

## What Is Already Complete

| Area | Status |
|---|---|
| Login (Google OAuth + Email OTP) | Done |
| Books CRUD (create, rename, delete, sort, drag reorder) | Done |
| Book Detail Screen (entries list, filters, balance) | Done |
| Add / Edit / Delete Entry | Done |
| Entry Detail Screen | Done |
| Category system (CRUD, profile, balance) | Done |
| Customers & Suppliers (CRUD, contact picker) | Done |
| Reports (view, bar chart, PDF export, Excel export) | Done |
| Book Settings (field visibility, categories, contacts, payment modes) | Done |
| Settings Screen | Done |
| Profile Screen (name, avatar, phone) | Done |
| Admin Dashboard (users, books, status toggle) | Done |
| Real-time sync for collaborator sharing (hooks) | Done |
| Theme (dark / light toggle) | Done |

---

## What Remains — In Sequence

Work through these phases **in order**. Do not start a later phase before the previous is complete.

---

### Phase 1 — Local SQLite Database (Free Tier Foundation)

The free tier stores all data on-device only. This requires a local database layer.

- [ ] Install `expo-sqlite` and create a local DB schema mirroring the Supabase tables:
  `books`, `entries`, `categories`, `customers`, `suppliers`
- [ ] Build a **data source abstraction layer**: every read/write call goes through a router that checks the user's tier — free users hit SQLite, paid users hit the API
- [ ] Implement local CRUD for: books, entries, categories, customers, suppliers
- [ ] Net balance calculation done locally (no trigger — computed from entries sum)
- [ ] Show a persistent banner on the Books screen for free users:
  *"Your data is stored only on this device. Upgrade to back it up to the cloud."*
- [ ] When a free user upgrades, **migrate local data to cloud** automatically:
  - Prompt: *"We found data on this device. Upload it to your new account?"*
  - On confirm: call `POST /api/v1/migrate/offline` with all local books + entries
  - On success: local SQLite becomes read-only cache; Supabase becomes source of truth

---

### Phase 2 — Subscription Data Model

- [ ] **Supabase migration:** add these columns to `profiles`:

  | Column | Type | Values |
  |---|---|---|
  | `subscription_tier` | text | `FREE` / `PRO` / `BUSINESS` |
  | `subscription_status` | text | `active` / `expired` / `cancelled` |
  | `billing_cycle` | text | `monthly` / `yearly` / `none` |
  | `subscribed_at` | timestamp | Date of first paid subscription |
  | `expires_at` | timestamp | End of current billing period |
  | `revenuecat_user_id` | text | Links profile to RevenueCat |

- [ ] **Backend:** add `subscription_tier` and `subscription_status` to the profile response model
- [ ] **Frontend:** add `subscription_tier`, `subscription_status`, `expires_at` to `authStore`
- [ ] Store `subscription_tier` in `expo-secure-store` locally so gates work offline

---

### Phase 3 — RevenueCat Integration

RevenueCat handles all billing for both App Store (iOS) and Google Play (Android).

- [ ] Create RevenueCat account and project
- [ ] Configure entitlements in RevenueCat dashboard:
  - `pro` entitlement → Pro plan
  - `business` entitlement → Business plan
- [ ] Set up products in **App Store Connect**:
  - `cashbook_pro_monthly` — $4.99 / month
  - `cashbook_pro_yearly` — $44.99 / year
  - `cashbook_business_monthly` — $9.99 / month
  - `cashbook_business_yearly` — $89.99 / year
- [ ] Mirror the same 4 products in **Google Play Console**
- [ ] Install `react-native-purchases` (RevenueCat SDK) in the frontend
- [ ] On login: identify the user in RevenueCat with their Supabase user ID
- [ ] **Backend webhook:** `POST /api/v1/webhooks/revenuecat`
  - On `INITIAL_PURCHASE` or `RENEWAL` → update `subscription_tier`, `subscription_status`, `expires_at` in Supabase
  - On `CANCELLATION` or `EXPIRATION` → downgrade tier to `FREE`
- [ ] Add migration: `POST /api/v1/migrate/offline` endpoint for local→cloud data upload

---

### Phase 3b — Testing Strategy (Local vs Cloud)

Use this throughout all phases to test both tiers without real purchases.

#### During Development (no RevenueCat needed)

Add a **dev-only tier switcher** row to SettingsScreen, visible only when `__DEV__ === true`:

- Renders a row: *"Dev: Switch Tier → Free / Pro / Business"*
- Tapping an option writes `subscription_tier` to `authStore` and `expo-secure-store`
- `canAccess()` reads from `authStore` → all gates and paywalls reflect the change instantly
- No backend call, no purchase, works fully offline
- Automatically hidden in production builds (`__DEV__` is `false` in EAS production)

This lets you flip between all 3 tiers in seconds to test every gate and paywall screen during Phases 4–7.

#### During Store Testing (after RevenueCat is integrated)

| Platform | How to test purchases for free |
|---|---|
| iOS | Create a **Sandbox Apple ID** in App Store Connect — makes real purchases for $0 in TestFlight / Simulator |
| Android | Add your account as a **License Tester** in Google Play Console — purchases go through with no real charge |

RevenueCat's own dashboard lets you simulate subscription renewals, cancellations, and expirations on any sandbox purchase — use this to test the webhook and tier downgrade flows.

#### Recommended Testing Order

1. Dev tier switcher → test all gates and paywall UI (Phases 4–7)
2. RevenueCat sandbox → test the actual purchase and webhook flow (Phase 3)
3. TestFlight / Play Internal Testing → full end-to-end before public release (Phase 9)

---

### Phase 4 — Feature Gates & Paywall UI

- [ ] Build `canAccess(feature)` utility — reads `subscription_tier` from `authStore` and returns `true` / `false`

  | Feature key | Free | Pro | Business |
  |---|---|---|---|
  | `add_book` (beyond 3) | ❌ | ❌ (beyond 15) | ✅ |
  | `cloud_sync` | ❌ | ✅ | ✅ |
  | `multi_device` | ❌ | ✅ | ✅ |
  | `export_pdf_excel` | ❌ | ✅ | ✅ |
  | `customers_suppliers_write` | ❌ | ✅ | ✅ |
  | `categories_write` | ❌ | ✅ | ✅ |
  | `reports_download_share` | ❌ | ✅ | ✅ |
  | `shared_books` | ❌ | ✅ | ✅ |
  | `backup_history` | ❌ | ✅ (7 days) | ✅ (30 days) |
  | `guest_access` | ❌ | ❌ | ✅ (up to 10) |

- [ ] Build reusable `PaywallSheet` bottom sheet component:
  - Shows what plan unlocks the feature
  - "See Plans" button → navigates to Plans screen
  - "Maybe Later" dismisses

- [ ] Wire gates at each touch point:
  - FAB on BooksScreen: if free user has 3 books → `PaywallSheet` (Pro)
  - Pro user has 15 books → `PaywallSheet` (Business)
  - "+ Add" in Customers & Suppliers tab (free) → `PaywallSheet` (Pro)
  - "+ Add" in Categories tab (free) → `PaywallSheet` (Pro)
  - Export buttons in ReportsScreen (free) → `PaywallSheet` (Pro)
  - Share button in ReportsScreen (free) → `PaywallSheet` (Pro)
  - Invite Guest button (free + pro) → `PaywallSheet` (Business)

- [ ] **Backend enforcement** (defence in depth — never trust client alone):
  - `POST /api/v1/books` → check book count vs tier limit; return `403` if exceeded
  - Export endpoints → check tier; return `403` if free

---

### Phase 5 — Plans & Upgrade Screen

- [ ] Build `PlansScreen` (accessible from `PaywallSheet` and Settings):
  - Toggle: Monthly / Yearly (yearly shows "25% off" badge)
  - 3 plan cards: Free · Pro · Business with feature list per plan
  - "Current plan" badge on active plan
  - "Subscribe" / "Upgrade" button per plan → triggers RevenueCat purchase flow
  - Restore Purchases link (required by App Store rules)
- [ ] Add **Subscription row** to SettingsScreen under Account section:
  - Shows: current plan + renewal date
  - Tap → `PlansScreen`
- [ ] On successful purchase:
  - RevenueCat webhook fires → backend updates Supabase
  - Frontend polls or listens for `authStore` update → UI refreshes instantly

---

### Phase 6 — Guest Access (Business Feature)

- [ ] **Database migration:** create `book_guests` table:

  | Column | Type | Notes |
  |---|---|---|
  | `id` | uuid | PK |
  | `book_id` | uuid | FK → books |
  | `owner_id` | uuid | FK → profiles (the Business user) |
  | `guest_user_id` | uuid | FK → profiles (the invitee) |
  | `permission` | text | `view` / `edit` / `full` |
  | `invited_at` | timestamp | |
  | `accepted_at` | timestamp | null until accepted |

- [ ] **Backend endpoints:**
  - `POST /api/v1/books/:id/guests` — invite a guest by email
  - `GET /api/v1/books/:id/guests` — list all guests for a book
  - `PATCH /api/v1/books/:id/guests/:guest_id` — change permission level
  - `DELETE /api/v1/books/:id/guests/:guest_id` — remove guest
  - `GET /api/v1/me/shared-books` — list books shared with the logged-in user

- [ ] **Frontend — Book Settings → Guests tab** (Business plan only):
  - List of invited guests with their permission level
  - Change permission dropdown per guest (View / Edit / Full)
  - Remove guest button
  - "+ Invite Guest" → enter email → send invite
  - Shows remaining guest slots (e.g. "7 of 10 used")

- [ ] **Guest experience:**
  - Guest receives email invite (Supabase email or custom)
  - On login, guest sees a "Shared Books" section on their BooksScreen
  - Guest can access the owner's cloud books per their permission level
  - Guest's own books remain local (Free tier) unless they have their own subscription

- [ ] Enforce max 10 guests per Business account on both backend and frontend

---

### Phase 7 — Backup History

- [ ] **Backend:**
  - Pro: expose last 7 days of entry history with restore option
  - Business: expose last 30 days
  - `GET /api/v1/books/:id/backups` — list available restore points
  - `POST /api/v1/books/:id/backups/restore` — restore to a specific point

- [ ] **Frontend — Backup & Sync screen** (Settings → Backup & Sync):
  - Currently a TODO row in SettingsScreen — implement it
  - Shows last backup time
  - List of restore points (7 or 30 days depending on plan)
  - "Restore" button per restore point with confirmation sheet
  - Free users see locked state + upgrade prompt

---

### Phase 8 — Remaining Incomplete Screens

These screens exist but are skeleton / TODO:

- [ ] **BusinessSettingsScreen** (`/(app)/settings/business`):
  - Business name, address, logo, tax number
  - Used for PDF report headers
  - `PUT /api/v1/profile/business` endpoint

- [ ] **CurrencyScreen** (`/(app)/settings/currency`):
  - List of currencies with symbol and name
  - Selected currency stored in profile
  - Applied to all amount displays app-wide

- [ ] **SettingsScreen — Support rows** (currently no-op):
  - **Help & FAQ** → in-app FAQ screen or link to web page
  - **Rate the App** → `expo-store-review` (native rating prompt)
  - **Share App** → `expo-sharing` share sheet with store link

- [ ] **EntryDetailScreen — Backup Entry** (currently TODO in ⋮ menu):
  - Export single entry as PDF or share as text
  - Gate: export requires Pro / Business

---

### Phase 9 — App Store & Play Store Launch Prep

- [ ] Configure **EAS Build** (`eas.json`) for production builds
- [ ] Set app version, bundle ID, package name
- [ ] Create app icons (all required sizes for iOS + Android)
- [ ] Create splash screens
- [ ] Write **App Store listing**:
  - App name, subtitle, description, keywords
  - 6.7" and 5.5" iPhone screenshots
  - iPad screenshots (if supporting iPad)
- [ ] Write **Google Play listing**:
  - Short + full description, feature graphic
  - Phone screenshots (multiple aspect ratios)
- [ ] Privacy Policy page (required by both stores) — describes what data is collected
- [ ] Terms of Service page
- [ ] Submit for **TestFlight** (iOS beta) before public release
- [ ] Submit for **Google Play Internal Testing** before public release
- [ ] Submit for App Store review + Google Play review

---

## Summary — Remaining Work at a Glance

| Phase | What | Complexity |
|---|---|---|
| 1 | Local SQLite for free tier + offline → cloud migration | High |
| 2 | Subscription data model (Supabase + backend + authStore) | Low |
| 3 | RevenueCat setup + webhook + store products | Medium |
| 4 | Feature gates + PaywallSheet | Medium |
| 5 | Plans screen + upgrade flow + subscription in settings | Medium |
| 6 | Guest access (DB, backend, frontend) | High |
| 7 | Backup history (backend + UI) | Medium |
| 8 | Remaining incomplete screens (Business, Currency, Help, Rate) | Low |
| 9 | App Store + Play Store launch prep | Medium |
