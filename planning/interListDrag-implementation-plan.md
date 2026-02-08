# Phase 8.5: Cross-List Drag-and-Drop

## Context

The app supports drag-and-drop within a single list (reorder, move between categories, nest/unnest subtasks) and a web split-view showing multiple lists side by side. Currently, each web list pane has its own isolated `<DragProvider>`, making cross-list drag structurally impossible. We need to enable dragging tasks between lists.

**Decisions made:**

- Subtasks move with their parent when dragged cross-list
- Task lands in the category at the drop position
- Cross-list drops only support category placement (no nesting into tasks in the target list)
- Fix the existing subtask-to-uncategorized bug alongside this work

**Non-goals (v1):**

- Auto-scrolling the horizontal ScrollView during drag (if a list is off-screen, scroll first, then drag)
- Cross-list nesting (dropping onto a task in the target list to make it a subtask)
- Mobile cross-list drag (mobile only shows one list at a time)

---

## Step 1: Fix Existing Subtask Unnest Bug

**Why first:** This bug is in `handleDragEnd`'s unnest case and would compound with cross-list logic. Small, isolated fix.

**Root cause:** `handleDragEnd` line 233 calls `nestTask(task.id, null)` for unnest, ignoring `dropZone.categoryId`. The `NEST_TASK` reducer with `parentTaskId: null` keeps the old `categoryId`.

**Files:**

- `app/(tabs)/index.tsx` — `handleDragEnd`, unnest case (line 232-234)

**Change:** After calling `nestTask(task.id, null)`, also call `moveTask()` to place the unnested task in the correct category:

```typescript
case "unnest": {
  // First unnest (set parentTaskId to null)
  nestTask(task.id, null);
  // Then place in the category the user dropped into
  const siblingTasks = tasks.filter(
    (t) => t.listId === task.listId && t.categoryId === dropZone.categoryId && t.parentTaskId === null && t.id !== task.id
  );
  const newSortOrder = siblingTasks.length > 0
    ? Math.max(...siblingTasks.map((t) => t.sortOrder)) + 1
    : 0;
  moveTask(task.id, dropZone.categoryId, newSortOrder);
  break;
}
```

**Verify:** Drag a subtask out of its parent area into a different category. It should land in that category, not uncategorized.

---

## Step 2: Add `MOVE_TASK_TO_LIST` Reducer Action

**Why now:** The reducer is the foundation — everything else dispatches to it.

**Files:**

- `store/AppContext.tsx` — Add action type + reducer case (after `MOVE_TASK` at line 385)
- `hooks/useAppData.ts` — Add `moveTaskToList` dispatcher

**Action type:**

```typescript
| {
    type: "MOVE_TASK_TO_LIST";
    payload: {
      taskId: string;
      targetListId: string;
      targetCategoryId: string | null;
      newSortOrder: number;
    };
  }
```

**Reducer logic:**

1. Update the task's `listId`, `categoryId`, `sortOrder`
2. Set `parentTaskId` to `null` (cross-list nesting not supported)
3. Find all subtasks where `parentTaskId === taskId` and update their `listId` and `categoryId` to match

**Dispatcher:**

```typescript
const moveTaskToList = useCallback(
  (
    taskId: string,
    targetListId: string,
    targetCategoryId: string | null,
    newSortOrder: number,
  ) => {
    dispatch({
      type: "MOVE_TASK_TO_LIST",
      payload: { taskId, targetListId, targetCategoryId, newSortOrder },
    });
  },
  [dispatch],
);
```

**Verify:** Call `moveTaskToList` manually (e.g., from a test button or console) and confirm the task + subtasks move to the new list with correct category.

---

## Step 3: Update Type System for Cross-List Awareness

**Why now:** Type changes before code changes ensure the compiler guides us.

**File: `types/drag.ts`**

**Changes:**

1. Add `listId` to `DragOrigin` (line 24):

