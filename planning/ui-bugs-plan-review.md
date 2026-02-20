# Review: UI Bugs Fix Plan (Phase 10.1)

**Reviewer:** Staff Engineer (automated review)
**Date:** 2026-02-20
**Plan file:** `planning/ui-bugs-plan-spec.md`

---

## Critical Issues

None. The three bugs are real, the root causes are correctly diagnosed, and the proposed fixes are minimal and targeted.

---

## Concerns

### 1. Bug 1: `useHeaderHeight` on web returns 0 when header is hidden

In `app/(tabs)/_layout.tsx`, the header is controlled by `headerShown: useClientOnlyValue(false, true)`. On web, during SSR this returns `false` (header hidden). After hydration it returns `true`. The `useHeaderHeight` hook should return the correct value on native (which is where this bug matters), but double-check that passing `keyboardVerticalOffset={0}` on web (where KAV is basically inert anyway) does not cause any visual regression. This is low risk but worth a 30-second visual check on web after implementation.

### 2. Bug 1: `behavior="height"` on Android with offset

The plan adds `keyboardVerticalOffset={headerHeight}` unconditionally, but on Android the `behavior` is `"height"` (not `"padding"`). The `keyboardVerticalOffset` prop interacts differently with `"height"` behavior -- it shrinks the view by the keyboard height minus the offset, which can cause the content to not shrink enough if the offset is wrong. On Android, an alternative is `behavior={undefined}` (no adjustment) and relying on `android:windowSoftInputMode="adjustResize"` in the manifest, which Expo sets by default. Worth testing on Android specifically. If it regresses on Android, consider making the offset iOS-only:

```tsx
keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
```

### 3. Bug 2: Keyboard dismiss timing vs. gesture activation

`Keyboard.dismiss()` is asynchronous -- it triggers the keyboard hide animation but the content layout shift (from `KeyboardAvoidingView` restoring content position) takes ~250-300ms. The drag gesture's `onStart` fires immediately, so `handlers.onDragStart(startX, startY)` captures the absolute position while the content is still mid-animation from the KAV shrinking back. This means the initial Y coordinate captured in `dragStartY` could be stale for a fraction of a second.

In practice this is likely fine because:

- The `onUpdate` handler continuously sends new absolute positions
- The drop zone calculation uses the final position, not the start
- The activation threshold (10px) adds a small delay before `onStart` fires

But if testing reveals tasks landing one category off on the first drag after keyboard dismiss, this is why. The fix would be to add a short delay before starting the drag, or to re-measure layouts after keyboard dismiss completes. Not worth pre-optimizing -- just be aware.

### 4. Bug 3: Missing `shadowColor` and `shadowOffset` reset

The proposed fix resets `shadowOpacity` and `elevation` but does not reset `shadowColor`, `shadowOffset`, or `shadowRadius`. While `shadowOpacity: 0` makes the shadow invisible (so the other values are cosmetically irrelevant), leaving stale values is inconsistent. For completeness and to prevent future confusion if someone changes the opacity logic, reset all five shadow properties:

```tsx
if (!isDragged) {
  return {
    transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
    opacity: 1,
    zIndex: 0,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  };
}
```

This is a style nit, not a functional issue -- the plan's fix will work.

---

## Questions

### 1. Is `@react-navigation/elements` a direct dependency?

The plan imports `useHeaderHeight` from `@react-navigation/elements`. I confirmed this package exists in `node_modules` as a transitive dependency of `@react-navigation/bottom-tabs`. However, it is not listed as a direct dependency in `package.json`. Expo Router / React Navigation typically re-exports this, so it should be stable, but worth confirming the import path works without adding an explicit dependency. If the import fails, try `@react-navigation/bottom-tabs` or check Expo Router's re-exports.

### 2. Are there other screens with `KeyboardAvoidingView` that need the same fix?

The plan only addresses `app/(tabs)/index.tsx`. The task detail screen (`app/task/[id].tsx`) also has text inputs. Does it use `KeyboardAvoidingView`? If so, it may need the same offset treatment. If not, and it works fine, then no action needed.

### 3. Does `Keyboard.dismiss()` work reliably on web?

The plan says these are mobile-only bugs, and `Keyboard` from `react-native` is a no-op on web. Just confirming: the `Keyboard.dismiss()` call added to `DraggableTask.tsx` will silently do nothing on web, which is correct behavior. No issue here, just documenting.

---

## What the Plan Gets Right

- All three fixes are minimal, surgical changes -- no refactoring, no new dependencies (assuming `@react-navigation/elements` import resolves), no architecture changes.
- The root cause analysis for each bug is accurate. I verified the line numbers and code structure against the actual files.
- Bug 2's "dismiss keyboard on drag start" is the right pragmatic call. Re-measuring all layouts on keyboard events would be fragile and complex.
- Bug 3's diagnosis of Reanimated's `useAnimatedStyle` not reverting omitted properties is a well-known Reanimated behavior.
- The verification checklist covers the right scenarios including regression testing for drag-and-drop.

---

## Verdict: **APPROVED**

The plan is tight, correctly diagnosed, and appropriately scoped. The concerns above are minor and can be addressed during implementation if testing reveals issues. No revision needed before starting work.
