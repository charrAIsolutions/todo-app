# Todo App - Session Handoff

> Last updated: February 2026 | Version: 0.0.8.6

## Quick Start

```bash
# Start dev server (web - fastest feedback)
npx expo start --web

# If port 8081 is busy, use alternate port
npx expo start --web --port 8083

# TypeScript check
npm run typecheck

# Run tests
npm run test

# Build static web export
npm run build:web

# Manual deploy to Vercel
vercel --prod
```

## Deployment

- **Platform**: Vercel (static hosting)
- **Production URL**: https://todo-app-ten-blush-46.vercel.app
- **Auto-deploy**: Pushes to `main` trigger automatic builds via GitHub integration
- **Config**: `vercel.json` — build command, SPA rewrites, static asset caching headers
- **Manual deploy**: `vercel --prod` from project root

## What's Built (Phase 1-8 Complete)

### Core Features

- **Multi-list system**: Create, rename, delete lists with categories
- **Categories**: Now/Next/Later (default) + custom categories per list
- **Tasks**: Add, edit, complete, delete tasks
- **Subtasks**: One level deep nesting via parentTaskId
- **Drag-and-drop**: Reorder tasks, move between categories, nest/unnest
- **Cross-list drag**: Drag tasks between lists in web split-view
- **Web split-view**: Display multiple lists side by side (web only)
- **Task detail modal**: Edit title, change category, manage subtasks, delete

### Phase 8 Polish (sub-phases 8a-8e)

- **8a: UI Animations** - Checkbox pulse, task entry/exit, button press feedback, modal transitions
- **8b: Dark Mode** - NativeWind v4 migration, CSS variables, theme toggle (Light/Dark/System)
- **8c: Loading Skeletons** - Skeleton UI mirrors real layout, synchronized pulse, splash screen covers hydration
- **8d: Empty States** - Context-aware messaging (no tasks, all caught up, no list selected)
- **8e: Cross-List Drag** - Drag between lists in web split-view, lifted DragProvider, subtask unnest bug fix

### Platform Support

| Feature                     | Web | iOS | Android |
| --------------------------- | --- | --- | ------- |
| Basic CRUD                  | Yes | Yes | Yes     |
| Drag-and-drop (within list) | Yes | Yes | Yes     |
| Cross-list drag             | Yes | N/A | N/A     |
| Split-view                  | Yes | N/A | N/A     |
| Haptic feedback             | N/A | Yes | Yes     |
| Dark mode                   | Yes | Yes | Yes     |
| Loading skeleton            | Yes | Yes | Yes     |
| Empty states                | Yes | Yes | Yes     |

## Architecture

### Key Files

```
app/(tabs)/index.tsx    # Main screen - list tabs, task display, split-view, ListPane component
app/task/[id].tsx       # Task detail modal
app/_layout.tsx         # Root layout (providers, splash screen, GestureHandlerRootView)
app/global.css          # CSS variables for light/dark theming
app/modal.tsx           # Settings screen (theme toggle)
store/AppContext.tsx    # State management (Context + useReducer, 15+ actions)
store/ThemeContext.tsx  # Theme state (light/dark/system)
hooks/useAppData.ts     # Data selectors and action dispatchers
hooks/useTheme.ts       # Theme preference + effective scheme
lib/animations.ts       # Shared animation constants (SPRING, DURATION, SKELETON)
lib/storage.ts          # AsyncStorage persistence (includes theme)
lib/colors.ts           # Semantic color values for React Navigation
components/drag/        # Drag-and-drop system (cross-list capable)
components/skeleton/    # Loading skeleton components
components/EmptyState.tsx # Context-aware empty state (full/compact modes)
```

### State Flow

```
User Action -> useAppData dispatch -> AppContext reducer -> AsyncStorage
                                           |
                              Component re-render <- State update
```

### Data Model

- **TodoList**: Contains categories (embedded), has showOnOpen flag
- **Category**: Belongs to a list, has sortOrder
- **Task**: Belongs to list + optional category, optional parentTaskId for subtasks

### Drag System Architecture

- Single `DragProvider` wraps all web panes (lifted for gesture continuity)
- Layout registry with composite keys (`${listId}:${categoryId}`) prevents collisions
- Pane-relative X coordinates for nest/unnest thresholds
- `"move-list"` drop zone type for cross-list moves
- `MOVE_TASK_TO_LIST` reducer moves task + subtasks to target list

### Theme System

