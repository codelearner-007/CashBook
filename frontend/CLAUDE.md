# CLAUDE.md — Frontend (cashbook/frontend)

> **Auto-update rule:** Whenever any file inside `frontend/` is edited (screen, component, hook, store, lib), re-read that file and update the matching section in this file before finishing the task.

---

## Folder Structure

```
frontend/
├── app/                          # Expo Router file-based routes
│   ├── _layout.jsx               # Root layout: fonts, QueryClient, AuthGuard, Toast
│   ├── index.jsx                 # Splash / onboarding redirect
│   ├── (auth)/
│   │   ├── _layout.jsx           # Auth stack (no tab bar)
│   │   └── login.jsx             # → LoginScreen
│   └── (app)/
│       ├── _layout.jsx           # App layout (tab bar / drawer)
│       ├── books/
│       │   ├── index.jsx         # → BooksScreen
│       │   ├── [id].jsx          # → BookDetailScreen
│       │   └── [id]/
│       │       ├── add-entry.jsx             # → AddEntryScreen
│       │       ├── edit-entry.jsx            # → EditEntryScreen
│       │       ├── entry-detail.jsx          # → EntryDetailScreen
│       │       ├── reports.jsx               # → ReportsScreen
│       │       ├── book-settings.jsx         # → BookSettingsScreen
│       │       ├── categories-settings.jsx   # → CategoriesSettingsScreen
│       │       ├── contact-settings.jsx      # → ContactSettingsScreen
│       │       └── payment-mode-settings.jsx # → PaymentModeSettingsScreen
│       ├── dashboard/
│       │   └── index.jsx         # → DashboardScreen (superadmin only)
│       └── settings/
│           ├── index.jsx         # → SettingsScreen
│           ├── profile.jsx       # → ProfileScreen
│           └── business/
│               ├── index.jsx     # → BusinessSettingsScreen
│               ├── profile.jsx   # → BusinessProfileScreen
│               └── delete.jsx    # → DeleteBusinessScreen
├── src/
│   ├── screens/                  # All screen components (one file = one screen)
│   ├── components/
│   │   ├── entry/EntryForm.jsx   # Shared form for add/edit entry
│   │   └── ui/                   # Atomic UI: Input, Icons, DatePickerModal, TimePickerModal
│   ├── hooks/
│   │   ├── useBooks.js           # Books CRUD via React Query
│   │   ├── useProfile.js         # Profile read/update via React Query
│   │   └── useTheme.js           # Returns { C, Font, isDark, toggleTheme }
│   ├── lib/
│   │   ├── api.js                # All API calls (mock now, real later)
│   │   ├── supabase.js           # Supabase client (SecureStore adapter)
│   │   └── toast.js              # Toast helper
│   ├── store/
│   │   ├── authStore.js          # Zustand: user, session, setUser, clearUser
│   │   ├── bookFieldsStore.js    # Zustand: per-book field visibility toggles
│   │   └── themeStore.js         # Zustand: isDark, toggle
│   └── constants/
│       ├── colors.js             # LightColors, DarkColors
│       ├── fonts.js              # Font.* constants (Inter family)
│       ├── categories.js         # Default category list
│       └── shadows.js            # Shadow presets
```

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React Native + Expo SDK 51 |
| Routing | Expo Router v3 (file-based) |
| Server state | TanStack React Query v5 |
| Global state | Zustand v4 |
| HTTP | Axios (+ Supabase client) |
| Auth | Supabase Auth (Google OAuth) |
| Token storage | Expo SecureStore |
| Fonts | @expo-google-fonts/inter |
| Date/time pickers | react-native-modal-datetime-picker |

---

## Auth & Navigation Logic

### Root Layout (`app/_layout.jsx`)
- Loads Inter 400/500/600/700/800; hides splash screen when ready
- Wraps app in `QueryClientProvider` (single `QueryClient` instance at module level)
- `AuthGuard` watches `useAuthStore → user` and `useSegments`
  - No user + inside `(app)` → `router.replace('/(auth)/login')`
  - User + inside `(auth)` + role `superadmin` → `router.replace('/(app)/dashboard')`
  - User + inside `(auth)` + regular role → `router.replace('/(app)/books')`
