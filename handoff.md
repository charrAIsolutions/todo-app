# Handoff Document

**Last Updated:** January 2026
**Last Session:** Completed Phase 1 (Data Foundation) and Phase 2 (Multi-List Tabs)

## Quick Start

```bash
npm install          # Install dependencies (if needed)
npx expo start --web # Start dev server on web (fastest feedback)
```

App runs at http://localhost:8081 (or 8082 if 8081 is in use).

## Current State

The app is a functional multi-list todo application with:

- Multiple todo lists (tabs at top)
- Add/toggle tasks within each list
- Data persists to AsyncStorage

**What works:**

- Create new lists via "+" button
- Switch between lists by tapping tabs
- Add tasks via input at bottom
- Toggle task completion by tapping the row
- Data persists across refreshes

**What's not built yet:**

- Categories are stored but not displayed (tasks show in a flat list)
- Subtasks data model exists but no UI
- List settings modal (rename, delete list)
- Task detail view (edit title, change category)
- Reordering tasks

## Architecture Overview

### Data Flow

```
User Action → useAppData hook → dispatch(action) → AppContext reducer → state update → re-render
                    ↓                                        ↓
              Auto-persist                              AsyncStorage
```

### Key Files

| File                          | Purpose                                          |
| ----------------------------- | ------------------------------------------------ |
| `types/todo.ts`               | Data model: TodoList, Category, Task             |
| `store/AppContext.tsx`        | React Context + useReducer (15+ actions)         |
| `hooks/useAppData.ts`         | Main hook - selectors, actions, auto-persistence |
| `lib/storage.ts`              | AsyncStorage wrapper + migration logic           |
| `app/(tabs)/index.tsx`        | Main todo screen                                 |
| `components/ListTabBar.tsx`   | List tab navigation                              |
| `components/AddTaskInput.tsx` | Task input field                                 |

### State Shape

```typescript
{
  lists: TodoList[],      // All todo lists with embedded categories
  tasks: Task[],          // All tasks (flat array, filtered by listId)
  activeListId: string,   // Currently selected list
  isLoading: boolean,
  error: string | null
}
```

### Available Actions

**Lists:** ADD_LIST, UPDATE_LIST, DELETE_LIST, SET_ACTIVE_LIST
**Categories:** ADD_CATEGORY, UPDATE_CATEGORY, DELETE_CATEGORY, REORDER_CATEGORIES
**Tasks:** ADD_TASK, UPDATE_TASK, DELETE_TASK, TOGGLE_TASK, MOVE_TASK, NEST_TASK, REORDER_TASKS

## Next Steps (Priority Order)

### 1. List Settings Modal (finish Phase 2)

Create `app/list-settings/[id].tsx` to:

- Rename a list
- Delete a list
- Manage categories (add/edit/delete)

Wire it up via long-press on list tabs (handler exists, shows Alert placeholder).

### 2. Phase 3: Categories

Display tasks grouped by category:

- Create `CategorySection.tsx` - renders category header + its tasks
- Create `CategoryHeader.tsx` - bold header with background color
- Extract `TaskItem.tsx` from index.tsx for reuse
- Uncategorized tasks go at bottom

The `tasksByCategory` selector in useAppData already groups tasks - just need UI.

### 3. Phase 4: Task Detail & Subtasks

Create `app/task/[id].tsx` modal for:

- Editing task title
- Changing task category (dropdown)
- Adding/managing subtasks

Subtask data model is ready (`parentTaskId` field).

### 4. Phase 5: Move & Reorder

Add tap-based controls:

- Move task up/down within category
- Move task to different category
- Nest task as subtask of another

### 5. Phase 6: Drag-and-Drop (Future)

Requires: `react-native-gesture-handler`, `react-native-draggable-flatlist`

## Known Issues / Tech Debt

1. **Unused "Tab Two"** - The Expo template's second tab still exists at `app/(tabs)/two.tsx`. Can be removed or repurposed.

2. **No delete task UI** - Can toggle complete but not delete. Add swipe-to-delete or delete button in task detail.

3. **Default list always created** - On first launch, "General" list with Now/Next/Later categories is auto-created. This is intentional but could be configurable.

4. **pointerEvents warning** - React Native Web shows deprecation warning. It's from the library, not our code. Can be ignored.

5. **NativeWind not set up** - Using StyleSheet.create(). NativeWind v4 is planned but deferred.

## Testing Checklist

When making changes, verify:

- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] App loads on web without errors
- [ ] Creating a new list works
- [ ] Switching lists works
- [ ] Adding tasks works
- [ ] Toggling tasks works
- [ ] Data persists after refresh

## Conventions

- **Commits:** Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- **Components:** Named exports, Props interface as `{Name}Props`
- **Styling:** StyleSheet.create() with styles at bottom of file
- **State:** All state changes through useAppData hook actions

## Important Implementation Details

### Auto-Persistence

Data automatically saves to AsyncStorage whenever `state.lists` or `state.tasks` changes. This is handled by a `useEffect` in `useAppData.ts`. No manual save calls needed.

### Migration Logic

On first load, `lib/storage.ts` checks for legacy data (old `todos` key) and migrates it to the new multi-list structure. Safe to run multiple times - only migrates if new data doesn't exist.

### Default List Creation

If no lists exist on load, a "General" list with Now/Next/Later categories is auto-created. This ensures the app always has something to display.

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
