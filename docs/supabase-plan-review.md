# Phase 10: Supabase Plan Review

**Reviewer:** Staff Engineer (automated)
**Date:** 2026-02-19
**Plan:** `docs/supabase-plan.md`

---

## Critical Issues (must fix before implementing)

### C1: ID format mismatch between existing data and Postgres UUID columns

**Severity: Critical**

The DB schema declares all `id` columns as `uuid`. The plan says "keep `generateId()`" and notes it is "Postgres UUID compatible." Looking at the actual code in `lib/utils.ts`, `generateId()` has a fallback that produces IDs like `1708300000000-abc1234` (timestamp-dash-random). These are not valid UUIDs and will fail Postgres UUID column constraints on insert.

Even the `crypto.randomUUID()` path produces valid v4 UUIDs, but any data already created via the fallback path (older browsers, React Native environments where `crypto.randomUUID` was unavailable) will be unmigratable without ID transformation.

**Recommendation:** Before migration, you need to either:

1. Change the DB columns from `uuid` to `text` (simpler, no migration hassle), or
2. Add an ID remapping step in `migrateLocalToSupabase` that converts non-UUID IDs to proper UUIDs and updates all FK references (listId, categoryId, parentTaskId) -- complex and error-prone.

Option 1 is strongly recommended. `text` primary keys work fine for a single-user app. The performance difference is negligible at this scale.

---

### C2: Categories currently lack `listId` in the in-memory model

**Severity: Critical**

The `Category` interface in `types/todo.ts` has no `listId` field. Categories are embedded inside `TodoList.categories[]`, so the parent list is implicit. The plan says categories get extracted to a separate Supabase table with `list_id` as a required FK column.

The plan mentions `transformToRows(userId, lists)` will extract categories, which makes sense. But `computeDiff` is the problem. The diff engine needs to compare previous and current categories, and since in-memory categories are embedded in lists, the diff must:

1. Flatten categories from all lists (adding `listId`)
2. Compare flattened previous vs. current
3. Detect moved, added, deleted categories

This is doable but is significantly more complex than diffing flat arrays. The plan does not acknowledge this complexity at all -- it just says "computeDiff(prevState, currState) -> { upserted[], deleted[] } per table." The category diff is the hardest part of the entire sync engine and it gets zero detail.

**Recommendation:** Spell out how category diffing works. Consider whether `computeDiff` should operate on the already-flattened row format rather than the in-memory format.

---

### C3: Echo prevention has a race condition

**Severity: Critical**

The echo prevention flow is:

1. Local write -> debounce 500ms -> `pushDiff()` to Supabase
2. Supabase sends Realtime event back
3. `scheduleRefetch()` -> fetches fresh data -> sets `isRemoteSyncRef = true` -> dispatches HYDRATE
4. Persistence useEffect sees `isRemoteSyncRef === true` -> resets flag -> skips Supabase push

The problem: Step 4 relies on a single boolean ref. If a real remote change arrives between steps 1 and 4, that change's HYDRATE will also set `isRemoteSyncRef = true`, but then the local echo from step 2 will also try to set it. With only one boolean, you cannot distinguish "this HYDRATE was from my own echo" vs. "this HYDRATE was a genuine remote change that happened to arrive during the debounce window."

More concretely: if you make a local edit and another device makes a different edit within the same 500ms+300ms window, the second device's change could get swallowed because `isRemoteSyncRef` is already true and gets consumed by the echo.

For a single-user app this is unlikely but not impossible (two browser tabs). And the plan explicitly says real-time cross-device sync is a goal.

**Recommendation:** Use a version counter or timestamp instead of a boolean. Track the last push timestamp and ignore realtime events that arrive within a short window after a push. Or simpler: after each push, record which record IDs were just pushed, and skip refetch if all changed IDs match the pushed set.

---

## Concerns (worth discussing)

### W1: Full refetch on every realtime event is wasteful and will cause UI flicker

**Severity: Warning**

The plan says "On any remote change: debounced (300ms) full refetch -> dispatch HYDRATE." This means every single change from another device causes a complete re-fetch of all 4 tables and a full HYDRATE dispatch, which replaces the entire state tree.

For a single-user app, the data volume is small so latency is fine. But dispatching HYDRATE replaces `state.lists` and `state.tasks` with new array references even if nothing changed in most of the data. This will trigger re-renders across every component that reads from those arrays.

On the main screen, this means: every `CategorySection`, every `TaskItem`, every `DraggableTask` wrapper will re-render. If the user is mid-drag when a realtime event fires, the re-render could blow away the drag state (layout registry positions, animated values).

**Recommendation:** At minimum, add a deep equality check before dispatching HYDRATE -- only dispatch if the fetched data actually differs from current state. Better: debounce the refetch to a longer window (1-2s) to batch multiple rapid remote changes.

### W2: No `updated_at` column makes future conflict resolution impossible

**Severity: Warning**

The schema has `created_at` but no `updated_at` on any table. The plan says "last write wins" which technically works, but without timestamps on writes you have zero ability to:

