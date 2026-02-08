# Phase 8.5: Cross-List Drag-and-Drop -- Plan Review

**Reviewer:** Staff Engineer (automated)
**Date:** 2026-02-07
**Plan:** `interListDrag-implementation-plan.md`

---

## Critical Issues (must fix before implementing)

### 1. Shared `translateX`/`translateY` SharedValues break multi-task rendering

The current `DragProvider` holds a single pair of `translateX`/`translateY` SharedValues (lines 67-68 of `DragProvider.tsx`). Every `DraggableTask` reads these same shared values in its `useAnimatedStyle` (line 138 of `DraggableTask.tsx`), gated by `isDragged` (which checks `dragState.draggedTask?.id === task.id`).

When DragProvider wraps a single list pane, this works: only tasks in that list consume those shared values. When you lift the DragProvider to wrap ALL panes (Step 6a), every `DraggableTask` in every pane now reads the same `isDragged` gating check against a single shared `translateX`/`translateY`. This is functionally correct (only the matching task moves), but now **every task across all panes** re-evaluates its animated style on every drag frame. With many tasks across many lists, this is a performance regression.

This is not a correctness bug, but it is a critical perf concern because drag smoothness is the core UX of this feature. The plan does not acknowledge or address this.

**Fix:** Acknowledge this tradeoff and consider whether you need to measure its impact. If drag becomes janky with 3-4 lists visible, you will need a different approach (e.g., per-task shared value refs).

### 2. `renderListPane` is a render function, not a component -- refs and hooks are illegal

The plan acknowledges this in Step 6c with the parenthetical "consider extracting a `<ListPane>` component to properly own its ref and lifecycle, or use a callback ref pattern" -- but then the code example uses `useRef` inside `renderListPane`, which is a plain function, not a React component. You cannot call `useRef` inside a non-component function. This will crash at runtime.

The plan must commit to one of:

- Extract `renderListPane` into a `<ListPane>` component (the right call)
- Use a `Map<string, View>` of callback refs at the TodoScreen level

This is not a "consider" item. It is a "you must do this or Step 6c does not work."

### 3. Category key lookup regression in `calculateDropZone`

Step 4a changes category registry keys from `categoryId ?? "uncategorized"` to `${listId}:${categoryId ?? "uncategorized"}`. Step 4c says "Category key lookups inside calculateDropZone must use the composite key format." But the plan does not spell out what changes are needed in the existing `calculateDropZone` code.

Looking at `calculateDropZone` (line 265-268 of `DragProvider.tsx`), category lookups happen via `Array.from(registry.categories.entries())` followed by filtering by `layout.listId`. The key value is then compared: `key === "uncategorized" ? null : key`. With composite keys, this comparison becomes `"listId:catId" === "uncategorized"`, which will never be true. Every category will be treated as non-null.

This will break the existing uncategorized section handling for ALL drag operations (within-list and cross-list). The plan needs to specify how category IDs are extracted from composite keys, or change the filtering approach entirely (e.g., always use `layout.categoryId` from the value, not the key).

### 4. `updatePosition` stale closure problem will get worse

`updatePosition` (line 100-117 of `DragProvider.tsx`) has `dragState.dragOrigin` and `dragState.activeDropZone` in its dependency array. It compares the new `dropZone` with `dragState.activeDropZone` using `!==` reference equality, which is always true for newly created objects. This means `setDragState` fires on every mouse/touch move event.

After lifting the provider to wrap multiple panes, the drag state change triggers re-renders of every DraggableTask and CategorySection across all panes. Currently the blast radius is one list. After this change, it is every visible list.

The plan does not address this. At minimum, this needs a deep comparison or a ref-based approach for `activeDropZone` to avoid unnecessary re-renders.

---

## Concerns (worth discussing)

### 5. `overflow-hidden` removal may cause visual artifacts

Step 6b removes `overflow-hidden` from the pane outer View so the dragged item can escape the pane boundary. But this also means non-dragged content (e.g., long task titles, animations) can visually overflow the pane border. The plan moves `overflow-hidden` to the inner ScrollView, but the pane title (`<Text>` at line 401) sits outside the ScrollView and above it. If a pane title is very long, it could overflow.

Also, on web, `zIndex` stacking does not always work as expected without `position: relative` on containers. The dragged item might render behind the adjacent pane even with `zIndex: 1000`. This should be tested early and may require `position: relative` + `overflow: visible` on the pane container.

### 6. Subtask `categoryId` handling in `MOVE_TASK_TO_LIST`

Step 2 says subtasks should have their `categoryId` updated "to match" the parent. But the data model says subtasks inherit their parent's `categoryId` via the `NEST_TASK` reducer. If `MOVE_TASK_TO_LIST` sets the parent to `targetCategoryId` and also sets all subtasks to `targetCategoryId`, this is correct. But if the parent is later moved to a different category within the new list, the subtasks will not follow (same as existing behavior). This is fine -- just noting that it is consistent with existing behavior, not a new problem.

### 7. X-position thresholds for nest/unnest become ambiguous cross-list

