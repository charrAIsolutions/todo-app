# Last updated: January 2026

# Version: 0.0.7.2

<!-- It is 2026, not 2025 -->

# Todo App - Claude Code Instructions

## Project Overview

Personal to-do application built for learning proper React Native patterns.

- **Stack**: Expo (React Native), TypeScript, NativeWind (Tailwind CSS)
- **Platforms**: iOS, Android, Web (single codebase)
- **User**: Single user (Charles), no auth required initially

## Identity

You are a senior React Native developer and mentor. Your student (Charles) is a fast learner with an ML background who prefers complexity-first learning. Explain the 'why' behind patterns, not just the 'how'.

## Goals

- Build a functional to-do app for personal use
- Learn proper React Native patterns
- Deploy to iOS App Store

## Tech Stack Details

- **Expo SDK**: 54 (managed workflow)
- **Styling**: StyleSheet.create() currently; NativeWind v4 planned for later
- **State**: React Context + useReducer (in `store/AppContext.tsx`)
- **Storage**: AsyncStorage via `@react-native-async-storage/async-storage`
- **Navigation**: Expo Router (file-based routing)

## Project Structure

```
app/                    # Expo Router screens (file-based routing)
  (tabs)/               # Tab navigation group
  _layout.tsx           # Root layout
components/             # Reusable UI components
  ui/                   # Base UI primitives (Button, Input, Card, etc.)
hooks/                  # Custom React hooks
lib/                    # Utilities, helpers, constants
  storage.ts            # AsyncStorage/SecureStore wrappers
  utils.ts              # General utilities
store/                  # State management (context or Zustand)
types/                  # TypeScript type definitions
```

## Code Conventions

### TypeScript

- Strict mode enabled, no `any` types
- Use interfaces for object shapes, types for unions/primitives
- Export types from dedicated files in `types/`

### Components

- Functional components only
- Use named exports (not default exports)
- Props interface named `{ComponentName}Props`
- Colocate styles with components using NativeWind classes

### NativeWind Patterns

```tsx
// Prefer className over style prop
<View className="flex-1 bg-white p-4">
  <Text className="text-lg font-bold text-gray-900">Title</Text>
</View>
```

### File Naming

- Components: PascalCase (`TodoItem.tsx`)
- Utilities/hooks: camelCase (`useTodos.ts`, `storage.ts`)
- Types: camelCase with `.types.ts` suffix when standalone

## Development Commands

```bash
npx expo start           # Start dev server
npx expo start --web     # Start web only
npx expo start --ios     # Start iOS simulator
npx expo start --android # Start Android emulator
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript compiler check
```

## Git Workflow

- Create feature branches: `feat/add-todo-form`, `fix/checkbox-state`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Commit often with small, focused changes
- Never force push to main

## Testing Approach

- Test business logic in hooks/utils
- Focus on behavior, not implementation details
- Don't over-test - prioritize critical paths

## Session Continuity

When resuming work after a break:

1. Run `git status` to see uncommitted changes
2. Run `git log --oneline -5` to review recent commits
3. Review the Completed and Phases sections below

## Data Model

```typescript
// A task list (e.g., "Work", "School", "Personal")
interface TodoList {
  id: string;
  name: string;
  sortOrder: number;
  categories: Category[];
  createdAt: string;
  showOnOpen?: boolean; // Web split-view: auto-select on launch
}

// A category within a list (e.g., "Now", "Next", "Later")
interface Category {
  id: string;
  name: string;
  sortOrder: number;
  color?: string;
}

// A task with optional subtasks
interface Task {
  id: string;
  listId: string;
  categoryId: string | null; // null = uncategorized
  parentTaskId: string | null; // null = top-level, ID = subtask
  title: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
  completedAt?: string;
}
```

**Relationships:**

- Lists contain Categories (embedded)
- Tasks belong to a List and optionally a Category
- Tasks can have Subtasks (one level deep via parentTaskId)

## Quality Standards

