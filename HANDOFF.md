# Todo App - Session Handoff

> Last updated: February 2026 | Version: 0.0.10.0

## Quick Start

```bash
# Start dev server (web - fastest feedback)
npx expo start --web

# Start with Metro cache clear (required after CSS changes like dark mode fix)
npx expo start --clear

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

# iOS build (EAS)
eas build --platform ios --profile production
eas submit --platform ios --latest
```

### Environment Variables

Supabase requires two env vars. These are already configured:

- **Local dev**: `.env.local` (gitignored) — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **EAS builds**: Set via `eas env:create --environment production` (already done)
- **Vercel**: Must be added in Vercel dashboard → Settings → Environment Variables

## Deployment

### Web (Vercel)

- **Platform**: Vercel (static hosting)
- **Production URL**: https://todo-app-ten-blush-46.vercel.app
- **Auto-deploy**: Pushes to `main` trigger automatic builds via GitHub integration
- **Config**: `vercel.json` — build command, SPA rewrites, static asset caching headers
- **Manual deploy**: `vercel --prod` from project root

### iOS (EAS Build + TestFlight)

- **Bundle ID**: `com.charr.todoapp`
- **Build service**: EAS Build (cloud-based)
- **Distribution**: TestFlight (internal testing)
- **Config**: `eas.json` (build profiles: development, preview, production)
- **Version source**: Remote (EAS manages `buildNumber` auto-increment)
- **Credentials**: Managed by EAS (not in repo — uses env vars or interactive prompts)

## What's Built (Phases 1-10 Complete)

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

### Phase 9: iOS TestFlight Deployment

- EAS Build configured and deployed to TestFlight
- App installs and runs on physical iPhone
- Privacy manifest for UserDefaults (AsyncStorage)

### Phase 9.5: Mobile UI Fixes (PR #12)

- **Dark mode on native**: `.dark` → `.dark:root` in global.css (NativeWind native pipeline recognition)
- **Theme-aware task titles**: `interpolateColor` endpoints swap based on `effectiveScheme` from `useTheme()`
- **Switch track color**: "Show on Open" toggle uses blue (matches Settings modal)
- **Text overflow fix**: `flex-1` on "Show on Open" text wrapper prevents layout overflow
- **Long-press tabs**: Long-press any list tab to open settings with haptic feedback (300ms delay)

### Phase 10: Supabase Cloud Sync

- **Auth**: Email/password via Supabase Auth with email confirmation flow
- **Sync**: Diff-based persistence with 500ms debounce, FK-ordered pushes
- **Realtime**: Cross-device sync in ~2-3 seconds via Supabase Realtime subscriptions
- **Offline**: `hasPendingSync` dirty flag + AppState foreground retry
- **Two-phase hydration**: AsyncStorage (instant) → Supabase fetch (background reconciliation)
- **Migration**: First sign-in migrates existing local data to cloud
- **Route protection**: Unauthenticated users redirected to login screen
- **Settings**: Account section with email display and sign-out (local scope only)

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
| Long-press tab for settings | Yes | Yes | Yes     |
| Auth (sign in/up/out)       | Yes | Yes | Yes     |
| Cloud sync + realtime       | Yes | Yes | Yes     |
| Offline persistence + retry | Yes | Yes | Yes     |

## Architecture

### Key Files

