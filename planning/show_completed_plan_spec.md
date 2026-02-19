# Plan: Show Completed Tasks Toggle (v0.0.9.9)

## Context

Users want to hide completed tasks to reduce visual clutter. Adding a "Show completed tasks" toggle in Settings that persists across sessions. Default: **off** (completed tasks hidden). When hidden, completed tasks are excluded from all views, counts, and "all caught up" detection — they behave as though they don't exist.

---

## Architecture Decision

**Add `showCompleted` to `AppContext` state** (not a separate context). Rationale:

- It directly affects task filtering, which is already computed in `useAppData` and `index.tsx`
- `AppContext` already stores UI preferences (`activeListId`, `selectedListIds`)
- Avoids adding another provider layer to `_layout.tsx`
- Persistence follows the existing `activeListId` pattern (separate `useEffect` for a single preference)

---

## Step 1: Storage layer

### `lib/storage.ts`

Add `SHOW_COMPLETED: "app:showCompleted"` to `STORAGE_KEYS`.

Add two methods to `storage`:

```ts
async getShowCompleted(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.SHOW_COMPLETED);
  return value === "true"; // Default false if null
},

async setShowCompleted(show: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.SHOW_COMPLETED, show.toString());
},
```

---

## Step 2: State + reducer

### `store/AppContext.tsx`

Add `showCompleted: boolean` to `AppState` interface (default `false`).

Add action type:

```ts
| { type: "SET_SHOW_COMPLETED"; payload: boolean }
```

Add reducer case:

```ts
case "SET_SHOW_COMPLETED":
  return { ...state, showCompleted: action.payload };
```

Update `HYDRATE` action to accept and set `showCompleted`.

---

## Step 3: Hydration + persistence

### `hooks/useAppData.ts`

**Hydration**: In the `hydrate()` function, load `showCompleted` from storage:

```ts
const showCompleted = await storage.getShowCompleted();
```

Pass it into the `HYDRATE` dispatch payload.

**Persistence**: Add a `useEffect` to persist `showCompleted` changes:

```ts
useEffect(() => {
  if (state.isLoading) return;
  storage.setShowCompleted(state.showCompleted);
}, [state.showCompleted, state.isLoading]);
```

**Dispatcher**: Add `setShowCompleted` callback:

```ts
const setShowCompleted = useCallback(
  (show: boolean) => {
    dispatch({ type: "SET_SHOW_COMPLETED", payload: show });
  },
  [dispatch],
);
```

---

## Step 4: Task filtering in `useAppData`

### `hooks/useAppData.ts` — `tasksByCategory` memo

Add `state.showCompleted` to the filter:

```ts
const listTasks = state.tasks.filter(
  (t) =>
    t.listId === state.activeListId &&
    t.parentTaskId === null &&
    (state.showCompleted || !t.completed),
);
```

Add `state.showCompleted` to the dependency array.

### `hooks/useAppData.ts` — `subtasksByParent` memo

Same filter:

```ts
state.tasks.filter(
  (t) => t.parentTaskId !== null && (state.showCompleted || !t.completed),
);
```

Add `state.showCompleted` to the dependency array.

### Return `showCompleted` and `setShowCompleted` from the hook.

---

## Step 5: Task filtering in web split-view

### `app/(tabs)/index.tsx` — `listTaskData` useMemo

The web split-view computes its own `listTaskData` from `tasks`. Add filtering here too:

In the `listTasks.forEach` loop, add the completed filter before grouping:

```ts
const filteredTasks = listTasks.filter(
  (task) => showCompleted || !task.completed,
);
```

Add `showCompleted` to the destructure from `useAppData()` and to the `useMemo` dependency array.

---

## Step 6: Settings UI

### `app/modal.tsx`

Add a "Tasks" section (between Appearance and About) with a Switch toggle:

```tsx
{
  /* Tasks Section */
}
<View className="mb-8">
  <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-3">
    Tasks
  </Text>
  <View className="bg-surface-secondary rounded-lg p-4 flex-row items-center justify-between">
    <View className="flex-1 mr-4">
      <Text className="text-[15px] font-semibold text-text">
        Show completed tasks
      </Text>
      <Text className="text-xs text-text-muted mt-1">
        Display tasks that have been checked off
      </Text>
    </View>
    <Switch value={showCompleted} onValueChange={setShowCompleted} />
  </View>
</View>;
```

Import `Switch` from `react-native`, and get `showCompleted`/`setShowCompleted` from `useAppData()`.

---

## Step 7: Version bump

- `app/(tabs)/_layout.tsx` title → `0.0.9.9`
- `app/modal.tsx` version display → `0.0.9.9`
- `CLAUDE.md` version header → `0.0.9.9`

---

## Files Modified

| File                     | Changes                                                |
| ------------------------ | ------------------------------------------------------ |
| `lib/storage.ts`         | Add `SHOW_COMPLETED` key + get/set methods             |
| `store/AppContext.tsx`   | Add `showCompleted` to state, action, reducer, hydrate |
| `hooks/useAppData.ts`    | Filter tasks, add hydration/persistence/dispatcher     |
| `app/(tabs)/index.tsx`   | Filter in `listTaskData` for web split-view            |
| `app/modal.tsx`          | Add toggle switch in Settings + import Switch          |
| `app/(tabs)/_layout.tsx` | Version bump                                           |
| `CLAUDE.md`              | Version bump                                           |

---

## Verification

1. **Web**: `npx expo start --web`
   - Settings → toggle "Show completed tasks" on/off
   - With toggle off: completed tasks hidden, category counts reflect only incomplete tasks, "all caught up" does not show (since completed tasks don't exist)
   - With toggle on: all tasks visible, existing behavior restored
   - Preference persists across page reload
   - Web split-view panes also respect the toggle
2. **TypeScript**: `npm run typecheck` passes
3. **Edge cases**:
   - Toggle off when all tasks are completed → shows "No tasks yet" empty state
   - Toggle on → completed tasks reappear
   - Drag-and-drop works correctly with toggle off (only dragging visible tasks)
