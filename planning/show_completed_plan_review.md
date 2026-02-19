# Plan Review: Show Completed Tasks Toggle (v0.0.9.9)

**Reviewer:** Staff Engineer (automated review)
**Date:** 2026-02-18
**Plan:** `planning/show_completed_plan_spec.md`

---

## Summary

The plan adds a global "Show completed tasks" toggle to Settings, persisted via AsyncStorage. Default is off (hide completed). The plan modifies storage, reducer, hook, main screen, and settings modal across 7 steps. It is well-scoped, follows existing patterns correctly, and the code structure assumptions match the actual codebase.

---

## Code Verification

Each referenced file was read and checked against the plan's assumptions.

| File                     | Plan Assumption                                                            | Actual Code                                         | Match? |
| ------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------- | ------ |
| `lib/storage.ts`         | `STORAGE_KEYS` object exists with `ACTIVE_LIST`, etc.                      | Lines 10-18: confirmed, `as const` object           | Yes    |
| `store/AppContext.tsx`   | `AppState` interface, `HYDRATE` action with payload                        | Lines 16-23 (state), lines 42-48 (HYDRATE payload)  | Yes    |
| `hooks/useAppData.ts`    | `tasksByCategory` memo filters by `activeListId` + `parentTaskId === null` | Lines 94-119: confirmed                             | Yes    |
| `hooks/useAppData.ts`    | `subtasksByParent` memo filters by `parentTaskId !== null`                 | Lines 124-143: confirmed                            | Yes    |
| `hooks/useAppData.ts`    | Hydration calls `loadAppData()` then dispatches `HYDRATE`                  | Lines 21-65: confirmed                              | Yes    |
| `hooks/useAppData.ts`    | Persistence pattern: `useEffect` guarded by `isLoading`                    | Lines 70-82: confirmed for lists/tasks/activeListId | Yes    |
| `app/(tabs)/index.tsx`   | `listTaskData` useMemo groups tasks for web split-view                     | Lines 504-554: confirmed, iterates all `tasks`      | Yes    |
| `app/modal.tsx`          | Appearance section exists, About section follows                           | Lines 24-78: confirmed, Appearance then About       | Yes    |
| `app/(tabs)/_layout.tsx` | Version in title string                                                    | Line 47: `"Tasks - 0.0.9.8"`                        | Yes    |

All assumptions verified. No discrepancies.

---

## Step-by-Step Review

### Step 1: Storage layer

**Verdict:** Clean. Follows the existing `getActiveListId`/`setActiveListId` pattern exactly. Defaulting to `false` when `value` is `null` is correct behavior.

### Step 2: State + reducer

**Verdict:** Clean. One minor note: the plan says "Update HYDRATE action to accept and set showCompleted" but does not show the updated HYDRATE payload type. The current HYDRATE payload is `{ lists, tasks, activeListId, selectedListIds }` (line 42-48 of AppContext.tsx). Adding `showCompleted` here is straightforward but the plan should be explicit that the HYDRATE payload type union needs updating. Not a blocker -- the implementer will see it.

### Step 3: Hydration + persistence

**Verdict:** Clean. The plan correctly modifies `hydrate()` to load `showCompleted` from storage, and adds a separate `useEffect` for persistence matching the existing `activeListId` pattern. The `isLoading` guard prevents persisting during initial load.

One note: the plan loads `showCompleted` via `storage.getShowCompleted()` which is independent of `loadAppData()`. This is fine. An alternative would be to extend `loadAppData()` return type, but the plan's approach of keeping it separate is actually cleaner since `showCompleted` is a UI preference, not core data.

### Step 4: Task filtering in useAppData

**Verdict:** Correct logic. The filter `(state.showCompleted || !t.completed)` reads well: "include if we're showing completed, OR if the task isn't completed."

### Step 5: Task filtering in web split-view

**Verdict:** Correct. The `listTaskData` useMemo in `index.tsx` (line 504) processes raw `tasks` independently from `useAppData`'s memos, so it needs its own filter. The plan correctly identifies this.

### Step 6: Settings UI

**Verdict:** Clean. Placement between Appearance and About is sensible. Uses `Switch` from react-native which is already imported in `index.tsx` (line 11) but NOT in `modal.tsx` currently -- the plan correctly notes the need to add the import.

### Step 7: Version bump

**Verdict:** Routine. No issues.

---

## Cross-Cutting Concerns

### Task Detail Screen (`app/task/[id].tsx`) -- CRITICAL

The plan does not address `app/task/[id].tsx`. This screen:

1. **Finds tasks from `tasks` array directly** (line 37): `const task = tasks.find((t) => t.id === id)`. If `showCompleted` is off and a user somehow navigates to a completed task (e.g., via deep link, browser back button, or URL manipulation), the task is still found because `tasks` is the raw unfiltered array from state. This is actually fine -- you can still view a completed task's detail page.

2. **Shows subtasks from `subtasksByParent`** (line 39): `const subtasks = id ? (subtasksByParent.get(id) ?? []) : []`. With the plan's Step 4 filtering, completed subtasks would be hidden in this detail view when `showCompleted` is off. This is **correct and desirable** behavior.

