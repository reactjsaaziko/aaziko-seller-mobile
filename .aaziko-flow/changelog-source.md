---
title: "Change Documentation — aaziko-seller-mobile"
---

# Change Documentation — aaziko-seller-mobile

> Auto-generated on every push, to any branch. Newest entry first. Old entries are never removed.

<!-- AAZIKO-CHANGELOG:INSERT-AFTER -->

## 2026-10-19 16:14 — branch `main`

### Overview

This push to branch `main` changed **2 file(s)**: 2 new, 0 modified, 0 removed (+457 / −0 lines).

Main areas touched: `.aaziko-flow` (1), `.github/workflows` (1).

### New files

#### `.aaziko-flow/changelog.mjs`

*New file — 347 lines*

- Defines: `sh`, `shSafe`, `git`, `esc`, `code`, `list`, `repo`, `declName`, `collect`, `minusSet` and 9 more.
- Uses: `node:child_process`, `node:fs`, `node:path`.
- Reads environment variables: `BEFORE_SHA`, `AFTER_SHA`, `BASE_BRANCH`, `BRANCH`.

**Other new files**

- `.github/workflows/aaziko-changelog.yml` — 110 lines

### Impact

- Code now reads `BEFORE_SHA` — make sure it is set in the `.env` / deployment.
- Code now reads `AFTER_SHA` — make sure it is set in the `.env` / deployment.
- Code now reads `BASE_BRANCH` — make sure it is set in the `.env` / deployment.
- Code now reads `BRANCH` — make sure it is set in the `.env` / deployment.
- Build/deploy configuration changed: `.github/workflows/aaziko-changelog.yml` — re-check the build and deployment.

---

<!-- AAZIKO-CHANGELOG:HISTORY-START -->

> **History before automatic documentation was switched on** — one entry per day of the `main` branch, newest first.

## 2026-09-26 — branch `main` (history)

### Overview

On this day, branch `main` received changes to **1 file(s)**: 1 new, 0 modified, 0 removed (+94 / −0 lines).

Main areas touched: `.github/workflows` (1).

### New files

**Other new files**

- `.github/workflows/backup-to-gitlab.yml` — 94 lines

### Impact

- Build/deploy configuration changed: `.github/workflows/backup-to-gitlab.yml` — re-check the build and deployment.

---

## 2026-08-29 — branch `main` (history)

### Overview

On this day, branch `main` received changes to **29 file(s)**: 16 new, 11 modified, 2 removed (+2992 / −234 lines).

Main areas touched: `assets/images` (8), `lib` (6), `(project root)` (5), `app` (4), `app/(tabs)` (3), `components` (1).

### New files

#### `app/order-detail.tsx`

*New file — 1047 lines*

- Defines: `QueueItem`, `StageKey`, `stageHasData`, `currentStageTab`, `StageImages`, `Capture`, `fileName`, `isVideo`, `isImageFile`, `isPdfFile`, `VideoThumb`, `MediaViewer`, `PdfThumb`, `post`, `OrderDetailScreen`, `setQtyForTab`, `setNotesForTab`, `setBoxField`, `persistFields`, `enqueueMedia`, `captureLocationMeta`, `captureAndQueue`, `pickDocument`, `stageHasMedia`, `goToTab`, `statusIcon`, `renderStamp`, `openDoc`, `renderCompleted`, `BoxInput`.
- Uses: `@expo/vector-icons`, `expo-document-picker`, `expo-image-picker`, `expo-location`, `expo-network`, `expo-video`, `expo-web-browser`, `react-native-webview`, `expo-router`, `react`, `react-native-safe-area-context`, `@/constants/api`, `@/lib/manufacturing`, `@/lib/orders`, `@/lib/upload-queue`, `@/lib/image-meta`.

#### `app/orders.tsx`

*New file — 326 lines*

- Defines: `StatusTab`, `OrderCard`, `OrdersScreen`.
- Uses: `@expo/vector-icons`, `expo-router`, `react`, `react-native-safe-area-context`, `@/lib/orders`.

#### `app/index.tsx`

*New file — 294 lines*

