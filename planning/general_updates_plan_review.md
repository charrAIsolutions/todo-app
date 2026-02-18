# Plan Review: General UI Updates (feat/general-updates)

**Reviewer:** Staff Engineer (automated review)
**Date:** 2026-02-18
**Plan:** `planning/general_updates_plan_spec.md`

---

## Summary

The plan covers 6 incremental UX improvements to the drag-and-drop system and task input. The changes are well-scoped, correctly ordered, and individually small. However, the plan has significant line-number inaccuracies across nearly every referenced file, one critical logic gap in Change 4, and a few missing edge cases worth addressing before implementation.

---

## Line Number Verification

The plan references specific line numbers in multiple files. I verified each against the actual code.

### `components/drag/DragProvider.tsx`

| Plan Reference | Plan Says                                   | Actual Code                                                                 | Status  |
| -------------- | ------------------------------------------- | --------------------------------------------------------------------------- | ------- |
| Lines 356-358  | Nest/unnest threshold constants             | Lines 356-358: `UNNEST_THRESHOLD_X = 60`, `NEST_THRESHOLD_X = 120`          | CORRECT |
| Lines 399-410  | Unnest check for subtask drag               | Lines 399-410: `if (isSubtaskDrag && relativeX < UNNEST_THRESHOLD_X)` block | CORRECT |
| Lines 412-429  | Nest check                                  | Lines 412-429: `if (relativeX > NEST_THRESHOLD_X && !isSubtaskDrag)` block  | CORRECT |
| Lines 431-488  | Subtask drag handling                       | Lines 431-488: `if (isSubtaskDrag)` block with subtask reorder              | CORRECT |
| Line 452       | `relativeX >= UNNEST_THRESHOLD_X` condition | Line 452: `relativeX >= UNNEST_THRESHOLD_X`                                 | CORRECT |
| Lines 479-487  | Fallback returning `"unnest"`               | Lines 479-487: returns `type: "unnest"`                                     | CORRECT |
| Lines 314-315  | `relativeX` variable                        | Lines 314-315: `const relativeX = ...`                                      | CORRECT |

### `app/(tabs)/index.tsx`

| Plan Reference | Plan Says                            | Actual Code                                                                    | Status  |
| -------------- | ------------------------------------ | ------------------------------------------------------------------------------ | ------- |
| Lines 356-361  | `case "nest":` block                 | Lines 356-361: `case "nest": { nestTask(...) }`                                | CORRECT |
| Lines 363-380  | `case "unnest":` block               | Lines 363-380: `case "unnest": { nestTask(task.id, null); ... moveTask(...) }` | CORRECT |
| Line 183       | `nestTask` in useAppData destructure | Line 183: `nestTask,`                                                          | CORRECT |
| Line 427       | useCallback deps with `nestTask`     | Line 427: `[tasks, moveTask, moveTaskToList, nestTask, updateTask]`            | CORRECT |

### `types/drag.ts`

| Plan Reference | Plan Says                               | Actual Code                                                                                               | Status      |
| -------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------- | --------- | ------- |
| Lines 39-40    | `"nest"` and `"unnest"` in DropZoneType | Lines 39-40: `                                                                                            | "nest"`and` | "unnest"` | CORRECT |
| Lines 165-169  | `DropIndicatorProps` interface          | Lines 165-169: `export interface DropIndicatorProps { y: number; visible: boolean; type: DropZoneType; }` | CORRECT     |

### `components/drag/index.ts`

| Plan Reference | Plan Says                                                               | Actual Code         | Status  |
| -------------- | ----------------------------------------------------------------------- | ------------------- | ------- |
| Line 8         | `export { DropIndicator, InlineDropIndicator } from "./DropIndicator";` | Line 8: exact match | CORRECT |

### `components/CategorySection.tsx`