- Renders `<Slot />` (page content) + `<Toast />` (global toast layer)

### Role-based routing

| Role | Landing route | Can access |
|---|---|---|
| Regular user | `/(app)/books` | Books, entries, settings |
| `superadmin` | `/(app)/dashboard` | Dashboard + admin user management |

---

## Screen Logic Reference

### `LoginScreen` → `/(auth)/login`
- **Mock (current):** "Continue" button shows a user-picker bottom sheet with 5 mock users. Selecting one calls `setUser(user)` in authStore.
- **Real (when wired):** Google button → `supabase.auth.signInWithOAuth({ provider: 'google' })` → on session event → `apiGetProfile()` → `setUser(profile, session)`.
- Queries: none

---

### `BooksScreen` → `/(app)/books`
- Fetches all books via `useBooks()` (queryKey `['books']`, staleTime 2 min)
- Header shows total net balance (sum across all books)
- FAB opens `AddBookModal`; save calls `useCreateBook()` → optimistic prepend to cache
- Long-press a book → confirm → `useDeleteBook()` → removes from cache
- Tap book → `router.push('/(app)/books/' + id)`

---

### `BookDetailScreen` → `/(app)/books/[id]`
- Fetches entries (`['entries', bookId]`) and summary (`['summary', bookId]`)
- Search bar: client-side filter by remark or amount text
- Filter chips: Date range | Type (in/out) | Contact | Category | Payment mode — all client-side
- Balance summary recalculates from filtered subset
- Entries grouped by date, each group collapsible
- Long-press entry → confirm delete → `apiDeleteEntry`
- "Cash In" / "Cash Out" buttons → navigate to `add-entry?type=in` / `add-entry?type=out`
- Reports icon → `/(app)/books/[id]/reports`
- Settings icon → `/(app)/books/[id]/book-settings`

---

### `AddEntryScreen` → `/(app)/books/[id]/add-entry`
- Receives `type` param (`'in'` or `'out'`) from query string
- Renders `<EntryForm type={type} />`
- On save: `apiCreateEntry(bookId, payload)` → invalidates `['entries', bookId]`, `['summary', bookId]`, `['books']`

---

### `EditEntryScreen` → `/(app)/books/[id]/edit-entry`
- Loads entry by `entryId` param from cache or fetches fresh
- Toggle type (in ↔ out) allowed inside form
- Delete button → confirm → `apiDeleteEntry` → pop
- On save: `apiUpdateEntry` → invalidates entries, summary, books

---

### `EntryDetailScreen` → `/(app)/books/[id]/entry-detail`
- Read-only view: amount (green=in, red=out), remark, category, payment mode, contact, date, time
- Dropdown (⋮): Edit → push edit-entry | Delete → confirm → delete

---

### `ReportsScreen` → `/(app)/books/[id]/reports`
- Period picker: This Month | Last Month | Last 3 Months | Custom
- Cards: Total Income | Total Expenses | Net Balance
- Bar chart: Income vs Expense by sub-period
- Export PDF / Export Excel → call API report endpoints (TODO)

---

### `BookSettingsScreen` → `/(app)/books/[id]/book-settings`
- Rename book via modal → `apiUpdateBook(bookId, { name })`
- Nav cards: Contact Settings | Categories Settings | Payment Mode Settings

---

### `CategoriesSettingsScreen` → `/(app)/books/[id]/categories-settings`
- "Show Category Field" toggle → `bookFieldsStore`
- Enable/disable individual categories
- Add / remove categories
- Data stored in `bookFieldsStore` (Zustand, persisted per book)

---

### `ContactSettingsScreen` → `/(app)/books/[id]/contact-settings`
- "Show Contact Field" toggle → `bookFieldsStore`
- Add contacts (name + phone), delete contacts
- Data stored in `bookFieldsStore`

---

### `PaymentModeSettingsScreen` → `/(app)/books/[id]/payment-mode-settings`
- "Show Payment Mode Field" toggle → `bookFieldsStore`
- Toggle modes on/off: Cash, Online, Cheque, Other
- Guard: minimum one mode must stay enabled

---

