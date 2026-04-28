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
│       ├── _layout.jsx           # App layout (Stack, no header)
│       ├── books/
│       │   ├── index.jsx                         # → BooksScreen
│       │   ├── [id].jsx                          # → BookDetailScreen
│       │   └── [id]/
│       │       ├── add-entry.jsx                 # → AddEntryScreen
│       │       ├── edit-entry.jsx                # → EditEntryScreen
│       │       ├── entry-detail.jsx              # → EntryDetailScreen
│       │       ├── reports.jsx                   # → ReportsScreen
│       │       ├── book-settings.jsx             # → BookSettingsScreen
│       │       ├── categories-settings.jsx       # → CategoriesSettingsScreen
│       │       ├── contact-settings.jsx          # → ContactSettingsScreen
│       │       └── payment-mode-settings.jsx     # → PaymentModeSettingsScreen
│       ├── dashboard/
│       │   ├── _layout.jsx       # Tabs layout (Users | My Books | Settings)
│       │   ├── users.jsx         # → AdminUsersScreen  (superadmin only)
│       │   ├── books.jsx         # → AdminBooksScreen  (superadmin only)
│       │   ├── settings.jsx      # → SettingsScreen    (reused)
│       │   └── index.jsx         # href: null (redirected by _layout)
│       └── settings/
│           ├── index.jsx         # → SettingsScreen
│           ├── profile.jsx       # → ProfileScreen
│           ├── currency.jsx      # → CurrencyScreen
│           └── business/
│               ├── index.jsx     # → BusinessSettingsScreen
│               ├── profile.jsx   # → BusinessProfileScreen
│               └── delete.jsx    # → DeleteBusinessScreen
├── src/
│   ├── screens/                  # All screen components (one file = one screen)
│   ├── components/
│   │   ├── books/
│   │   │   ├── BookMenu.jsx      # Bottom-sheet action menu for a book (delete)
│   │   │   ├── DraggableList.jsx # Custom drag-reorder list for books
│   │   │   └── SortSheet.jsx     # Sort-mode picker bottom sheet
│   │   ├── entry/
│   │   │   └── EntryForm.jsx     # Shared form for add/edit entry
│   │   └── ui/
│   │       ├── Input.jsx
│   │       ├── Icons.jsx
│   │       ├── DatePickerModal.jsx
│   │       └── TimePickerModal.jsx
│   ├── hooks/
│   │   ├── useBooks.js           # useBooks, useCreateBook, useDeleteBook (React Query)
│   │   ├── useBookSort.js        # Sort state + sorted list derivation
│   │   ├── useProfile.js         # useProfile, useUpdateProfile
│   │   └── useTheme.js           # Returns { C, Font, isDark, toggleTheme }
│   ├── lib/
│   │   ├── api.js                # All Axios API calls (real backend, no mocks)
│   │   ├── supabase.js           # Supabase client (SecureStore / localStorage adapter)
│   │   └── toast.js              # Toast helper
│   ├── store/
│   │   ├── authStore.js          # Zustand: user, session, setUser, clearUser
│   │   ├── themeStore.js         # Zustand: isDark, toggle
│   │   └── bookFieldsStore.js    # Zustand: per-book field visibility toggles
│   └── constants/
│       ├── colors.js             # LightColors, DarkColors, CARD_ACCENTS
│       ├── currencies.js         # CURRENCIES list (160+ ISO 4217), getCurrency(code) helper
│       ├── fonts.js              # Font.regular/medium/semiBold/bold/extraBold
│       ├── categories.js         # Default category list
│       └── shadows.js            # Shadow presets
```

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React Native + Expo SDK 51 (JavaScript) |
| Routing | Expo Router v3 (file-based) |
| Server state | TanStack React Query v5 |
| Global state | Zustand v4 |
| HTTP | Axios (+ Supabase client for auth) |
| Auth | Supabase Auth (Google OAuth + Email OTP) |
| Token storage | Expo SecureStore (native) / localStorage (web) |
| Fonts | @expo-google-fonts/inter |
| Date/time pickers | react-native-modal-datetime-picker |

---

## Auth & Navigation Logic

### Root Layout (`app/_layout.jsx`)
- Loads Inter 400/500/600/700/800; hides splash screen when ready
- Wraps app in `QueryClientProvider` (single `QueryClient` instance at module level)
- `AuthGuard` watches `useAuthStore → user` and `useSegments`:
  - No user + inside `(app)` → `router.replace('/(auth)/login')`
  - User + inside `(auth)` + role `superadmin` → `router.replace('/(app)/dashboard')`
  - User + inside `(auth)` + role `user` → `router.replace('/(app)/books')`
- Renders `<Slot />` (page content) + `<Toast />` (global toast layer)

### Role-based routing

| Role | Landing route | Can access |
|---|---|---|
| `user` | `/(app)/books` | Books, entries, settings |
| `superadmin` | `/(app)/dashboard` | Dashboard (Users + Books + Settings tabs) |

---

## Screen Logic Reference

### `LoginScreen` → `/(auth)/login`
- Email/password or Google → `supabase.auth.signIn*` → on session event → `apiGetProfile()` → `setUser(profile, session)`
- AuthGuard redirects based on role after login

---

### `BooksScreen` → `/(app)/books` _(regular user)_
- `useBooks()` — queryKey `['books']`, staleTime 2 min, calls `GET /api/v1/books`
- Header: total net balance (sum across all books), book count, theme toggle, avatar → settings
- Sort modes: `updated` (default) | `created` | `alpha` | `custom` (drag-reorder)
- FAB → "Add New Book" modal → `useCreateBook().mutate({ name })`
- ⋮ on card → `BookMenu` bottom sheet → confirm delete → `useDeleteBook().mutate(id)`
- Tap book → `/(app)/books/[id]`
- Bottom nav: Cashbooks | Help | Settings

---

### `AdminBooksScreen` → `/(app)/dashboard/books` _(superadmin)_
- Identical to `BooksScreen` — same hooks, same CRUD flow, same sort/drag
- Header shows "Admin Workspace ▾" instead of "Personal Workspace ▾"
- FAB at `bottom: 16` (no bottom nav bar — nav is handled by dashboard tab bar)
- No bottom nav bar (the dashboard `_layout.jsx` tab bar replaces it)

---

### `AdminUsersScreen` → `/(app)/dashboard/users` _(superadmin)_
- `useQuery({ queryKey: ['admin-users'], queryFn: apiGetAllUsers, refetchInterval: 10000 })`
  - Polls every **10 seconds** so new user registrations appear near-instantly
- `useQuery({ queryKey: ['books'], queryFn: apiGetBooks })` — admin's own books for stats
- Header stats: Total Users | Active Users | Total Books | Storage
- Each user row: avatar initials, full name, email, book count, storage, entry count, active toggle
- Toggle → `Alert.alert` confirm → `useMutation(apiToggleUserStatus)` → `invalidate(['admin-users'])`
- Tap user card → modal with that user's books via `useQuery({ queryKey: ['user-books', id], queryFn: () => apiGetUserBooks(id) })`
- The `books` stat in the header = `allUsers.reduce(book_count) + adminOwnBooks.length`

---

### `BookDetailScreen` → `/(app)/books/[id]`
- Fetches entries (`['entries', bookId]`) and summary (`['summary', bookId]`)
- Search bar (client-side), filter chips (client-side)
- Entries grouped by date; long-press entry → delete
- "Cash In" / "Cash Out" → `add-entry?type=in|out`
- Reports icon → `/(app)/books/[id]/reports`
- Settings icon → `/(app)/books/[id]/book-settings`

---

### `AddEntryScreen` → `/(app)/books/[id]/add-entry`
- `type` param from query string (`'in'` or `'out'`)
- On save: `apiCreateEntry(bookId, payload)` → invalidates `['entries', bookId]`, `['summary', bookId]`, `['books']`

---

### `EditEntryScreen` → `/(app)/books/[id]/edit-entry`
- Toggle type allowed; delete button → confirm → pop
- On save: `apiUpdateEntry` → invalidates entries, summary, books

---

### `SettingsScreen` → `/(app)/settings` (and `/(app)/dashboard/settings`)
- Sections: Account | App | Support
- Logout → `supabase.auth.signOut()` → `clearUser()` → AuthGuard redirects to login

---

### `ProfileScreen` → `/(app)/settings/profile`
- `useProfile()` loads data; save → `useUpdateProfile(payload)` → `invalidate(['profile'])`

---

### `CurrencyScreen` → `/(app)/settings/currency`
- Full list of world currencies from `constants/currencies.js` (160+ ISO 4217 entries)
- Search bar filters by code, name, or symbol (client-side, no API call)
- Selected currency is highlighted with a checkmark; code comes from `profile?.currency`
- Tapping a row → `useUpdateProfile().mutate({ currency: code })` → `invalidate(['profile'])` → `router.back()`
- `SettingsScreen` reads `profile.currency`, looks it up with `getCurrency()`, and shows `"CODE – Name"` as the sub-label

---

## Books CRUD — Data Flow

### Create
1. Modal → `useCreateBook().mutate({ name })`
2. `onMutate`: optimistic prepend with `id: '__optimistic__'` → UI updates instantly
3. `POST /api/v1/books` → real book inserted in DB
4. `onSuccess`: `invalidateQueries(['books'])` → refetch → cache = real DB row with actual UUID
5. `onError`: rollback to snapshot

### Delete
1. `BookMenu` confirm → `useDeleteBook().mutate(bookId)`
2. `onMutate`: optimistic remove from cache → UI updates instantly
3. `DELETE /api/v1/books/:id` → DB delete (cascades entries)
4. `onSuccess`: `invalidateQueries(['books'])` → refetch → cache = remaining books from DB
5. `onError`: rollback to snapshot

**Invariant:** After `onSuccess`, the cache always reflects real DB data — not just the optimistic state.

---

## DraggableList Sync Rule

`DraggableList` maintains its own `items` state for drag ordering. It syncs with the parent `books` prop via `useEffect`:

```js
useEffect(() => {
  if (dragIdx < 0) {        // don't interrupt an active drag
    setItems([...books]);
  }
}, [books, dragIdx]);
```

This ensures that after a create or delete (which invalidates `['books']` and triggers a refetch), the drag list updates to show the real DB state without requiring the user to switch sort modes.

---

## API Layer (`src/lib/api.js`)

All functions call the real FastAPI backend. Axios interceptor attaches the Supabase JWT automatically. 401/403 responses trigger `supabase.auth.signOut()`.

| Function | HTTP | Endpoint |
|---|---|---|
| `apiGetBooks()` | GET | `/api/v1/books` |
| `apiCreateBook(name, currency)` | POST | `/api/v1/books` |
| `apiUpdateBook(bookId, payload)` | PUT | `/api/v1/books/:id` |
| `apiDeleteBook(bookId)` | DELETE | `/api/v1/books/:id` |
| `apiGetProfile()` | GET | `/api/v1/profile` |
| `apiUpdateProfile(payload)` | PUT | `/api/v1/profile` |
| `apiUploadAvatar(uri, mimeType)` | POST | `/api/v1/upload/avatar` — multipart, returns `{ avatar_url }` |
| `apiGetEntries(bookId, params)` | GET | `/api/v1/books/:id/entries` |
| `apiGetSummary(bookId)` | GET | `/api/v1/books/:id/summary` |
| `apiCreateEntry(bookId, payload)` | POST | `/api/v1/books/:id/entries` |
| `apiUpdateEntry(bookId, entryId, payload)` | PUT | `/api/v1/books/:id/entries/:eid` |
| `apiDeleteEntry(bookId, entryId)` | DELETE | `/api/v1/books/:id/entries/:eid` |
| `apiGetAllUsers()` | GET | `/api/v1/admin/users` |
| `apiToggleUserStatus(userId, is_active)` | PATCH | `/api/v1/admin/users/:id/status` |
| `apiGetUserBooks(userId)` | GET | `/api/v1/admin/users/:id/books` |

---

## State Management

| Store / Cache | Library | Contents |
|---|---|---|
| `authStore` | Zustand | `user`, `session`, `setUser(user, session)`, `clearUser()` |
| `themeStore` | Zustand | `isDark`, `toggle()` |
| `bookFieldsStore` | Zustand | Per-book: categories list, contacts list, payment mode toggles |
| `['books']` | React Query | All books for current user; staleTime 2 min |
| `['admin-users']` | React Query | All non-admin users; refetchInterval 10 s |
| `['entries', bookId]` | React Query | Entries for a specific book; staleTime 2 min |
| `['summary', bookId]` | React Query | Balance summary for a specific book; staleTime 2 min |
| `['profile']` | React Query | Current user profile; staleTime 5 min |
| `['user-books', userId]` | React Query | A specific user's books (admin modal); enabled when userId is set |

**Rule:** Never store server data in Zustand. Zustand = auth state + UI preferences only.

---

## Styling Rules

- Always use `useTheme()` → `{ C, Font }` — never hardcode hex colors or font family strings
- `C` resolves to `LightColors` or `DarkColors` from `constants/colors.js`
- `Font` resolves to Inter variant constants from `constants/fonts.js`
- Per-screen styles via `StyleSheet.create()` inside a local `makeStyles(C, Font)` function called with current theme values
- `CARD_ACCENTS` from `constants/colors.js` — color each book card by `index % CARD_ACCENTS.length`

---

## React Query Conventions

| Query key | staleTime | refetchInterval | Data |
|---|---|---|---|
| `['books']` | 2 min | — | Books list |
| `['admin-users']` | 0 | 10 s | All non-admin users |
| `['entries', bookId]` | 2 min | — | Book entries |
| `['summary', bookId]` | 2 min | — | Book balance summary |
| `['profile']` | 5 min | — | User profile |
| `['user-books', userId]` | 0 | — | Specific user's books (admin modal) |

Mutations use `qc.setQueryData(...)` for optimistic updates + `qc.invalidateQueries(...)` on success to sync with DB.

---

## When to Update This File

- New screen added or an existing screen's route changes
- New hook added or its query key / stale time changes
- New API function added to `api.js`
- New Zustand store or store field added
- Component moved, renamed, or has a new significant behaviour