| Plan Reference | Plan Says                                  | Actual Code                                                                             | Status  |
| -------------- | ------------------------------------------ | --------------------------------------------------------------------------------------- | ------- |
| Line 12        | `InlineDropIndicator` import               | Line 12: `import { DraggableTask, InlineDropIndicator, useDragContext } from "./drag";` | CORRECT |
| Lines 77-81    | `showDropBefore` computation               | Lines 77-81: `const showDropBefore = ...`                                               | CORRECT |
| Lines 90-93    | `<InlineDropIndicator>` before each task   | Lines 90-93: `<InlineDropIndicator active={showDropBefore} .../>`                       | CORRECT |
| Lines 127-135  | `<InlineDropIndicator>` at end of category | Lines 127-135: `<InlineDropIndicator active={...} .../>`                                | CORRECT |

**Verdict on line numbers: All line references are accurate.** This is unusually precise. No corrections needed.

---

## Change-by-Change Review

### Change 1: Remove nesting from drag-and-drop (v0.0.9.3)

**Assessment: Sound, with one concern.**

The plan correctly identifies all code paths to remove. The approach of keeping nesting only in the task detail menu is a reasonable UX simplification.

**Concern -- Subtask reorder still uses `relativeX >= UNNEST_THRESHOLD_X`:**
The plan says to remove the `relativeX >= UNNEST_THRESHOLD_X` condition on line 452, but it also says to remove the `relativeX` variable on lines 314-315. These are contradictory. If you remove the condition on line 452, you also need to decide what replaces it. The plan says "Keep subtask reorder logic (lines 432-476) but remove the `relativeX >= UNNEST_THRESHOLD_X` condition on line 452" -- this means subtask reorder will trigger even when the user drags far left (which previously would unnest). That seems intentional (since nesting/unnesting is removed from drag entirely), but the plan should explicitly state this is the desired behavior: dragging a subtask anywhere within the subtask Y-area keeps it as a reorder, and dragging outside the subtask area returns `null` (snap back) instead of unnesting.

**Concern -- Fallback for subtask drag outside subtask area returns `null`:**
The plan says to change lines 479-487 from returning `"unnest"` to returning `null`. This means if a user drags a subtask outside the subtask area, the drag simply cancels (snaps back). This is correct given the design intent, but it could feel unintuitive -- the user moves a subtask far away and nothing happens. Consider whether a brief toast or visual cue would help. Low priority, not a blocker.

**Concern -- `relativeX` variable removal:**
The plan says to remove `relativeX` (lines 314-315). But `relativeX` is NOT used only in the nest/unnest threshold checks. It is also used on line 452 inside the subtask reorder logic. If you remove the condition on line 452 (as planned), then `relativeX` truly is unused and can be removed. This is consistent, but the plan should note the dependency: line 452 change must happen before line 314-315 removal.

### Change 2: Remove colored drop indicator lines (v0.0.9.4)

**Assessment: Clean. No issues.**

Straightforward file deletion and import cleanup. The `DropIndicator` component (not just `InlineDropIndicator`) is also exported from `components/drag/index.ts` on line 8, and both are removed by deleting the file. Good.

**One thing to verify during implementation:** `DropIndicator` (the non-inline one) -- is it used anywhere besides the barrel export? A quick search should confirm it is not imported elsewhere. The plan does not mention checking this, but the barrel export removal covers it.

### Change 3: Highlight category header on drag hover (v0.0.9.5)

**Assessment: Good approach, one missing detail.**

**Missing: How does `DraggableCategorySection` access `dragState`?**
It already does -- line 42 of `CategorySection.tsx` destructures `{ dragState, registerCategoryLayout }` from `useDragContext()`. The plan's code snippet (`dragState.isDragging && activeDropZone?.listId === listId && activeDropZone?.categoryId === categoryId`) uses `activeDropZone` which is already assigned on line 43 (`const activeDropZone = dragState.activeDropZone`). This will work as-is.

