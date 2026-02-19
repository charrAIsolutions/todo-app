# UI Cleanup Plan: Mobile UI Fixes

## Context

After TestFlight deployment (Phase 9), four mobile UI issues were identified:
1. Inconsistent Switch color in list settings
2. Layout overflow on the "Show on Open" toggle row
3. Dark mode not applying to NativeWind-styled components on native (only navigation bar works)
4. No long-press gesture to access list settings from tab

These are all mobile-specific issues that don't affect web.

---

## Fix 1: "Show on Open" Switch Track Color

**File:** `app/(tabs)/index.tsx` (~line 815)

**Problem:** The Switch has no `trackColor` prop, defaulting to iOS green. The "Show Completed" Switch in `app/modal.tsx` already uses blue.

**Change:** Add `trackColor={{ false: "#767577", true: "#3b82f6" }}` to the Switch component, matching the pattern in `app/modal.tsx:84-88`.

**Risk:** None.

---

## Fix 2: "Show on Open" Toggle Text Overflow

**File:** `app/(tabs)/index.tsx` (~line 807)

**Problem:** The inner `<View>` wrapping the text labels has no `flex-1`, so on narrow screens the text pushes the Switch off-screen. The equivalent row in `app/modal.tsx:76` uses `<View className="flex-1 mr-4">`.

**Change:** Add `flex-1` class to the inner View wrapping the "Show on open" text labels.

**Risk:** None. Standard flex layout fix.

---

## Fix 3: Dark Mode on Native

**File:** `app/global.css` (line 20)

**Problem:** NativeWind's native CSS-to-RN pipeline (in `react-native-css-interop`) has a function `isRootDarkVariableSelector` (at `normalize-selectors.ts:482-503`) that only recognizes:
- `.dark:root { }`
- `:root[class~="dark"] { }`

Our `global.css` uses a bare `.dark { }` selector, which on native is treated as a regular class selector — NOT as the dark variant of root variables. The dark CSS variable values never get registered with `subtype: "dark"`, so `colorScheme.set("dark")` has no dark values to switch to.

On web this works because `.dark` is literally added/removed as a class on `document.documentElement` via DOM manipulation, and standard CSS cascading handles it. On native there's no DOM.

The navigation bar still works because it bypasses NativeWind entirely — it uses `SemanticColors` from `lib/colors.ts` via `getColors(effectiveScheme)`.

**Change:** In `app/global.css` line 20, change `.dark {` to `.dark:root {`. Add a comment above explaining why `.dark:root` is required (reviewer feedback — prevents future developers from "simplifying" it back to `.dark`).

**Why NOT `darkMode: "media"`:** NativeWind's `useColorScheme()` hook (in `nativewind/src/stylesheet.ts`) throws an error if you call `setColorScheme()` or `toggleColorScheme()` when dark mode is `"media"`. Our `ThemeContext` relies on `colorScheme.set()` for manual theme override. Must stay on `"class"`.

**Why `.dark:root` works on both platforms:**
- **Native:** NativeWind's Metro transform recognizes `.dark:root` via `isRootDarkVariableSelector`, stores variables with `subtype: "dark"`, and serves them when `colorScheme.get()` returns `"dark"`.
- **Web:** `.dark:root` is valid CSS — `:root` matches `<html>`, and `.dark` class is added to `<html>` by `colorScheme.set()`. Higher specificity than `:root` alone, so dark overrides win.

**Risk:** Medium (highest of the four fixes). Requires Metro cache clear and cross-platform verification.

---

## Fix 4: Long Press on List Tab

**File:** `components/ListTab.tsx` (~line 27)

**Problem:** List settings are only accessible via a 14px ellipsis icon inside the tab — hard to tap on mobile. Long press is a natural mobile gesture for contextual menus.

**Changes:**
1. Add `onLongPress` to the outer `Pressable` component, wired to `onOpenSettings`
2. Add `delayLongPress={300}` — default 500ms feels sluggish for a settings shortcut (reviewer feedback)
3. Add haptic feedback (`expo-haptics` `ImpactFeedbackStyle.Medium`) on long press, matching the pattern in `components/drag/DraggableTask.tsx` — guard with `Platform.OS !== "web"` check
4. Keep the ellipsis visible on mobile for discoverability (users need a visual hint that settings exist)

**Risk:** Low. `onLongPress` is a standard Pressable prop. No interference with `onPress` or drag-and-drop (drag uses `GestureDetector` on `DraggableTask` in the task list area, not on `ListTab`).

---

## Implementation Order

1. **Fixes 1 + 2** together (trivial, zero risk) — one commit
2. **Fix 4** (small, low risk) — one commit
3. **Fix 3** (dark mode, highest impact) — own commit for clean revert point

### Commit plan:
```
fix: match Switch trackColor and fix text overflow in list settings
feat: add long-press on list tab to open settings
fix: use .dark:root selector in global.css for native dark mode
```

---

## Verification

### Fixes 1 + 2:
- Open list settings modal on mobile
- "Show on Open" toggle track should be blue when enabled
- Toggle row text should wrap properly, Switch stays visible on narrow screens
- Compare visually with "Show Completed" in app Settings modal

### Fix 3 (test in this order):
1. Clear Metro cache: `npx expo start --clear`
2. **Web first:** Toggle dark mode in Settings — all components should switch (regression test). Verify `.dark` class is added to `<html>` element (not `<body>`) via browser DevTools.
3. **iOS simulator:** Toggle dark mode — backgrounds, text, surfaces should all switch (not just nav bar)
4. **Android emulator:** Same test as iOS — NativeWind's Metro transform runs for both platforms (reviewer feedback)
5. **System preference:** Set device to dark mode, app to "system" — should follow device
6. **Persistence:** Force-quit in dark mode, relaunch — should stay dark

### Fix 4:
- Long-press a list tab on mobile — settings modal should open with haptic feedback
- Short tap still switches/selects list (no interference)
- Ellipsis icon still visible and tappable
- Web: long-press also works; hover ellipsis still works independently

---

## Critical Files

| File | Changes |
|------|---------|
| `app/(tabs)/index.tsx` | Fixes 1 + 2: `trackColor` prop, `flex-1` class |
| `app/global.css` | Fix 3: `.dark` → `.dark:root` |
| `components/ListTab.tsx` | Fix 4: `onLongPress`, haptic feedback |

### Reference files (no changes):
- `app/modal.tsx` — Pattern reference for Switch color and flex layout
- `store/ThemeContext.tsx` — Confirms `colorScheme.set()` call chain (stays unchanged)
- `lib/colors.ts` — Explains why nav bar works independently
- `components/drag/DraggableTask.tsx` — Haptic feedback pattern to reuse

---

## Follow-up Items (out of scope)

- **Hardcoded Switch trackColor:** Both `app/modal.tsx` and `app/(tabs)/index.tsx` use hardcoded `#3b82f6` (light-mode blue). After Fix 3 ships and dark mode works, this won't adapt — dark-mode primary is `rgb(10, 132, 255)`. Consider extracting Switch track colors into a theme-aware constant. (Reviewer feedback — not blocking this changeset.)
