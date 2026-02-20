# Phase 10: Supabase Integration Plan

> **Revision 2** — Updated to address staff review findings (see `supabase-plan-review.md`)

## Context

The todo app currently persists all data to AsyncStorage (local-only). Data lives on a single device with no cross-device sync. Adding Supabase replaces the persistence layer to enable cloud storage and real-time sync across web and iOS, while keeping the reducer, components, and theme system completely unchanged.

**User decisions:**

- Login + Signup screen (both options on one screen)
- `showCompleted` syncs across devices via Supabase
- Simple offline strategy with dirty flag for unsyncced changes
- Supabase region: US Central (Chicago)
- Email/password auth for now; Sign in with Apple added later for App Store prep

## Architecture

```
React Context + useReducer (unchanged)
        |
  useAppData() hook (modified: two-phase hydration, debounced sync)
        |
+---------------+--------------------------+
|  AsyncStorage  |    Supabase Client       |
|  (local cache  |  (source of truth +      |
|  + device prefs)|  real-time)             |
+---------------+--------------------------+
```

**Key principle:** The reducer and all component code stay identical. We only change what happens at the storage boundary.

Categories get extracted from embedded arrays in `TodoList` into a separate `categories` table. The in-memory `TodoList.categories[]` format stays identical -- transformation happens at the storage boundary only.

## What Stays Local (AsyncStorage only)

| Key                   | Why                               |
| --------------------- | --------------------------------- |
| `app:themePreference` | Per-device UI preference          |
| `app:activeListId`    | Per-device navigation state       |
| `selectedListIds`     | Not persisted (derived in memory) |

## What Moves to Supabase

| Data          | Current Storage                    | Supabase Table                  |
| ------------- | ---------------------------------- | ------------------------------- |
| TodoList[]    | `app:lists` (JSON blob)            | `lists` table                   |
| Category[]    | Embedded in TodoList               | `categories` table (new!)       |
| Task[]        | `app:tasks` (JSON blob)            | `tasks` table                   |
| showCompleted | `app:showCompleted` (AsyncStorage) | `user_preferences` table (new!) |

---

## Database Schema (4 tables)

Run this SQL in Supabase SQL Editor:

```sql
-- Lists
-- NOTE: id is `text` not `uuid` because existing client-side IDs use
-- a timestamp-based fallback format that is not valid UUID.
create table public.lists (
  id           text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  sort_order   integer not null default 0,
  show_on_open boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Categories (extracted from embedded TodoList.categories[])
create table public.categories (
  id           text primary key,
  list_id      text not null references public.lists(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  sort_order   integer not null default 0,
  color        text,
  updated_at   timestamptz not null default now()
);

-- Tasks
create table public.tasks (
  id              text primary key,
  list_id         text not null references public.lists(id) on delete cascade,
  category_id     text references public.categories(id) on delete set null,
  parent_task_id  text references public.tasks(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  completed       boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,
  updated_at      timestamptz not null default now()
);

-- User Preferences (synced across devices)
create table public.user_preferences (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  show_completed boolean not null default false
);

-- Auto-update updated_at on row changes
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger lists_updated_at before update on public.lists
  for each row execute function public.update_updated_at();
create trigger categories_updated_at before update on public.categories
  for each row execute function public.update_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.update_updated_at();

-- RLS
alter table public.lists enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.user_preferences enable row level security;

create policy "Users manage own lists" on public.lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own preferences" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Indexes
create index idx_lists_user on public.lists(user_id);
create index idx_categories_list on public.categories(list_id);
create index idx_categories_user on public.categories(user_id);
create index idx_tasks_list on public.tasks(list_id);
create index idx_tasks_category on public.tasks(category_id);
create index idx_tasks_parent on public.tasks(parent_task_id);
create index idx_tasks_user on public.tasks(user_id);

-- Replica identity (required for Realtime UPDATE/DELETE filter matching)
alter table public.lists replica identity full;
alter table public.categories replica identity full;
alter table public.tasks replica identity full;

-- Realtime (on data tables only, not preferences)
alter publication supabase_realtime add table public.lists;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.tasks;
```

### FK Cascade Behavior