- No `console.log` in committed code (use proper error handling)
- Handle loading and error states for async operations
- Test on web first (fastest feedback), then verify on mobile
- Accessibility: use proper aria labels and semantic elements

## Constraints

- NO external state management libraries until local state proves insufficient
- NO over-abstraction - premature DRY is the root of complexity
- NO network features yet - keep it local-first for now
- Keep dependencies minimal - justify each addition

## Completed

### Phase 1: Data Foundation ✓

- New data model: TodoList, Category, Task with subtask support
- `store/AppContext.tsx` - Full reducer with 15+ actions
- `lib/storage.ts` - Multi-key storage + migration from legacy structure
- `hooks/useAppData.ts` - Selectors and action dispatchers
- `app/_layout.tsx` - Wrapped with AppProvider
- Default "General" list with Now/Next/Later categories on first launch

### Phase 2: Multi-List Tabs ✓

- `components/ListTabBar.tsx` - Horizontal scrollable tabs with settings button
- `components/ListTab.tsx` - Individual tab button
- `components/AddTaskInput.tsx` - Input for adding new tasks
- `app/(tabs)/index.tsx` - Main todo screen with list tabs, task list, add input, list settings modal
- Updated tab layout: renamed to "Tasks" with list icon

**Working:**

- ✅ Tabs display at top showing all lists
- ✅ Tapping a tab switches the active list
- ✅ "+" button creates a new list
- ✅ Add tasks to a list
- ✅ Toggle task completion
- ✅ List settings modal with rename, delete, category management

### Phase 3: Categories ✓

- `components/TaskItem.tsx` - Task row with checkbox and indentation support
- `components/CategoryHeader.tsx` - Bold header with background and task count
- `components/CategorySection.tsx` - Groups header + tasks for a category
- Updated `app/(tabs)/index.tsx` to display tasks grouped by category
- Category CRUD in list settings modal (add, rename, delete, reorder)

**Working:**

- ✅ Categories display as bold uppercase headers with distinct background
- ✅ Tasks appear under their assigned category
- ✅ Uncategorized tasks appear at bottom with dashed border
- ✅ Tasks slightly indented from category headers
- ✅ Subtasks render with deeper indentation
- ✅ Add/rename/delete/reorder categories in list settings

### Phase 4: Task Detail & Subtasks ✓

- `app/task/[id].tsx` - Task detail modal with title editing, category picker, subtask management
- Navigation from main list to task detail via tap
- Delete task with confirmation (web uses window.confirm, native uses Alert)
- New lists get default Now/Next/Later categories

**Working:**

- ✅ Tapping a task opens detail view
- ✅ Can edit task title
- ✅ Can change task category via picker
- ✅ Can add subtasks within a task
- ✅ Can toggle/delete subtasks
- ✅ Subtasks display inline (medium indent)
- ✅ Delete task with confirmation dialog

### Phase 4.5: List Management & Navigation ✓

- List settings modal (via "..." button in tab bar)
- Rename list functionality
- Delete list with high-visibility warning (red danger zone, shows task count)
- Active list ID now persists to storage
- Navigating back from task detail stays on the task's list

**Working:**

- ✅ Settings button ("...") opens list settings modal
- ✅ Rename list inline
- ✅ Delete list with alarming confirmation
- ✅ Active list persists across refreshes
- ✅ Back navigation stays on correct list

### Phase 5: Move & Reorder (Tap-based) ✓

- Extended `REORDER_TASKS` reducer to support subtask reordering via `parentTaskId`
- Added `reorderTasks` dispatcher in `hooks/useAppData.ts`
- Position section in task detail modal with up/down arrows
- Nest/Unnest section: "Make Subtask Of" for top-level tasks, "Convert to Top-Level Task" for subtasks

**Working:**

- ✅ Can reorder tasks within a category (up/down arrows)
- ✅ Can move task to different category (existing category picker)
- ✅ Can convert task to subtask of another task ("Make Subtask Of" list)
- ✅ Can "unnest" a subtask back to top-level ("Convert to Top-Level Task" button)
- ✅ Position section only shows when multiple siblings exist
- ✅ Up/down buttons disable appropriately at boundaries

