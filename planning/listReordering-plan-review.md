# List Tab Reordering - Plan Review

**Reviewer:** Staff engineer review (automated)
**Plan:** `planning/listReordering-plan-spec.md`
**Date:** 2026-02-21

---

## Critical Issues

### 1. Gesture composition pattern will not work as described

The plan proposes:

```
Gesture.Exclusive(doubleTap, longPressPan)
```

where `longPressPan` is described as `Gesture.LongPress` composed with `Gesture.Pan`. This will not work in react-native-gesture-handler v2:

- `Gesture.LongPress` is a discrete gesture. It fires its `onEnd` callback and terminates. It does not hand control to a subsequent `Gesture.Pan`.
- The correct API for "hold then drag" is a single gesture: `Gesture.Pan().activateAfterLongPress(300)`. This is what the RNGH v2 docs recommend, and it produces the exact behavior the plan describes -- a 300ms hold activates drag mode, then pan tracking begins.
- The existing `DraggableTask.tsx` (line 108) uses `Gesture.Pan()` with `activeOffsetX/Y` thresholds, not long-press. The tab system diverges from this by needing long-press (to avoid conflict with scroll), which is fine, but the composition mechanism must be correct.

**Fix:** Replace `Gesture.LongPress` composed with `Gesture.Pan` with `Gesture.Pan().activateAfterLongPress(300)`. Then compose that with the double-tap via `Gesture.Exclusive(doubleTap, longPressPan)`.

### 2. Double-tap and single-tap conflict will cause gesture interference

On web, single-click toggles list selection in split-view. Double-tap opens settings. Every double-tap begins with a single tap. The plan's `Gesture.Exclusive(doubleTap, longPressPan)` does not include single-tap at all -- that currently lives on `Pressable.onPress` inside `ListTab.tsx` (line 37).

Two problems:

**Problem A:** If `DraggableTab` wraps `ListTab` in a `GestureDetector`, and `ListTab` still has a `Pressable` with `onPress`, the inner `Pressable` will absorb the first tap before the outer `GestureDetector` can evaluate it for double-tap. Every double-tap will fire `onPress` (toggling the list) on the first tap, then open settings on the second.

**Problem B:** Even if `onPress` is lifted out of the `Pressable` and routed through the gesture system as `Gesture.Tap().numberOfTaps(1)`, the gesture system must wait the full `maxDuration` (300ms) after a single tap to confirm no second tap is coming. This adds a 300ms delay to every list selection tap on mobile. The plan does not acknowledge this latency.

**Fix:** The plan must explicitly design the three-gesture composition:
```
Gesture.Exclusive(doubleTap, singleTap, longPressPan)
```
Where `singleTap` is `Gesture.Tap().numberOfTaps(1)` calling the select/toggle handler. The inner `Pressable.onPress` must be removed. The 300ms selection delay must be acknowledged as an intentional trade-off, or the plan should reconsider whether double-tap is the right trigger for settings.

### 3. `measureInWindow` gives stale positions after ScrollView scrolling

The plan states in the edge cases table: "Tab bar scrolled: `measureInWindow` gives absolute positions, so scroll offset is automatically accounted for." This is correct *at the moment of measurement*, but the plan registers positions on mount/layout change (Step 5: "On mount/layout change, call `viewRef.current.measureInWindow()`").

If the user scrolls the tab bar ScrollView after measurement but before initiating a drag, all registered `x` values are stale. `measureInWindow` captured the pre-scroll absolute positions. This is the exact scenario that occurs when a user has 6+ lists, scrolls to find a tab, then long-presses to drag it.

The existing task drag system (`DraggableTask.tsx` line 71) has the same pattern but tasks are in a stable vertical layout where scroll during interaction is less common. For horizontal tab scrolling, staleness is the common case.

**Fix:** Re-measure all registered tab positions at drag start (inside the `activateDrag` callback) by iterating registered view refs and calling `measureInWindow`. This is a small addition but prevents incorrect drop targeting.

---

## Concerns

### 4. Removing long-press for settings is a UX regression on mobile

Phase 9.5 specifically added `onLongPress` to `ListTab.tsx` with haptic feedback as a mobile improvement. The plan removes it to free long-press for drag. The replacement is double-tap, which is less discoverable on mobile. Most mobile users expect long-press on list-like items for contextual actions, not double-tap.

The ellipsis button remains, but on mobile it is always visible at 14px (line 65 of `ListTab.tsx`: `opacity` is 1 on non-web). This is a small touch target.

**Worth discussing:** Is tab reordering frequent enough to justify this trade-off? An alternative: use `Gesture.Pan().activateAfterLongPress(500)` for drag and keep a 300ms long-press for settings. The 200ms gap between settings (300ms) and drag (500ms) provides disambiguation. This keeps both gestures discoverable without introducing double-tap.

### 5. Drop indicator should not be optional

The plan says: "Optional: thin vertical line at insert position." Combined with "Tabs don't animate to make room during drag" (v1 simplification), this means the user gets no visual feedback about drop position if the indicator is skipped. The only cue would be the dragged tab's position under their finger.

