# List Tab Reordering - Implementation Plan

**Revision 2** — Updated based on plan review findings.

## Feature Summary

Add drag-to-reorder for list tabs in the horizontal tab bar, allowing users to rearrange their lists by dragging tabs left/right. Also changes settings access from long-press to double-tap (both platforms) while keeping the ellipsis button.

## Requirements (Confirmed with User)

| Decision                    | Choice                                                  |
| --------------------------- | ------------------------------------------------------- |
| Drag trigger (mobile)       | Long-press to initiate drag (consistent with task drag) |
| Settings access             | Double-tap (300ms max between taps) + ellipsis button   |
| Old long-press for settings | Removed (freed up for drag)                             |
| '+' button                  | Fixed at end, not draggable                             |

## Architecture Decision: Separate Tab Drag System

**Why not reuse the existing `DragProvider`?**

The task drag system is 2D (vertical reorder + horizontal nest/unnest + cross-list + cross-category). Tab drag is purely 1D (horizontal position swap). Grafting horizontal tab concerns into the existing vertical task system would:

- Add conditional logic branches throughout `DragProvider.tsx` (already ~400 lines)
- Introduce risk of regressions in the battle-tested task drag flow
- Conflate two unrelated layout registries (tab X-positions vs task Y-positions)

A focused ~450-line system is clearer, safer, and independently testable.

**No interference with existing DragProvider:** On web, `DragProvider` wraps the task panes while `TabDragProvider` wraps the tab bar above them. They occupy different parts of the component tree and use independent gesture detectors and contexts. No shared state or gesture conflicts.

## File Changes Overview

### New Files (4)

| File                                     | Purpose                                             | ~Lines |
| ---------------------------------------- | --------------------------------------------------- | ------ |
| `types/tab-drag.ts`                      | Type definitions for tab drag system                | ~50    |
| `components/tab-drag/TabDragProvider.tsx` | Context provider + horizontal drop zone calculation | ~200   |
| `components/tab-drag/DraggableTab.tsx`    | Wraps `ListTab` with pan gesture + animated styles  | ~180   |
| `components/tab-drag/index.ts`           | Barrel exports                                      | ~5     |

### Modified Files (5)

| File                        | Change                                               | Scope           |
| --------------------------- | ---------------------------------------------------- | --------------- |
| `store/AppContext.tsx`       | Add `REORDER_LISTS` action                           | ~15 lines added |
| `hooks/useAppData.ts`       | Add `reorderLists` dispatcher                        | ~10 lines added |
| `components/ListTabBar.tsx`  | Wrap tabs with `TabDragProvider`, use `DraggableTab` | Medium rewrite  |
| `components/ListTab.tsx`     | Remove `onLongPress`, add `isDragged` prop           | Small rewrite   |
| `app/(tabs)/index.tsx`       | Pass `reorderLists`, rebuild `selectedListIds` order | Small addition  |

### Unchanged (Sync is free)

The existing persistence pipeline (`useAppData` persistence effect -> `storage.setLists()` -> Supabase diff) already watches `state.lists`. When `REORDER_LISTS` updates `sortOrder` values, the diff engine detects the change and pushes `ListRow` updates to Supabase. **No sync code changes needed.**

**Known limitation:** Concurrent reorders from two devices will produce `sortOrder` conflicts resolved by last-write-wins. Acceptable for a single-user app.

---

## Implementation Steps

### Step 1: Type Definitions (`types/tab-drag.ts`)

Define the minimal types for the tab drag system:

```typescript
export interface TabLayout {
  tabId: string;
  x: number;        // absolute X position (via measureInWindow)
  width: number;
  index: number;     // current visual index in sorted list
}

export interface TabDragState {
  isDragging: boolean;
  draggedTabId: string | null;
  insertAtIndex: number | null;  // where the tab will land
}

export interface TabDragContextValue {
  dragState: TabDragState;
  registerTab: (layout: TabLayout) => void;
  unregisterTab: (tabId: string) => void;
}
```

### Step 2: Reducer Action (`store/AppContext.tsx`)

Add `REORDER_LISTS` to `AppAction` union and reducer:

