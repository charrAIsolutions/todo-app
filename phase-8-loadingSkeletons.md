# Phase 8.5: Loading Skeletons — Implementation Plan

## Problem

When the app launches, there's a brief flash of "Loading..." text between the splash screen hiding and data finishing hydration from AsyncStorage. This feels jarring and unpolished.

## Solution

Replace the "Loading..." text with skeleton UI that mirrors the actual screen layout, and extend the Expo splash screen to cover both font loading AND data hydration — so in practice users see: **splash screen -> real content** for fast loads, and **splash screen -> skeleton -> real content** only if AsyncStorage is unusually slow.

## Decisions (from Charles)

| Decision | Choice |
|----------|--------|
| Animation style | **Pulse** (opacity fade between 0.4–1.0) |
| Splash screen timing | **Hold until data loads** from AsyncStorage |
| Skeleton task count | **3 tasks** per category section |
| Color tokens | **New** `skeleton` token in tailwind + global.css |

## Architecture

### Pulse Animation Strategy

One single `Animated.View` wraps ALL skeleton content. A single `useSharedValue` drives the opacity pulse via `withRepeat(withSequence(...))`. Individual skeleton components are just static styled Views — no animation logic in them. This means:

- **One animated value** for the entire skeleton screen (no drift, perfect sync)
- **Zero overhead** in individual skeleton components
- **Clean separation**: layout in components, animation in orchestrator

```
SkeletonScreen (owns the pulse animation)
└── Animated.View (opacity pulse 0.4 ↔ 1.0)
    ├── SkeletonTabBar         ← static Views with bg-skeleton
    ├── ScrollView
    │   ├── SkeletonCategorySection (×2, with 3 tasks each)
    │   └── SkeletonCategorySection (×1, with 2 tasks — varied)
    └── SkeletonAddTaskInput   ← static Views with bg-skeleton
```

### Splash Screen Flow

**Current flow:**
```
App start → fonts load → SplashScreen.hideAsync() → "Loading..." flash → data hydrates → real UI
```

**New flow:**
```
App start → fonts load → RootLayoutNav renders → data hydrates → SplashScreen.hideAsync() → real UI
                                                                 ↑ (skeleton shown behind splash as fallback)
```

Implementation: Move `SplashScreen.hideAsync()` from the font-loading `useEffect` in `_layout.tsx` into a component inside `AppProvider` that waits for `isLoading === false`. Since fonts must load before `AppProvider` even renders, this guarantees both conditions are met.

---

## Implementation Steps

### Step 1: Add Skeleton Color Token

**Why:** Skeleton blocks need a dedicated color that sits between `surface` and `border` — distinct enough to read as a placeholder but subtle enough to not be distracting. Having a dedicated token also lets us tune light/dark mode independently.

**Files:**

**`app/global.css`** — Add `--color-skeleton` CSS variables:
```css
:root {
  --color-skeleton: 228 228 232;    /* Light: between surface-secondary(240) and border(224) */
}

.dark {
  --color-skeleton: 50 50 54;       /* Dark: between surface-secondary(44,44,46) and border(56,56,58) */
}
```

**`tailwind.config.js`** — Add `skeleton` to the color tokens:
```js
skeleton: "rgb(var(--color-skeleton) / <alpha-value>)",
```

---

### Step 2: Add Skeleton Animation Constants

**Why:** Centralizes the pulse timing so it's consistent and easy to tweak. Follows the existing pattern in `lib/animations.ts`.

**File: `lib/animations.ts`** — Add:
```typescript
export const SKELETON = {
  durationDown: 800,   // ms to fade to low opacity
  durationUp: 800,     // ms to fade back to full
  opacityLow: 0.4,     // minimum opacity during pulse
  opacityHigh: 1.0,    // maximum opacity during pulse
} as const;
```

---

### Step 3: Create Skeleton Components

All new files in `components/skeleton/`.

#### 3a: `SkeletonBone.tsx` — Base Building Block

A simple `View` with `bg-skeleton` and configurable dimensions via NativeWind className. This is the atomic unit — a rounded rectangle placeholder.

```tsx
interface SkeletonBoneProps {
  className?: string;  // NativeWind classes for w, h, rounded, etc.
}
```

