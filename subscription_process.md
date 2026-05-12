# CashBook — Subscription & Offline/Online Plan

> **Purpose:** Defines subscription tiers, what each user type can do, and how offline vs online data is handled.
> No code changes yet — this is the planning foundation before any implementation begins.

---

## Table of Contents

1. [App Distribution](#1-app-distribution)
2. [Tier Comparison at a Glance](#2-tier-comparison-at-a-glance)
3. [Tier Details](#3-tier-details)
4. [Offline User — How It Works](#4-offline-user--how-it-works)
5. [Online User — How It Works](#5-online-user--how-it-works)
6. [Onboarding Flow](#6-onboarding-flow)
7. [Feature Gates & Paywalls](#7-feature-gates--paywalls)
8. [Subscription Data Model](#8-subscription-data-model)
9. [Code Changes Required (Summary)](#9-code-changes-required-summary)
10. [Open Questions](#10-open-questions)

---

## 1. App Distribution

- Free to download on **Google Play Store** and **Apple App Store**
- No credit card required — works immediately after install
- Offline mode is available from the first launch with no account needed

---

## 2. Tier Comparison at a Glance

| Feature                        | Free (Offline) |   Starter    |     Pro      |   Business   |
| ------------------------------ | :------------: | :----------: | :----------: | :----------: |
| **Price**                      |      $0        |  ~$2–3/mo    |  ~$5–6/mo    | ~$10–15/mo   |
| **Account required**           |      No        |     Yes      |     Yes      |     Yes      |
| **Data storage**               |  Device only   |    Cloud     |    Cloud     |    Cloud     |
| **Cashbooks**                  |       1        |      3       |  Unlimited   |  Unlimited   |
| **Entries per book**           |   Unlimited    |  Unlimited   |  Unlimited   |  Unlimited   |
| **Categories**                 |       5        |  Unlimited   |  Unlimited   |  Unlimited   |
| **Cloud sync & backup**        |       ❌        |      ✅       |      ✅       |      ✅       |
| **Multi-device access**        |       ❌        |      ✅       |      ✅       |      ✅       |
| **Customers & suppliers**      |       ❌        |    Basic     |     Full     |     Full     |
| **Reports (on screen)**        |       ❌        |      ✅       |      ✅       |      ✅       |
| **PDF / Excel export**         |       ❌        |      ❌       |      ✅       |      ✅       |
| **Photo attachments**          |       ❌        |      ❌       |      ✅       |      ✅       |
| **Advanced filters & search**  |       ❌        |      ❌       |      ✅       |      ✅       |
| **Team members**               |       ❌        |      ❌       |      ❌       |   Up to 5    |
| **Shared cashbooks**           |       ❌        |      ❌       |      ❌       | ✅ (future)  |
| **Business profile on reports**|       ❌        |      ❌       |      ❌       |      ✅       |
| **Priority support**           |       ❌        |      ❌       |      ✅       |      ✅       |

> **Business tier** is planned for a later release. Design for it now, but do not build it in v1.

---

## 3. Tier Details

### Tier 0 — Free (Offline)

**Price:**       $0 forever
**Target user:** Anyone who just installed the app and hasn't committed yet

**What they get:**
- 1 cashbook stored entirely on their device
- Unlimited entries, cash in / cash out, net balance view
- Up to 5 categories
- No login, no internet required

**The catch:**
- If the app is uninstalled or the device is lost → **all data is permanently gone**
- A persistent banner reminds them: *"Your data exists only on this device. Subscribe to back it up."*

---

### Tier 1 — Starter

**Price:**       ~$2–3 / month  or  ~$20 / year
**Target user:** Individuals who want a safety net and use 2–3 books

**What they get (on top of Free):**
- Account (Google login or Email OTP)
- Up to 3 cashbooks synced to the cloud
- Cloud backup — restore on any device
- Basic customers & suppliers list
- Unlimited categories
- View reports on screen (no export)

**Still locked:**
- PDF / Excel export
- Photo attachments on entries

---

### Tier 2 — Pro

**Price:**       ~$5–6 / month  or  ~$50 / year
**Target user:** Freelancers, shop owners, anyone managing finances seriously

**What they get (on top of Starter):**
- Unlimited cashbooks
- PDF export and Excel export
- Photo attachments on entries (receipts, invoices)
- Full customers & suppliers management
- Advanced filters and date-range search
- Priority support

---

### Tier 3 — Business *(v2, not in first release)*

**Price:**       ~$10–15 / month
**Target user:** Small businesses with multiple staff members

**What they get (on top of Pro):**
- Up to 5 team members per account
- Shared cashbooks (collaborative editing)
- Business profile and logo shown on exported reports
- Admin dashboard with usage overview

---

## 4. Offline User — How It Works

### Where data lives
All data is stored in **SQLite on the device** using `expo-sqlite`. No backend calls are made. The app runs fully without internet access.

### When they uninstall
Data is permanently deleted. The app must make this risk visible at all times — not buried in settings, but shown as a soft warning on the main screen.

### When they decide to subscribe (Offline → Cloud migration)

1. User taps "Subscribe" or hits a feature gate
2. They complete account creation (Google or Email OTP)
3. App checks: does local SQLite data exist?
4. If yes → prompt: *"We found data on this device. Upload it to your new cloud account?"*
5. User confirms → app calls a **bulk migration API endpoint**
6. Endpoint inserts all local books and entries into Supabase under their new `user_id`
7. Local SQLite data is **kept** (not deleted) and becomes the offline cache going forward
8. From this point on, **Supabase is the source of truth**

---

## 5. Online User — How It Works

### Where data lives
- **Primary:**   Supabase (PostgreSQL) via the FastAPI backend
- **Secondary:** Local SQLite cache for when there is no internet

### Sync behavior

| State        | Read from          | Write to                  |
| ------------ | ------------------ | ------------------------- |
| Online       | API (Supabase)     | API directly              |
| Offline      | Local SQLite cache | Local queue               |
| Back online  | —                  | Flush local queue to API  |

**Conflict resolution (v1):** Last write wins. Sufficient for a personal finance app used by one person across devices.

### Multi-device
Every device syncs through the backend. No peer-to-peer sync. Both devices stay in sync as long as they are online.

---

## 6. Onboarding Flow

```
App installed
      │
      ▼
Onboarding slides  (2–3 screens explaining CashBook)
      │
      ▼
┌──────────────────────────────────────────────┐
│           How do you want to start?          │
│                                              │
│   [ Start for Free ]     [ Sign Up / Log In ]│
└──────────┬───────────────────────┬───────────┘
           │                       │
           ▼                       ▼
     Offline mode             Auth screen
     (1 book,                 (Google / Email OTP)
      device only)                  │
                                    ▼
                          7-day free Pro trial offered
                                    │
                                    ▼
                             Home screen (Books)
```

**Trial note:** After the 7-day trial, users are downgraded to Starter unless they subscribe to a paid plan.

---

## 7. Feature Gates & Paywalls

### How gates work
The app reads `subscription_tier` from local storage (synced from the Supabase profile). When a user attempts a gated action, a **paywall bottom sheet** slides up explaining what they get if they upgrade.

### Gate rules

```
FREE      →  offline only  |  1 book        |  5 categories  |  no export  |  no attachments
STARTER   →  cloud         |  3 books       |  unlimited cat  |  no export  |  no attachments
PRO       →  cloud         |  unlimited     |  unlimited cat  |  export     |  attachments
BUSINESS  →  everything    |  + team (future)
```

### Paywall triggers

| User action                    | Blocked for    | Message shown                                         |
| ------------------------------ | -------------- | ----------------------------------------------------- |
| Add a 2nd book                 | Free           | "Upgrade to Starter — 3 books + cloud backup"         |
| Add a 4th book                 | Starter        | "Upgrade to Pro — unlimited cashbooks"                |
| Export to PDF or Excel         | Free + Starter | "Upgrade to Pro to export reports"                    |
| Add a photo to an entry        | Free + Starter | "Upgrade to Pro to attach receipts and invoices"      |
| Open app on a second device    | Free           | "Upgrade to Starter for multi-device access"          |
| Add a 6th category             | Free           | "Upgrade to Starter for unlimited categories"         |

### Purchase handling
- **iOS:**     Apple In-App Purchase via **RevenueCat SDK**
- **Android:** Google Play Billing via **RevenueCat SDK**
- RevenueCat manages entitlements across both platforms. The app reads the entitlement — it never handles raw store receipts directly.

---

## 8. Subscription Data Model

Fields added to the `profiles` table:

| Field                  | Type      | Values / Notes                              |
| ---------------------- | --------- | ------------------------------------------- |
| `subscription_tier`    | text      | `FREE` / `STARTER` / `PRO` / `BUSINESS`     |
| `subscription_status`  | text      | `active` / `expired` / `cancelled` / `trial`|
| `trial_ends_at`        | timestamp | Set on first account creation               |
| `subscribed_at`        | timestamp | Date of first paid subscription             |
| `expires_at`           | timestamp | When the current billing period ends        |
| `revenuecat_user_id`   | text      | Links the profile to RevenueCat             |

`subscription_tier` is also stored locally so gates work without an internet connection.

---

## 9. Code Changes Required (Summary)

### Frontend
- [ ] Add `expo-sqlite` for local data layer (offline mode)
- [ ] Add `subscription_tier` and `subscription_status` to `authStore`
- [ ] Build `canAccess(feature, tier)` utility for feature gate checks
- [ ] Build reusable `PaywallSheet` bottom sheet component
- [ ] Integrate RevenueCat SDK (`react-native-purchases`)
- [ ] Build offline write queue + reconnect sync logic
- [ ] Build offline → cloud migration screen (shown after first login when local data exists)

### Backend
- [ ] Add subscription fields to `profiles` table
- [ ] Add RevenueCat webhook endpoint (`POST /api/v1/webhooks/revenuecat`)
- [ ] Add bulk-import migration endpoint (`POST /api/v1/migrate/offline`)
- [ ] Enforce tier limits on book count at `POST /api/v1/books`
- [ ] Enforce tier limits on export endpoints

### Supabase
- [ ] New migration: add subscription columns to `profiles`
- [ ] Review RLS policies if any need to reflect tier access

### Third-party setup
- [ ] Create RevenueCat account and configure entitlements
- [ ] Set up products in App Store Connect: `starter_monthly`, `starter_yearly`, `pro_monthly`, `pro_yearly`
- [ ] Mirror products in Google Play Console

---

## 10. Open Questions

Decide these before any implementation starts:

- [ ] **Free trial:**        Offer 7-day Pro trial for all new accounts? *(Recommended: yes)*
- [ ] **Pricing:**           Confirm exact USD prices and whether to localize for specific regions
- [ ] **Lifetime deal:**     Offer a one-time purchase option for early adopters?
- [ ] **Simplified v1:**     Launch with only Free + Pro (skip Starter) to reduce complexity?
- [ ] **One-time export:**   Allow a single manual export for Free offline users as a goodwill feature?
- [ ] **Trial after import:** If a Free user migrates local data then subscribes, do they still get the 7-day trial?
