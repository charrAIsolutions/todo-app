# Phase 9: iOS TestFlight Deployment via EAS Build

## Context

The app is fully functional (Phases 1-8 complete) and deployed to Vercel for web. Now it's time to get it on a real iPhone via TestFlight. The project has no EAS configuration yet — `app.json` is missing required iOS fields (`bundleIdentifier`, `buildNumber`), and no `eas.json` exists. App icons are still Expo defaults.

**Goal:** Configure EAS Build, run a production iOS build in the cloud, and submit it to TestFlight for internal testing.

---

## Pre-requisites (User Action Required)

- [ ] **App Icon**: Replace `assets/images/icon.png` with a custom 1024x1024 PNG (no transparency, no rounded corners — iOS applies the mask). _(Can use a temporary solid-color icon for the first TestFlight build, but must replace before App Store submission.)_
- [ ] **Apple Developer Account**: Confirm active membership and know your Apple ID email + 10-character Team ID (found at developer.apple.com > Membership).

---

## Steps

### Step 1: Install EAS CLI and authenticate

```bash
npm install -g eas-cli
eas login
eas whoami  # verify
```

### Step 2: Link project to EAS

```bash
eas build:configure
```

Run this first to generate a baseline `eas.json` and register the project with your Expo account. This will:

- Create `eas.json` with default profiles
- Add `extra.eas.projectId` to `app.json` (auto-generated UUID linking to your Expo account)
- Prompt for `bundleIdentifier` if missing — enter `com.charr.todoapp`

**Note:** We'll customize the generated `eas.json` in Step 4.

### Step 3: Update `app.json` — iOS + splash configuration

**File:** `app.json`

**3a. Sync version** — change `"version": "0.0.7"` to `"0.0.8"` to match `package.json`.

**3b. Add iOS fields** to the `ios` section:

```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.charr.todoapp",
  "buildNumber": "1",
  "infoPlist": {
    "UIViewControllerBasedStatusBarAppearance": true
  },
  "privacyManifests": {
    "NSPrivacyAccessedAPITypes": [
      {
        "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
        "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
      }
    ]
  }
}
```

- **`bundleIdentifier`** — Unique App Store ID. Once submitted, cannot be changed.
- **`buildNumber`** — Apple's `CFBundleVersion`. Must increment with every TestFlight upload. `autoIncrement` in `eas.json` handles this automatically.
- **`infoPlist.UIViewControllerBasedStatusBarAppearance`** — Lets `expo-status-bar` (already installed) control status bar style dynamically. Without this, status bar text color can clash with the current theme on launch.
- **`privacyManifests`** — AsyncStorage uses iOS `UserDefaults` under the hood. Since May 2024, Apple requires a privacy manifest declaring why you access this API. `CA92.1` = "accessing info written by the same app."

**3c. Fix splash screen dark mode** — The current splash has `"backgroundColor": "#ffffff"` which causes a white flash in dark mode. Add a dark splash variant to the `ios` section:

```json
"ios": {
  ...existing fields above...,
  "splash": {
    "dark": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#000000"
    }
  }
}
```

