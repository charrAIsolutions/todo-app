# Open Issues

Issues identified during Phase 8 code review and testing that have not yet been addressed.

---

## Bugs

### Bug: Dragging subtask to new category sends it to uncategorized

**Severity:** High
**Component:** Drag-drop system

**Description:**
When trying to drag a subtask into a new category as a top-level task, it automatically goes to the bottom of uncategorized instead of the intended category.

**Expected behavior:**
Dragging a subtask and dropping it into a category should convert it to a top-level task in that category.

**Actual behavior:**
The subtask ends up at the bottom of the uncategorized section regardless of where it was dropped.

---

## Code Quality

### Issue 6: SPRING type is too loose

**Severity:** Suggestion
**File:** `lib/animations.ts:14`

```tsx
export const SPRING: Record<string, WithSpringConfig> = { ... }
```

The type `Record<string, WithSpringConfig>` allows any string key, so `SPRING.typo` compiles without error (resolves to `WithSpringConfig | undefined`). Compare with `DURATION`, which uses `as const` and provides autocomplete + typo detection.

**Recommended fix:**

```tsx
export const SPRING = {
  default: { damping: 15, stiffness: 150 },
  snappy: { damping: 20, stiffness: 300 },
  bouncy: { damping: 10, stiffness: 100 },
  gentle: { damping: 20, stiffness: 100 },
} as const satisfies Record<string, WithSpringConfig>;
```

---

## Accessibility

### Issue 7: useReducedMotion hook not implemented

**Severity:** Warning
**File:** `lib/animations.ts` (missing)

The implementation plan specified a `useReducedMotion` hook to respect iOS/Android "Reduce Motion" accessibility settings. This was marked as required for "critical paths (8.1, 8.2)" but was not implemented.

Users with reduced motion enabled will still see all animations, which can cause discomfort or accessibility issues.

**Recommended fix:**
Implement the hook as specified in the plan:

```tsx
import { useState, useEffect } from "react";
import { AccessibilityInfo } from "react-native";

export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  return reduceMotion;
}
```

Then thread it into `TaskItem` and `CategorySection` to conditionally skip animations.

---

### Issue 8: Checkbox and row lack accessibility labels

**Severity:** Suggestion
**File:** `components/TaskItem.tsx:84-100`

The nested `Pressable` components (checkbox and row) have no `accessibilityLabel` or `accessibilityRole`. Screen reader users cannot distinguish "tap to open detail" from "tap to toggle complete".

**Recommended fix:**

```tsx
<Pressable
  onPress={handleToggle}
  accessibilityLabel="Toggle completion"
  accessibilityRole="checkbox"
  accessibilityState={{ checked: task.completed }}
>
```

And for the outer pressable:

```tsx
<Pressable
  accessibilityLabel={task.title}
  accessibilityRole="button"
  ...
>
```

---

## Minor / Informational

### Issue 9: AnimatedPressable placement comment

**Severity:** Informational
**File:** `components/AddTaskInput.tsx:17`

```tsx
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
```

This is correctly placed at module scope (not inside the component). If it were inside the component, React would see a new component type on every render and unmount/remount the element. This is fine as-is but worth a comment for future maintainers.

---

### Issue 10: Redundant animation option on modal

**Severity:** Suggestion
**File:** `app/_layout.tsx:67-73`

```tsx
options={{
  presentation: "modal",
  title: "Task Details",
  animation: "slide_from_bottom",
}}
```

With Expo Router and `react-native-screens`, `presentation: "modal"` already defaults to `slide_from_bottom` on iOS. The explicit `animation` prop is redundant on iOS and may override better native defaults on Android.

**Recommendation:**
Can be safely removed if current behavior was not intentionally tested and confirmed.

---

## Summary

| #   | Type          | Severity   | Description                                    |
| --- | ------------- | ---------- | ---------------------------------------------- |
| -   | Bug           | High       | Subtask drag to category goes to uncategorized |
| 6   | Code Quality  | Suggestion | SPRING type allows typos                       |
| 7   | Accessibility | Warning    | useReducedMotion hook missing                  |
| 8   | Accessibility | Suggestion | Missing accessibility labels                   |
| 9   | Informational | Info       | Comment suggestion for AnimatedPressable       |
| 10  | Code Quality  | Suggestion | Redundant modal animation option               |