- Debug sync issues ("when was this record last modified?")
- Implement smarter merge strategies later
- Detect stale writes

Adding `updated_at` now costs nothing. Removing the need for it later would require a migration.

**Recommendation:** Add `updated_at timestamptz not null default now()` to lists, categories, and tasks tables. Add a Postgres trigger to auto-update it on row changes. This is a 10-line addition to the schema SQL.

### W3: Sign-out clears AsyncStorage but the plan does not address multi-account scenarios

**Severity: Warning**

The plan says "On sign-out, clear AsyncStorage app data (keep theme)." But what happens if:

1. User A signs in, creates data, signs out
2. User B signs in on the same device

User B gets an empty AsyncStorage (good) and fetches from Supabase (good). But when User B signs out and User A signs back in, Phase 1 hydration loads empty AsyncStorage, Phase 2 fetches from Supabase. This works correctly.

However, the plan does not address what happens if sign-out fails (network error during `supabase.auth.signOut()`). If the session is cleared locally but the AsyncStorage wipe was already done, User A's local cache is gone. If Supabase is unreachable at next sign-in, they see nothing.

**Recommendation:** Only clear AsyncStorage app data AFTER confirming sign-out succeeded. Or better: namespace AsyncStorage keys by user ID so each user's cache is independent.

### W4: The plan claims "No new native build required -- deployable via EAS Update" but auth session storage needs validation

**Severity: Warning**

The plan uses AsyncStorage as the Supabase auth token store. This should work with `@supabase/supabase-js` since `@react-native-async-storage/async-storage` is already a native dependency in the app. However, `react-native-url-polyfill` is listed as a new dependency. While it is "pure JS," Expo's metro bundler configuration and module resolution for polyfills can sometimes behave differently between `expo start` (dev) and `eas update` (production JS bundle). This is not a guaranteed problem but deserves explicit testing before claiming OTA-safe.

**Recommendation:** Explicitly test the OTA update path: current production build + EAS Update with Supabase deps. Include this as a verification step in Step 7.

### W5: `computeDiff` complexity is underspecified

**Severity: Warning**

The plan describes `computeDiff(prevState, currState) -> { upserted[], deleted[] } per table` in one line. This is the core of the sync engine and it has significant edge cases:

- What constitutes "changed"? Deep equality on every field? Shallow key comparison?
- Category IDs are generated client-side in the reducer (`ADD_CATEGORY` case in `AppContext.tsx`). The diff engine needs to detect new categories that exist in current but not in prev.
- Reordering tasks changes `sortOrder` on multiple records. A single drag could touch 10+ tasks' sortOrders. The diff needs to batch these as upserts, not individual writes.
- Deleting a list cascades in the reducer (removes list + tasks). The diff engine only needs to send the list deletion to Supabase (FK cascades handle the rest). But it needs to know NOT to also send individual task deletions. If it does, you get unnecessary DELETE queries that might 404 (tasks already cascade-deleted).

**Recommendation:** Write out the diff algorithm pseudocode before implementing. Especially clarify how cascade deletes interact with the diff engine.

### W6: Supabase Realtime filter syntax may not work as expected

**Severity: Warning**

The plan shows:

```typescript
filter: `user_id=eq.${userId}`;
```

Supabase Realtime's `postgres_changes` filter only supports `eq` filtering on a single column, and only for columns that are NOT the primary key, and the table must have replica identity set to `full` for UPDATE/DELETE events to include the `user_id` in the old record. By default, tables use `default` replica identity which only includes the primary key in old records.

If replica identity is not set to `full`, UPDATE and DELETE events will not match the `user_id` filter and will be silently dropped by the Realtime server.

**Recommendation:** Add `ALTER TABLE public.lists REPLICA IDENTITY FULL;` (and same for categories, tasks) to the schema SQL. Or remove the filter and filter client-side (since RLS already ensures you only see your own data).

---

## Questions (things the plan does not address)

### Q1: What happens to the default "General" list on first sign-up?

Currently, `loadAppData()` creates a default "General" list with Now/Next/Later categories if no data exists. With the new two-phase hydration, the flow would be:

1. Phase 1: `loadAppData()` from AsyncStorage -- no data (fresh install) -- creates default "General" list locally
2. Phase 2: Fetch from Supabase -- empty (new account) -- detects "Supabase empty + local has data" -- uploads the default General list

This works, but it means every new user gets a "General" list uploaded to Supabase. Is that intentional? Or should first-sign-up create the default list directly in Supabase? What if the user signs up on web, gets the default list, then signs in on iOS -- will Phase 1 on iOS also create a local default list before Phase 2 overwrites it with the Supabase data? That creates a brief UI flash of a local default list being replaced.

### Q2: How does the app behave when the user is not authenticated but the auth system is loaded?

The plan says unauthenticated users get redirected to `(auth)/login`. But what about the period between "auth system loaded, no session" and "redirect completes"? Does the user briefly see the main screen with no data? The `SplashScreenManager` currently waits for `fontsLoaded && !state.isLoading`, but with auth added, it also needs to wait for the auth check to complete before hiding the splash screen.