| Action             | FK Behavior                             | Matches Reducer?      |
| ------------------ | --------------------------------------- | --------------------- |
| Delete list        | Cascade deletes categories + tasks      | Yes (DELETE_LIST)     |
| Delete category    | Tasks become uncategorized (`set null`) | Yes (DELETE_CATEGORY) |
| Delete parent task | Cascade deletes subtasks                | Yes (DELETE_TASK)     |

### Design Decisions

| Decision                | Choice                                     | Why                                                                            |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| ID column type          | `text` (not `uuid`)                        | Existing `generateId()` fallback produces non-UUID IDs; `text` avoids breakage |
| Category storage        | Separate table (not embedded)              | Relational DB; FK constraints, RLS, subscriptions                              |
| ID generation           | Client-side (keep `generateId()`)          | Already works; avoids round-trip for ID                                        |
| Timestamps              | `timestamptz` in DB, ISO string in app     | Supabase returns ISO by default; no conversion                                 |
| `updated_at` columns    | On lists, categories, tasks + auto-trigger | Enables future conflict resolution; costs nothing now                          |
| `user_id` on categories | Yes (denormalized)                         | Simpler RLS; avoids joins for permission checks                                |
| `showCompleted` storage | `user_preferences` table                   | Syncs across devices per user request                                          |
| Replica identity        | `FULL` on all data tables                  | Required for Realtime filter matching on UPDATE/DELETE events                  |

---

## Auth Strategy

**Method:** Supabase email/password auth

**Future:** Sign in with Apple will be added before App Store submission (requires native build, not OTA). For now, email/password is sufficient for personal use via TestFlight.

### Auth Context (`store/AuthContext.tsx`)

```typescript
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean; // true until initial session check completes
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

On mount: `supabase.auth.getSession()` + subscribe to `onAuthStateChange()`.

### Session Lifecycle

- **Token refresh:** Handled automatically by `@supabase/supabase-js`. Refresh tokens have a longer lifetime than access tokens.
- **Expired refresh token** (app backgrounded for extended period): `onAuthStateChange` fires with `SIGNED_OUT` event -> redirect to login screen. User re-enters credentials.
- **Sign-out:** Calls `supabase.auth.signOut()`. On success, clear AsyncStorage app data keys (lists, tasks, showCompleted, activeListId, hasPendingSync). Keep theme preference. On sign-out failure (network error), still clear the local session but preserve AsyncStorage cache so data is recoverable on next sign-in.

### Route Protection (Expo Router pattern)

```
app/
  (auth)/           # Auth route group (no tabs)
    _layout.tsx     # Minimal Stack layout
    login.tsx       # Login + Signup screen (toggle between modes)
  (tabs)/           # Existing tab group
    ...
  _layout.tsx       # Root layout with redirect logic
```

`ThemedNavigator` checks auth state + current route segment:

- No session & not in `(auth)` group -> `router.replace("/(auth)/login")`
- Has session & in `(auth)` group -> `router.replace("/(tabs)")`

### Provider Tree (updated)

```
GestureHandlerRootView
  > ThemeProvider
    > AuthProvider        <-- NEW (wraps AppProvider so useAppData can access userId)
      > AppProvider
        > SplashScreenManager  (updated: waits for fonts + auth + data hydration)
        > ThemedNavigator      (updated: redirect logic)
```

### Splash Screen Gating

`SplashScreenManager` hides splash when ALL conditions are met:

1. `fontsLoaded` is true
2. `authLoading` is false (initial session check done)
3. `state.isLoading` is false (data hydrated)

If auth resolves to "no session," data hydration is skipped (empty state) and the user sees the login screen. No flash of the main screen.

---

## Sync Strategy

### Reads: Two-Phase Hydration

```
App launches + user authenticated
  -> Phase 1: loadAppData() from AsyncStorage (instant, app usable immediately)
  -> dispatch HYDRATE with cached data
  -> Phase 2: Check hasPendingSync flag
     -> If pending: push local data to Supabase first (reconcile unsyncced changes)
     -> Then: fetchAll() from Supabase (background)
       -> If Supabase empty + local has data: first-time migration (upload local data)
       -> If Supabase has data + differs from local: dispatch HYDRATE with fresh data
       -> If Supabase data equals local data: skip dispatch (no unnecessary re-render)
       -> If fetch fails: silently skip (cache is valid)
  -> Subscribe to real-time changes
