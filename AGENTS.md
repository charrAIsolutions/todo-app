# Todo App - Agent Instructions

> This file contains essential context for AI agents working on this codebase.
> For full details, see CLAUDE.md.

## Quick Reference

- **Version**: 0.0.7.2
- **Stack**: Expo 54, React Native, TypeScript, StyleSheet.create()
- **State**: React Context + useReducer (`store/AppContext.tsx`)
- **Storage**: AsyncStorage (`lib/storage.ts`)
- **Navigation**: Expo Router (file-based routing)

## Versioning

Format: `Release.PreRelease.Phase.Change`

- **Release**: Major release (0 = pre-release)
- **PreRelease**: Stable pre-release (0 = unstable)
- **Phase**: Development phase number
- **Change**: Incremental change within phase

Update version in:

- `app/(tabs)/_layout.tsx` - Display title (full: 0.0.7.2)
- `app.json` - Expo config (semver: 0.0.7)
- `package.json` - npm version (semver: 0.0.7)

## Project Structure

```
app/                    # Expo Router screens
  (tabs)/               # Tab navigation
    index.tsx           # Main todo screen (lists, tasks, split-view)
    _layout.tsx         # Tab bar config
  task/[id].tsx         # Task detail modal
  _layout.tsx           # Root layout (providers)
components/
  drag/                 # Drag-and-drop system
  ListTabBar.tsx        # List tabs at top
  ListTab.tsx           # Individual tab
  CategorySection.tsx   # Category header + tasks
  TaskItem.tsx          # Task row
  AddTaskInput.tsx      # New task input
hooks/
  useAppData.ts         # Main data hook (selectors + dispatchers)
store/
  AppContext.tsx        # State context + reducer
lib/
  storage.ts            # AsyncStorage wrappers
types/
  todo.ts               # TodoList, Category, Task interfaces
  drag.ts               # Drag-and-drop types
```

## Data Model

```typescript
interface TodoList {
  id: string;
  name: string;
  sortOrder: number;
  categories: Category[];
  createdAt: string;
  showOnOpen?: boolean; // Web split-view auto-select
}

interface Category {
  id: string;
  name: string;
  sortOrder: number;
  color?: string;
}

interface Task {
  id: string;
  listId: string;
  categoryId: string | null;
  parentTaskId: string | null; // null = top-level
  title: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
  completedAt?: string;
}
```

## Key Patterns

### State Management

All state flows through `useAppData()` hook:

```typescript
const {
  lists,
  tasks,
  activeListId,
  selectedListIds,
  addTask,
  updateTask,
  toggleTask,
  moveTask,
  nestTask,
  addList,
  updateList,
  deleteList,
  setActiveList,
  setSelectedLists,
  toggleListSelection,
} = useAppData();
```

### Platform Detection

```typescript
import { Platform } from "react-native";
const isWeb = Platform.OS === "web";
```

### Split-View (Web Only)

- `selectedListIds`: Array of list IDs shown in split view
- `toggleListSelection(id)`: Add/remove list from selection
- Each pane width: `Math.max(windowWidth / 4, 360)`
- Horizontal scroll when panes exceed screen width

## Commands

```bash
npx expo start --web     # Dev server (web)
npx expo start --ios     # iOS simulator
npm run typecheck        # TypeScript check
```

## Git Conventions

- Branches: `feat/`, `fix/`, `docs/`, `refactor/`
- Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- Never force push to main

## Constraints

- No external state libraries (use Context)
- No over-abstraction
- No network features (local-first)
- Test on web first, then mobile
- No `console.log` in committed code

## Current State (Phase 7 Complete)

All core features implemented:

- Multi-list tabs with split-view (web)
- Categories within lists
- Tasks with subtasks (one level)
- Drag-and-drop reordering
- Task detail modal
- List/category CRUD
- "Show on open" for web launch