- Defines: `LoginScreen`, `onLogin`, `openForgotPassword`, `revealForm`.
- Uses: `@expo/vector-icons`, `expo-image`, `expo-router`, `react`, `react-native-safe-area-context`, `@/lib/auth`, `@/assets/images/aaziko-logo.png`, `@/assets/images/login-illustration.png`.

#### `lib/orders.ts`

*New file — 234 lines*

- Defines: `UiOrder`, `StatusKey`, `OrdersResult`, `norm`, `firstProduct`, `productCount`, `fmtDate`, `formatMoney`, `orderAmount`, `advanceReceived`, `productName`, `sampleLabel`, `mapOrder`, `FetchOnce`, `fetchOrdersOnce`, `delay`, `isTransientDirectory`, `getOrders`.
- Uses: `@/constants/api`, `@/lib/auth`.

#### `lib/media.ts`

*New file — 159 lines*

- Defines: `UploadResult`, `extractUrl`, `firstFailureMessage`, `postUpload`, `uploadMedia`.
- Uses: `@/constants/api`, `@/lib/auth`.

#### `lib/manufacturing.ts`

*New file — 157 lines*

- Defines: `BoxDetails`, `ManufacturingData`, `GetManufacturingResult`, `getManufacturing`, `saveManufacturing`.
- Uses: `@/constants/api`, `@/lib/auth`.

#### `lib/auth.ts`

*New file — 153 lines*

- Defines: `StoredUser`, `LoginResult`, `login`, `getAccessToken`, `refreshAccessToken`, `getStoredUser`, `logout`.
- Uses: `@react-native-async-storage/async-storage`, `@/constants/api`.

#### `lib/upload-queue.ts`

*New file — 115 lines*

- Defines: `StageKey`, `QueueItem`, `getQueue`, `setQueue`, `enqueue`, `removeFromQueue`, `getQueueForOrder`, `getUploadError`, `ProcessResult`, `processQueue`.
- Uses: `@react-native-async-storage/async-storage`, `@/lib/image-meta`, `@/lib/manufacturing`, `@/lib/media`.

#### `app/(tabs)/home.tsx`

*New file — 100 lines*

- Code moved here from other files: `HomeScreen`.
- Uses: `expo-image`, `react-native`, `@/components/hello-wave`, `@/components/parallax-scroll-view`, `@/components/themed-text`, `@/components/themed-view`, `expo-router`, `@/assets/images/aaziko-logo.png`.

#### `lib/image-meta.ts`

*New file — 68 lines*

- Defines: `ImageMeta`, `getMetaMap`, `saveMap`, `setMeta`, `getMeta`, `copyMeta`, `formatWhen`.
- Uses: `@react-native-async-storage/async-storage`.

#### `constants/api.ts`

*New file — 61 lines*

- Defines: `resolveMediaUrl`.

#### `components/aaziko-splash.tsx`

*New file — 47 lines*

- Defines: `AazikoSplash`.
- Uses: `react`, `react-native`, `@/assets/images/aaziko-logo.png`.

**Other new files**

- `eas.json` — 21 lines
- `assets/images/aaziko-icon.png` — binary file
- `assets/images/aaziko-logo.png` — binary file
- `assets/images/login-illustration.png` — binary file

### Changes to existing files

#### `app/_layout.tsx`

*Existing file, modified — +30 / −4 lines*

- Changed the code inside: `RootLayout`.
- Now also uses: `expo-network`, `react`, `react-native`, `@/components/aaziko-splash`, `@/lib/upload-queue`.

#### `package.json`

*Existing file, modified — +13 / −4 lines*

- Added package `@react-native-async-storage/async-storage` 2.2.0
- Added package `expo-document-picker` ~14.0.8
- Added package `expo-file-system` ~19.0.24
- Added package `expo-image-picker` ~17.0.11
- Added package `expo-location` ~19.0.8
- Added package `expo-network` ~8.0.8
- Added package `expo-video` ~3.0.16
- Added package `expo-video-thumbnails` ~10.0.8
- Added package `react-native-webview` 13.15.0
- Changed npm script `android`
- Changed npm script `ios`

#### `app/(tabs)/_layout.tsx`

*Existing file, modified — +1 / −1 lines*

- Changed the code inside: `TabLayout`.

**Other modified files**

