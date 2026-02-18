# Phase 9 Plan Review: iOS TestFlight Deployment via EAS Build

**Plan file:** `C:\Users\charr\projects\todo-app\ios-deploy-plan-spec.md`
**Reviewer:** Staff Engineer (automated)
**Date:** 2026-02-17

---

## Verdict: NEEDS REVISION

The plan covers the happy path well and the explanations are good for a learning context. However, it has several gaps that will cause real friction during execution -- some of which will block the build entirely, and others that will produce a confusing first-run experience on iOS. Details below.

---

## Critical Issues (must fix before implementing)

### 1. Missing `expo-dev-client` dependency for the `development` profile

The `eas.json` includes a `development` profile with `"developmentClient": true`, but the project's `package.json` does not list `expo-dev-client` as a dependency. EAS Build will either fail or produce a build that does not work as expected for the development profile. Either:

- Add `expo-dev-client` to dependencies, or
- Remove the `development` profile from `eas.json` since the plan never actually uses it (the plan jumps straight to `production`)

The second option is simpler and avoids scope creep. You can add development builds later if you need them.

### 2. Splash screen has hardcoded white background -- broken in dark mode

`app.json` line 14: `"backgroundColor": "#ffffff"` in the splash config. When a user in dark mode opens the app, they will get a white flash before the app renders. The plan does not address this. For TestFlight, you should either:

- Set the splash background to match your dark mode background, or
- Use `expo-splash-screen` config with `"userInterfaceStyle": "automatic"` and provide both light/dark splash backgrounds (Expo SDK 54 supports this via the `splash.dark` key)

This is not just cosmetic -- it is the first thing a user sees every launch. Since the app already supports dark mode, this needs to be addressed.

### 3. No `infoPlist` for safe area / status bar behavior

The app uses `react-native-safe-area-context` and has dark mode. The plan does not set `UIStatusBarStyle` or `UIViewControllerBasedStatusBarAppearance` in `app.json`'s `ios.infoPlist`. This can result in:

- Light status bar text on a light background (or vice versa) on launch
- Status bar style not matching the app theme until React renders

Add to the `ios` config:

```json
"infoPlist": {
  "UIViewControllerBasedStatusBarAppearance": true
}
```

This lets `expo-status-bar` (already a dependency) control the style dynamically, which is what you want with a dark mode toggle.

### 4. `autoIncrement` in `eas.json` needs the field specified

The plan sets `"autoIncrement": true` in the production profile, but does not specify which field to increment. The default is `"buildNumber"` for iOS, which is correct, but the behavior differs between iOS and Android. Since this is an iOS-focused plan, it works. However, the plan should explicitly state:

```json
"autoIncrement": "buildNumber"
```

Being explicit prevents confusion when Android is added later, where `autoIncrement` would default to `versionCode`. This is a minor correctness issue but worth calling out for a learning project.

---

## Concerns (worth discussing)

### 5. `supportsTablet: true` -- is this intentional?