```
app/(auth)/login.tsx    # Login/signup screen with email confirmation
app/(auth)/_layout.tsx  # Auth route layout
app/(tabs)/index.tsx    # Main screen - list tabs, task display, split-view, ListPane component
app/task/[id].tsx       # Task detail modal
app/_layout.tsx         # Root layout (providers, auth redirect, splash screen)
app/global.css          # CSS variables for light/dark theming (.dark:root selector)
app/modal.tsx           # Settings screen (theme toggle, account section, sign-out)
store/AppContext.tsx    # State management (Context + useReducer, 15+ actions)
store/AuthContext.tsx   # Auth state (session, signIn/signUp/signOut)
store/ThemeContext.tsx  # Theme state (light/dark/system)
hooks/useAppData.ts     # Data selectors, dispatchers, sync, two-phase hydration
hooks/useRealtimeSync.ts # Supabase realtime subscriptions with echo prevention
hooks/useTheme.ts       # Theme preference + effective scheme
lib/supabase.ts         # Supabase client (lazy singleton — avoids SSR window error)
lib/supabase-storage.ts # Supabase CRUD + row ↔ app state transformations
lib/sync.ts             # Diff engine, migration, snapshot management
lib/animations.ts       # Shared animation constants (SPRING, DURATION, COLORS, SKELETON)
lib/storage.ts          # AsyncStorage persistence (theme, pendingSync, clearAppData)
lib/colors.ts           # Semantic color values for React Navigation
types/auth.ts           # AuthContextValue interface
types/supabase.ts       # DB row types (ListRow, CategoryRow, TaskRow)
components/drag/        # Drag-and-drop system (cross-list capable)
components/skeleton/    # Loading skeleton components
components/EmptyState.tsx # Context-aware empty state (full/compact modes)
components/ListTab.tsx  # Tab button with long-press settings + haptic feedback
components/TaskItem.tsx # Task row with theme-aware animated colors
```

### State Flow

```
User Action -> useAppData dispatch -> AppContext reducer -> AsyncStorage (immediate)
                                           |                      |
                              Component re-render         500ms debounce
                                                               |
                                                    computeDiff -> pushDiff -> Supabase
                                                               |
                                              Realtime subscription <- Other devices
                                                               |
                                                    fetchAll -> HYDRATE dispatch
```

### Sync Architecture