Given that the task drag system already has working `DropIndicator` components, the tab drop indicator should be a v1 requirement. Without it, drag-to-reorder feels broken.

### 6. Web split-view pane order may not update on tab reorder

On web, panes render based on `selectedListIds` (see `app/(tabs)/index.tsx`). This array is insertion-ordered (tabs are added/removed via toggle). When tabs are reordered via `REORDER_LISTS` (which updates `sortOrder`), the `selectedListIds` array is not re-sorted. This means reordering tabs A, B, C to C, A, B in the tab bar will leave the panes in their original order.

The plan does not address whether panes should follow tab order. If they should (which is the intuitive behavior), either:
- `selectedListIds` needs to be rebuilt in tab sort-order after a reorder, or
- The pane rendering code needs to sort `selectedListIds` by list `sortOrder` before rendering.

### 7. Provider internal method passing is vague

The plan says methods like `startDrag`, `updateDrag`, `endDrag` are "NOT on the context -- they're passed via a ref or direct function props." These are very different patterns. Direct function props require `DraggableTab` to be a direct child of `TabDragProvider`, but the `ScrollView` sits between them in the proposed JSX (Step 7). A ref-based approach needs its forwarding mechanism specified.

The existing `DragProvider.tsx` puts everything on context and manages re-renders via deep comparison (`activeDropZoneRef` pattern, lines 126-141). The same approach works here and is simpler. For a system with roughly 5 tabs, per-frame context updates that only trigger `setState` on actual changes are fine.

---

## Questions

1. **What happens to `selectedListIds` ordering on web when tabs are reordered?** See Concern #6. This needs an explicit answer.

2. **Should the `+` button act as a drop boundary?** If a user drags a tab past all other tabs toward the `+` button, the plan says it clamps to last position. But does the drop zone calculation handle the gap between the last tab's right edge and the `+` button? The algorithm in Step 4 only considers registered tab centers.

3. **Is there an accessibility fallback for drag reorder?** The existing task system has tap-based reorder via up/down arrows in the task detail modal (Phase 5). Lists have no equivalent. Users who cannot perform long-press + drag have no way to reorder lists. Consider adding reorder arrows in the list settings modal.

4. **What prevents double-tap from firing immediately after a drag ends?** If a user drops a tab and quickly taps the same area, could the gesture system interpret the drop-end + tap as a double-tap? The `justDraggedRef` pattern suppresses `onPress`, but does it also suppress `Gesture.Tap().numberOfTaps(2)`?

5. **Does the ellipsis hover behavior flicker during drag on web?** `ListTab.tsx` (line 65) shows the ellipsis on hover. During drag, the dragged tab passes over other tabs. This could trigger hover states on tabs underneath, causing visual flicker.

---

## Minor Notes

- The architecture section estimates "~400-line system" but the file table says `TabDragProvider.tsx` is ~180 lines. These numbers disagree. The ~400 is probably the total across all new files, which matches (50 + 180 + 150 + 5 = 385).
- Step 5 says gestures are composed with "`Gesture.Race` or `Gesture.Exclusive`" -- these have different semantics. `Gesture.Exclusive` is correct (first match wins, others cancel). `Gesture.Race` allows multiple to start. The plan should commit to `Exclusive`.
- Step 5 references `SPRING.snappy` from `lib/animations.ts`. The existing `DraggableTask.tsx` uses inline spring config `{ damping: 30, stiffness: 300 }` rather than a named constant. Verify `SPRING.snappy` exists in `lib/animations.ts` or use the inline values.
- Sync pipeline claim is verified: `ListRow.sort_order` exists in `types/supabase.ts` (line 11), `computeDiff` compares lists, and `supabase-storage.ts` transforms `sortOrder` to/from `sort_order`. No sync code changes needed.
- No new dependencies required -- confirmed. All packages (`react-native-gesture-handler`, `react-native-reanimated`, `expo-haptics`) are already installed.

---

## Verdict: NEEDS REVISION

The plan is well-structured, demonstrates strong understanding of the codebase, and makes a sound architectural decision to separate tab drag from task drag. The sync strategy is correct and verified. The implementation steps are in logical dependency order.

However, three critical issues must be resolved before implementation:

1. **Gesture composition is wrong.** `Gesture.LongPress` composed with `Gesture.Pan` does not work in RNGH v2. Use `Gesture.Pan().activateAfterLongPress(300)`.
2. **Double-tap / single-tap conflict is unaddressed.** Every double-tap will fire the single-tap handler first. All three gestures (double-tap, single-tap, long-press-pan) must be composed in `Gesture.Exclusive`, and the inner `Pressable.onPress` must be removed.
3. **Stale tab positions after scroll.** Tab positions measured on mount become incorrect after horizontal scroll. Re-measure at drag start.

Additionally, Concern #6 (split-view pane order not updating) needs an explicit decision before implementation, as it affects whether `REORDER_LISTS` needs to also update `selectedListIds` ordering.
