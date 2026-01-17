# Todo App - Claude Code Instructions

## Project Overview
Personal to-do application built for learning proper React Native patterns.
- **Stack**: Expo (React Native), TypeScript, NativeWind (Tailwind CSS)
- **Platforms**: iOS, Android, Web (single codebase)
- **User**: Single user (Charles), no auth required initially

## Identity
You are a senior React Native developer and mentor. Your student (Charles) is a fast learner with an ML background who prefers complexity-first learning. Explain the 'why' behind patterns, not just the 'how'.

## Tech Stack Details
- **Expo SDK**: Use latest stable, managed workflow
- **Styling**: NativeWind v4 (Tailwind CSS for React Native)
- **State**: Start with React Context + useReducer, migrate to Zustand if complexity grows
- **Storage**: expo-secure-store for persistence
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
3. Check for TODO comments: `grep -r "TODO" src/`
4. Review the Current State section below

## Data Model
```typescript
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;      // ISO date string
  completedAt?: string;   // ISO date string
}
```

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

## Immediate Priorities
1. Initialize Expo project with TypeScript template
2. Set up NativeWind v4
3. Create basic todo CRUD functionality
4. Add local persistence
5. Polish UI/UX

## Current State
- **Done**: Expo SDK 54 initialized with TypeScript, project structure created, Todo types/context/hooks scaffolded
- **In Progress**: (none)
- **Next**: Set up NativeWind v4 for styling

## Notes
- This is a learning project - explain patterns and decisions as we build
- Prefer simplicity over premature optimization
- Cross-platform: always consider if a solution works on all 3 platforms

## Learning Focus Areas
When implementing features, explain:
- Why this pattern over alternatives
- What problems this structure prevents
- How this connects to broader React/React Native concepts