The plan mentions updating `SplashScreenManager` to "also wait for auth.isLoading" but does not spell out how this interacts with the data loading state. If auth is loading, data loading should not start at all.

### Q3: What is the Supabase auth token refresh strategy?

Supabase JWTs expire (default 1 hour). The `@supabase/supabase-js` client handles refresh automatically if the refresh token is valid. But if the app is backgrounded for a long time (common on mobile), the refresh token itself might expire. What does the app do then? Silent re-auth? Redirect to login?

### Q4: What happens to in-flight debounced writes when the app goes to background?

On iOS, when the app enters the background, JavaScript execution can be suspended. If a debounced write has not yet fired (within the 500ms window), it never executes. The data exists in AsyncStorage (immediate write succeeded) but never reaches Supabase. The plan's "On next app launch -> two-phase hydration resyncs everything" only works if "resync" means "upload local changes that Supabase does not have." But the current design pushes Supabase data DOWN to local, not UP. The migration path only runs on first-time sign-in.

This means data created while offline or during a background suspension could be lost on the next launch because the Supabase HYDRATE overwrites the local cache.

### Q5: Is email/password auth the right choice for a single-user personal app?

The plan implements full email/password auth with sign-up flow. But this is a personal app for one user. Alternatives:

- Magic link auth (no password to remember)
- OAuth (Sign in with Apple -- required for App Store if you offer any auth)
- A simpler invite-only flow

If this app ever hits the App Store with email/password sign-in, Apple will require "Sign in with Apple" as an option per App Store Review Guidelines 4.8. This could block the App Store submission that is listed as a project goal.

### Q6: How are environment variables provided to EAS Build?

The plan puts Supabase URL and anon key in `.env.local` (gitignored). `EXPO_PUBLIC_*` env vars are embedded at build time by Expo. For local development this is fine. But for EAS Build (cloud) and Vercel deployments, these env vars need to be configured separately:

- EAS Build: via `eas secret:create` or `eas.json` `env` field
- Vercel: via Vercel dashboard environment variables

The plan does not mention this. Missing env vars in production builds would produce a broken app that silently fails to connect to Supabase.

---

## Suggestions (nice to have)

### S1: The diff engine could be dramatically simpler

Instead of computing diffs between previous and current state, consider: after each reducer action, tag which records were affected. The reducer already knows which task IDs changed in each action case. Pass that metadata alongside the dispatch, and the sync layer only needs to upsert/delete those specific records.

This avoids the entire deep-comparison diff engine and its associated edge cases.

### S2: Consider Supabase database types generation

Supabase CLI can generate TypeScript types from your schema (`supabase gen types typescript`). This would auto-generate `ListRow`, `CategoryRow`, etc. rather than maintaining them manually. Reduces drift between schema and code.

### S3: The plan should specify error UI

The plan says "Supabase write fails -> log warning, skip." But what does the user see? No toast, no indicator, no retry button. For a personal app this might be fine, but at least a subtle "sync failed" indicator would help debug issues during development.

---

## Praise

### P1: Clean separation of concerns

The plan correctly identifies that the reducer and components should not change. Keeping the sync boundary at the storage layer is the right call. The existing `useAppData` hook is the right place to add sync logic.

### P2: Two-phase hydration is well-designed

Loading from AsyncStorage first for instant UI, then backfilling from Supabase, is the correct pattern for a local-first app. This avoids the dreaded "loading spinner on every app launch" problem.

### P3: Category extraction is the right call

Moving categories from embedded arrays to a separate table is the correct relational design. The plan correctly identifies that the in-memory format stays the same (transformation at the boundary).

### P4: FK cascade behavior table is excellent

Explicitly mapping FK cascades to reducer behavior and confirming they match is exactly the kind of detail that prevents subtle bugs. Well done.

### P5: Dependency analysis and OTA compatibility

Checking whether new deps require a native rebuild and confirming OTA safety shows good operational awareness.

---

## Verdict: NEEDS REVISION

The plan is architecturally sound in its overall approach, but has three critical issues that would cause implementation failures:

1. **C1 (ID format):** Non-UUID IDs in existing data will crash against `uuid` column constraints. This is a showstopper for migration.
2. **C2 (Category diff complexity):** The hardest part of the sync engine is hand-waved. This will cause implementation delays and bugs.
3. **C3 (Echo prevention race):** The boolean flag approach will cause data loss in multi-device scenarios, which is the primary feature being added.

Additionally, **W6 (Replica Identity)** will cause Realtime subscriptions to silently not work for UPDATE/DELETE events, which would be extremely confusing to debug.

**Recommended actions before implementation:**

1. Change `uuid` columns to `text` (or add ID remapping to migration)
2. Write pseudocode for `computeDiff`, especially category handling and cascade-delete awareness
3. Replace boolean echo flag with a timestamp or ID-set approach
4. Add `REPLICA IDENTITY FULL` to schema SQL
5. Add `updated_at` columns (cheap now, expensive later)
6. Address Q5 (Sign in with Apple requirement) if App Store submission is still a goal