**Missing: `StaticCategorySection` does not use drag context.**
The `isDropTarget` prop only matters for `DraggableCategorySection`. The plan does not mention `StaticCategorySection`, which is correct since it has no drag context. But `CategoryHeader` and `UncategorizedHeader` are shared between both paths. The `isDropTarget` prop should default to `false` (or `undefined`) so the static path does not need changes. The plan implies this by saying "Add `isDropTarget?: boolean` prop" (optional), which is correct.

**Missing: `bg-primary/15` on native.**
NativeWind v4 supports opacity modifiers like `bg-primary/15` on web via CSS, but on native it depends on the NativeWind version. Since the project already uses NativeWind v4 with Expo SDK 54, this should work, but it is worth verifying on iOS. If it does not render correctly, a fallback `style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}` would be needed.

### Change 4: Prevent tasks from going to uncategorized on invalid drops (v0.0.9.6)

**Assessment: Has a logic gap.**

**Critical -- The guard is incomplete.**
The plan adds a guard: if `targetCategoryId === null` and the origin had a category, and there is no registered uncategorized section, fall back to origin's `categoryId`. But the guard checks `registry.categories.has(uncatKey)` where `uncatKey = "${targetListId}:uncategorized"`. This check works for determining if an uncategorized section is registered. However, the deeper issue is: **why is `targetCategoryId` resolving to `null` in the first place?**

Looking at the category region detection loop (lines 329-335), `targetCategoryId` stays `null` if `absoluteY` is not within any registered category's Y/height bounds. This can happen when:

1. The user drops in the gap between categories
2. The user drops above the first category or below the last
3. Category layout measurements are stale

The proposed guard only helps case (1) and (2) when there is no uncategorized section. But if there IS an uncategorized section registered, the guard does nothing, and the task still lands in uncategorized. This is a partial fix. The plan should acknowledge this limitation or handle the "between categories" case more robustly (e.g., snap to the nearest category by Y distance).

**Also:** For cross-list drags, the same `targetCategoryId === null` situation can occur. The guard only checks `origin.categoryId`, but on a cross-list drag, the origin's category may not exist in the target list. The plan does not address this. However, since cross-list drags are handled in a separate branch (lines 371-395) that returns before reaching this guard, this is actually fine -- the guard is only hit for within-list drags. The plan should note this.

### Change 5: Show uncategorized section as drop target during drag (v0.0.9.7)

**Assessment: Good idea, one concern.**

**Concern -- `DragAwareUncategorized` needs drag context.**
The plan says to create a helper component that reads drag context. On mobile, the `DragProvider` wraps the `ScrollView` (line 651 of `index.tsx`), so `useDragContext()` is available inside. On web, the `DragProvider` wraps the horizontal `ScrollView` (line 610). The `ListPane` component is inside this, so it also has access. This should work.

**Concern -- Rendering an empty uncategorized section registers it in the layout registry.**
When `showWhenEmpty` causes the uncategorized `CategorySection` to render (even with 0 tasks), `DraggableCategorySection` will call `registerCategoryLayout` on mount. This means the `uncatKey` check in Change 4's guard will now always find a registered uncategorized section (because Change 5 ensures it is always rendered during drag). This effectively **nullifies Change 4's guard during drag** -- if the uncategorized section is registered, the guard's `if (!registry.categories.has(uncatKey))` check will be false, and `targetCategoryId` stays `null`.

This is a subtle interaction between Changes 4 and 5. The guard in Change 4 is only useful when no drag is happening (which is contradictory since drop zones are only calculated during drag). **Change 4's guard becomes dead code after Change 5 is implemented.**

**Recommendation:** Either combine Changes 4 and 5 into a single change with a different guard strategy (e.g., "if dropped between categories, snap to nearest category" regardless of uncategorized section), or acknowledge that Change 4's guard is only a safety net for the brief moment before Change 5's component mounts.

### Change 6: Keep input focused after adding a task (v0.0.9.8)

**Assessment: Clean, with one platform consideration.**