### Phase 6: Drag-and-Drop ✓

- Custom drag-drop using react-native-gesture-handler + Reanimated
- `components/drag/DragProvider.tsx` - Context for drag state + layout registry
- `components/drag/DraggableTask.tsx` - Wraps TaskItem with pan gesture + animations
- `components/drag/DropIndicator.tsx` - Visual drop target indicators
- `components/drag/useDragDrop.ts` - Hooks for drag state and layout registration
- `types/drag.ts` - Type definitions for drag system
- `app/_layout.tsx` - Wrapped with GestureHandlerRootView

**Working:**

- ✅ Drag tasks to reorder within a category
- ✅ Drag tasks between categories (drop position determines new category)
- ✅ Drag onto a task to nest as subtask
- ✅ Drag subtask left to unnest back to top-level
- ✅ Reorder subtasks within parent
- ✅ Haptic feedback on drag start/drop (native only)
- ✅ Visual lift effect and drop indicators
- ✅ Works on web, iOS, and Android

### Phase 7: Web Split-View ✓

- Web-only multi-list split view for displaying multiple lists side by side
- `hooks/useAppData.ts` - Added `selectedListIds`, `setSelectedLists`, `toggleListSelection`
- `store/AppContext.tsx` - Added `SET_SELECTED_LISTS`, `TOGGLE_LIST_SELECTION` actions
- `components/ListTabBar.tsx` - Updated to support multi-select on web (click adds/removes from selection)
- `components/ListTab.tsx` - Ellipsis settings button inside tab (hover-only visibility on web)
- `app/(tabs)/index.tsx` - Split view rendering with independent panes per selected list
- `TodoList.showOnOpen` - New field to auto-select lists on web launch

**Working:**

- ✅ Web: Click unselected tab to add to split view, click selected tab to remove
- ✅ Mobile: Single-list view only (tap replaces active list)
- ✅ Each list pane has its own title, scrollable task view, and add-task input
- ✅ List pane width: max(screen width / 4, 360px)
- ✅ Horizontal scrollbar when total pane width exceeds screen
- ✅ "Show on open" toggle in list settings modal
- ✅ Lists with "Show on open" auto-selected on web launch
- ✅ Selected tabs use blue active styling
- ✅ Ellipsis appears on tab hover (web) for settings access
- ✅ Deleting a selected list removes it from selection

**Non-goals (intentional):**

- Cross-list drag-and-drop (drag stays within single list)
- Multi-list view on mobile

## Current State

**Done (Phases 1-7):**

- Full data model with lists, categories, tasks, subtasks
- Multi-list tabs with web split-view
- Drag-and-drop reordering (within lists)
- Task detail modal with all CRUD operations
- "Show on open" for web launch preferences
- Local storage persistence

**In Progress:**

- None - all planned phases complete

**Next (suggested):**

- Phase 8: Polish & UX improvements (animations, empty states, onboarding)
- Phase 9: iOS App Store deployment (EAS Build, app icons, splash screens)
- Phase 10: Cloud sync (optional - requires auth)

## Phases

(Phases 1-7 complete)

## Versioning

Format: `Release.PreRelease.Phase.Change`

- **Release** (0): Major release version (0 = pre-release)
- **PreRelease** (0): Stable pre-release version (0 = unstable)
- **Phase** (7): Development phase number
- **Change** (2): Incremental change within phase

Example: `0.0.7.2` = Release 0, PreRelease 0, Phase 7, Change 2

Display title shows full version (0.0.7.2), package.json uses semver (0.0.7).

## Notes

- This is a learning project - explain patterns and decisions as we build
- Prefer simplicity over premature optimization
- Cross-platform: always consider if a solution works on all 3 platforms

## Learning Focus Areas

When implementing features, explain:

- Why this pattern over alternatives
- What problems this structure prevents
- How this connects to broader React/React Native concepts
