# Phase 9: Empty State Messaging

## Context

When users create new lists or categories, they see minimal "No tasks yet" text with no visual warmth or contextual guidance. Empty categories show a blank dashed box with no explanation. There's also no acknowledgment when a user completes all tasks. This phase adds friendly, context-aware empty state messaging to guide new users and celebrate completions — preparing for a future "hide completed tasks" setting where distinguishing "truly empty" from "all done" becomes critical.

## Plan

### Step 1: Create `components/EmptyState.tsx`

New reusable component with two display modes:

**Full mode** (default — for centered hero empty states):

- Emoji icon inside a rounded `bg-surface-secondary` circle (w-16 h-16)
- Title in `text-text` (semibold, text-lg)
- Subtitle in `text-text-secondary` (text-sm, max-w-xs)
- Centered layout with `flex-1 items-center justify-center py-12`
- Subtle `FadeInDown` entrance animation using `SPRING.gentle`, with the `hasRendered` ref pattern (skip animation on initial mount — same pattern as `CategorySection.tsx:48-50`)

**Compact mode** (`compact={true}` — for banners above existing content):

- No icon circle — just emoji inline with title text
- Smaller padding (`py-4 px-4`), centered text
- Used for "all caught up" banner and "no tasks yet" message when categories are rendering below

**Props interface:**

```typescript
interface EmptyStateProps {
  icon: string; // Emoji character
  title: string;
  message: string;
  animated?: boolean; // Default true
  compact?: boolean; // Default false
}
```

**Variants by context:**

| Scenario                            | Mode    | Icon   | Title              | Message                                  |
| ----------------------------------- | ------- | ------ | ------------------ | ---------------------------------------- |
| Empty list, no categories           | full    | `"📝"` | "No tasks yet"     | "Add your first task below"              |
| Empty list, has categories (common) | compact | `"📝"` | "No tasks yet"     | "Add your first task below"              |
| All tasks completed                 | compact | `"🎉"` | "All caught up!"   | "Great work — add more or take a break"  |
| No list selected (mobile)           | full    | `"👆"` | "No list selected" | "Create a list using the + button above" |
| No list selected (web)              | full    | `"👆"` | "No list selected" | "Click a tab to add it to this view"     |

### Step 2: Update empty category dashed boxes in `components/CategorySection.tsx`

Add small hint text **inside** the existing dashed box (preserving drag-drop target):

- **DraggableCategorySection** (line 135): Add `<Text>` inside the `<View>`
- **StaticCategorySection** (line 211): Same change
- Text: `"No tasks yet"` in `text-text-muted text-xs`, centered
- Increase box height from `h-8` to `h-10` to accommodate text comfortably
- Add `items-center justify-center` to the dashed box for centering
- Note: increasing the drag target area from 32px to 40px is harmless (bigger = easier to hit)

### Step 3: Update `app/(tabs)/index.tsx` — fix conditions, replace inline empty states, add "all caught up"

**Critical fix: empty state detection logic**

The current condition `categories.length === 0 && !hasAnyTasks` never triggers because new lists have default Now/Next/Later categories. The fix:

```typescript
// Mobile (near line 378):
const hasAnyTasks = tasksByCategory.size > 0;
const hasCategories = categories.length > 0;

// All top-level tasks for "all caught up" detection
const allTopLevelTasks = Array.from(tasksByCategory.values()).flat();
const isAllCaughtUp =
  allTopLevelTasks.length > 0 && allTopLevelTasks.every((t) => t.completed);
```

**Subtask assumption (explicit):** "All caught up" checks top-level tasks only. Subtasks are nested under their parent in the UI and are not independently visible at the list level. A completed parent with an incomplete subtask is treated as "caught up" at the list level — the subtask detail is visible when expanding the parent.

**Rendering logic (mobile, replacing lines 525-568):**

```
if activeList:
  if isAllCaughtUp:
    → compact EmptyState "All caught up!" at top of ScrollView
    → category sections still render below (showing completed tasks)
  if !hasAnyTasks && !hasCategories:
    → full centered EmptyState "No tasks yet"
  else if !hasAnyTasks && hasCategories:
    → compact EmptyState "No tasks yet" at top
    → category sections render below with dashed box hints (from Step 2)
  else:
    → normal category sections with tasks
else:
  → full centered EmptyState "No list selected"
```

**Same logic applies to web pane** (`renderListPane` function), using `listTasksByCategory` and `listCategories` per-pane.

**Replace all 4 inline empty state blocks:**

- **A. Web pane empty list** (lines 440-449) → EmptyState with condition fix
- **B. Web no list selected** (lines 507-514) → full EmptyState
- **C. Mobile empty list** (lines 558-568) → EmptyState with condition fix
- **D. Mobile no list selected** (lines 570-578) → full EmptyState

### Step 4: Version bump + CLAUDE.md documentation

- Update version from `0.0.8.0` to `0.0.9.0` in `CLAUDE.md`
- Add Phase 9 to the **Completed** section following the pattern of Phases 1-8
- Update **Current State** section

## Files Modified

| File                             | Change                                                             |
| -------------------------------- | ------------------------------------------------------------------ |
| `components/EmptyState.tsx`      | **NEW** — Reusable empty state component (full + compact modes)    |
| `components/CategorySection.tsx` | Add hint text inside empty category dashed boxes (both variants)   |
| `app/(tabs)/index.tsx`           | Fix detection conditions, replace 4 inline empty states, add logic |
| `CLAUDE.md`                      | Version bump to 0.0.9.0, add Phase 9 completed section             |

## Existing patterns to reuse

- `hasRendered` ref pattern from `components/CategorySection.tsx:48-50`
- `FadeInDown.springify().damping(15)` from `components/CategorySection.tsx:24`
- `SPRING.gentle` config from `lib/animations.ts:18`
- NativeWind semantic tokens from `app/global.css`

## Out of scope

- Task detail subtask empty state (`app/task/[id].tsx`) — separate concern, can address later
- Cross-platform emoji consistency — acceptable for a learning project; can upgrade to SVG icons later
- `useReducedMotion` accessibility hook — noted in `open-issues.md`, not part of this phase

## Verification

1. `npm run typecheck` — no TypeScript errors
2. `npx expo start --web` — test all scenarios on web:
   - Create a new list (has default categories, no tasks) → compact "No tasks yet" at top + dashed box hints in each category
   - Add tasks, complete all of them → "All caught up!" compact banner at top, completed tasks visible below
   - Delete all categories from a list, ensure no tasks → full centered "No tasks yet"
   - Web split-view: deselect all tabs → full centered "No list selected"
   - Web split-view: select empty list → same empty state as single list
3. Toggle dark mode in Settings → verify all empty states look correct in both themes
4. Verify drag-drop still works with the taller (h-10) dashed boxes