- `package-lock.json` — +135 / −10 lines
- `app.json` — +30 / −5 lines
- `README.md` — +1 / −0 lines
- `assets/images/android-icon-background.png` — binary file
- `assets/images/android-icon-foreground.png` — binary file
- `assets/images/android-icon-monochrome.png` — binary file
- `assets/images/favicon.png` — binary file
- `assets/images/icon.png` — binary file

### Removed files

#### `scripts/reset-project.js`

*Removed file — 112 lines removed*

- It defined: `Index`, `RootLayout`, `moveDirectories`.

#### `app/(tabs)/index.tsx`

*Removed file — 98 lines removed*


### Impact

- Dependencies changed in `package.json` — run `npm install` and rebuild the Docker image before deploying.

---

## 2026-08-24 — branch `main` (history)

### Overview

On this day, branch `main` received changes to **41 file(s)**: 41 new, 0 modified, 0 removed (+14162 / −0 lines).

Main areas touched: `assets/images` (10), `(project root)` (9), `components` (6), `app/(tabs)` (3), `components/ui` (3), `hooks` (3).

### New files

#### `app/(tabs)/explore.tsx`

*New file — 112 lines*

- Defines: `TabTwoScreen`.
- Uses: `expo-image`, `react-native`, `@/components/ui/collapsible`, `@/components/external-link`, `@/components/parallax-scroll-view`, `@/components/themed-text`, `@/components/themed-view`, `@/components/ui/icon-symbol`, `@/constants/theme`, `@/assets/images/react-logo.png`.

#### `scripts/reset-project.js`

*New file — 112 lines*

- Defines: `Index`, `RootLayout`, `moveDirectories`.
- Uses: `fs`, `path`, `readline`.

#### `app/(tabs)/index.tsx`

*New file — 98 lines*

- Defines: `HomeScreen`.
- Uses: `expo-image`, `react-native`, `@/components/hello-wave`, `@/components/parallax-scroll-view`, `@/components/themed-text`, `@/components/themed-view`, `expo-router`, `@/assets/images/partial-react-logo.png`.

#### `components/parallax-scroll-view.tsx`

*New file — 79 lines*

- Defines: `Props`, `ParallaxScrollView`.
- Uses: `react`, `react-native`, `@/components/themed-view`, `@/hooks/use-color-scheme`, `@/hooks/use-theme-color`.

#### `components/themed-text.tsx`

*New file — 60 lines*

- Defines: `ThemedTextProps`, `ThemedText`.
- Uses: `react-native`, `@/hooks/use-theme-color`.

#### `constants/theme.ts`

*New file — 53 lines*

- Uses: `react-native`.

#### `package.json`

*New file — 47 lines*

- Added package `@expo/vector-icons` ^15.0.3
- Added package `@react-navigation/bottom-tabs` ^7.4.0
- Added package `@react-navigation/elements` ^2.6.3
- Added package `@react-navigation/native` ^7.1.8
- Added package `expo` ~54.0.36
- Added package `expo-constants` ~18.0.13
- Added package `expo-font` ~14.0.12
- Added package `expo-haptics` ~15.0.8
- Added package `expo-image` ~3.0.11
- Added package `expo-linking` ~8.0.12
- Added package `expo-router` ~6.0.24
- Added package `expo-splash-screen` ~31.0.13
- Added package `expo-status-bar` ~3.0.9
- Added package `expo-symbols` ~1.0.8
- Added package `expo-system-ui` ~6.0.9
- Added package `expo-web-browser` ~15.0.11
- Added package `react` 19.1.0
- Added package `react-dom` 19.1.0
- Added package `react-native` 0.81.5
- Added package `react-native-gesture-handler` ~2.28.0
- Added package `react-native-worklets` 0.5.1
- Added package `react-native-reanimated` ~4.1.1
- Added package `react-native-safe-area-context` ~5.6.0
- Added package `react-native-screens` ~4.16.0
- Added package `react-native-web` ~0.21.0
- Added package `@types/react` ~19.1.0
- Added package `typescript` ~5.9.2
- Added package `eslint` ^9.25.0
- Added package `eslint-config-expo` ~10.0.0
- Added npm script `start`
- Added npm script `reset-project`
- Added npm script `android`
- Added npm script `ios`
- Added npm script `web`
- Added npm script `lint`