```

The `hasPendingSync` flag (`app:hasPendingSync` in AsyncStorage) solves the background suspension problem: if the app is backgrounded during a debounced write, the flag ensures those changes get pushed on next launch before pulling cloud data.

### Writes: Debounced Diff-Based Sync

**Current pattern (3 useEffects):**

```
State change -> storage.setLists(entireArray) -> AsyncStorage
State change -> storage.setActiveListId(id) -> AsyncStorage
State change -> storage.setShowCompleted(bool) -> AsyncStorage
```

**New pattern (1 unified useEffect):**

```
State change ->
  1. AsyncStorage writes (immediate, same as today) + set hasPendingSync = true
  2. Debounced Supabase push (500ms):
     - computeDiff(prevSnapshot, currState) -> { lists, categories, tasks } diffs
     - pushDiff(userId, diff) -> parallel upsert/delete to Supabase
     - On success: set hasPendingSync = false, update prevSnapshot
     - On failure: log warning, hasPendingSync stays true (retry on next launch)
```

**Why 500ms debounce:** Batches rapid actions (drag-and-drop, quick toggles) into one Supabase write.

### computeDiff Algorithm

The diff operates on **flattened row format**, not in-memory format. This avoids the complexity of comparing embedded categories.

```
computeDiff(prevSnapshot, currentState):
  // 1. Convert current in-memory state to flat rows
  currListRows    = currentState.lists.map(toListRow)
  currCategoryRows = currentState.lists.flatMap(list =>
    list.categories.map(cat => toCategoryRow(cat, list.id))
  )
  currTaskRows    = currentState.tasks.map(toTaskRow)

  // 2. Build ID maps for prev and curr
  prevListMap = Map(prevSnapshot.listRows by id)
  currListMap = Map(currListRows by id)
  prevCatMap  = Map(prevSnapshot.categoryRows by id)
  currCatMap  = Map(currCategoryRows by id)
  prevTaskMap = Map(prevSnapshot.taskRows by id)
  currTaskMap = Map(currTaskRows by id)

  // 3. Diff each table independently
  for each table (lists, categories, tasks):
    upserted = rows in curr where:
      - id not in prev (new), OR
      - JSON.stringify(curr[id]) !== JSON.stringify(prev[id]) (changed)
    deleted = ids in prev but not in curr

  // 4. Cascade-delete awareness:
  //    If a list is in deleted, DO NOT also emit its categories/tasks as deleted.
  //    Postgres FK cascades handle that. Only emit the list deletion.
  deletedListIds = Set(lists.deleted)
  categories.deleted = categories.deleted.filter(id =>
    prevCatMap.get(id).list_id NOT in deletedListIds
  )
  tasks.deleted = tasks.deleted.filter(id =>
    prevTaskMap.get(id).list_id NOT in deletedListIds
  )

  // Similarly for deleted categories: don't emit task category_id nullifications
  // (Postgres ON DELETE SET NULL handles that)

  // 5. showCompleted diff
  if prevSnapshot.showCompleted !== currentState.showCompleted:
    include preference upsert

  return { lists, categories, tasks, showCompleted }
```

The `prevSnapshot` stores data in **row format** (already flattened), so the diff only needs to flatten the current state, not both sides. The snapshot is initialized after the first successful Supabase fetch and updated after each successful push.

### Real-time: Cross-Device Sync

```typescript
supabase
  .channel("db-changes")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "lists",
      filter: `user_id=eq.${userId}`,
    },
    handleChange,
  )
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "categories",
      filter: `user_id=eq.${userId}`,
    },
    handleChange,
  )
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "tasks",
      filter: `user_id=eq.${userId}`,
    },
    handleChange,
  )
  .subscribe();