### `DashboardScreen` → `/(app)/dashboard` _(superadmin only)_
- Tab bar: "Users" | "My Books"
- Users tab: list all users via `apiGetAllUsers()`, toggle active status via `apiToggleUserStatus`, view user's books via `apiGetUserBooks(userId)`
- My Books tab: identical to BooksScreen scoped to admin's account

---

### `SettingsScreen` → `/(app)/settings`
- Sections: Account (Profile, Business, Currency) | App (Notifications, Privacy, Backup, Language) | Support (FAQ, Rate, Share)
- Logout → `clearUser()` → AuthGuard redirects to login

---

### `ProfileScreen` → `/(app)/settings/profile`
- `useProfile()` loads data; edit name + phone; email read-only
- "Update" disabled until dirty; save → `useUpdateProfile(payload)`

---

### `BusinessProfileScreen` → `/(app)/settings/business/profile`
- Edit business name, email, phone, address
- Avatar shows initials; save → `apiUpdateProfile({ business: payload })`

---

### `DeleteBusinessScreen` → `/(app)/settings/business/delete`
- Must type business name to confirm; "Delete" only enables on match
- On delete → call delete API → `clearUser()` → navigate to login

---

## API Layer (`src/lib/api.js`)

Currently returns **mock data**. To switch to real backend:
1. Uncomment the axios instance + auth interceptor block
2. Replace each `return MOCK_*` with the real `api.get/post/put/delete(...)` call
3. Delete the MOCK_DATA block at the top

| Function | HTTP | Endpoint |
|---|---|---|
| `apiGetBooks()` | GET | `/api/v1/books` |
| `apiCreateBook(name, currency)` | POST | `/api/v1/books` |
| `apiDeleteBook(bookId)` | DELETE | `/api/v1/books/:id` |
| `apiGetProfile()` | GET | `/api/v1/profile` |
| `apiUpdateProfile(payload)` | PUT | `/api/v1/profile` |
| `apiGetEntries(bookId)` | GET | `/api/v1/books/:id/entries` |
| `apiGetSummary(bookId)` | GET | `/api/v1/books/:id/summary` |
| `apiCreateEntry(bookId, payload)` | POST | `/api/v1/books/:id/entries` |
| `apiUpdateEntry(bookId, entryId, payload)` | PUT | `/api/v1/books/:id/entries/:eid` |
| `apiDeleteEntry(bookId, entryId)` | DELETE | `/api/v1/books/:id/entries/:eid` |
| `apiGetAllUsers()` | GET | `/api/v1/admin/users` |
| `apiToggleUserStatus(userId, is_active)` | PATCH | `/api/v1/admin/users/:id/status` |
| `apiGetUserBooks(userId)` | GET | `/api/v1/admin/users/:id/books` |

---

## State Management

| Store | Library | Contents |
|---|---|---|
| `authStore` | Zustand | `user`, `session`, `setUser(user, session)`, `clearUser()` |
| `themeStore` | Zustand | `isDark`, `toggle()` |
| `bookFieldsStore` | Zustand | Per-book field visibility: categories list, contacts list, payment modes |
| Books | React Query `['books']` | All books for current user |
| Entries | React Query `['entries', bookId]` | Entries for a specific book |
| Summary | React Query `['summary', bookId]` | Balance summary for a specific book |
| Profile | React Query `['profile']` | Current user profile |

**Rule:** Never store server data in Zustand. Zustand = auth + UI preferences only.

---

## Styling Rules

- Always use `useTheme()` → `{ C, Font }` — never hardcode hex colors or font family strings
- `C` resolves to `LightColors` or `DarkColors` based on `isDark`
- `Font` resolves to Inter variant names from `constants/fonts.js`
- Per-screen styles via `StyleSheet.create()` inside a local `makeStyles(C, Font)` function called with current theme values

---

## React Query Conventions

| Query key | staleTime | Data |
|---|---|---|
| `['books']` | 2 min | Books list |
| `['entries', bookId]` | 2 min | Book entries |
| `['summary', bookId]` | 2 min | Book balance summary |
| `['profile']` | 5 min | User profile |

Mutations use `qc.setQueryData(...)` for optimistic updates — no full refetch unless data shape is unknown.