#### `components/ui/collapsible.tsx`

*New file — 45 lines*

- Defines: `Collapsible`.
- Uses: `react`, `react-native`, `@/components/themed-text`, `@/components/themed-view`, `@/components/ui/icon-symbol`, `@/constants/theme`, `@/hooks/use-color-scheme`.

#### `components/ui/icon-symbol.tsx`

*New file — 41 lines*

- Defines: `IconMapping`, `IconSymbolName`, `IconSymbol`.
- Uses: `@expo/vector-icons/MaterialIcons`, `expo-symbols`, `react`, `react-native`.

#### `app/(tabs)/_layout.tsx`

*New file — 35 lines*

- Defines: `TabLayout`.
- Uses: `expo-router`, `react`, `@/components/haptic-tab`, `@/components/ui/icon-symbol`, `@/constants/theme`, `@/hooks/use-color-scheme`.

#### `components/ui/icon-symbol.ios.tsx`

*New file — 32 lines*

- Defines: `IconSymbol`.
- Uses: `expo-symbols`, `react-native`.

#### `app/modal.tsx`

*New file — 29 lines*

- Defines: `ModalScreen`.
- Uses: `expo-router`, `react-native`, `@/components/themed-text`, `@/components/themed-view`.

#### `components/external-link.tsx`

*New file — 25 lines*

- Defines: `Props`, `ExternalLink`.
- Uses: `expo-router`, `expo-web-browser`, `react`.
- Reads environment variables: `EXPO_OS`.

#### `app/_layout.tsx`

*New file — 24 lines*

- Defines: `RootLayout`.
- Uses: `@react-navigation/native`, `expo-router`, `expo-status-bar`, `react-native-reanimated`, `@/hooks/use-color-scheme`.

#### `hooks/use-color-scheme.web.ts`

*New file — 21 lines*

- Defines: `useColorScheme`.
- Uses: `react`, `react-native`.

#### `hooks/use-theme-color.ts`

*New file — 21 lines*

- Defines: `useThemeColor`.
- Uses: `@/constants/theme`, `@/hooks/use-color-scheme`.

#### `components/hello-wave.tsx`

*New file — 19 lines*

- Defines: `HelloWave`.
- Uses: `react-native-reanimated`.

#### `components/haptic-tab.tsx`

*New file — 18 lines*

- Defines: `HapticTab`.
- Uses: `@react-navigation/bottom-tabs`, `@react-navigation/elements`, `expo-haptics`.
- Reads environment variables: `EXPO_OS`.

#### `components/themed-view.tsx`

*New file — 14 lines*

- Defines: `ThemedViewProps`, `ThemedView`.
- Uses: `react-native`, `@/hooks/use-theme-color`.

#### `eslint.config.js`

*New file — 10 lines*

- Uses: `eslint/config`, `eslint-config-expo/flat`.

#### `hooks/use-color-scheme.ts`

*New file — 1 lines*

- Data / content file (no functions or components).

**Other new files**

- `package-lock.json` — 13091 lines
- `README.md` — 50 lines
- `app.json` — 48 lines
- `.gitignore` — 43 lines
- `tsconfig.json` — 17 lines
- `.vscode/settings.json` — 7 lines
- `.claude/settings.json` — 5 lines
- `AGENTS.md` — 3 lines
- `.vscode/extensions.json` — 1 lines
- `CLAUDE.md` — 1 lines
- `assets/images/android-icon-background.png` — binary file
- `assets/images/android-icon-foreground.png` — binary file
- `assets/images/android-icon-monochrome.png` — binary file
- `assets/images/favicon.png` — binary file
- `assets/images/icon.png` — binary file
- `assets/images/partial-react-logo.png` — binary file
- `assets/images/react-logo.png` — binary file
- `assets/images/react-logo@2x.png` — binary file
- `assets/images/react-logo@3x.png` — binary file
- `assets/images/splash-icon.png` — binary file

### Impact

- Dependencies changed in `package.json` — run `npm install` and rebuild the Docker image before deploying.
- Code now reads `EXPO_OS` — make sure it is set in the `.env` / deployment.
- Build/deploy configuration changed: `tsconfig.json` — re-check the build and deployment.

---