- NativeWind v4 with CSS variables in `app/global.css`
- Semantic color tokens: `background`, `surface`, `text`, `border`, `primary`, `skeleton`, etc.
- Theme preference stored in AsyncStorage, synced with React Navigation
- No `dark:` prefix needed — colors swap automatically via CSS variables

## Known Issues

### Resolved

- ~~Dragging subtask to new category sends it to uncategorized~~ (Fixed in Phase 8e)

### Open

- **Accessibility**: `useReducedMotion` hook not implemented (Warning)
- **Accessibility**: Missing accessibility labels on checkbox/row (Suggestion)
- **Code Quality**: SPRING type too loose — should use `as const satisfies` (Suggestion)
- **Cosmetic**: Line ending warnings on Windows (LF to CRLF) — harmless
- **Cleanup**: Stray `nul` file in root (Windows artifact) — can delete
- **Cleanup**: `phase6plan.md` in root — old planning doc, can delete

### Version Drift

Code version references are behind docs:

- `app/(tabs)/_layout.tsx` shows 0.0.8.0 (should be 0.0.8.6)
- `app.json` shows 0.0.7 (should be 0.0.8)
- `package.json` shows 0.0.8 (correct for semver)

## Testing Checklist

### List Management

- [ ] Create new list (+ button)
- [ ] Rename list (settings modal)
- [ ] Delete list (danger zone confirmation)
- [ ] "Show on open" toggle persists

### Task Operations

- [ ] Add task to list
- [ ] Toggle task completion
- [ ] Edit task title (detail view)
- [ ] Delete task (with confirmation)
- [ ] Change task category

### Subtasks

- [ ] Add subtask in detail view
- [ ] Toggle subtask completion
- [ ] Convert task to subtask ("Make Subtask Of")
- [ ] Convert subtask to top-level ("Convert to Top-Level Task")

### Drag-and-Drop (Within List)

- [ ] Reorder tasks within category
- [ ] Drag task to different category
- [ ] Drag onto task to nest as subtask
- [ ] Drag subtask left to unnest
- [ ] Unnested subtask lands in correct category (not uncategorized)

### Cross-List Drag (Web Only)

- [ ] Drag task from List A to List B
- [ ] Task lands in category at drop position
- [ ] Subtasks follow parent on cross-list move
- [ ] Drop indicators show only in target pane
- [ ] Within-list drag still works in non-first panes

### Web Split-View

- [ ] Click tab to add to selection
- [ ] Click selected tab to remove
- [ ] Each pane has own add-task input
- [ ] Pane width is max(screenWidth/4, 360px)
- [ ] Horizontal scroll when lists overflow
- [ ] Lists with "Show on open" auto-selected on launch

### Dark Mode

- [ ] Theme toggle in Settings (Light/Dark/System)
- [ ] Theme persists across app restarts
- [ ] System preference detection works
- [ ] All screens use semantic color tokens

### Loading & Empty States

- [ ] Skeleton appears during initial load (no blank flash)
- [ ] Skeleton disappears when data is hydrated
- [ ] Empty list shows "No tasks yet" message
- [ ] All tasks complete shows "All caught up!" banner
- [ ] No list selected shows appropriate message
- [ ] Empty category boxes show hint text

## Recommended Next Steps

### Priority 1: iOS Deployment (Phase 9)

- Set up EAS Build
- Create app icons and splash screens
- Configure app.json for App Store
- TestFlight beta testing

### Priority 2: Cloud Sync (Phase 10 - Optional)

- Add authentication (likely Supabase or Firebase)
- Sync data across devices
- Conflict resolution strategy

### Priority 3: Accessibility Polish

- Implement `useReducedMotion` hook
- Add accessibility labels to checkbox/row
- Fix SPRING type safety (`as const satisfies`)

## Files to Ignore

These untracked files are intentional:

- `.claude/settings.local.json` - Local Claude Code settings
- `phase6plan.md` - Old planning doc (can delete)
- `nul` - Windows artifact (can delete)

## Planning Documents

Implementation plans and reviews in `planning/`:

- `emptyState-implementation-plan.md` - Phase 8d plan
- `emptyState-plan-review.md` - Phase 8d review
- `interListDrag-implementation-plan.md` - Phase 8e plan (detailed 7-step plan)
- `interListDrag-plan-review.md` - Phase 8e review (staff engineer review)

## Branch Status

- **Current branch**: `main`
- **Last commit**: `feat: add cross-list drag-and-drop for web split-view (#8)`

All changes committed and merged. Ready for Phase 9.