**Concern -- `Keyboard.dismiss?.()` removal on mobile.**
The current code calls `Keyboard.dismiss?.()` after adding a task. On mobile, this dismisses the software keyboard. The plan removes this call and replaces it with `inputRef.current?.focus()`. On mobile, calling `.focus()` on an already-focused `TextInput` is a no-op (the keyboard stays up). But on some Android devices, `setTitle("")` can cause the input to briefly lose focus. The `focus()` call should handle this. However, **removing `Keyboard.dismiss()` is the correct choice** since the whole point is to keep the input active for rapid entry.

**Missing: Web behavior.**
On web, `focus()` works as expected and the cursor stays in the input. No issues.

**Missing: `useRef` import.**
The plan says to add `useRef` to the React import. Looking at `AddTaskInput.tsx` line 1: `import { useState } from "react"`. This is correct -- `useRef` needs to be added. Also, `TextInput` needs to be imported from `react-native` for the ref type. Looking at line 2: `import { View, TextInput, Keyboard, Pressable } from "react-native"` -- `TextInput` is already imported. Good.

**Missing: `Keyboard` import cleanup.**
After removing `Keyboard.dismiss?.()`, the `Keyboard` import on line 2 becomes unused. The plan does not mention removing it from the import. This will cause a lint warning.

---

## Cross-Cutting Concerns

### Platform Compatibility

- **`bg-primary/15` (Change 3):** NativeWind opacity modifier -- verify on native. Low risk since NativeWind v4 supports this, but worth a quick test.
- **Change 6:** Focus behavior differs slightly between iOS/Android/Web but the implementation should work across all three.
- **Changes 1-5:** All drag changes are fundamentally web-focused (drag-and-drop). Mobile drag also works but is less commonly used. No platform-specific risks identified.

### State Management

- No new state added to AppContext. All changes are UI-layer only (drag calculation + rendering). This is correct and keeps the scope tight.
- The `nestTask` action is being removed from `handleDragEnd`'s dependency array but NOT from the `useAppData` hook or the reducer. This is correct -- nesting still works from the task detail screen.

### Performance

- Change 3 adds a computed `isDropTarget` boolean that recalculates on every drag state change. Since `dragState` already triggers re-renders of `DraggableCategorySection` (it reads `dragState.activeDropZone` on line 43), this adds no additional re-renders. Clean.
- Change 5 renders an additional (empty) component during drag. Minimal overhead.

---

## Risks & Mitigations

| Risk                                                                          | Severity | Mitigation                                                                             |
| ----------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| Change 4's guard becomes dead code after Change 5                             | Medium   | Rethink the guard strategy or combine changes                                          |
| `bg-primary/15` not rendering on native                                       | Low      | Test on iOS simulator; fallback to inline style if needed                              |
| Removing `Keyboard.dismiss()` causes keyboard flicker on some Android devices | Low      | Test on Android emulator; `focus()` should prevent this                                |
| Removing `relativeX` before removing all its usages                           | Low      | Implementation order within Change 1 matters -- remove usages first, then the variable |
| Unused `Keyboard` import after Change 6                                       | Trivial  | Remove it from the import line                                                         |

---

## Verdict: APPROVE WITH CHANGES

The plan is well-structured, the line number references are all accurate (impressive), and the implementation order is correct. The changes are appropriately scoped and the dependencies between them are clearly stated.

**Must address before implementing:**

1. **Change 4 + Change 5 interaction:** The uncategorized guard in Change 4 becomes ineffective once Change 5 always registers the uncategorized section during drag. Either rethink the guard (e.g., use nearest-category-by-Y-distance instead of checking registry) or document that Change 4 is a safety net for non-drag scenarios only (which would make it dead code).

**Should address:**

2. **Change 6:** Remove unused `Keyboard` import after removing `Keyboard.dismiss?.()`.
3. **Change 1:** Explicitly state that removing the `relativeX >= UNNEST_THRESHOLD_X` condition on line 452 means subtask reorder triggers regardless of horizontal position, and that this is intentional.

**Nice to have:**

4. Verify `bg-primary/15` renders correctly on native before committing Change 3.