```typescript
| {
    type: "REORDER_LISTS";
    payload: { listIds: string[] };  // new order by ID
  }
```

Reducer logic:
- Map each list ID to its new `sortOrder` based on array index
- Return new lists array with updated `sortOrder` values

**Why `listIds: string[]` instead of `fromIndex/toIndex`?** Consistent with existing `REORDER_CATEGORIES` pattern. Avoids off-by-one edge cases with index arithmetic. The caller computes the final order, reducer just applies it.

### Step 3: Dispatcher (`hooks/useAppData.ts`)

Add `reorderLists` callback:

```typescript
const reorderLists = useCallback(
  (listIds: string[]) => {
    dispatch({ type: "REORDER_LISTS", payload: { listIds } });
  },
  [dispatch],
);
```

Expose in return object.

### Step 4: Tab Drag Provider (`components/tab-drag/TabDragProvider.tsx`)

Responsibilities:
- Maintain a `Map<string, TabLayout>` registry of tab positions
- Expose `registerTab`/`unregisterTab` for tabs to self-register
- Expose `dragState` (read by tabs for visual feedback and drop indicator)
- Accept `onReorder(listIds: string[])` callback from `ListTabBar`
- Calculate drop position from absolute X coordinate

**Drop zone calculation algorithm:**
1. Get all registered tab layouts sorted by X position
2. Exclude the dragged tab
3. For each remaining tab, compute its center X
4. Find where the dragged tab's center falls relative to these centers
5. Return the insertion index
6. If drag position is past the rightmost tab (toward '+' button), return last position

**Key detail: `calculateInsertIndex(absoluteX, draggedTabId)`**
- Iterates sorted layouts (excluding dragged tab)
- Returns index where dragged tab should be inserted
- Called from the dragged tab's pan gesture `onUpdate` via `runOnJS`

**Re-render mitigation (from review):** Use a `insertAtIndexRef` to track the current value. Only call `setDragState()` when `insertAtIndex` actually changes (deep-compare pattern from existing `DragProvider`). This prevents every tab from re-rendering on every gesture frame.

**Re-measurement on drag start (from review):** When `startDrag` is called, iterate all registered tab refs and call `measureInWindow` to refresh their absolute positions. This fixes stale positions after the user has scrolled the tab bar since mount.

The provider exposes internal methods (`startDrag`, `updateDrag`, `endDrag`) that `DraggableTab` calls. These are passed via a ref to avoid context re-renders on every drag frame.

### Step 5: Draggable Tab (`components/tab-drag/DraggableTab.tsx`)

Wraps `ListTab` with gesture handling. All gestures are handled here — `ListTab` becomes a pure visual component.

**Gesture composition — three gestures via `Gesture.Exclusive`:**

```typescript
// 1. Double-tap for settings (highest priority)
const doubleTap = Gesture.Tap()
  .numberOfTaps(2)
  .maxDuration(300)
  .onStart(() => {
    runOnJS(handleOpenSettings)();
  });

// 2. Long-press-activated pan for drag reorder
const longPressPan = Gesture.Pan()
  .activateAfterLongPress(300)  // CORRECT API (not Gesture.LongPress + Gesture.Pan)
  .onStart(() => { ... })
  .onUpdate(() => { ... })
  .onEnd(() => { ... })
  .onFinalize(() => { ... });

// 3. Single tap for list selection (lowest priority)
const singleTap = Gesture.Tap()
  .numberOfTaps(1)
  .maxDelay(200)  // fail faster to reduce perceived delay
  .onStart(() => {
    if (!justDraggedRef.current) {
      runOnJS(handlePress)();
    }
  });

// Compose: double-tap > long-press-pan > single-tap
const composed = Gesture.Exclusive(doubleTap, longPressPan, singleTap);
```

**Why `Gesture.Pan().activateAfterLongPress(300)` (from review):** The plan originally described `Gesture.LongPress` composed with `Gesture.Pan`. This doesn't work — `LongPress` is a discrete gesture that doesn't hand off to `Pan`. The correct RNGH v2 API is `Gesture.Pan().activateAfterLongPress(ms)`, which delays pan activation until after a hold period.