The current `calculateDropZone` uses absolute X thresholds: `UNNEST_THRESHOLD_X = 60` and `NEST_THRESHOLD_X = 120`. These work when a list fills the viewport. In split view, absolute X of 120 might be inside the first pane while the cursor is logically at X=0 within a second pane (if the first pane is narrow enough).

The plan says "skip nest/unnest checks when crossing lists" (Step 4c), which is correct. But for within-list drags in split view, the absolute X values are now offset by the pane's position. A task in the rightmost pane might have an absolute X of 800, which is always above `NEST_THRESHOLD_X`. This would make nesting trigger on every single within-list drag in right-side panes.

The plan needs to use pane-relative X for nest/unnest threshold checks, not absolute X. This is a correctness issue for within-list drag in non-first panes.

### 8. Scroll offset handling across panes

The current `LayoutRegistry` has a single `scrollOffset` and `containerTop`. With multiple panes, each having its own `ScrollView`, the scroll offset is per-pane but the registry is shared. The plan does not address how `scrollOffset` works in the lifted provider.

Looking at the code, `scrollOffset` and `containerTop` are on the registry but `calculateDropZone` does not actually use them -- all positions come from `measureInWindow` which gives absolute coordinates. So this might be fine if `measureInWindow` correctly accounts for scroll position. But the `scrollOffset` field sitting on the shared registry is misleading and should either be per-pane or removed if unused.

### 9. `handleDragEnd` needs `moveTaskToList` in the `useCallback` dependency array

Step 6d adds `moveTaskToList` to the `handleDragEnd` callback but the plan only says "add `moveTaskToList` to the destructured `useAppData()` imports." The existing `useCallback` at line 162 has `[tasks, moveTask, nestTask, updateTask]` as deps. `moveTaskToList` must be added to this array.

### 10. Plan does not address the horizontal ScrollView scroll interaction

When dragging a task cross-list on web, the user may need to scroll the horizontal `ScrollView` to reach a list that is off-screen. The plan does not mention auto-scroll behavior. If a user has 5+ lists visible and needs to drag from list 1 to list 5, they currently have no way to scroll during a drag. This is an acceptable v1 limitation but should be stated explicitly as a non-goal.

---

## Questions (things the plan does not address)

### Q1. What happens when you drag a task over the gap between panes?

The `renderListPane` containers have `gap: 16` between them (line 499 of `index.tsx`). If the cursor is in the 16px gap, `calculateDropZone` will not match any pane, so `targetListId` defaults to the origin list. The drop indicator might flash between cross-list and within-list modes as the cursor crosses the gap. Is this acceptable UX?

### Q2. Mobile behavior guarantee

The plan says "Mobile should be unaffected (no panes registered, single DragProvider unchanged)." This is correct -- mobile keeps its own `<DragProvider>` instance (line 520). But the type changes (`listId` now required in `DragOrigin`, `TaskLayout`) will force changes in mobile code paths too. The plan covers this in Step 5 but should explicitly confirm that the mobile DragProvider does not need pane registration because single-list mode never enters the `move-list` branch.

### Q3. What happens if you drag a subtask cross-list?

The plan's verification item 6 says "Drag a subtask cross-list -- it unnests and moves as a top-level task." But looking at the `calculateDropZone` logic: if `isSubtaskDrag` is true and the cursor moves to another pane, the code enters Step 4c's cross-list branch which "disables nest/unnest." But the subtask reorder path (lines 337-394) runs before the cross-list check (if following the existing code order). The plan needs to specify where in the function the cross-list check happens relative to the subtask handling code.

### Q4. Category layout `y` values are relative to each pane's ScrollView

Each `CategorySection` calls `measureInWindow` to get its `y`. For categories in different panes, these Y values might overlap (both pane 1 and pane 2 have categories starting at Y=150). The filtering by `targetListId` (Step 4c) handles this correctly, but only if `TaskLayout` also includes `listId` so that task filtering by list works. The plan adds `listId` to `TaskLayout` (Step 3) but never shows the filtering of tasks by list in `calculateDropZone`. The current code does `Array.from(registry.tasks.values())` with no list filter (line 251). For cross-list drops, this means tasks from all lists are candidates for Y-position matching. Need to filter tasks by `targetListId` in `calculateDropZone`.

---

## Verdict: NEEDS REVISION

The plan is well-structured, well-ordered, and demonstrates good understanding of the drag system. The decisions (subtasks follow parent, no cross-list nesting, fix bug first) are all correct. The learning notes are excellent.

However, there are four issues that will cause bugs or crashes if not addressed before implementation:

1. **Critical #2**: `useRef` inside `renderListPane` will crash. Must extract a component.
2. **Critical #3**: Composite category key breaks uncategorized lookup. Must define key parsing strategy.
3. **Concern #7**: Absolute X thresholds break within-list nest/unnest in non-first panes. Must use pane-relative X.
4. **Question Q4**: Tasks not filtered by `targetListId` in `calculateDropZone`. Tasks from all panes will interfere with each other's drop zone calculation.

Fix these four and the plan is ready to implement.
