# Move to List — Implementation Plan

## Context

Users can currently move tasks between lists only via drag-and-drop in the web split-view. There is no way to move tasks between lists on mobile. This adds a tappable list in the task detail modal so users on **all platforms** can move a task (and its subtasks) to another list.

## Scope

**Zero new dependencies, 1 file changed.** All backend infrastructure (reducer, dispatcher, sync) already exists from Phase 8e. UI uses the existing Pressable row pattern (same as "Make Subtask Of" section).

## Implementation

### Modify `app/task/[id].tsx`

This is the **only file** that changes.

**a) Destructure `moveTaskToList` from `useAppData()` (line ~34):**

```typescript
moveTaskToList,  // add to existing destructuring
```

**b) Add computed list of other lists (after `isSubtask` at line 116):**

```typescript
const otherLists = useMemo(() => {
  if (!task) return [];
  return lists
    .filter((l) => l.id !== task.listId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}, [lists, task]);
```

**c) Add handler (after `handleUnnest` at line 237):**

```typescript
const handleMoveToList = (targetListId: string) => {
  if (!targetListId || targetListId === task.listId) return;
  const targetExists = lists.some((l) => l.id === targetListId);
  if (!targetExists) return;
  moveTaskToList(task.id, targetListId, null, 0);
  router.back();
};
```

- `null` = uncategorized category, `0` = first position
- `router.back()` navigates back; the existing `setActiveList(task.listId)` useEffect will switch to the target list (desired behavior — user lands on the list where the task now lives)

**d) Add "Move to List" section JSX — after Category section (line 332), before Position:**

Only visible when: not a subtask AND other lists exist. Uses the same Pressable row pattern as "Make Subtask Of" (lines 424-455).

```tsx
{
  !isSubtask && otherLists.length > 0 && (
    <View className="mb-6">
      <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-2">
        Move to List
      </Text>
      {otherLists.map((list) => (
        <Pressable
          key={list.id}
          className="flex-row items-center p-3 bg-surface-secondary rounded-lg mb-1.5"
          onPress={() => handleMoveToList(list.id)}
        >
          <FontAwesome
            name="arrow-right"
            size={14}
            color="rgb(var(--color-text-secondary))"
            style={{ marginRight: 10 }}
          />
          <Text className="flex-1 text-[15px] text-text" numberOfLines={1}>
            {list.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
```

## Existing Infrastructure (no changes needed)

| Component                   | File                           | What it does                                                |
| --------------------------- | ------------------------------ | ----------------------------------------------------------- |
| `MOVE_TASK_TO_LIST` reducer | `store/AppContext.tsx:405-431` | Updates task + subtasks `listId`, sets `parentTaskId: null` |
| `moveTaskToList` dispatcher | `hooks/useAppData.ts:599-612`  | Dispatches the reducer action                               |
| Diff-based sync             | `lib/sync.ts`                  | Detects FK changes automatically                            |

## Design Decisions

- **Pressable list over native Picker**: Matches existing modal patterns, zero dependencies, works identically on all platforms, NativeWind classes for theming
- **No confirmation dialog**: Move is easily reversible (just move back). Consistent with category change behavior
- **Navigate to target list after move**: The existing `setActiveList(task.listId)` effect fires when `task.listId` changes, switching the active list to the target. This is desired — user lands on the list where the task now lives
- **Hidden for subtasks**: Subtasks cannot be independently moved; they follow their parent via the reducer

## Edge Cases

| Case                               | Behavior                                       |
| ---------------------------------- | ---------------------------------------------- |
| Only 1 list exists                 | Section hidden (`otherLists.length === 0`)     |
| Viewing a subtask                  | Section hidden (`isSubtask === true`)          |
| Task has subtasks                  | Subtasks move with parent (handled by reducer) |
| Web split-view, both lists visible | Source pane loses task, target pane gains it   |
| Target list deleted during modal   | Guard check prevents dispatch                  |

## Verification

1. `npx expo start --web` — open a task detail, verify section appears below Category
2. Move a task with subtasks to another list — confirm parent + subtasks in target list uncategorized at top
3. Verify navigating back lands on the target list
4. Verify only 1 list → section not visible
5. Verify subtask detail → section not visible
6. Toggle dark mode → verify rows look correct
7. `npm run typecheck` — no TypeScript errors