**Why existing `DraggableTask` uses `activeOffsetX/Y` instead of `activateAfterLongPress`:** Tasks need immediate drag on movement (any direction), with a small movement threshold to distinguish from taps. Tabs need a deliberate hold first because horizontal movement conflicts with ScrollView scrolling — the long-press provides clear intent disambiguation.

**Single-tap delay trade-off (from review):** With `Gesture.Exclusive(doubleTap, ..., singleTap)`, every single tap is delayed while the gesture system waits to see if a second tap is coming. The `maxDelay(200)` on the `Tap` gesture helps — it means the system fails the double-tap after 200ms of no second tap, then fires the single-tap. This is a ~200ms delay on list selection, which is the trade-off for having double-tap-to-settings. The ellipsis button provides a zero-delay alternative for settings access. **This trade-off should be tested on device** — if 200ms feels too sluggish, we can increase `maxDelay` or reconsider the double-tap approach.

**Animated styles (Reanimated):**
- `translateX`: follows finger during drag
- `scale`: subtle lift effect (1.05) when dragging
- `opacity`: 0.8 when dragging
- `zIndex`: 1000 when dragging (above siblings)
- Snap-back: `withSpring(0, SPRING.snappy)` on release (confirmed exists in `lib/animations.ts`)

**Layout registration:**
- On mount/layout change, call `viewRef.current.measureInWindow()` to get absolute X position
- Register with `TabDragProvider` via `registerTab({ tabId, x, width, index })`
- Unregister on unmount
- **Store `viewRef` in the provider's registry** so that `startDrag` can re-measure all tabs (fixes stale scroll positions)

**Interaction with ScrollView:**
- The `activateAfterLongPress(300)` naturally disambiguates from ScrollView's scroll gesture
- During drag, the ScrollView won't scroll because the pan gesture has captured the pointer
- Set `scrollEnabled={false}` on the parent ScrollView when `isDragging` for extra safety

**Drop handling:**
- `onEnd`: compute final position from `insertAtIndex`
- Build new `listIds` array by removing dragged tab and inserting at `insertAtIndex`
- Call `onReorder(listIds)` callback
- Snap-back animation via `withSpring`

**Preventing taps during/after drag:**
- `justDraggedRef` tracks if a drag just ended (150ms cooldown)
- The `singleTap` gesture checks `justDraggedRef` before firing
- This also prevents double-tap from firing on a drop + quick tap sequence

**Haptic feedback:**
- On drag start (long-press activation): `Haptics.impactAsync(Medium)`
- On drop: `Haptics.notificationAsync(Success)`
- Same pattern as `DraggableTask.tsx`

### Step 6: Update ListTab (`components/ListTab.tsx`)

Changes:
- **Remove** `onLongPress` and `delayLongPress` from `Pressable`
- **Remove** the `handleLongPress` callback
- **Remove** `onPress` from the outer `Pressable` (gestures now handled by wrapping `DraggableTab`)
- `ListTab` becomes a pure visual component (name, active state, ellipsis button)
- Add optional `isDragged` prop for visual feedback (dimmed placeholder when being dragged)
- Keep ellipsis button with `onOpenSettings` for non-gesture settings access (always visible on mobile, hover-visible on web)

**UX trade-off note (from review):** Removing long-press for settings is an intentional trade-off to free up long-press for drag reorder. Long-press was added in Phase 9.5 as a mobile convenience. The replacement (double-tap + always-visible ellipsis on mobile) is less discoverable than long-press, but the ellipsis button provides a clear visual affordance that doesn't require learning a gesture.

### Step 7: Update ListTabBar (`components/ListTabBar.tsx`)

Changes:
- Import `TabDragProvider` and `DraggableTab`
- Wrap the tab list with `<TabDragProvider onReorder={handleReorder}>`
- Replace direct `<ListTab>` rendering with `<DraggableTab>` wrapper
- Pass sorted list data and index to each `DraggableTab`
- The '+' button stays outside the drag system (fixed at end)
- Add `scrollEnabled` state that disables during drag
- New prop: `onReorderLists: (listIds: string[]) => void`