```

On any remote change: debounced (1s) full refetch -> deep equality check -> dispatch HYDRATE only if data differs.

**Why 1s debounce (not 300ms):** Longer window batches bulk operations (e.g., reordering 5 tasks fires 5 events). Also reduces the chance of refetching mid-drag, which could blow away drag state.

**Why deep equality check before HYDRATE:** Dispatching HYDRATE replaces `state.lists` and `state.tasks` with new array references, which triggers re-renders across every component. If the fetched data matches current state (common for echoed writes), skip the dispatch entirely.

### Echo Prevention

Replace the simple boolean flag with a **timestamp-based approach** to handle concurrent local + remote changes:

```
lastPushTimestampRef = useRef(0)
ECHO_WINDOW_MS = 2000  // 2 second window

On push completion:
  lastPushTimestampRef.current = Date.now()

On realtime event -> scheduleRefetch:
  if (Date.now() - lastPushTimestampRef.current < ECHO_WINDOW_MS):
    skip refetch (likely our own echo)
  else:
    proceed with refetch
```

**Why timestamp over boolean:** A boolean can't distinguish "my echo" from "a genuine remote change that arrived during the debounce window." The timestamp approach ignores ALL realtime events within a short window after a push, which is safe because:

- For echoes: correctly ignored
- For genuine remote changes during the window: the next change outside the window will trigger a full refetch that catches up

**Worst case:** A genuine remote change is delayed by up to 2s. Acceptable for a single-user app.

### Conflict Resolution

**Last write wins.** Single user, so true conflicts are rare. The `updated_at` column provides an audit trail for debugging sync issues.

### Offline Handling (v1)

- AsyncStorage writes always succeed (local cache stays current)
- `hasPendingSync` flag set to `true` on every local write
- Supabase write succeeds -> `hasPendingSync = false`
- Supabase write fails -> log warning, `hasPendingSync` stays `true`
- On next app launch: Phase 2 checks `hasPendingSync` -> if true, push local state to Supabase before fetching cloud data
- This prevents cloud data from overwriting unsyncced local changes

---

## First-Time Migration (Local -> Supabase)

```
User signs in for first time
  -> Phase 2 hydration fetches from Supabase
  -> Supabase empty + AsyncStorage has data
  -> Upload all local data: lists, categories (extracted), tasks, showCompleted
  -> Set hasPendingSync = false
  -> Done (no re-fetch needed, local data IS the truth)
