# Plan: General UI Updates (feat/general-updates)

## Context

Six UX improvements to the todo app's main screen: drag-and-drop simplification, improved drag feedback, and rapid task entry. Each change increments version by 0.0.0.1, starting from 0.0.9.2 (current code version) and ending at 0.0.9.8.

---

## Change 1: Remove nesting from drag-and-drop (v0.0.9.3)

Only allow reorder/recategorize via drag. Nesting stays in the task detail menu.

### `components/drag/DragProvider.tsx` - `calculateDropZone()` function

- **Delete** nest/unnest threshold constants (lines 356-358)
- **Delete** unnest check for subtask drag (lines 399-410)
- **Delete** nest check (lines 412-429)
- **Subtask drag handling** (lines 431-488): Keep subtask reorder logic (lines 432-476) but remove the `relativeX >= UNNEST_THRESHOLD_X` condition on line 452. This is intentional: with nesting/unnesting removed from drag, subtask reorder should trigger regardless of horizontal position. Dragging a subtask anywhere within the subtask Y-area reorders it among siblings.
- Change the fallback at lines 479-487 from returning `"unnest"` to returning `null` (cancel/snap back). This means dragging a subtask outside the subtask area does nothing — subtasks can only be unnested via the task detail menu.
- **Remove** `relativeX` variable (lines 314-315) — after removing the condition on line 452 and the nest/unnest threshold checks, `relativeX` has no remaining usages.

### `app/(tabs)/index.tsx` - `handleDragEnd` callback

- **Delete** `case "nest":` block (lines 356-361)
- **Delete** `case "unnest":` block (lines 363-380)
- Remove `nestTask` from useAppData destructure (line 183) and useCallback deps (line 427)

### `types/drag.ts`

- Remove `"nest"` and `"unnest"` from `DropZoneType` (lines 39-40)
- Remove `DropIndicatorProps` interface (lines 165-169) - will be unused after Change 2

---

## Change 2: Remove colored drop indicator lines (v0.0.9.4)

### `components/drag/DropIndicator.tsx` - Delete entire file

### `components/drag/index.ts`

- Remove line 8: `export { DropIndicator, InlineDropIndicator } from "./DropIndicator";`

### `components/CategorySection.tsx` - `DraggableCategorySection`

- Remove `InlineDropIndicator` from import (line 12)
- Delete `showDropBefore` computation (lines 77-81)
- Delete `<InlineDropIndicator>` before each task (lines 90-93)
- Delete `<InlineDropIndicator>` at end of category (lines 127-135)

---

## Change 3: Highlight category header on drag hover (v0.0.9.5)

Uses existing `bg-primary/15` (15% opacity primary blue) - no new CSS variables needed.

### `components/CategoryHeader.tsx`

Add `isDropTarget?: boolean` prop to both components:

**CategoryHeader:**

- When `isDropTarget` is true: apply `bg-primary/15` background, ignore `category.color` override
- When false: keep current `bg-surface-secondary` + optional `category.color` style

**UncategorizedHeader:**

- When `isDropTarget` is true: apply `bg-primary/15` background
- When false: keep current `bg-surface` with dashed border

Note: `isDropTarget` defaults to `undefined`/`false`, so `StaticCategorySection` (which has no drag context) does not need changes.

### `components/CategorySection.tsx` - `DraggableCategorySection`

Compute `isDropTarget` from drag context:

```ts
const isDropTarget =
  dragState.isDragging &&
  activeDropZone?.listId === listId &&
  activeDropZone?.categoryId === categoryId;
```

Pass `isDropTarget` to `<CategoryHeader>` and `<UncategorizedHeader>`.

---

## Change 4: Prevent tasks from going to uncategorized on invalid drops (v0.0.9.6)

### `components/drag/DragProvider.tsx` - `calculateDropZone()`

After the category region detection loop (lines 329-354), if `targetCategoryId` is still `null` (drop landed between categories, above the first, or below the last), snap to the **nearest category by Y distance** instead of allowing it to go to uncategorized. This works regardless of whether an uncategorized section is registered.