```typescript
export interface DragOrigin {
  taskId: string;
  listId: string; // NEW
  categoryId: string | null;
  parentTaskId: string | null;
  index: number;
}
```

2. Add `listId` to `TaskLayout` (line 61):

```typescript
export interface TaskLayout {
  taskId: string;
  listId: string; // NEW
  categoryId: string | null;
  parentTaskId: string | null;
  y: number;
  height: number;
  isSubtask: boolean;
}
```

3. Add `listId` to `DropZone` (line 43):

```typescript
export interface DropZone {
  type: DropZoneType;
  listId: string | null; // NEW — target list (null = same list)
  categoryId: string | null;
  beforeTaskId: string | null;
  parentTaskId: string | null;
  indicatorY: number;
}
```

4. Add `"move-list"` to `DropZoneType` (line 34):

```typescript
export type DropZoneType =
  | "reorder"
  | "move-category"
  | "move-list" // NEW
  | "nest"
  | "unnest";
```

5. Add `PaneLayout` interface and update `LayoutRegistry` (line 83):

```typescript
export interface PaneLayout {
  listId: string;
  x: number;
  width: number;
}

export interface LayoutRegistry {
  tasks: Map<string, TaskLayout>;
  categories: Map<string, CategoryLayout>; // key changes to composite
  panes: Map<string, PaneLayout>; // NEW
  scrollOffset: number;
  containerTop: number;
}
```

6. Add `registerPaneLayout` to `DragContextValue` (line 116):

```typescript
export interface DragContextValue {
  // ... existing ...
  registerPaneLayout: (layout: PaneLayout) => void; // NEW
}
```

**Verify:** Run `npm run typecheck`. Expect errors in every file that constructs these types — that's correct, we'll fix them in subsequent steps.

---

## Step 4: Update DragProvider for Cross-List Support

**Why now:** The core algorithm changes. All layout registration and drop zone calculation lives here.

**File: `components/drag/DragProvider.tsx`**

**Changes:**

### 4a. Fix category registry key collision (line 167-170)

Change from `categoryId ?? "uncategorized"` to composite key `${listId}:${categoryId ?? "uncategorized"}`:

```typescript
const registerCategoryLayout = useCallback((layout: CategoryLayout) => {
  const key = `${layout.listId}:${layout.categoryId ?? "uncategorized"}`;
  layoutRegistry.current.categories.set(key, layout);
}, []);
```

**Important:** Inside `calculateDropZone`, category lookups currently use the Map key to determine `categoryId` (line 267: `key === "uncategorized" ? null : key`). With composite keys, this breaks. **Fix:** Always use `layout.categoryId` from the value object instead of parsing the key. Change the category iteration to:

```typescript
for (const [_key, layout] of categories) {
  if (absoluteY >= layout.y && absoluteY < layout.y + layout.height) {
    targetCategoryId = layout.categoryId; // Use value, not key
    break;
  }
}
```

### 4b. Add pane layout registration

Add `panes: new Map()` to the `layoutRegistry` ref initialization (line 73).

Add `registerPaneLayout` function:

```typescript
const registerPaneLayout = useCallback((layout: PaneLayout) => {
  layoutRegistry.current.panes.set(layout.listId, layout);
}, []);
```

Expose `registerPaneLayout` in the context value.

### 4c. Update `calculateDropZone` to be 2D-aware

The key changes to the algorithm:

**1. Determine target list from X position** — iterate `registry.panes` to find which pane the cursor is over:

```typescript
let targetListId = taskListId; // default to origin list
let targetPaneX = 0; // track pane left edge for relative X calculations
for (const [listId, pane] of registry.panes) {
  if (absoluteX >= pane.x && absoluteX < pane.x + pane.width) {
    targetListId = listId;
    targetPaneX = pane.x;
    break;
  }
}
const isCrossListDrag = targetListId !== taskListId;
```

**2. Use pane-relative X for nest/unnest thresholds** — the current `UNNEST_THRESHOLD_X = 60` and `NEST_THRESHOLD_X = 120` use absolute screen X, which breaks for panes that are not at X=0. Convert to pane-relative:

