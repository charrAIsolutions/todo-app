# Handoff Document

**Last Updated:** January 2026
**Last Session:** Completed Phase 5 (Tap-based Task Reordering)

## Quick Start

```bash
npm install          # Install dependencies (if needed)
npx expo start --web # Start dev server on web (fastest feedback)
```

App runs at http://localhost:8081 (or 8082 if 8081 is in use).

## Current State

The app is a functional multi-list todo application with:

- Multiple todo lists (tabs at top)
- Tasks grouped by category within each list
- Subtasks (one level deep)
- Task detail modal for editing
- List settings for rename/delete
- Task reordering and nesting via tap-based controls
- Data persists to AsyncStorage

**What works:**

- Create new lists via "+" button (with default Now/Next/Later categories)
- Switch between lists by tapping tabs
- Hover over tab to reveal settings icon (web), or long-press (mobile)
- Double-click tab also opens list settings (power-user shortcut)
- Rename and delete lists (delete has high-visibility warning)
- Add tasks via input at bottom
- Toggle task completion by tapping the checkbox
- Tap task to open detail modal
- Edit task title and change category
- **Reorder tasks** within category using up/down arrows
- **Nest tasks** as subtasks via "Make Subtask Of" picker
- **Unnest subtasks** back to top-level via "Convert to Top-Level Task" button
- Add/toggle/delete subtasks
- Delete tasks with confirmation
- Data persists across refreshes
- Active list persists (navigating back from task detail stays on correct list)

**What's not built yet:**

- Category CRUD (add/edit/delete categories within a list)
- Drag-and-drop reordering (using gesture libraries)

## Architecture Overview

### Data Flow

```
User Action → useAppData hook → dispatch(action) → AppContext reducer → state update → re-render
                    ↓                                        ↓
              Auto-persist                              AsyncStorage
```

### Key Files

| File                             | Purpose                                          |
| -------------------------------- | ------------------------------------------------ |
| `types/todo.ts`                  | Data model: TodoList, Category, Task             |
| `store/AppContext.tsx`           | React Context + useReducer (15+ actions)         |
| `hooks/useAppData.ts`            | Main hook - selectors, actions, auto-persistence |
| `lib/storage.ts`                 | AsyncStorage wrapper + migration logic           |
| `app/(tabs)/index.tsx`           | Main todo screen with list settings modal        |
| `app/task/[id].tsx`              | Task detail modal (edit, reorder, nest/unnest)   |
| `components/ListTabBar.tsx`      | List tab navigation                              |
| `components/ListTab.tsx`         | Individual tab with hover/double-click detection |
| `components/CategorySection.tsx` | Category header + tasks                          |
| `components/TaskItem.tsx`        | Task row with checkbox and indentation           |
| `components/AddTaskInput.tsx`    | Task input field                                 |

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
**Categories:** addCategory, updateCategory, deleteCategory
**Tasks:** addTask, updateTask, deleteTask, toggleTask, moveTask, nestTask, reorderTasks

## Next Steps (Priority Order)

### 1. List Settings Enhancement

Add category CRUD to list settings:

- Add new category
- Rename category
- Delete category (moves tasks to uncategorized)
- Reorder categories

### 2. Phase 6: Drag-and-Drop (Future)

Requires: `react-native-gesture-handler`, `react-native-draggable-flatlist`

- Reorder within category by dragging
- Drop on category header to move
- Drop on task to nest as subtask

### 3. UI Polish

- Completed task styling (strikethrough, muted colors)
- Empty state messages
- Loading skeletons

## Known Issues / Tech Debt

1. **pointerEvents warning** - React Native Web shows deprecation warning. It's from the library, not our code. Can be ignored.

2. **shadow\* style warning** - "shadow\*" style props deprecated, use "boxShadow". Shows in list settings modal. Low priority.

3. **NativeWind not set up** - Using StyleSheet.create(). NativeWind v4 is planned but deferred.