```ts
// If no category matched by Y region, snap to nearest category
if (targetCategoryId === null && categories.length > 0) {
  let closestCategoryId: string | null = null;
  let closestDistance = Infinity;
  for (const [_key, layout] of categories) {
    const categoryCenter = layout.y + layout.height / 2;
    const distance = Math.abs(absoluteY - categoryCenter);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestCategoryId = layout.categoryId;
    }
  }
  if (closestCategoryId !== null) {
    targetCategoryId = closestCategoryId;
  }
}
```

This handles all gap scenarios (between categories, above first, below last) and is not affected by whether Change 5's uncategorized section is registered — the nearest-category approach is independent.

Note: This guard only runs for within-list drags. Cross-list drags return earlier (lines 371-395) and are unaffected.

---

## Change 5: Show uncategorized section as drop target during drag (v0.0.9.7)

### `components/CategorySection.tsx`

Add `showWhenEmpty?: boolean` prop to `CategorySectionProps`.

Change the uncategorized guard:

```ts
if (!category && tasks.length === 0 && !showWhenEmpty) {
  return null;
}
```

### `app/(tabs)/index.tsx`

Create a `DragAwareUncategorized` helper component that reads drag context and passes `showWhenEmpty={dragState.isDragging}` to CategorySection.

Replace conditional uncategorized rendering in both mobile and ListPane web views.

With Change 4's nearest-category-by-Y-distance guard, drops between categories snap to the closest category. The uncategorized section shown here is a valid explicit drop target — users can intentionally drag into it to uncategorize a task.

---

## Change 6: Keep input focused after adding a task (v0.0.9.8)

### `components/AddTaskInput.tsx`

- Add `useRef` to the react import (line 1)
- Add `const inputRef = useRef<TextInput>(null);`
- In `handleSubmit`: Remove `Keyboard.dismiss?.();` (line 36). After `setTitle("")`, add `inputRef.current?.focus();`
- Add `ref={inputRef}` to the `<TextInput>` (line 56)
- **Remove `Keyboard` from the react-native import** (line 2) — it becomes unused after removing `Keyboard.dismiss?.()`.

---

## Implementation Order

1. **Change 1** - Remove nesting from drag (prerequisite for 2)
2. **Change 2** - Remove drop indicators (prerequisite for 3)
3. **Change 3** - Category header highlighting (depends on 2)
4. **Change 4** - Prevent uncategorized drops (depends on 1)
5. **Change 5** - Show uncategorized during drag (depends on 4)
6. **Change 6** - Input focus retention (independent)

## Version bumps

Final version after all changes: **0.0.9.8**

- `app/(tabs)/_layout.tsx` title
- `app/modal.tsx` version display
- `CLAUDE.md` version header

## Files Modified (summary)

| File                                | Changes                                                 |
| ----------------------------------- | ------------------------------------------------------- |
| `components/drag/DragProvider.tsx`  | Remove nest/unnest logic, add nearest-category guard    |
| `components/drag/DropIndicator.tsx` | **Delete**                                              |
| `components/drag/index.ts`          | Remove DropIndicator exports                            |
| `components/CategorySection.tsx`    | Remove indicators, add isDropTarget, add showWhenEmpty  |
| `components/CategoryHeader.tsx`     | Add isDropTarget highlight                              |
| `components/AddTaskInput.tsx`       | Keep focus after submit, remove unused Keyboard import  |
| `app/(tabs)/index.tsx`              | Remove nest/unnest handlers, add DragAwareUncategorized |
| `types/drag.ts`                     | Remove nest/unnest types + DropIndicatorProps           |
| `app/(tabs)/_layout.tsx`            | Version bump to 0.0.9.8                                 |
| `app/modal.tsx`                     | Version bump to 0.0.9.8                                 |
| `CLAUDE.md`                         | Version bump to 0.0.9.8                                 |