```typescript
const relativeX = absoluteX - targetPaneX;
// Then use relativeX instead of absoluteX for threshold checks:
if (isSubtaskDrag && relativeX < UNNEST_THRESHOLD_X) { ... }
if (relativeX > NEST_THRESHOLD_X && !isSubtaskDrag) { ... }
```

**3. Filter categories AND tasks by target list:**

```typescript
const categories = allCategories.filter(
  ([_, layout]) => layout.listId === targetListId,
);

// Also filter tasks by target list for position matching
const tasksInTargetList = tasks.filter((t) => t.listId === targetListId);
```

Use `tasksInTargetList` instead of `tasks` for all subsequent task position lookups (topLevelTasks, siblingSubtasks, etc.). Without this filter, tasks from other panes with overlapping Y values would interfere with drop zone calculation.

**4. Cross-list branch — when `isCrossListDrag` is true:**

This check must happen BEFORE the subtask-specific logic (lines 337-394). If a subtask is dragged cross-list, it should be treated as a top-level task move, not a subtask reorder/unnest.

```typescript
if (isCrossListDrag) {
  // Cross-list: find insertion point using Y-based logic (same as top-level reorder)
  // but skip nest/unnest checks entirely
  // Return type: "move-list" with listId: targetListId
  for (const taskLayout of topLevelTasks) {
    const taskCenter = taskLayout.y + taskLayout.height / 2;
    if (absoluteY < taskCenter) {
      return {
        type: "move-list",
        listId: targetListId,
        categoryId: targetCategoryId,
        beforeTaskId: taskLayout.taskId,
        parentTaskId: null,
        indicatorY: taskLayout.y,
      };
    }
  }
  // Insert at end
  const lastTask = topLevelTasks[topLevelTasks.length - 1];
  return {
    type: "move-list",
    listId: targetListId,
    categoryId: targetCategoryId,
    beforeTaskId: null,
    parentTaskId: null,
    indicatorY: lastTask ? lastTask.y + lastTask.height : absoluteY,
  };
}
```

**5. All returned `DropZone` objects** now include `listId: targetListId`.

### 4d. Reduce unnecessary re-renders from `updatePosition`

The current `updatePosition` (line 100-117) compares `dropZone !== dragState.activeDropZone` using reference equality, which is always `true` for newly created objects. This causes `setDragState` on every mouse move event. After lifting the provider to wrap all panes, the re-render blast radius increases from one list to all visible lists.

**Fix:** Use a ref to track the active drop zone and only update state when the drop zone meaningfully changes:

```typescript
const activeDropZoneRef = useRef<DropZone | null>(null);

const updatePosition = useCallback((absoluteX: number, absoluteY: number) => {
  const dropZone = calculateDropZone(...);
  const prev = activeDropZoneRef.current;

  // Deep compare to avoid unnecessary re-renders
  const changed = !prev || !dropZone ||
    prev.type !== dropZone.type ||
    prev.listId !== dropZone.listId ||
    prev.categoryId !== dropZone.categoryId ||
    prev.beforeTaskId !== dropZone.beforeTaskId ||
    prev.parentTaskId !== dropZone.parentTaskId;

  if (changed) {
    activeDropZoneRef.current = dropZone;
    setDragState((prev) => ({ ...prev, activeDropZone: dropZone }));
  }
}, [dragState.dragOrigin, dragState.draggedTask]);
```

This also removes `dragState.activeDropZone` from the dependency array, fixing the stale closure issue.

**Verify:** TypeScript compiles. Existing within-list drag still works (no panes registered = `targetListId` stays as origin list).

---

## Step 5: Update Layout Registration in Components

**Why now:** Components need to pass the new `listId` field when registering layouts.

### 5a. `components/drag/useDragDrop.ts`

**`useLayoutRegistration`** — add `listId` parameter:

