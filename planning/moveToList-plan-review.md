# Move to List -- Plan Review

**Reviewer**: Staff Engineer (automated review)
**Plan**: `planning/moveToList-plan-spec.md`
**Date**: 2026-02-21

---

## Summary

The plan adds a "Move to List" picker to the task detail modal (`app/task/[id].tsx`) using `@react-native-picker/picker`. It correctly identifies that all backend infrastructure already exists and scopes the change to a single file plus one new dependency. The plan is straightforward and low-risk.

**Verdict: APPROVE WITH CHANGES** -- two issues worth fixing before implementation, several minor items worth discussing.

---

## Critical Issues

### 1. iOS Picker UX is bad for this use case

The iOS `<Picker>` renders as a full-width wheel spinner that takes up significant vertical space and is always visible inline. It does not behave like a dropdown/select. For a "fire-and-forget" action like moving a task to another list, an always-visible wheel picker is awkward:

- It shows the full wheel even before the user decides to move anything.
- The "select a list..." placeholder trick with `selectedValue=""` may not work cleanly on iOS -- the wheel tends to default to the first real item visually, even if the value is empty.
- The wheel doesn't dismiss after selection; the user sees it spin to a value and then the modal closes, which feels jarring.

**Recommendation**: Consider using a simple list of `Pressable` buttons (like the existing "Make Subtask Of" section at lines 424-456 of `app/task/[id].tsx`) instead of `<Picker>`. This would:

- Match the existing visual language of the modal (you already have a pattern for "tap a list item to perform an action").
- Remove the need for `@react-native-picker/picker` entirely (zero new dependencies).
- Work identically on all three platforms with no platform-specific styling concerns.
- Avoid the `getColors()` / `useTheme()` additions since you can use NativeWind classes directly.

The "Make Subtask Of" section is architecturally identical: it shows a list of targets, you tap one, the action fires. "Move to List" is the same pattern with lists instead of tasks.

### 2. `selectedValue=""` on iOS wheel picker is unreliable

Even if you keep the Picker approach, `selectedValue=""` with a disabled/placeholder `Picker.Item` with `value=""` can behave inconsistently on iOS. The native `UIPickerView` does not have a true "placeholder" concept -- it will visually highlight the first item in the wheel. If the user scrolls to a list and then scrolls back to the placeholder row and releases, `onValueChange` fires with `""`, which your guard catches, but the UX of scrolling a wheel to "Select a list..." is unusual.

---

## Concerns

### 3. New native dependency for minimal UI

`@react-native-picker/picker` is a native module. Adding it means:

- New EAS build required (native code change, can't be served over-the-air).
- Adds to the native binary size.
- Another dependency to maintain for SDK upgrades.

For rendering a list of 1-5 items (typical number of lists for a single-user todo app), a `Pressable` list is simpler and requires zero new dependencies. The project's CLAUDE.md explicitly says: "Keep dependencies minimal - justify each addition."

### 4. `router.back()` race condition with state update

The handler calls `moveTaskToList()` (dispatches reducer) and then immediately calls `router.back()`. This is the same pattern used in `handleDeleteTask` (line 167/179), so it's consistent with the codebase. However, there's a subtle difference: after delete, the task screen would show "Task not found" anyway. After move, the task still exists but in a different list. If `router.back()` is slow (animation), the task detail screen could briefly re-render showing the task in its new list before the modal closes.

This is not a bug, but worth being aware of. The existing delete pattern makes this acceptable.

### 5. No confirmation dialog

Moving a task to another list is a significant action (task disappears from current view, subtasks follow). The plan calls `router.back()` immediately on selection with no confirmation. Compare this to delete, which uses `Alert.alert` / `window.confirm`. A move is less destructive than a delete (it's reversible by moving back), so skipping confirmation is defensible -- but consider whether an accidental tap on the wrong list in a Picker or Pressable list would be frustrating.

Given this is a single-user personal app, the lack of confirmation is probably fine.

---

## Questions

### 6. What happens to the task's `categoryId` in the target list?

The plan passes `null` as `targetCategoryId`, landing the task in "Uncategorized" in the target list. This is documented in the plan and matches the reducer behavior. But worth noting: if the target list has categories (e.g., Now/Next/Later), the user will need to manually re-categorize after moving. This is acceptable for v1 but could be noted in the plan as a known UX limitation.

### 7. What about the `setActiveList` effect?

The task detail screen has a `useEffect` at lines 58-62 that calls `setActiveList(task.listId)` whenever `task.listId` changes. After `moveTaskToList` dispatches, the task's `listId` changes to the target list. If the component re-renders before `router.back()` completes, this effect would fire and switch the active list to the target list. When the user navigates back, they'd land on the target list instead of the source list.

This might actually be desirable (you moved a task there, so show me that list), or it might be confusing (I was working in list A and now I'm in list B). Either way, the plan doesn't discuss this behavior. It depends on how quickly `router.back()` unmounts the component vs. how quickly the re-render fires.

This is the most important question in the review. Test this explicitly.

### 8. Should the section title show the current list name?

The section is labeled "Move to List" but doesn't tell the user which list the task is currently in. A label like "Move from [Current List]" or showing the current list name somewhere nearby would add clarity, especially if the user navigated to the task from a search or deep link in the future.

---

## Nits / Suggestions

### 9. Line number references are accurate

I verified all line references against the actual source files. They are correct or within 1-2 lines (well within tolerance for a plan document). Good.

### 10. `dropdownIconColor` is Android-only

The plan sets `dropdownIconColor={colors.textSecondary}` on the Picker. This prop only applies to Android's spinner mode. It's harmless on other platforms but worth knowing it's not doing anything on iOS/web.

### 11. Style consistency: `color` prop on `Picker.Item`

The plan uses `color={colors.text}` and `color={colors.textMuted}` on `Picker.Item`. These are raw color values from `getColors()`, which is the correct approach since `Picker.Item` doesn't support NativeWind className. This is consistent with how `TaskItem.tsx` handles `interpolateColor` (Phase 9.5). Good.

### 12. The `otherLists` memo dependency is slightly broad

```typescript
const otherLists = useMemo(() => { ... }, [lists, task]);
```

This re-computes whenever any list changes (name, sortOrder, categories, etc.) or whenever the task object reference changes. For a personal app with a handful of lists, this is negligible. Not worth optimizing.

---

## If You Go with Pressable List Instead of Picker

Here's the minimal change -- reuse the exact pattern from the "Make Subtask Of" section (lines 424-455):

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

This eliminates:

- The `@react-native-picker/picker` dependency
- The `useTheme` import
- The `getColors` import
- The `effectiveScheme` / `colors` variables
- All platform-specific Picker styling concerns

And you get:

- Visual consistency with the rest of the modal
- Works identically on iOS, Android, and web
- NativeWind classes for theming (no raw color values needed)
- Zero new dependencies

---

## Verdict: APPROVE WITH CHANGES

The plan is well-structured, correctly references existing infrastructure, and the scope is appropriately small. Two changes recommended before implementation:

1. **Strongly consider** replacing `@react-native-picker/picker` with a `Pressable` list to avoid a new native dependency and iOS UX issues. This is the same pattern already used in the modal for "Make Subtask Of".

2. **Test the `setActiveList` side effect** (question #7 above) -- after move, does the user land back on the source list or the target list? Decide which behavior you want and handle explicitly.
