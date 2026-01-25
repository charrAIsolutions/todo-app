# Handoff Document

**Last Updated:** January 2026
**Last Session:** Completed Phase 6 (Drag-and-Drop)

## Quick Start

```bash
npm install          # Install dependencies (if needed)
npx expo start --web # Start dev server on web (fastest feedback)
```

App runs at http://localhost:8081 (or 8082 if 8081 is in use).

## Current State

The app is a fully functional multi-list todo application with:

- Multiple todo lists (tabs at top)
- Tasks grouped by category within each list
- Subtasks (one level deep)
- Task detail modal for editing
- List settings modal with category management
- Task reordering via tap-based controls OR drag-and-drop
- Drag-and-drop for reordering, moving between categories, and nesting
- Data persists to AsyncStorage

**All planned phases are complete.**

### What works:

- Create new lists via "+" button (with default Now/Next/Later categories)
- Switch between lists by tapping tabs
- Settings button ("...") in tab bar opens list settings
- Rename and delete lists (delete has high-visibility warning)
- **Category CRUD**: Add, rename, delete, reorder categories in list settings
- Add tasks via input at bottom
- Toggle task completion by tapping the checkbox
- Tap task to open detail modal
- Edit task title and change category
- **Reorder tasks** within category using up/down arrows (in detail modal)
- **Nest tasks** as subtasks via "Make Subtask Of" picker (in detail modal)
- **Unnest subtasks** back to top-level via "Convert to Top-Level Task" button
- **Drag-and-drop**: Drag tasks to reorder within category
- **Drag-and-drop**: Drag tasks between categories (drop position determines target)
- **Drag-and-drop**: Drag onto a task to nest as subtask
- **Drag-and-drop**: Drag subtask left to unnest to top-level
- Add/toggle/delete subtasks
- Delete tasks with confirmation
- Data persists across refreshes
- Active list persists (navigating back from task detail stays on correct list)
- Haptic feedback on drag (native only)

### What's not built yet:

- Completed task styling (strikethrough, muted colors)
- Due dates / reminders
- Search / filter
- iOS App Store deployment

## Architecture Overview

### Data Flow

```
User Action → useAppData hook → dispatch(action) → AppContext reducer → state update → re-render
                    ↓                                        ↓
              Auto-persist                              AsyncStorage
```

### Key Files

| File                                | Purpose                                          |
| ----------------------------------- | ------------------------------------------------ |
| `types/todo.ts`                     | Data model: TodoList, Category, Task             |
| `types/drag.ts`                     | Drag-and-drop type definitions                   |
| `store/AppContext.tsx`              | React Context + useReducer (15+ actions)         |
| `hooks/useAppData.ts`               | Main hook - selectors, actions, auto-persistence |
| `lib/storage.ts`                    | AsyncStorage wrapper + migration logic           |
| `app/_layout.tsx`                   | Root layout with GestureHandlerRootView          |
| `app/(tabs)/index.tsx`              | Main todo screen with list settings modal        |
| `app/task/[id].tsx`                 | Task detail modal (edit, reorder, nest/unnest)   |
| `components/ListTabBar.tsx`         | List tab navigation with settings button         |
| `components/ListTab.tsx`            | Individual tab button                            |
| `components/CategorySection.tsx`    | Category header + tasks (static or draggable)    |
| `components/TaskItem.tsx`           | Task row with checkbox and indentation           |
| `components/AddTaskInput.tsx`       | Task input field                                 |
| `components/drag/DragProvider.tsx`  | Drag context, state, layout registry             |
| `components/drag/DraggableTask.tsx` | Task wrapper with pan gesture + animations       |
| `components/drag/DropIndicator.tsx` | Visual drop target indicators                    |
| `components/drag/useDragDrop.ts`    | Hooks for drag state and layout registration     |

### State Shape

```typescript
{
  lists: TodoList[],      // All todo lists with embedded categories
  tasks: Task[],          // All tasks (flat array, filtered by listId)
  activeListId: string,   // Currently selected list (persisted!)
  isLoading: boolean,
  error: string | null
}
```

### Available Actions

**Lists:** ADD_LIST, UPDATE_LIST, DELETE_LIST, SET_ACTIVE_LIST
**Categories:** ADD_CATEGORY, UPDATE_CATEGORY, DELETE_CATEGORY, REORDER_CATEGORIES
**Tasks:** ADD_TASK, UPDATE_TASK, DELETE_TASK, TOGGLE_TASK, MOVE_TASK, NEST_TASK, REORDER_TASKS

### Available Dispatchers (useAppData hook)