```tsx
<TabDragProvider onReorder={handleReorder}>
  <ScrollView horizontal scrollEnabled={!isDragging} ...>
    {sortedLists.map((list, index) => (
      <DraggableTab
        key={list.id}
        tabId={list.id}
        index={index}
        onPress={() => /* select/toggle logic */}
        onOpenSettings={() => onOpenSettings(list.id)}
      >
        <ListTab
          name={list.name}
          isActive={/* ... */}
          onOpenSettings={() => onOpenSettings(list.id)}
        />
      </DraggableTab>
    ))}
    {/* '+' button stays outside DraggableTab */}
    <Pressable onPress={onAddList}>...</Pressable>
  </ScrollView>
</TabDragProvider>
```

### Step 8: Wire Up in TodoScreen (`app/(tabs)/index.tsx`)

- Destructure `reorderLists` from `useAppData()`
- Pass `reorderLists` to `ListTabBar` as `onReorderLists`

**Web split-view pane order fix (from review):** After reordering, rebuild `selectedListIds` to match the new tab sort order. Currently `selectedListIds` is insertion-ordered, so reordering tabs wouldn't reorder panes without this fix:

```typescript
// In the reorder handler or via useEffect:
const sortedSelectedIds = selectedListIds
  .filter(id => lists.find(l => l.id === id))
  .sort((a, b) => {
    const listA = lists.find(l => l.id === a);
    const listB = lists.find(l => l.id === b);
    return (listA?.sortOrder ?? 0) - (listB?.sortOrder ?? 0);
  });
if (JSON.stringify(sortedSelectedIds) !== JSON.stringify(selectedListIds)) {
  setSelectedLists(sortedSelectedIds);
}
```

### Step 9: Accessibility Fallback (from review)

Add up/down arrows for list reorder in the existing list settings modal (same pattern as category reorder in `app/(tabs)/index.tsx` lines 474-490). This provides an alternative for users who cannot perform long-press + drag.

- Add "Position" section to list settings modal with up/down arrow buttons
- Reuse the same `handleMoveCategoryUp`/`Down` pattern but for lists
- Call `reorderLists` with the swapped list order

---

## Drop Indicator (v1 requirement)

**Upgraded from "optional" per review — users need visual feedback about where their tab will land.**

A thin vertical line (2px wide, primary color) rendered between tabs at the `insertAtIndex` position:

- Positioned absolutely within the ScrollView
- X position derived from the registered tab layouts: halfway between the end of the tab before and start of the tab after the insert position
- Only visible when `dragState.isDragging` is true
- Animated opacity transition (fade in/out) when position changes

Implementation: Rendered inside `TabDragProvider` as a child of the ScrollView, reading `dragState.insertAtIndex` from context.

---

## Gesture Interaction Summary

| Gesture             | Mobile          | Web                       | Result                                                        |
| ------------------- | --------------- | ------------------------- | ------------------------------------------------------------- |
| Single tap          | Select list     | Toggle list in split-view | ~200ms delay (double-tap disambiguation)                      |
| Double-tap (300ms)  | Open settings   | Open settings             | **New** (replaces long-press on mobile)                       |
| Long-press + drag   | Drag to reorder | Drag to reorder           | **New** (uses `activateAfterLongPress(300)`)                  |
| Ellipsis button tap | Open settings   | Open settings             | Unchanged (zero-delay, always visible on mobile)              |
| Horizontal scroll   | Scroll tab bar  | Scroll tab bar            | Unchanged (no conflict — long-press gates drag activation)    |

## Visual Feedback During Drag

| Element                 | Style                                                  |
| ----------------------- | ------------------------------------------------------ |
| Dragged tab             | `scale: 1.05`, `opacity: 0.8`, shadow, `zIndex: 1000` |
| Dragged tab placeholder | `opacity: 0.3` (ghost at original position)            |
| Drop indicator          | 2px vertical line, primary color, at insert position   |
| Other tabs              | Normal appearance (no movement animation in v1)        |

**v1 simplification:** Tabs don't animate to make room during drag. The dragged tab snaps to its new position on drop. This avoids the complexity of animated layout shifts in a horizontal ScrollView. Can be added later if it feels incomplete.

## Edge Cases