Renders: `<View className={`bg-skeleton ${className}`} />`

#### 3b: `SkeletonTaskItem.tsx` — Task Row Placeholder

Mirrors `TaskItem.tsx` layout: checkbox circle + text bar.

```
┌─────────────────────────────────────────┐
│  ○ (24×24)   ████████████ (flex-1, h-4) │  ← py-3 px-1, border-b
└─────────────────────────────────────────┘
```

- Checkbox: `w-6 h-6 rounded-full bg-skeleton`
- Title bar: `flex-1 h-4 rounded bg-skeleton` (randomized width: 60–90% via inline style)
- Container: `flex-row items-center gap-3 py-3 px-1 border-b border-border`

Props: `{ indent?: number }` — for subtask indentation (mirrors TaskItem's ml offset)

#### 3c: `SkeletonCategorySection.tsx` — Category Header + Tasks

Mirrors `CategorySection.tsx` layout: bold header bar + N task items.

```
┌─ ████████ (header, h-5)          (3) ─┐  ← bg-surface-secondary, rounded-md
└───────────────────────────────────────┘
   ○  ██████████████████████
   ○  ████████████████
   ○  ████████████████████████████
```

- Header: `py-2.5 px-3 bg-surface-secondary rounded-md mt-4 mb-1` with a `SkeletonBone` for title text + a small badge bone
- Tasks: Renders `taskCount` (default 3) `SkeletonTaskItem` components with varied title widths

Props: `{ taskCount?: number }` — defaults to 3

#### 3d: `SkeletonTabBar.tsx` — Tab Bar Placeholder

Mirrors `ListTabBar.tsx` layout: horizontal row of tab bones + add button.

```
┌──────────────────────────────────────────┐
│  [████]  [██████]  [████████]     [+]    │  ← border-b, bg-surface-secondary
└──────────────────────────────────────────┘
```

- Container: `border-b border-border bg-surface-secondary` with horizontal padding
- Tab bones: 3 rounded rectangles with varied widths (60px, 80px, 70px) and `py-2.5 px-4 rounded-lg bg-skeleton`
- Add button: `w-9 h-9 rounded-full bg-skeleton`

#### 3e: `SkeletonAddTaskInput.tsx` — Input Bar Placeholder

Mirrors `AddTaskInput.tsx` layout: input field + add button.

```
┌──────────────────────────────────────────┐
│  [██████████████████████████]       [+]  │  ← border-t, bg-surface
└──────────────────────────────────────────┘
```

- Container: `flex-row items-center px-4 py-3 border-t border-border bg-surface`
- Input bone: `flex-1 h-11 rounded-full bg-skeleton mr-3`
- Button bone: `w-11 h-11 rounded-full bg-skeleton`

#### 3f: `SkeletonScreen.tsx` — Full Screen Orchestrator

Owns the pulse animation. Composes all skeleton components into a full-screen layout that matches the real `TodoScreen`.

```typescript
export function SkeletonScreen() {
  const opacity = useSharedValue(SKELETON.opacityHigh);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(SKELETON.opacityLow, { duration: SKELETON.durationDown }),
        withTiming(SKELETON.opacityHigh, { duration: SKELETON.durationUp })
      ),
      -1,    // infinite repeat
      false  // don't reverse (sequence handles both directions)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className="flex-1 bg-background">
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <SkeletonTabBar />
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
          <SkeletonCategorySection taskCount={3} />
          <SkeletonCategorySection taskCount={3} />
          <SkeletonCategorySection taskCount={2} />
        </ScrollView>
        <SkeletonAddTaskInput />
      </Animated.View>
    </View>
  );
}
```

Three category sections (3, 3, 2 tasks) creates a natural-looking screen fill.

#### 3g: `index.ts` — Barrel Export

```typescript
export { SkeletonScreen } from './SkeletonScreen';
```

Only export the top-level component — internal pieces are implementation details.

---

### Step 4: Replace Loading State with Skeleton

**File: `app/(tabs)/index.tsx`**

Replace the current loading block (lines 364–370):
```tsx
// Before:
if (isLoading) {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-base text-text-secondary">Loading...</Text>
    </View>
  );
}

// After:
if (isLoading) {
  return <SkeletonScreen />;
}
```

Import `SkeletonScreen` from `@/components/skeleton`.

---

### Step 5: Extend Splash Screen to Cover Data Hydration

**Why:** Currently `SplashScreen.hideAsync()` fires when fonts load, but data hasn't hydrated yet. This causes the brief flash. By delaying the hide until data is ready, the splash covers the entire load.

**File: `app/_layout.tsx`**

Changes:

1. **Remove** `SplashScreen.hideAsync()` from the font-loading `useEffect`
2. **Add** a `SplashScreenManager` component rendered inside `AppProvider` that:
   - Uses `useAppContext()` (NOT `useAppData` — avoids triggering a second hydration)
   - Calls `SplashScreen.hideAsync()` when `state.isLoading === false`
   - Also receives `fontsLoaded` as a prop to ensure both conditions are met

```tsx
function SplashScreenManager({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { state } = useAppContext();
  const hasHidden = useRef(false);

  useEffect(() => {
    if (fontsLoaded && !state.isLoading && !hasHidden.current) {
      hasHidden.current = true;
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, state.isLoading]);

  return null;
}
```

3. **Render** `<SplashScreenManager fontsLoaded={loaded} />` inside `RootLayoutNav`, after `AppProvider`:

```tsx
function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppProvider>
          <SplashScreenManager fontsLoaded={fontsLoaded} />
          <ThemedNavigator />
        </AppProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```

4. **Export** `useAppContext` from `store/AppContext.tsx` if not already exported (it is — confirmed in codebase).

---

### Step 6: Verify & Test

1. **Web first** — `npx expo start --web`, observe: splash → real content (no flash)
2. **Slow load simulation** — Add a `setTimeout` (2s) before HYDRATE dispatch to verify skeleton appears and pulses smoothly
3. **Dark mode** — Toggle theme, verify skeleton tokens look correct in both modes
4. **Mobile** — Test on iOS simulator to confirm splash timing and skeleton fallback
5. **Remove simulation delay** after testing

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `app/global.css` | Edit | Add `--color-skeleton` CSS variables |
| `tailwind.config.js` | Edit | Add `skeleton` color token |
| `lib/animations.ts` | Edit | Add `SKELETON` timing constants |
| `components/skeleton/SkeletonBone.tsx` | Create | Base skeleton rectangle |
| `components/skeleton/SkeletonTaskItem.tsx` | Create | Task row placeholder |
| `components/skeleton/SkeletonCategorySection.tsx` | Create | Category header + tasks |
| `components/skeleton/SkeletonTabBar.tsx` | Create | Tab bar placeholder |
| `components/skeleton/SkeletonAddTaskInput.tsx` | Create | Input bar placeholder |
| `components/skeleton/SkeletonScreen.tsx` | Create | Full screen orchestrator with pulse |
| `components/skeleton/index.ts` | Create | Barrel export |
| `app/(tabs)/index.tsx` | Edit | Replace "Loading..." with SkeletonScreen |
| `app/_layout.tsx` | Edit | Delay splash hide until data hydrates |

**New dependencies:** None (uses existing react-native-reanimated + NativeWind)

## Learning Notes

**Why one animated value for all skeletons?** Each `useSharedValue` + `withRepeat` creates a separate animation loop on the UI thread. If you created one per skeleton bone, they could drift out of sync over time and you'd waste resources running 15+ independent animations. By wrapping everything in a single `Animated.View`, we get perfect synchronization with zero overhead in child components.

**Why opacity pulse over gradient shimmer?** Gradient shimmer requires `expo-linear-gradient` (new dependency) and a masked view or clipping trick to sweep across multiple elements. Opacity pulse achieves the same "this is loading" signal with zero dependencies, works identically on all platforms, and is the pattern used by most major apps (Facebook, Twitter, GitHub).

**Why extend the splash screen?** AsyncStorage reads are typically <100ms for local data. The splash screen already displays during font loading. By extending it to also cover data hydration, we eliminate the intermediate "Loading..." / skeleton state entirely for normal loads. The skeleton becomes a graceful fallback for unusually slow loads rather than something every user sees on every launch.