4. **Unused "Tab Two"** - The Expo template's second tab still exists at `app/(tabs)/two.tsx`. Can be removed or repurposed.

## Testing Checklist

When making changes, verify:

- [ ] TypeScript compiles: `npm run typecheck`
- [ ] App loads on web without errors
- [ ] Creating a new list works (gets default categories)
- [ ] Switching lists works
- [ ] Hover shows settings icon (web)
- [ ] Double-click opens list settings
- [ ] Rename and delete list work
- [ ] Adding tasks works
- [ ] Toggling tasks works
- [ ] Tapping task opens detail modal
- [ ] Editing task title/category works
- [ ] **Reordering tasks** with up/down arrows works
- [ ] **Nesting tasks** via "Make Subtask Of" works
- [ ] **Unnesting subtasks** via "Convert to Top-Level Task" works
- [ ] Adding subtasks works
- [ ] Deleting tasks works
- [ ] Data persists after refresh
- [ ] Active list persists after refresh

## Conventions

- **Commits:** Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- **Components:** Named exports, Props interface as `{Name}Props`
- **Styling:** StyleSheet.create() with styles at bottom of file
- **State:** All state changes through useAppData hook actions
- **Platform detection:** Use `Platform.OS === "web"` for web-specific code (e.g., window.confirm vs Alert.alert)

## Important Implementation Details

### Auto-Persistence

Data automatically saves to AsyncStorage whenever `state.lists`, `state.tasks`, or `state.activeListId` changes. This is handled by `useEffect` hooks in `useAppData.ts`. No manual save calls needed.

### Active List Persistence

The `activeListId` is now persisted separately. When the app loads, it restores the last active list. If that list was deleted, it falls back to the first list. This ensures navigating back from task detail stays on the correct list.

### Double-Click Detection

`ListTab.tsx` implements double-click detection using a ref to track last click time. If two clicks occur within 400ms, it triggers `onLongPress` (settings). Otherwise, it's a single click (select list). On web, a hover-reveal settings icon provides easier access.

### Task Reordering (Phase 5)

`REORDER_TASKS` action accepts:

- `taskIds`: New order of task IDs
- `categoryId`: For top-level tasks (filter by category)
- `parentTaskId`: For subtasks (filter by parent)

The reducer updates `sortOrder` for all affected tasks in one operation.

### Nesting/Unnesting Tasks

`NEST_TASK` action:

- `parentTaskId: string` - Makes task a subtask of the specified parent
- `parentTaskId: null` - Converts subtask back to top-level task

When nesting, the task inherits the parent's categoryId.

### Platform-Specific Dialogs

- **Web:** Uses `window.confirm()` and `window.prompt()` for dialogs
- **Native:** Uses React Native's `Alert.alert()`

Check `Platform.OS === "web"` before using browser APIs.

### Migration Logic

On first load, `lib/storage.ts` checks for legacy data (old `todos` key) and migrates it to the new multi-list structure. Safe to run multiple times - only migrates if new data doesn't exist.

### Default List/Categories

- New lists get default Now/Next/Later categories (not empty)
- If no lists exist on load, a "General" list is auto-created

### Expo Router Conventions

- Screens go in `app/` folder
- Dynamic routes use `[param].tsx` syntax (e.g., `app/task/[id].tsx`)
- Modals: Add to Stack in `app/_layout.tsx` with `presentation: "modal"`
- Tab screens go in `app/(tabs)/`

### Clearing Storage (for testing)

In browser dev tools console:

```javascript
localStorage.clear(); // Then refresh
```

Or add a dev button that calls:

```typescript
import { storage } from "@/lib/storage";
await storage.clearAll();
```

## Code Formatting

A Prettier PostToolUse hook is configured that auto-formats files on save. Uses double quotes and standard Prettier defaults.

## Questions?

Check `CLAUDE.md` for full project context, data model, and phase details.