```

**Edge case - new device, existing account:** AsyncStorage empty (fresh install), Phase 1 creates default "General" list. Phase 2 fetches from Supabase, finds data, dispatches HYDRATE replacing the default list. Brief display of default list during fetch (~1-2s) -- acceptable, and the skeleton/splash screen covers most of this.

**Edge case - sign out then sign in:** On sign-out, clear AsyncStorage app data. On next sign-in, Phase 1 loads empty/defaults, Phase 2 populates from cloud.

---

## Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

The anon key is designed to be public (like a Firebase API key). RLS provides security.

**Production deployment:**

- **Vercel (web):** Set env vars in Vercel dashboard (Settings > Environment Variables)
- **EAS Build (iOS):** Set via `eas secret:create EXPO_PUBLIC_SUPABASE_URL ...` or in `eas.json` `env` field
- **EAS Update (OTA):** Inherits env vars from the EAS Build that the update targets. If the env vars were baked into the original build, OTA updates use those same values.

Missing env vars in production will cause silent Supabase connection failures. Step 7 includes explicit verification of this.

---

## Implementation Steps

### Step 1: Supabase Project Setup + Client

**Manual:**

1. Create Supabase project (US Central / Chicago)
2. Run SQL schema in Supabase SQL Editor
3. Note project URL + anon key

**Code:**

| File                | Action | Description                                                                  |
| ------------------- | ------ | ---------------------------------------------------------------------------- |
| `.env.local`        | Create | `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`                 |
| `.gitignore`        | Modify | Add `.env.local`                                                             |
| `lib/supabase.ts`   | Create | Client singleton with AsyncStorage auth adapter, `detectSessionInUrl: false` |
| `types/supabase.ts` | Create | `ListRow`, `CategoryRow`, `TaskRow`, `UserPreferencesRow`                    |
| `package.json`      | Modify | `npx expo install @supabase/supabase-js react-native-url-polyfill`           |

**Verify:** Import client, confirm connection.

### Step 2: Auth System

| File                     | Action | Description                                                                                 |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------- |
| `types/auth.ts`          | Create | `AuthContextValue` type                                                                     |
| `store/AuthContext.tsx`  | Create | AuthProvider with session state, signIn/signUp/signOut                                      |
| `app/(auth)/_layout.tsx` | Create | Minimal Stack layout for auth screens                                                       |
| `app/(auth)/login.tsx`   | Create | Login + Signup screen (tab toggle, email/password)                                          |
| `app/_layout.tsx`        | Modify | Add AuthProvider to tree, add `(auth)` to Stack, redirect logic, update SplashScreenManager |
| `app/modal.tsx`          | Modify | Add Sign Out button                                                                         |

**Verify:** Sign up, sign in, sign out all work. Existing functionality unchanged when authenticated.

### Step 3: Supabase Storage Layer

| File                      | Action | Description                                |
| ------------------------- | ------ | ------------------------------------------ |
| `lib/supabase-storage.ts` | Create | CRUD operations + transformation functions |

**Key functions:**

- `fetchAll(userId)` -> parallel fetch 4 tables -> embed categories into lists -> return `{ lists, tasks, showCompleted }`
- `upsertLists/Categories/Tasks/Preferences` + `deleteLists/Categories/Tasks`
- `transformToAppState(listRows, categoryRows, taskRows, prefs)` -> in-memory format
- `transformToRows(userId, lists)` -> `{ listRows, categoryRows }` (extract categories)

**Verify:** Manually insert a row in Supabase, call `fetchAll()`, confirm correct shape.

### Step 4: Sync Orchestrator + Migration

| File                  | Action | Description                                                                                     |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `lib/sync.ts`         | Create | `hydrateFromCache`, `hydrateFromSupabase`, `computeDiff`, `pushDiff`, `migrateLocalToSupabase`  |
| `hooks/useAppData.ts` | Modify | Two-phase hydration with hasPendingSync check, first-time migration detection, import `useAuth` |
| `lib/storage.ts`      | Modify | Add `getHasPendingSync` / `setHasPendingSync` functions                                         |

**Verify:** Sign in with local data -> check Supabase dashboard. Open on second browser -> same data.

### Step 5: Debounced Persistence

| File                  | Action | Description                                                      |
| --------------------- | ------ | ---------------------------------------------------------------- |
| `hooks/useAppData.ts` | Modify | Replace 3 persistence useEffects with 1 debounced unified effect |

**New refs:** `prevSnapshotRef` (row format), `lastPushTimestampRef`, `debounceTimerRef`

**Verify:** Add task -> appears in Supabase within ~1s. Rapid reorder -> single batched write. Background app mid-edit, reopen -> data persisted via hasPendingSync reconciliation.

### Step 6: Real-time Subscriptions

| File                       | Action | Description                                                             |
| -------------------------- | ------ | ----------------------------------------------------------------------- |
| `hooks/useRealtimeSync.ts` | Create | Subscribe to 3 tables, 1s debounced refetch, timestamp echo prevention  |
| `hooks/useAppData.ts`      | Modify | Call `useRealtimeSync()`, wire up `lastPushTimestampRef`, deep eq check |

**Verify:** Two devices open. Add task on one -> appears on other within ~2s. No infinite loops. Mid-drag change from other device does not interrupt drag (1s debounce).

### Step 7: Cleanup + Deploy

- Sign-out: clear AsyncStorage app data (keep theme) only after sign-out succeeds
- Update version numbers
- Update `CLAUDE.md` with Phase 10 docs
- **Verify env vars in production:**
  - Vercel: check `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in dashboard
  - EAS: verify via `eas secret:list`
- **Verify OTA compatibility:** Build with current native deps, push EAS Update with Supabase code, confirm `react-native-url-polyfill` resolves correctly in production bundle
- Deploy: push to main (Vercel), `eas update` (iOS OTA)

**End-to-end test:** Sign up -> add data -> sign out -> sign in on different device -> data present. Background app mid-edit -> reopen -> changes preserved and syncced.

---

## File Summary

### New Files (10)

