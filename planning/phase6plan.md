# Phase 6: Drag-and-Drop

## Overview

Implement full drag-and-drop for tasks with position-based drops that determine category, order, and nesting.

## Requirements

1. **Reorder within category**: Drag task between other tasks to reorder
2. **Move between categories**: Drop position determines new category AND sort position
3. **Nesting**: Drag onto/near a task to make it a subtask
4. **Subtask dragging**: Subtasks can be reordered or unnested by dragging

## Approach

Build custom drag-drop using react-native-gesture-handler + Reanimated because:

- Current architecture uses ScrollView + map (not FlatList)
- react-native-draggable-flatlist requires FlatList
- Complex nesting logic is app-specific
- Web support is mandatory

## Dependencies

```bash
npx expo install react-native-gesture-handler
```

Already installed: react-native-reanimated@4.1.1

## New Files

```
components/drag/
  DragProvider.tsx      # Context for drag state + shared values
  DraggableTask.tsx     # Wraps TaskItem with gestures + animations
  DropZone.tsx          # Invisible hit targets + visual indicators
  DragOverlay.tsx       # Floating clone of dragged task
  useDragDrop.ts        # Hook for consuming drag context
  calculateDropZone.ts  # Pure function for drop target logic
types/drag.ts           # Type definitions
```

## Files to Modify

- `app/_layout.tsx` - Wrap with GestureHandlerRootView
- `components/CategorySection.tsx` - Use DraggableTask, add DropZones
- `app/(tabs)/index.tsx` - Wrap with DragProvider, handle onDragEnd

## Implementation Phases

### Phase 6A: Foundation

1. Install react-native-gesture-handler
2. Wrap app with GestureHandlerRootView in \_layout.tsx
3. Create types/drag.ts with type definitions

### Phase 6B: Drag Context

4. Create DragProvider with:
   - Drag state (isDragging, draggedTask, activeDropZone)
   - Reanimated shared values for position (UI thread)
   - Layout registry for drop zone calculation

### Phase 6C: Draggable Task

5. Create DraggableTask component:
   - Long press (200ms) to initiate drag
   - Pan gesture for movement
   - Lift effect animation (scale 1.05, shadow)
   - Layout measurement on mount

### Phase 6D: Drop Zone System

6. Create DropZone component:
   - Invisible measurement areas
   - Visual indicator when active (blue line)
7. Create calculateDropZone function:
   - Determines reorder vs nest vs category change
   - Uses Y position for order, X position for nesting intent

### Phase 6E: Integration

8. Update CategorySection:
   - Replace TaskItem with DraggableTask
   - Add DropZones between tasks
9. Update index.tsx:
   - Wrap with DragProvider
   - Connect onDragEnd to moveTask/nestTask/reorderTasks

### Phase 6F: Polish

10. Add haptic feedback on drag start/drop
11. Auto-scroll when dragging near edges
12. Test on web, iOS, Android

## Drop Zone Algorithm

```
For each drag position:
1. Find which category region (by Y position)
2. For each task in category:
   - If Y is in center 40% AND X is indented → NEST
   - If Y is above task center → INSERT ABOVE
   - If Y is below task center → continue to next
3. For subtasks: same logic but parentTaskId preserved
4. Dragging left (unindenting) → UNNEST to top-level
```

## Key Technical Decisions

| Decision           | Choice                               | Why                          |
| ------------------ | ------------------------------------ | ---------------------------- |
| Gesture library    | react-native-gesture-handler         | Expo compatible, web support |
| Animation          | Reanimated shared values             | 60fps on UI thread           |
| Drop calculation   | Pure function                        | Testable, predictable        |
| Visual feedback    | Animated DropIndicator               | Clear affordance             |
| Scroll during drag | Disable scroll, auto-scroll at edges | Prevents gesture conflict    |

## Edge Cases

| Case                      | Handling                         |
| ------------------------- | -------------------------------- |
| Drag onto own subtask     | Prevent (can't nest under self)  |
| Drag subtask onto sibling | Reorder within parent            |
| Drag to empty category    | Insert at position 0             |
| Fast scroll during drag   | Throttle drop zone calc to 50ms  |
| Drop outside valid zone   | Spring back to original position |

## Verification

1. `npm run typecheck` - TypeScript compiles
2. `npx expo start --web` - Test on web
3. Test checklist:
   - [ ] Long press initiates drag (not tap)
   - [ ] Dragged task has lift effect
   - [ ] Drop indicator shows insertion point
   - [ ] Reorder within category works
   - [ ] Move to different category works
   - [ ] Nest as subtask works (drag onto task)
   - [ ] Unnest subtask works (drag left)
   - [ ] Subtask reorder within parent works
   - [ ] Auto-scroll near edges
   - [ ] Cancel drag (release outside) springs back
   - [ ] Works on mobile (iOS/Android simulator)