3. **Shows `siblingTasks`** for position/reorder (line 67-85): This computes from the raw `tasks` array, NOT from `tasksByCategory`. So position controls would still show completed siblings even when toggle is off. This creates a **minor inconsistency** but is not a bug -- reordering should work against all tasks regardless of visibility. Arguably correct.

4. **Shows `potentialParents`** for nesting (line 98-109): Also from raw `tasks`. Completed tasks would still appear as nesting targets. This could be confusing if `showCompleted` is off, but is a cosmetic issue, not a functional one.

**Assessment:** Not a blocker. The task detail screen does not need changes for v1. The main list views (where users spend 95% of their time) are correctly filtered by the plan.

### "All Caught Up" Detection

The plan states: "When hidden, completed tasks are excluded from all views, counts, and 'all caught up' detection -- they behave as though they don't exist."

This is automatically handled by the filtering in Steps 4 and 5. When `showCompleted` is off:

- `tasksByCategory` only contains incomplete tasks
- `isAllCaughtUp` (line 572 of index.tsx) checks `allTopLevelTasks.every((t) => t.completed)` -- but with filtering, there are NO completed tasks in the map, so `every()` on an empty array returns `true`... wait.

Actually, let me trace this more carefully. If `showCompleted` is off and ALL tasks are completed:

- `tasksByCategory` would be empty (no tasks pass the filter)
- `hasAnyTasks` = `tasksByCategory.size > 0` = `false`
- `allTopLevelTasks` = `[]` (empty)
- `isAllCaughtUp` = `[].length > 0 && [].every(...)` = `false` (short-circuits on length check)

So the "All caught up" banner would NOT show. Instead, the user sees "No tasks yet" empty state. This matches the plan's verification section: "Toggle off when all tasks are completed -> shows 'No tasks yet' empty state." Good -- this is intentional and correctly handled.

### Category Header Task Counts

`CategoryHeader` receives `taskCount={tasks.length}` (CategorySection.tsx line 76). Since `tasks` is the already-filtered array passed from `index.tsx`, the count will automatically reflect only visible (incomplete) tasks. No changes needed.

### Drag-and-Drop

When `showCompleted` is off, completed tasks are not rendered, so they cannot be dragged. The `handleDragEnd` callback (index.tsx line 322) operates on the raw `tasks` array for sort order calculation, which is correct -- you want sort order computation against all tasks, not just visible ones. No issues here.

### Platform Compatibility

`Switch` from react-native works on iOS, Android, and web. No platform-specific concerns.

### Performance

Adding `state.showCompleted` to `tasksByCategory` and `subtasksByParent` dependency arrays means these memos recompute on toggle. This is the correct behavior (you want the filter to re-run). The data set is small (personal todo app), so no performance concern.

---

## Missing Items

### 1. Subtask filtering in web split-view `listTaskData` (Step 5) -- CONCERN

The plan's Step 5 says to filter in the `listTasks.forEach` loop. But looking at the actual code (index.tsx lines 520-551), the loop processes BOTH top-level tasks and subtasks. The plan only shows filtering top-level tasks:

```ts
const filteredTasks = listTasks.filter(
  (task) => showCompleted || !task.completed,
);
```

This filter needs to be applied BEFORE the `forEach` that splits into `tasksByCategoryMap` and `subtasksByParentMap`. The plan's placement is correct (filter `listTasks` before grouping), but it should be explicit that this filters BOTH parent and subtask completed tasks in one shot. As written, it does -- just worth noting for the implementer that a single filter point handles both.

### 2. `loadAppData()` does NOT load `showCompleted` -- Fine but worth noting

The plan has `hydrate()` in `useAppData.ts` load `showCompleted` separately from `loadAppData()`. This means `loadAppData()` in `lib/storage.ts` does not return `showCompleted`. This is fine for now but if other consumers of `loadAppData()` ever need this value, it would need to be added there. Not a concern for a single-user app.

### 3. No mention of `clearAll()` in storage.ts

`storage.clearAll()` (line 82-88) removes `LISTS`, `TASKS`, and `ACTIVE_LIST` but would NOT clear `SHOW_COMPLETED`. This is actually correct behavior -- the toggle is a user preference, not app data, so it should survive a data reset. But worth being intentional about it.

---

## Risks & Mitigations

| Risk                                                              | Likelihood | Impact | Mitigation                                                                                                                                                                     |
| ----------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Existing users see all completed tasks vanish on upgrade          | Medium     | Low    | Default is `false` (hide completed). Existing users who had completed tasks visible will notice them gone. The Settings toggle is discoverable. Acceptable for a personal app. |
| Toggle state lost if AsyncStorage is cleared                      | Low        | Low    | User just toggles again. No data loss.                                                                                                                                         |
| Future features (search, bulk operations) need to be filter-aware | Medium     | Low    | Cross that bridge when we get there. The filter is in a single location per view.                                                                                              |

---

## Verdict: APPROVED

The plan is clean, well-structured, and correctly accounts for the dual rendering paths (mobile via `useAppData` memos, web split-view via `listTaskData` useMemo). All code assumptions match the actual codebase. The architectural decision to put `showCompleted` in AppContext rather than a separate context is the right call.

No critical issues. No blocking concerns. Ship it.