- **Two-phase hydration**: Phase 1 loads AsyncStorage (instant), Phase 2 fetches Supabase (background)
- **Debounced persistence**: 500ms debounce batches rapid changes into single Supabase push
- **Diff-based sync**: `computeDiff()` compares snapshot to current state, generates minimal upserts/deletes
- **FK-ordered push**: Deletes child→parent (tasks→categories→lists), upserts parent→child
- **Echo prevention**: 2-second timestamp window after push ignores own realtime events
- **Offline retry**: AppState listener checks `hasPendingSync` on foreground resume
- **Auth boundary**: All sync refs reset when userId becomes null (prevents stale snapshot diffs)
- **Category extraction**: In-memory `categories[]` on TodoList stored as separate table in Supabase

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
- **Critical**: Dark mode selector must be `.dark:root` (not bare `.dark`) for native pipeline recognition
- Semantic color tokens: `background`, `surface`, `text`, `border`, `primary`, `skeleton`, etc.
- Theme preference stored in AsyncStorage, synced with React Navigation
- No `dark:` prefix needed — colors swap automatically via CSS variables
- `TaskItem.tsx` uses `useTheme()` for animated color endpoints (can't use CSS vars in `interpolateColor`)

## Known Issues

### Resolved (Phase 10 session)

- ~~SSR `window is not defined`~~ (Fixed: lazy singleton `supabase()` function)
- ~~Sign-up silent failure~~ (Fixed: email confirmation message + mode switch)
- ~~Cross-device sign-out~~ (Fixed: `scope: "local"` in signOut)
- ~~Data loss on re-login~~ (Fixed: sync ref reset on auth boundary)
- ~~Offline sync not working~~ (Fixed: AppState foreground retry + hasPendingSync flag)
- ~~FK race in pushDiff~~ (Fixed: sequential phases instead of Promise.all)

### Open

- **Supabase schema**: SQL tables, RLS policies, triggers not yet applied — see `docs/supabase-plan.md` Step 1
- **Supabase Realtime**: `REPLICA IDENTITY FULL` needed on data tables for filter matching
- **Supabase free tier**: 3 emails/hour rate limit on auth confirmation emails
- **Vercel env vars**: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` need to be added in Vercel dashboard
- **Accessibility**: `useReducedMotion` hook not implemented (Warning)
- **Accessibility**: Missing accessibility labels on checkbox/row (Suggestion)
- **Code Quality**: SPRING type too loose — should use `as const satisfies` (Suggestion)
- **Cosmetic**: Line ending warnings on Windows (LF to CRLF) — harmless
- **App Icon**: Still Expo default — needs custom icon before App Store submission

### Version Status

- `app/(tabs)/_layout.tsx` shows 0.0.10.0
- `app/modal.tsx` shows 0.0.10.0
- `app.json` shows 0.0.8 (semver — update when deploying)
- `package.json` shows 0.0.8 (semver — update when deploying)

## Testing Checklist

### List Management

- [ ] Create new list (+ button)
- [ ] Rename list (settings modal)
- [ ] Delete list (danger zone confirmation)
- [ ] "Show on open" toggle persists
- [ ] "Show on open" Switch has blue track color
- [ ] Toggle text doesn't overflow on narrow screens

### Task Operations

- [ ] Add task to list
- [ ] Toggle task completion
- [ ] Edit task title (detail view)
- [ ] Delete task (with confirmation)
- [ ] Change task category
- [ ] Task titles readable in dark mode

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
- [ ] Native: all components switch (not just nav bar) — requires Metro cache clear
- [ ] Task titles are white (uncompleted) / dimmed gray (completed) in dark mode

### Mobile-Specific

- [ ] Long-press list tab opens settings modal
- [ ] Haptic feedback on long-press (native only)
- [ ] Short tap still switches list (no interference with long-press)
- [ ] Ellipsis icon still visible and tappable

### Auth & Sign-in

- [ ] Sign-up with email sends confirmation email
- [ ] Confirmation message displayed after sign-up
- [ ] Sign-in works after email confirmed
- [ ] Session persists across app restarts
- [ ] Unauthenticated users see login screen (route protection)

### Cloud Sync

- [ ] Changes sync to other devices in ~2-3 seconds
- [ ] Add task on device A appears on device B
- [ ] Delete task on device A removed from device B
- [ ] Offline changes sync when connectivity returns
- [ ] App foreground triggers pending sync retry
- [ ] First sign-in migrates local data to cloud
- [ ] Sign-out clears local app data
- [ ] Sign-out on device A does NOT sign out device B (local scope)
- [ ] Re-login after sign-out shows cloud data (no data loss)

### Loading & Empty States

- [ ] Skeleton appears during initial load (no blank flash)
- [ ] Skeleton disappears when data is hydrated
- [ ] Empty list shows "No tasks yet" message
- [ ] All tasks complete shows "All caught up!" banner
- [ ] No list selected shows appropriate message
- [ ] Empty category boxes show hint text

## Recommended Next Steps

### Priority 1: Merge & Deploy Phase 10

- Merge `feat/supabase-sync` branch to main (create PR)
- Add Supabase env vars to Vercel dashboard
- New EAS Build + TestFlight submission with Supabase env vars
- Verify Supabase SQL schema is applied (tables, RLS policies, triggers — `docs/supabase-plan.md` Step 1)

### Priority 2: App Store Preparation

- Custom app icon (replace Expo default)
- App Store listing metadata (screenshots, description, keywords)
- Update semver in app.json/package.json when deploying

### Priority 3: Accessibility Polish

- Implement `useReducedMotion` hook
- Add accessibility labels to checkbox/row
- Fix SPRING type safety (`as const satisfies`)

## Planning Documents

Implementation plans and reviews in `planning/`:

- `emptyState-implementation-plan.md` - Phase 8d plan
- `emptyState-plan-review.md` - Phase 8d review
- `interListDrag-implementation-plan.md` - Phase 8e plan (detailed 7-step plan)
- `interListDrag-plan-review.md` - Phase 8e review (staff engineer review)
- `ui-cleanup-plan-spec.md` - Phase 9.5 implementation spec
- `ui-cleanup-plan-review.md` - Phase 9.5 plan review
- `ui-cleanup-plan-review2.md` - Phase 9.5 second review (edge cases)

Supabase integration plans in `docs/`:

- `supabase-plan.md` - Phase 10 full implementation plan (Revision 2, 7 steps)
- `supabase-plan-review.md` - Staff engineer review (3 critical, 6 warnings, 3 questions — all addressed)

## Branch Status

- **Current branch**: `feat/supabase-sync`
- **Last commit**: `aedbe2c feat: add Supabase integration with auth, sync, and realtime (Phase 10)`
- **Working tree**: Clean
- **Action needed**: Create PR and merge to main