```typescript
export function useLayoutRegistration(taskId: string, listId: string) {
  // ...
  const register = useCallback(
    (y, height, categoryId, parentTaskId, isSubtask) => {
      registerTaskLayout({
        taskId,
        listId,
        y,
        height,
        categoryId,
        parentTaskId,
        isSubtask,
      });
    },
    [taskId, listId, registerTaskLayout],
  );
}
```

**`useDraggable`** — add `listId` to `DragOrigin` construction (line 23-28):

```typescript
const origin: DragOrigin = {
  taskId: task.id,
  listId: task.listId, // NEW
  categoryId: task.categoryId,
  parentTaskId: task.parentTaskId,
  index,
};
```

### 5b. `components/drag/DraggableTask.tsx`

Pass `task.listId` to `useLayoutRegistration`:

```typescript
const { register, unregister } = useLayoutRegistration(task.id, task.listId);
```

No other changes needed — it already passes `task` to `useDraggable` which reads `task.listId`.

### 5c. `components/CategorySection.tsx`

The `registerCategoryLayout` call (line 56) already passes `listId` — no change needed there. The composite key is now handled inside `DragProvider`.

**Drop indicator matching** needs a `listId` check to avoid showing indicators in the wrong pane. Update the `showDropBefore` logic (line 76-79):

```typescript
const showDropBefore =
  activeDropZone?.listId === listId && // NEW — match list
  activeDropZone?.categoryId === categoryId &&
  activeDropZone?.beforeTaskId === task.id &&
  activeDropZone?.type !== "nest";
```

Same for the end-of-category indicator (line 126-130):

```typescript
active={
  activeDropZone?.listId === listId &&          // NEW — match list
  activeDropZone?.categoryId === categoryId &&
  activeDropZone?.beforeTaskId === null &&
  activeDropZone?.type !== "nest"
}
```

**Verify:** Run typecheck. Within-list drag with drop indicators should still work.

---

## Step 6: Extract `<ListPane>` Component, Lift DragProvider, Fix Clipping (Web)

**Why now:** This is the structural change that makes cross-list drag possible.

**File: `app/(tabs)/index.tsx`**

### 6a. Extract `renderListPane` into a `<ListPane>` component

The current `renderListPane` is a plain render function inside `TodoScreen`. It cannot use hooks (`useRef`, `useCallback`, etc.) because it is not a React component. We need pane layout registration via `useRef` + `onLayout` + `measureInWindow`, which requires hooks.

**Extract to a proper component** (can be defined in the same file or a separate file):

```tsx
interface ListPaneProps {
  listId: string;
  list: TodoList;
  categories: Category[];
  tasksByCategory: Map<string | null, Task[]>;
  subtasksByParent: Map<string, Task[]>;
  onToggleTask: (taskId: string) => void;
  onPressTask: (taskId: string) => void;
  onAddTask: (title: string) => void;
  paneWidth: number;
}

function ListPane({
  listId, list, categories, tasksByCategory, subtasksByParent,
  onToggleTask, onPressTask, onAddTask, paneWidth,
}: ListPaneProps) {
  const { registerPaneLayout } = useDragContext();
  const paneRef = useRef<View>(null);

  const handleLayout = useCallback(() => {
    paneRef.current?.measureInWindow((x, _y, w, _h) => {
      registerPaneLayout({ listId, x, width: w });
    });
  }, [listId, registerPaneLayout]);

  return (
    <View
      ref={paneRef}
      onLayout={handleLayout}
      className="bg-surface rounded-xl border border-border"
      style={{ width: paneWidth, position: "relative" }}
    >
      <Text className="text-lg font-bold text-text px-4 pt-4 pb-2">
        {list.name}
      </Text>
      <ScrollView className="flex-1 overflow-hidden" ...>
        {/* CategorySections */}
      </ScrollView>
      <AddTaskInput onAddTask={onAddTask} />
    </View>
  );
}
```

**Key details:**