| File                       | Purpose                              |
| -------------------------- | ------------------------------------ |
| `lib/supabase.ts`          | Client singleton                     |
| `lib/supabase-storage.ts`  | CRUD + transformations               |
| `lib/sync.ts`              | Hydration, diff engine, migration    |
| `store/AuthContext.tsx`    | Auth state management                |
| `hooks/useRealtimeSync.ts` | Real-time subscriptions              |
| `app/(auth)/_layout.tsx`   | Auth route layout                    |
| `app/(auth)/login.tsx`     | Login + signup screen                |
| `types/auth.ts`            | Auth types                           |
| `types/supabase.ts`        | DB row types                         |
| `.env.local`               | Supabase URL + anon key (gitignored) |

### Modified Files (6)

| File                  | Change                                                         |
| --------------------- | -------------------------------------------------------------- |
| `hooks/useAppData.ts` | Two-phase hydration, debounced persistence, real-time, useAuth |
| `app/_layout.tsx`     | AuthProvider in tree, auth redirect, splash gate update        |
| `app/modal.tsx`       | Sign out button                                                |
| `lib/storage.ts`      | Add hasPendingSync get/set functions                           |
| `.gitignore`          | Add `.env.local`                                               |
| `package.json`        | New deps                                                       |

### Unchanged

- `store/AppContext.tsx` (reducer stays as-is)
- All component files
- `types/todo.ts` (in-memory types unchanged)
- Theme system (`ThemeContext`, `useTheme`, `global.css`, `tailwind.config.js`)

## Dependencies

| Package                     | Native module? | OTA safe? |
| --------------------------- | -------------- | --------- |
| `@supabase/supabase-js`     | No (pure JS)   | Yes       |
| `react-native-url-polyfill` | No (pure JS)   | Yes       |

No new native build required -- deployable via EAS Update. Explicit OTA verification included in Step 7.

## Risks & Mitigations

| Risk                          | Mitigation                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Supabase free tier limits     | Single user, small data -- well within limits                                |
| OTA update breaks something   | Test in Expo Go first; EAS Update supports rollback; explicit OTA test step  |
| Realtime subscription drops   | Client auto-reconnects; full refetch on reconnect                            |
| Data loss during migration    | AsyncStorage preserved as fallback; migration is additive                    |
| Echo loops                    | Timestamp-based echo window (2s) + deep equality check before HYDRATE        |
| Background suspension         | `hasPendingSync` dirty flag ensures unsyncced changes are pushed on relaunch |
| Non-UUID existing IDs         | All ID columns use `text` type, not `uuid`                                   |
| Realtime filter on UPDATE/DEL | `REPLICA IDENTITY FULL` on all data tables                                   |
| Missing env vars in prod      | Explicit verification step for Vercel + EAS secrets                          |
| App Store auth requirements   | Email/password for now; Sign in with Apple added before App Store submission |

## Review Findings Addressed

| Finding                           | Severity | Resolution                                                          |
| --------------------------------- | -------- | ------------------------------------------------------------------- |
| C1: ID format mismatch            | Critical | Changed all ID/FK columns from `uuid` to `text`                     |
| C2: Category diff complexity      | Critical | `computeDiff` operates on flattened row format; pseudocode included |
| C3: Echo prevention race          | Critical | Replaced boolean flag with timestamp-based 2s echo window           |
| W1: Full refetch UI flicker       | Warning  | Deep equality check before HYDRATE; 1s debounce on refetch          |
| W2: No updated_at column          | Warning  | Added `updated_at` + auto-update trigger to all data tables         |
| W3: Sign-out data safety          | Warning  | Only clear AsyncStorage after sign-out succeeds                     |
| W4: OTA needs validation          | Warning  | Explicit OTA test step added to Step 7                              |
| W5: computeDiff underspecified    | Warning  | Full pseudocode with cascade-delete awareness                       |
| W6: Replica identity for Realtime | Warning  | Added `REPLICA IDENTITY FULL` to schema SQL                         |
| Q4: Background write loss         | Question | `hasPendingSync` dirty flag; push before pull on relaunch           |
| Q5: Sign in with Apple            | Question | Deferred to App Store prep phase (requires native build)            |
| Q6: Production env vars           | Question | Documented Vercel dashboard + EAS secrets setup                     |
