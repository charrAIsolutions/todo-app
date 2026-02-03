# Todo App - Session Handoff

> Last updated: January 2026 | Version: 0.0.7.2

## Quick Start

```bash
# Start dev server (web - fastest feedback)
npx expo start --web

# If port 8081 is busy, use alternate port
npx expo start --web --port 8083

# TypeScript check
npm run typecheck
```

## What's Built (Phases 1-7 Complete)

### Core Features
- **Multi-list system**: Create, rename, delete lists with categories
- **Categories**: Now/Next/Later (default) + custom categories per list
- **Tasks**: Add, edit, complete, delete tasks
- **Subtasks**: One level deep nesting via parentTaskId
- **Drag-and-drop**: Reorder tasks, move between categories, nest/unnest
- **Web split-view**: Display multiple lists side by side (web only)

### Platform Support
| Feature | Web | iOS | Android |
|---------|-----|-----|---------|
| Basic CRUD | Yes | Yes | Yes |
| Drag-and-drop | Yes | Yes | Yes |
| Split-view | Yes | N/A | N/A |
| Haptic feedback | N/A | Yes | Yes |

## Architecture

### Key Files
```
app/(tabs)/index.tsx    # Main screen - list tabs, task display, split-view
app/task/[id].tsx       # Task detail modal
store/AppContext.tsx    # State management (Context + useReducer)
hooks/useAppData.ts     # Data selectors and action dispatchers
lib/storage.ts          # AsyncStorage persistence
components/drag/        # Drag-and-drop system
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

## Known Issues

1. **None critical** - All Phase 7 features working as specified

### Minor/Cosmetic
- Line ending warnings on Windows (LF to CRLF) - harmless
- Stray `nul` file in root (Windows artifact) - can delete

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

### Drag-and-Drop
- [ ] Reorder tasks within category
- [ ] Drag task to different category
- [ ] Drag onto task to nest as subtask
- [ ] Drag subtask left to unnest

### Web Split-View
- [ ] Click tab to add to selection
- [ ] Click selected tab to remove
- [ ] Each pane has own add-task input
- [ ] Pane width is max(screenWidth/4, 360px)
- [ ] Horizontal scroll when lists overflow
- [ ] Lists with "Show on open" auto-selected on launch

## Recommended Next Steps

### Priority 1: Polish (Phase 8)
- Improve empty state messaging
- Add loading skeletons
- Smooth animations for list transitions
- Keyboard shortcuts for web

### Priority 2: iOS Deployment (Phase 9)
- Set up EAS Build
- Create app icons and splash screens
- Configure app.json for App Store
- TestFlight beta testing

### Priority 3: Cloud Sync (Phase 10 - Optional)
- Add authentication (likely Supabase or Firebase)
- Sync data across devices
- Conflict resolution strategy

## Files to Ignore

These untracked files are intentional:
- `.claude/settings.local.json` - Local Claude Code settings
- `phase6plan.md` - Old planning doc (can delete)
- `nul` - Windows artifact (can delete)

## Branch Status

- **Current branch**: `docs/update-from-codex`
- **Main branch**: `main`
- **Last commit**: `fix: correct split-view pane widths and enable scrollbar`

All changes committed. Ready for merge to main.