**Lists:** addList, updateList, deleteList, setActiveList
**Categories:** addCategory, updateCategory, deleteCategory, reorderCategories
**Tasks:** addTask, updateTask, deleteTask, toggleTask, moveTask, nestTask, reorderTasks

## Next Steps (Priority Order)

### 1. UI Polish

- Completed task styling (strikethrough, muted colors)
- Empty state messages
- Loading skeletons
- Better visual feedback during drag

### 2. Additional Features

- Due dates / reminders
- Search / filter tasks
- Keyboard shortcuts (web)

### 3. Deployment

- iOS App Store build and submission
- Android Play Store (optional)

## Known Issues / Tech Debt

1. **pointerEvents warning** - React Native Web shows deprecation warning. It's from the library, not our code. Can be ignored.

2. **shadow\* style warning** - "shadow\*" style props deprecated, use "boxShadow". Shows in list settings modal. Low priority.

3. **NativeWind not set up** - Using StyleSheet.create(). NativeWind v4 is planned but deferred.

4. **Unused "Tab Two"** - The Expo template's second tab still exists at `app/(tabs)/two.tsx`. Can be removed or repurposed.

5. **Drag visual polish** - The dragged task visual could be sharper/more polished. Functional but not perfect.

## Testing Checklist

When making changes, verify:

- [ ] TypeScript compiles: `npm run typecheck`
- [ ] App loads on web without errors
- [ ] Creating a new list works (gets default categories)
- [ ] Switching lists works
- [ ] Settings button ("...") opens list settings
- [ ] Rename and delete list work
- [ ] **Category CRUD**: Add, rename, delete, reorder categories
- [ ] Adding tasks works
- [ ] Toggling tasks works
- [ ] Tapping task opens detail modal
- [ ] Editing task title/category works
- [ ] **Reordering tasks** with up/down arrows works
- [ ] **Nesting tasks** via "Make Subtask Of" works
- [ ] **Unnesting subtasks** via "Convert to Top-Level Task" works
- [ ] **Drag to reorder** within category works
- [ ] **Drag between categories** moves task to new category
- [ ] **Drag onto task** nests as subtask
- [ ] **Drag subtask left** unnests to top-level
- [ ] Adding subtasks works
- [ ] Deleting tasks works
- [ ] Data persists after refresh
- [ ] Active list persists after refresh

## Conventions

- **Commits:** Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- **Components:** Named exports, Props interface as `{Name}Props`
- **Styling:** StyleSheet.create() with styles at bottom of file
- **State:** All state changes through useAppData hook actions
- **Platform detection:** Use `Platform.OS === "web"` for web-specific code

## Important Implementation Details

### Auto-Persistence

Data automatically saves to AsyncStorage whenever `state.lists`, `state.tasks`, or `state.activeListId` changes. This is handled by `useEffect` hooks in `useAppData.ts`. No manual save calls needed.

### Active List Persistence

The `activeListId` is persisted separately. When the app loads, it restores the last active list. If that list was deleted, it falls back to the first list.

### Drag-and-Drop System

The drag system uses react-native-gesture-handler + Reanimated:

- **DragProvider**: Wraps the task list, provides drag context and layout registry
- **DraggableTask**: Wraps TaskItem with pan gesture, handles animation
- **DropIndicator**: Shows blue line where task will be inserted
- **calculateDropZone**: Pure function that determines drop target based on cursor position

Key behaviors:

- Drag activates after 10px movement (prevents conflicts with taps)
- Categories are filtered by listId (prevents cross-list issues)
- Haptic feedback on native (expo-haptics)
- Visual lift effect (scale 1.05, shadow)

### Task Reordering

`REORDER_TASKS` action accepts:

- `taskIds`: New order of task IDs
- `categoryId`: For top-level tasks (filter by category)
- `parentTaskId`: For subtasks (filter by parent)

### Nesting/Unnesting Tasks

`NEST_TASK` action:

- `parentTaskId: string` - Makes task a subtask of the specified parent
- `parentTaskId: null` - Converts subtask back to top-level task

When nesting, the task inherits the parent's categoryId.

### Platform-Specific Dialogs

- **Web:** Uses `window.confirm()` for dialogs
- **Native:** Uses React Native's `Alert.alert()`

### Default List/Categories

- New lists get default Now/Next/Later categories
- If no lists exist on load, a "General" list is auto-created

### Clearing Storage (for testing)

In browser dev tools console:

```javascript
localStorage.clear(); // Then refresh
```

## Code Formatting

A Prettier PostToolUse hook is configured that auto-formats files on save.

## Questions?

Check `CLAUDE.md` for full project context, data model, and phase details.
