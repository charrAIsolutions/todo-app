# UI Cleanup Plan Review

**Plan:** `planning/ui-cleanup-plan-spec.md`
**Reviewer:** Staff engineer (automated review)
**Date:** 2026-02-19

---

## Verdict: APPROVED

This is a tight, well-scoped plan. The root cause analysis for Fix 3 (dark mode) is especially strong -- citing the exact NativeWind internal function (`isRootDarkVariableSelector`) and explaining why `.dark` works on web but not native. All four fixes are verified against the actual codebase.

---

## Critical Issues

None.

---

## Concerns

### 1. Fix 3: `.dark:root` specificity on web -- verify it actually wins

The plan claims `.dark:root` is valid CSS and higher specificity than `:root` alone. This is correct (`:root` = 0,0,1; `.dark:root` = 0,1,1). But worth a quick verification: confirm NativeWind's web runtime adds the `dark` class to the `<html>` element (which `:root` matches), not to `<body>` or some wrapper `<div>`. If the class is applied to a non-root element, `.dark:root` would never match on web. The plan's reasoning is sound, but this is the one spot where a regression could silently appear.

**Recommendation:** The verification steps in the plan already cover this (Step 2: "Web first: Toggle dark mode"). Just make sure the web regression test is done before committing, not after.

### 2. Fix 4: Long press delay and visual feedback

The plan adds `onLongPress` to the outer `Pressable` but does not mention any visual feedback during the press-and-hold window (the ~500ms before `onLongPress` fires). On iOS, a long press with no visual response can feel broken -- the user wonders "is anything happening?" Consider either:
- Adding `delayLongPress={300}` to shorten the default 500ms
- Using the `pressed` state from `Pressable`'s children render function to show a subtle opacity change or scale during the hold

Neither is blocking, but the default 500ms feels sluggish for a settings shortcut.

### 3. Hardcoded color values in Switch trackColor

Fix 1 uses `trackColor={{ false: "#767577", true: "#3b82f6" }}` matching the pattern in `app/modal.tsx`. Both instances use hardcoded hex values rather than the semantic color tokens defined in `app/global.css` and `tailwind.config.js`. This means the Switch track colors will not adapt to dark mode. In dark mode, `#767577` (the false track) may look fine against dark surfaces, but `#3b82f6` is the light-mode blue -- the dark-mode primary is `rgb(10, 132, 255)` per `app/global.css` line 29.

This is a pre-existing issue (already in `app/modal.tsx:87`), so matching the existing pattern is reasonable for consistency. But flagging it because you are literally fixing dark mode in the same changeset (Fix 3), and after Fix 3 ships, this inconsistency will become visible.

**Recommendation:** Not blocking. Could be a follow-up to extract Switch track colors into a shared constant that respects the theme, or use the `useTheme` hook to pick the right blue. But do not scope-creep this plan.

---

## Questions

### 1. Android testing?

The plan's verification section mentions iOS simulator and web but never mentions Android. The plan intro says "These are all mobile-specific issues that don't affect web" -- but Fix 3 (dark mode selector) affects Android too. NativeWind's Metro transform runs for both iOS and Android native. Does the `.dark:root` fix need separate Android verification, or does the iOS simulator test implicitly cover it?

### 2. Is `expo-haptics` imported correctly for tree-shaking on web?

Fix 4 adds `expo-haptics` to `components/ListTab.tsx`. The existing pattern in `components/drag/DraggableTask.tsx` guards with `if (Platform.OS === "web") return;`. The plan says to match this pattern. Confirm the import does not cause issues on web builds -- `expo-haptics` is a native module. In `DraggableTask.tsx`, the guard is inside a standalone function (`triggerHaptic`). In `ListTab.tsx`, you will need a similar pattern. Just make sure the haptic call is behind a platform guard, not called unconditionally in the `onLongPress` handler.

### 3. Metro cache clear -- is it documented enough for future developers?

Fix 3's verification says "Clear Metro cache: `npx expo start --clear`". This is good. But should a comment be added to `app/global.css` explaining why `.dark:root` is required instead of `.dark`? Future refactors might innocently simplify it back. A one-line comment above line 20 would save a debugging session.

---

## Minor Notes

- The line numbers in the plan (~line 807, ~line 815) are accurate against the current codebase. Good.
- The commit plan follows conventional commits correctly.
- Implementation order (trivial fixes first, dark mode last with own commit) is the right call for clean revert.
- The plan correctly identifies that `ListTab.tsx`'s `Pressable` does not conflict with the drag system's `GestureDetector` since drag gestures are on `DraggableTask` in the task list, not on tab bar items.
