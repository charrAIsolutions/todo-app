# Todo App - Agent Instructions

> This file contains essential context for AI agents working on this codebase.
> For full details, see CLAUDE.md.

## Quick Reference

- **Version**: 0.0.9.10
- **Stack**: Expo 54, React Native, TypeScript, NativeWind v4 (Tailwind CSS)
- **Styling**: NativeWind v4 with CSS variables for automatic light/dark theming
- **Animations**: react-native-reanimated (spring-based micro-interactions)
- **State**: React Context + useReducer (`store/AppContext.tsx`)
- **Storage**: AsyncStorage (`lib/storage.ts`)
- **Navigation**: Expo Router (file-based routing)
- **Theming**: NativeWind + ThemeContext (`store/ThemeContext.tsx`)

## Versioning

Format: `Release.PreRelease.Phase.Change`

- **Release**: Major release (0 = pre-release)
- **PreRelease**: Stable pre-release (0 = unstable)
- **Phase**: Development phase number
- **Change**: Incremental change within phase

Update version in:

- `CLAUDE.md` - Header (full: 0.0.9.10)
- `app/(tabs)/_layout.tsx` - Display title (currently 0.0.8.0 — needs update)
- `app/modal.tsx` - About section (currently 0.0.9.9 — needs update)
- `app.json` - Expo config (semver: 0.0.8)
- `package.json` - npm version (semver: 0.0.8)

## Project Structure

```
app/                    # Expo Router screens
  (tabs)/               # Tab navigation
    index.tsx           # Main todo screen (lists, tasks, split-view)
    _layout.tsx         # Tab bar config
  task/[id].tsx         # Task detail modal
  _layout.tsx           # Root layout (providers, splash screen)
  global.css            # CSS variables for light/dark colors
  modal.tsx             # Settings screen (theme toggle)
components/
  drag/                 # Drag-and-drop system (cross-list capable)
  skeleton/             # Loading skeleton placeholders
  EmptyState.tsx        # Context-aware empty state (full/compact modes)
  ListTabBar.tsx        # List tabs at top
  ListTab.tsx           # Individual tab (long-press for settings + haptic)
  CategorySection.tsx   # Category header + tasks
  CategoryHeader.tsx    # Bold category header with count
  TaskItem.tsx          # Task row with checkbox + theme-aware animated colors
  AddTaskInput.tsx      # New task input with press feedback
hooks/
  useAppData.ts         # Main data hook (selectors + dispatchers)
  useTheme.ts           # Theme preference + effective scheme
store/
  AppContext.tsx        # State context + reducer (15+ actions)
  ThemeContext.tsx      # Theme state (light/dark/system)
lib/
  animations.ts         # Shared constants (SPRING, DURATION, SKELETON)
  colors.ts             # Semantic color values for React Navigation
  storage.ts            # AsyncStorage wrappers (includes theme)
  utils.ts              # General utilities
types/
  todo.ts               # TodoList, Category, Task interfaces
  drag.ts               # Drag-and-drop types (includes PaneLayout)
  theme.ts              # ThemePreference, ColorScheme types
planning/               # Implementation plans and reviews
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
  moveTaskToList, // Cross-list drag
  nestTask,
  reorderTasks,
  addList,
  updateList,
  deleteList,
  setActiveList,
  setSelectedLists,
  toggleListSelection,
} = useAppData();
```

### NativeWind Theming

```tsx
// Colors adapt automatically via CSS variables -- no dark: prefix needed
<View className="bg-surface text-text" />;

// Access theme state
const { preference, effectiveScheme, setPreference } = useTheme();
```

**Semantic Color Tokens:** `background`, `surface`, `surface-secondary`, `text`, `text-secondary`, `text-muted`, `border`, `primary`, `success`, `warning`, `danger`, `skeleton`

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
- Cross-list drag enabled (single lifted DragProvider wraps all panes)

### Drag-and-Drop

- Custom system using react-native-gesture-handler + Reanimated
- Single `DragProvider` wraps all panes on web (gesture continuity)
- Layout registry uses composite keys (`${listId}:${categoryId}`) for multi-list support
- Pane-relative X coordinates for nest/unnest thresholds
- `"move-list"` drop zone type for cross-list moves

### Loading State

- `SkeletonScreen` mirrors the real layout with synchronized pulse animation
- Expo splash screen extended to cover font loading + data hydration
- `isHydrated` flag in AppContext controls skeleton visibility

### Animation Patterns

- Entry animations skip initial render (`hasRendered` ref pattern)
- `LinearTransition` only in static sections (conflicts with drag-drop measurements)
- `AnimatedPressable` created at module scope to avoid remount on re-render
- Shared `SPRING` configs in `lib/animations.ts`

## Commands

```bash
npx expo start --web     # Dev server (web)
npx expo start --ios     # iOS simulator
npm run build:web        # Static web export (dist/)
npm run typecheck        # TypeScript check
npm run test             # Run tests
vercel --prod            # Manual deploy to Vercel
```

## Deployment

- **Vercel**: Auto-deploys on push to `main`
- **URL**: https://todo-app-ten-blush-46.vercel.app
- **Config**: `vercel.json` (SPA rewrites + asset caching)

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

### NativeWind Dark Mode (Important)

- Dark mode selector in `app/global.css` must be `.dark:root` (not bare `.dark`)
- NativeWind's native CSS-to-RN pipeline only recognizes `.dark:root` or `:root[class~="dark"]`
- `TaskItem.tsx` uses `useTheme()` to swap `interpolateColor` endpoints (can't use CSS vars in Reanimated)

## Current State (Phases 1-9.5 Complete)

All core features implemented through Phase 9.5:

- Multi-list tabs with split-view (web)
- Categories within lists
- Tasks with subtasks (one level)
- Drag-and-drop reordering (within and across lists)
- Task detail modal
- List/category CRUD
- "Show on open" for web launch
- UI animations (spring-based micro-interactions)
- Dark mode with NativeWind v4 (working on web + native)
- Loading skeleton UI
- Context-aware empty state messaging
- Cross-list drag-and-drop (web split-view)
- Vercel deployment (auto-deploys on push to main)
- iOS TestFlight deployment via EAS Build
- Mobile UI fixes (dark mode native, theme-aware task titles, long-press tabs)

## Known Issues

- Missing: `useReducedMotion` accessibility hook
- Suggestion: SPRING type too loose (use `as const satisfies`)
- Suggestion: Missing accessibility labels on checkbox/row
- App icon is still Expo default (needs custom icon before App Store submission)