- `ListPane` calls `useDragContext()` to access `registerPaneLayout` — this requires it to be inside the `<DragProvider>` tree
- `position: "relative"` on the pane container ensures `zIndex: 1000` on the dragged item stacks correctly on web
- `overflow-hidden` moved from outer View to inner ScrollView (see 6b)

### 6b. Fix `overflow-hidden` clipping

Move `overflow-hidden` from the outer `<View>` to the inner `<ScrollView>`:

- **Outer View:** `className="bg-surface rounded-xl border border-border"` (no overflow-hidden)
- **Inner ScrollView:** `className="flex-1 overflow-hidden"`

This allows the dragged item (with `zIndex: 1000`) to visually escape the pane boundary while scroll content stays clipped. The pane title (`<Text>`) sits outside the ScrollView and won't overflow because `text-lg` and padding keep it constrained.

### 6c. Lift `<DragProvider>` out of panes

Remove the `<DragProvider>` from inside `ListPane`. Wrap the horizontal `ScrollView` at the screen level:

```tsx
{isWeb ? (
  <DragProvider onDragEnd={handleDragEnd}>
    <ScrollView horizontal ...>
      {listIdsToRender.map((listId) => (
        <ListPane key={listId} listId={listId} ... />
      ))}
    </ScrollView>
  </DragProvider>
) : (
  // Mobile: keep existing single DragProvider (line 520)
  <DragProvider onDragEnd={handleDragEnd}>
    ...
  </DragProvider>
)}
```

### 6d. Update `handleDragEnd` for cross-list drops

Add `moveTaskToList` to the destructured `useAppData()` imports **and** to the `useCallback` dependency array (currently `[tasks, moveTask, nestTask, updateTask]`).

Add a new case:

```typescript
case "move-list": {
  const targetTasks = tasks.filter((t) =>
    t.listId === dropZone.listId &&
    t.categoryId === dropZone.categoryId &&
    t.parentTaskId === null &&
    t.id !== task.id
  );
  targetTasks.sort((a, b) => a.sortOrder - b.sortOrder);

  let newSortOrder: number;
  if (dropZone.beforeTaskId) {
    const beforeIndex = targetTasks.findIndex((t) => t.id === dropZone.beforeTaskId);
    if (beforeIndex === 0) {
      newSortOrder = targetTasks[0].sortOrder - 1;
    } else if (beforeIndex > 0) {
      const prev = targetTasks[beforeIndex - 1];
      const next = targetTasks[beforeIndex];
      newSortOrder = (prev.sortOrder + next.sortOrder) / 2;
    } else {
      newSortOrder = targetTasks.length > 0 ? targetTasks[targetTasks.length - 1].sortOrder + 1 : 0;
    }
  } else {
    newSortOrder = targetTasks.length > 0 ? targetTasks[targetTasks.length - 1].sortOrder + 1 : 0;
  }

  moveTaskToList(task.id, dropZone.listId!, dropZone.categoryId, newSortOrder);
  break;
}
```

**Verify:**

1. Open web with 2+ lists visible
2. Drag a task from List A into a category in List B
3. Task should appear in List B's category
4. Within-list drag should still work exactly as before
5. Mobile should be unaffected (no panes registered, single DragProvider unchanged)

---

## Step 7: Add Visual Feedback for Cross-List Drops

**File: `components/drag/DropIndicator.tsx`**

Add color for the `"move-list"` type in both `DropIndicator` and `InlineDropIndicator`:

```typescript
// Use a distinct color — purple/violet to differentiate from move-category (orange)
case "move-list": return colors.primary; // or a new semantic color
```

**Verify:** When dragging over a different list, the drop indicator shows with the correct color/style.

---

## Files Changed (Summary)