| Case                             | Behavior                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| Only 1 list exists               | Drag gesture still activates but drop is no-op (same position)                              |
| Drag past left/right edge        | Clamp to first/last position                                                                |
| Drag past '+' button             | Same as drag past right edge — lands in last position                                       |
| Drag and release without moving  | Cancel drag, snap back, no reorder                                                          |
| Double-tap then immediately drag | Double-tap wins (`Gesture.Exclusive`) — settings opens, no drag                             |
| Drop then quick tap              | `justDraggedRef` (150ms cooldown) suppresses both single-tap and double-tap after drag      |
| Tab bar scrolled before drag     | `startDrag` re-measures all tabs via `measureInWindow` — positions are fresh                |
| New list added during drag       | Unlikely edge case; new tab won't be registered until next layout pass                      |
| Web: pane order after reorder    | `selectedListIds` rebuilt to match new `sortOrder` — panes reorder automatically            |

## Sync Considerations

- `sortOrder` changes flow through existing persistence pipeline:
  1. `REORDER_LISTS` reducer updates `list.sortOrder` values
  2. Persistence effect detects `state.lists` change
  3. `storage.setLists()` writes to AsyncStorage (immediate)
  4. `computeDiff()` detects `sort_order` change in `ListRow`
  5. `pushDiff()` upserts updated rows to Supabase (debounced 500ms)
- No new Supabase tables, columns, or RLS policies needed
- Cross-device sync: list order updates appear on other devices via Realtime subscription
- **Concurrent reorder limitation:** Two devices reordering simultaneously will resolve via last-write-wins on `sort_order`. Acceptable for single-user app.

## Testing Strategy

1. **Web first** (fastest feedback):
   - Double-tap opens settings
   - Long-press + drag reorders tabs
   - Single click still selects/toggles lists in split-view (test ~200ms delay acceptability)
   - Ellipsis still opens settings
   - Tab order persists across page refresh
   - Split-view pane order updates to match new tab order
   - Drop indicator appears at correct position during drag
2. **iOS** (native gestures):
   - Long-press haptic fires on drag start
   - Double-tap opens settings
   - Scroll vs drag doesn't conflict
   - Tab order syncs to Supabase
   - Single-tap delay is acceptable on device
3. **Cross-device sync**:
   - Reorder on web, verify order on mobile (and vice versa)
4. **Accessibility**:
   - Up/down arrows in list settings modal reorder lists correctly

## Estimated Scope

- ~435 lines of new code across 4 new files
- ~80 lines of modifications across 5 existing files
- No new dependencies
- No database schema changes

---

## Review Issues Addressed

| Review Issue | Resolution |
|---|---|
| #1 Critical: `Gesture.LongPress` + `Gesture.Pan` won't work | Fixed: Use `Gesture.Pan().activateAfterLongPress(300)` |
| #2 Critical: Double-tap delays single-tap 300ms | Acknowledged: Set `maxDelay(200)`, test on device, ellipsis is zero-delay fallback |
| #3 Critical: Stale `measureInWindow` after scroll | Fixed: Re-measure all tabs in `startDrag` |
| #4 Concern: Removing long-press is UX regression | Acknowledged as intentional trade-off, ellipsis always visible on mobile |
| #5 Concern: Drop indicator should be v1 | Upgraded to v1 requirement |
| #6 Concern: Web pane order won't update | Fixed: Rebuild `selectedListIds` sorted by `sortOrder` after reorder |
| #7 Concern: Context re-renders every frame | Fixed: Use `insertAtIndexRef` deep-compare, only setState on change |
| #8 Concern: Concurrent reorder limitation | Documented as known limitation |
| Q3: Accessibility fallback for drag reorder | Added Step 9: up/down arrows in list settings modal |
| Q5: Double-tap firing on drop + tap | `justDraggedRef` cooldown suppresses both tap types |
| Minor: Line count inconsistency | Fixed: ~200 for provider, ~180 for DraggableTab |
| Minor: `Gesture.Race` vs `Gesture.Exclusive` | Committed to `Gesture.Exclusive` throughout |
| Minor: `SPRING.snappy` existence | Confirmed: exists in `lib/animations.ts` line 16 |