This gives dark mode users a black splash background (`#000000` matches `--color-background` in `global.css`'s `.dark` rule) instead of a jarring white flash. The top-level `splash` config remains as the light mode default.

**3d. Keep `"name": "Todo App"`** — At 8 characters this fits fine under the iOS home screen icon. If you later want a shorter label, set `ios.infoPlist.CFBundleDisplayName` separately.

### Step 4: Customize `eas.json`

After `eas build:configure` generates the baseline, replace the contents with:

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "requireCommit": true
  },
  "build": {
    "preview": {
      "extends": "production",
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": "buildNumber"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "APPLE_ID_HERE",
        "ascAppId": "ASC_APP_ID_HERE",
        "appleTeamId": "TEAM_ID_HERE"
      }
    }
  }
}
```

**Changes from original plan (addressing review):**

- **Removed `development` profile** — It requires `expo-dev-client` which isn't installed. We go straight to production. Can add development builds later if needed.
- **`"autoIncrement": "buildNumber"`** — Explicit instead of `true`. Prevents confusion when Android is added later (where default is `versionCode`).
- **`preview` profile kept** — Extends production signing but distributes internally (install via link, no App Store). Useful for faster iteration if the first production build has config issues, since failed builds still count against EAS quota.
- **`requireCommit: true`** — EAS builds from committed code only. Prevents accidentally building uncommitted changes.

**About Apple credentials in `eas.json`:** The `appleId`, `ascAppId`, and `appleTeamId` are identifiers (not secrets), but your Apple ID email will be in a committed file. For a personal learning repo this is acceptable. For shared/public repos, use environment variables (`EXPO_APPLE_ID`, `EXPO_APPLE_TEAM_ID`) instead.

### Step 5: Update `.gitignore`

Add these entries:

```
# EAS
credentials.json
.eas/
```

- `credentials.json` — Could contain private signing keys if exported locally.
- `.eas/` — Local cache directory.

### Step 6: Verify web build still works

```bash
npm run build:web
```

The `app.json` changes (`bundleIdentifier`, `privacyManifests`, iOS splash) are iOS-specific and should be ignored on web, but this is a cheap safety check before committing. Verify the `dist/` output builds cleanly.

### Step 7: Commit all configuration changes

Commit `app.json` updates, new `eas.json`, and `.gitignore` changes. `requireCommit: true` enforces this before building.

### Step 8: Validate configuration locally

```bash
eas build:inspect --platform ios --profile production --output /tmp/eas-inspect
```

This generates the native Xcode project locally so you can catch config errors (missing plugins, bad `infoPlist` keys, etc.) before submitting to the EAS cloud queue. Especially important for a first-ever build where config mistakes are most likely — and failed cloud builds still count against your EAS quota.

**EAS Build free tier:** ~30 iOS builds/month for individuals. Production builds take 10-20 minutes. Use the `preview` profile for faster iteration when debugging build issues.

### Step 9: Run the iOS production build

```bash
eas build --platform ios --profile production
```

**First run will prompt for Apple credentials:**

1. Log in with Apple ID (the one tied to your Developer account)
2. EAS will offer to auto-generate a Distribution Certificate → accept
3. EAS will offer to auto-generate a Provisioning Profile → accept
4. Credentials are stored encrypted on EAS servers for future builds

Build takes ~10-20 minutes in the EAS cloud. You'll get a URL to monitor progress on the Expo dashboard.

### Step 10: Submit to TestFlight

**Option A — Single command:**

```bash
eas submit --platform ios --latest
```

**Option B — Combined build + submit (for future builds):**

```bash
eas build --platform ios --profile production --auto-submit
```

EAS will prompt for your Apple ID and an app-specific password (generate one at appleid.apple.com > Security > App-Specific Passwords).

**Note:** The `ascAppId` is the numeric App ID from App Store Connect. On the first submission, EAS can auto-create the App Store Connect record — it will prompt and provide the `ascAppId` to backfill in `eas.json`.

### Step 11: TestFlight setup

After Apple processes the build (~5-15 min):

1. Open App Store Connect → Your App → TestFlight
2. Add yourself as an internal tester (immediate access, no review needed)
3. Install TestFlight app on your iPhone
4. Accept the test invitation and install the build

---

## Files Modified

| File         | Action | What Changes                                                                                                                                          |
| ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.json`   | Edit   | Add `bundleIdentifier`, `buildNumber`, `infoPlist`, `privacyManifests`, iOS splash dark mode, sync `version`; `extra.eas.projectId` auto-added by EAS |
| `eas.json`   | Create | Build profiles (`preview`, `production`) + submit config                                                                                              |
| `.gitignore` | Edit   | Add `credentials.json`, `.eas/`                                                                                                                       |

---

## Verification

### Build verification

1. `npm run build:web` succeeds (no regression from config changes)
2. `eas build:inspect` generates native project without errors
3. `eas build --platform ios --profile production` completes (green checkmark on expo.dev)
4. `eas submit --platform ios --latest` uploads to App Store Connect
5. Build appears in TestFlight within App Store Connect

### Post-install verification (on physical iPhone via TestFlight)

- [ ] App launches without crash
- [ ] Light mode renders correctly (NativeWind styles, correct colors)
- [ ] Dark mode renders correctly (toggle in Settings modal)
- [ ] Splash screen matches current theme (no white flash in dark mode)
- [ ] Tasks can be created, completed, deleted
- [ ] Data persists after force-closing and reopening
- [ ] Drag-and-drop works via touch
- [ ] Animations are smooth (checkbox pulse, entry/exit transitions)
- [ ] Status bar text color matches current theme

### If the build fails or app crashes

- Check EAS build logs on the Expo dashboard for native compilation errors
- Check for missing native modules (common with first builds)
- Use `preview` profile for faster iteration on fixes
- TestFlight automatically serves the latest build — push a new build to replace a broken one

---

## Decisions & Tradeoffs

| Decision          | Choice                      | Rationale                                                                                                                                                            |
| ----------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tablet support    | Keep `supportsTablet: true` | User chose iPhone + iPad. Mobile code path is single-list (no split-view), but layout should scale acceptably. Verify on iPad simulator before App Store submission. |
| Orientation       | Keep `portrait` only        | Fine for iPhone. If iPad support stays, consider adding landscape later — iPad users expect it.                                                                      |
| Dev builds        | Omitted for now             | Requires `expo-dev-client` dependency. Going straight to production is simpler for first TestFlight.                                                                 |
| Xcode/SDK version | Use Expo default            | EAS picks the correct build image for SDK 54. Logged in build output for reproducibility.                                                                            |

---

## What This Does NOT Cover (Future Work)

- Custom app icon design (using placeholder for now)
- App Store listing metadata (screenshots, description, keywords)
- External TestFlight testers (requires Beta App Review)
- Full App Store submission (requires review, more metadata)
- Push notifications setup
- CI/CD pipeline (GitHub Actions + EAS)
- iPad layout optimization (verify before App Store, not needed for TestFlight)