| File                                | Change                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `types/drag.ts`                     | Add `listId` to `DragOrigin`, `TaskLayout`, `DropZone`; add `PaneLayout`; add `"move-list"` type; update `LayoutRegistry`              |
| `store/AppContext.tsx`              | Add `MOVE_TASK_TO_LIST` action type + reducer case                                                                                     |
| `hooks/useAppData.ts`               | Add `moveTaskToList` dispatcher; export it                                                                                             |
| `components/drag/DragProvider.tsx`  | Composite category keys; pane registration; 2D `calculateDropZone`; pane-relative X; deep compare; expose `registerPaneLayout`         |
| `components/drag/useDragDrop.ts`    | Pass `listId` in `DragOrigin` and `TaskLayout` registration                                                                            |
| `components/drag/DraggableTask.tsx` | Pass `task.listId` to `useLayoutRegistration`                                                                                          |
| `components/CategorySection.tsx`    | Add `listId` matching to drop indicator visibility checks                                                                              |
| `components/drag/DropIndicator.tsx` | Add `"move-list"` color case                                                                                                           |
| `app/(tabs)/index.tsx`              | Extract `ListPane` component; lift DragProvider; fix overflow-hidden; register pane layouts; add `"move-list"` handler; fix unnest bug |

---

## Verification Plan

1. **Typecheck**: `npm run typecheck` passes
2. **Within-list drag (web, first pane)**: Reorder, move-category, nest, unnest all work as before
3. **Within-list drag (web, non-first pane)**: Nest/unnest thresholds work correctly (pane-relative X)
4. **Within-list drag (mobile)**: No behavioral change
5. **Cross-list drag**: Drag task from List A to List B category — task moves with correct category
6. **Subtask migration**: Drag a parent task cross-list — all subtasks follow
7. **Cross-list subtask**: Drag a subtask cross-list — it unnests and moves as a top-level task in target list
8. **Unnest bug fix**: Drag subtask to a different category — lands in correct category (not uncategorized)
9. **Drop indicators**: Show correctly in the target list pane only, not in the origin pane
10. **Visual clipping**: Dragged item is visible when crossing pane boundaries
11. **Gap between panes**: Dragging over the 16px gap between panes defaults to origin list (acceptable)
12. **Edge cases**: Drag to uncategorized section in another list; drag when only 1 list is visible (no-op)
13. **Performance**: Drag should remain smooth with 3-4 lists visible (check for jank from shared animated styles)

---

## Performance Note

After lifting `DragProvider` to wrap all panes, every `DraggableTask` across all panes shares the same `translateX`/`translateY` SharedValues. The animated styles are gated by `isDragged` (checking `dragState.draggedTask?.id === task.id`), so only the dragged task applies transforms. The gating check runs on the UI thread via `useAnimatedStyle`, which is efficient. However, if drag becomes janky with 3-4 lists visible, the fallback is to move to per-task shared value refs instead of a single provider-level pair. Test this during implementation and note any degradation.

---

## Learning Notes

**Why lift the DragProvider?** The alternative approaches (event bus between providers, separate inter-list drag system) all fail because gesture continuity is the hard problem. A pan gesture owns the touch from start to end — you can't hand it off between two independent systems mid-drag. One shared provider means one gesture, one coordinate space, one drop zone calculation.

**Why composite category keys?** Two lists can both have uncategorized tasks. The old key `categoryId ?? "uncategorized"` would cause List B's uncategorized section to overwrite List A's in the shared registry. The composite key `${listId}:${categoryId}` prevents collisions. But the key is only for deduplication — always use `layout.categoryId` from the value when you need the actual category ID.

**Why pane-relative X?** The nest/unnest thresholds (60px and 120px) assume the list starts at X=0. In split view, a list in the second pane starts at X=376+. Without converting to pane-relative coordinates, every drag in a non-first pane would have `absoluteX > 120`, triggering nesting on every move.

**Why `measureInWindow` already works?** It returns coordinates relative to the screen origin, not the parent view. So tasks in different panes naturally have different X values, which is exactly what we need for pane detection.

**Why filter tasks by target list?** Tasks from different panes can have overlapping Y values (both pane 1 and pane 2 have tasks at Y=200). Without filtering by `targetListId`, the drop zone calculator would match tasks from the wrong pane, producing incorrect insertion points.
