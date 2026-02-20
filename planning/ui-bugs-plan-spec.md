# UI Bugs Fix Plan — Phase 10.1

## Context

Three mobile-specific UI bugs were identified during hands-on testing. All three relate to the interaction between the keyboard, the drag-and-drop system, and animated visual state. These bugs only affect mobile (iOS/Android) — web is unaffected.

---

## Bug 1: AddTaskInput hidden behind keyboard

**Symptom:** When you tap the AddTaskInput to type, the keyboard covers it. You can't see what you're typing.

**Root cause:** The `KeyboardAvoidingView` in `app/(tabs)/index.tsx:583` is missing `keyboardVerticalOffset`. This screen renders inside a Tabs navigator with a visible header (`headerShown: true` on native). Without the offset, KAV miscalculates how much padding to add — it doesn't account for the header height above the screen content.

**Fix:**

1. Import `useHeaderHeight` from `@react-navigation/elements` in `app/(tabs)/index.tsx`
2. Call `const headerHeight = useHeaderHeight()` inside `TodoScreen`
3. Add `keyboardVerticalOffset={headerHeight}` to the `KeyboardAvoidingView`

```tsx
// Before
<KeyboardAvoidingView
  className="flex-1 bg-background"
  behavior={Platform.OS === "ios" ? "padding" : "height"}
>

// After
<KeyboardAvoidingView
  className="flex-1 bg-background"
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={headerHeight}
>
```

**Files modified:**
- `app/(tabs)/index.tsx` — add import, call hook, add prop

---

## Bug 2: Drag-and-drop broken when keyboard is open

**Symptom:** When the keyboard is up (after typing in AddTaskInput), dragging tasks doesn't work correctly — tasks drop in wrong categories or fail to register drops.

**Root cause:** The drag system uses `measureInWindow()` to capture absolute Y coordinates of tasks and categories (see `DraggableTask.tsx:71`, `CategorySection.tsx:63`). These measurements are taken when the component mounts or re-layouts. When the keyboard appears, `KeyboardAvoidingView` pushes content up, but the layout registry still holds the old (pre-keyboard) Y coordinates. The `calculateDropZone()` function in `DragProvider.tsx:289` then compares the gesture's absolute Y against stale positions, causing drops to land in the wrong place.

**Fix:** Dismiss the keyboard when a drag starts. This is the pragmatic solution because:
- Dragging and typing don't overlap as a UX pattern
- It avoids the complexity of re-measuring all layouts on keyboard events
- The content returns to its original position, making the existing measurements valid again

1. Import `Keyboard` from `react-native` in `components/drag/DraggableTask.tsx`
2. Call `Keyboard.dismiss()` at the start of the `activateDrag` function

```tsx
// In DraggableTask.tsx, inside activateDrag callback
const activateDrag = useCallback(
  (startX: number, startY: number) => {
    Keyboard.dismiss();
    isDragActiveRef.current = true;
    justDraggedRef.current = true;
    triggerHaptic("start");
    handlers.onDragStart(startX, startY);
  },
  [handlers],
);
```

**Files modified:**
- `components/drag/DraggableTask.tsx` — add `Keyboard` import, add dismiss call

---

## Bug 3: Drag appearance stuck after no-op drop

**Symptom:** When you drag a task and release it in the same position (no actual move), it stays in the "being dragged" appearance — elevated with a shadow, slightly scaled up.

**Root cause:** In `DraggableTask.tsx:146-169`, the `animatedStyle` worklet returns two different style objects depending on `isDragged`:

- When `isDragged = true`: sets `transform`, `opacity`, `zIndex`, `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation`
- When `isDragged = false`: sets only `transform`, `opacity`, `zIndex` — does NOT reset shadow/elevation properties

In Reanimated's `useAnimatedStyle`, when a property is set in one frame and then omitted from the returned object in the next frame, it can persist at its previous value rather than reverting to default. So shadow and elevation stay stuck at their "dragged" values.

**Fix:** Explicitly reset all shadow/elevation properties in the `isDragged = false` branch.

```tsx
const animatedStyle = useAnimatedStyle(() => {
  if (!isDragged) {
    return {
      transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
      opacity: 1,
      zIndex: 0,
      // Explicitly reset shadow/elevation to prevent stuck "lifted" appearance
      shadowOpacity: 0,
      elevation: 0,
    };
  }

  return {
    transform: [
      { translateX: sharedValues.translateX.value },
      { translateY: sharedValues.translateY.value },
      { scale: sharedValues.scale.value },
    ],
    opacity: 0.95,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  };
}, [isDragged]);
```

**Files modified:**
- `components/drag/DraggableTask.tsx` — add `shadowOpacity: 0` and `elevation: 0` to non-dragged return

---

## Summary of changes

| File | Changes |
|------|---------|
| `app/(tabs)/index.tsx` | Import `useHeaderHeight`, add `keyboardVerticalOffset` to KAV |
| `components/drag/DraggableTask.tsx` | Import `Keyboard`, dismiss on drag start, reset shadow/elevation in animatedStyle |

Total: 2 files modified, ~10 lines changed.

## Verification

1. **Bug 1:** Open app on iOS/Android, tap AddTaskInput — keyboard should push the input above the keyboard so you can see what you're typing
2. **Bug 2:** Type something in AddTaskInput (keyboard open), then try to drag a task — keyboard should dismiss and drag should work correctly
3. **Bug 3:** Drag a task and release it in the same spot — it should snap back to normal appearance (no shadow, no elevation, normal scale)
4. **Regression check:** Verify normal drag-and-drop still works (reorder within category, move between categories). Verify web behavior unchanged.