The plan keeps `"supportsTablet": true` from the existing config. This means the app will be available on iPad via the App Store. The app has a web split-view for larger screens, but the mobile code path is single-list only. Have you tested on an iPad simulator? If the iPad experience is bad (e.g., a phone-sized layout stretched to a 12.9" screen), Apple reviewers may flag it.

Options:

- Set `"supportsTablet": false` to keep it iPhone-only for now
- Verify the layout looks acceptable on iPad before submitting

### 6. Hardcoded Apple credentials in `eas.json`

The plan puts `appleId`, `ascAppId`, and `appleTeamId` directly in `eas.json`, which gets committed to git. While these are not secrets (they are identifiers, not passwords), putting your Apple ID email in a public/shared repo is a spam risk. Consider:

- Using environment variables via `EXPO_APPLE_ID`, `EXPO_APPLE_TEAM_ID` instead
- Or accepting the risk since this is a personal learning repo

The plan should at least acknowledge this tradeoff.

### 7. No pre-build validation step

The plan goes straight from config to `eas build --platform ios --profile production`. There is no step to validate the configuration locally first. Before burning a cloud build (which takes 10-20 min and counts against your EAS quota), add:

```bash
eas build:inspect --platform ios --profile production --output /tmp/inspect
```

This generates the native project locally so you can catch config errors before submitting to the cloud queue. This is especially important for a first-ever build where config mistakes are most likely.

### 8. No mention of Expo account linking / project ID

Step 6 says `eas build:configure` "registers the project with your Expo account." But the plan does not mention that this will add an `extra.eas.projectId` field to `app.json`. The plan's "Files Modified" table only lists `app.json` changes for `bundleIdentifier`, `buildNumber`, `privacyManifests`, and `version`. The `projectId` addition should be documented so it is not a surprise when the file changes unexpectedly.

### 9. No mention of EAS Build pricing / free tier limits

EAS Build has a free tier (30 builds/month for individuals as of early 2026, though this may have changed). A first-time user should know:

- Production iOS builds take 10-20 min
- If the build fails due to a config issue, that still counts
- The `preview` profile is useful for faster iteration when debugging build issues

The plan defines the `preview` profile but never uses it or explains when to reach for it vs. `production`.

### 10. Orientation locked to portrait -- by design?

`app.json` has `"orientation": "portrait"`. This is fine for iPhone, but if `supportsTablet` stays `true`, iPad users will be stuck in portrait. Many iPad users expect landscape support. This compounds concern #5.

---

## Questions (things the plan does not address)

### 11. What happens to the Vercel web deploy?

The plan modifies `app.json` (adding `bundleIdentifier`, `privacyManifests`, etc.). Will any of these changes break the existing `npx expo export --platform web` build? The `privacyManifests` key is iOS-specific and should be ignored on web, but this should be verified. A quick `npm run build:web` after the config changes (before the EAS build) would be a cheap safety check.

### 12. What about the app name shown under the icon?

`app.json` has `"name": "Todo App"`. On iOS, the home screen label is typically short. "Todo App" is 8 characters and will display fine, but this is a conscious choice point. The plan does not mention it. If you want a shorter label (e.g., "Todo"), you can set `ios.infoPlist.CFBundleDisplayName` separately from the full app name.

### 13. What SDK/Xcode version will EAS use?

Expo SDK 54 has a default EAS Build image. The plan does not specify an `image` in `eas.json`. This is usually fine (Expo picks the right default), but for reproducibility and debugging build failures, it is worth knowing what you are getting. You can check with `eas build:inspect` or by looking at the EAS build logs after the first build.

### 14. What about `expo-splash-screen` plugin config?

The project uses `expo-splash-screen` (in dependencies) and the splash screen config in `app.json`. However, the `plugins` array only has `["expo-router", "expo-font"]`. Some Expo SDK 54 splash screen features (like per-scheme backgrounds) may require adding `"expo-splash-screen"` to the plugins array. Check the Expo SDK 54 docs for whether the plugin is needed for native builds.

### 15. Will NativeWind work in the EAS production build?

NativeWind v4 requires `babel.config.js` and `metro.config.js` to be set up correctly (the plan mentions these were configured in Phase 8b). EAS Build uses Metro, so this should work. But NativeWind v4 has been known to have edge cases in production builds where CSS is not generated. The plan should include a post-install verification: after installing via TestFlight, check that styles render correctly (not just that the app launches).

### 16. No rollback plan

What if the build succeeds but the app crashes on launch? The plan's verification section says "App installs and runs on a physical iPhone via TestFlight" but does not say what to do if it does not. At minimum: check EAS build logs, check for missing native modules, and know that you can push a new build (TestFlight automatically serves the latest).

---

## Ordering / Dependency Issues

### 17. Step 6 (`eas build:configure`) should come before Step 3

The plan says to create `eas.json` manually in Step 3, then run `eas build:configure` in Step 6 which "will validate rather than overwrite." This is backwards. Better approach:

- Run `eas build:configure` first to generate a baseline `eas.json`
- Then modify it to add the `submit` section, `requireCommit`, `autoIncrement`, etc.

This avoids a situation where your hand-written `eas.json` has a schema issue that `build:configure` does not catch because it sees the file already exists and skips generation.

### 18. Step 5 (version sync) should be Step 2

Version syncing should happen alongside the `app.json` edits, not as a separate step after `eas.json` creation. The plan even says in Step 2 to "sync the top-level version," then has a separate Step 5 for the same thing. This is redundant and confusing. Merge them.

---

## What the Plan Does Well

- The privacy manifest inclusion is correct and often missed. Good catch.
- The `requireCommit: true` flag is smart for a learning project.
- The explanation of `autoIncrement` for buildNumber is correct.
- The "What This Does NOT Cover" section sets clear boundaries.
- The pre-requisites section correctly identifies the Apple Developer Account requirement.
- The step-by-step credential flow for first-time EAS builds is accurate and will reduce confusion.

---

## Recommended Action Items

1. **Fix splash screen dark mode** (critical #2) -- add `splash.dark` config or at minimum use a neutral background color
2. **Remove or gate the `development` profile** (critical #1) -- do not include config that requires a missing dependency
3. **Add a local validation step** before cloud build (concern #7) -- `eas build:inspect`
4. **Add a web build check** after config changes (question #11) -- `npm run build:web`
5. **Decide on tablet support** (concern #5) -- test on iPad simulator or set `supportsTablet: false`
6. **Reorder steps** (issues #17, #18) -- run `eas build:configure` earlier, merge version sync into app.json edits
7. **Document the `projectId` side effect** (concern #8) -- note that `eas build:configure` will modify `app.json`
8. **Add post-install verification checklist** -- dark mode works, animations work, data persists, drag-and-drop works on touch
