---
title: "Change Documentation — aaziko-seller"
---

# Change Documentation — aaziko-seller

> Auto-generated on every push, to any branch. Newest entry first. Old entries are never removed.

<!-- AAZIKO-CHANGELOG:INSERT-AFTER -->

<!-- AAZIKO-CHANGELOG:HISTORY-START -->

> History of the main branch, one entry per day, newest first.

## 19 October 2026 — main branch (history)

### Summary

On 19 October 2026, the main branch received changes to 2 files: 2 added, 0 changed and 0 removed, with 463 lines added and 0 lines removed in total. Most of the work was in the main project folder and the workflows area.

### What was added

- 2 automatic change documentation files were added in the workflows area.

### Impact

- These changes are self-contained; no other part of the project depends on them.

---

## 26 September 2026 — main branch (history)

### Summary

On 26 September 2026, the main branch received changes to 1 file: 1 added, 0 changed and 0 removed, with 94 lines added and 0 lines removed in total. Most of the work was in the workflows area.

### What was added

- 1 build and deployment setting file was added in the workflows area.

### Impact

- Build or deployment settings changed, so the build and the deployment should be checked.

---

## 29 August 2026 — main branch (history)

### Summary

On 29 August 2026, the main branch received changes to 29 files: 16 added, 11 changed and 2 removed, with 2992 lines added and 234 lines removed in total. Most of the work was in the main project folder, the images area, the tabs area, the constants area and the scripts area.

### What was added

- A new order detail screen was added; it provides queue item, stage key, stage has data, current stage tab, stage images, capture, file name, the check for video, the check for image file, the check for PDF file, video thumb, media viewer, PDF thumb, post, order detail screen, setting quantity for tab, setting notes for tab, setting box field, persist fields, enqueue media, capture location meta, capture and queue, pick document, stage has media, going to tab, status icon, display of stamp, opening doc, display of completed and box input.
- A new orders screen was added; it provides status tab, order card and orders screen.
- A new app screen was added; it provides login screen, reaction to login, opening forgot password and reveal form.
- A new orders logic was added; it provides screen order, status key, orders result, norm, first product, product count, formatting date, formatting money, order amount, advance received, product name, sample label, mapping order, loading once, loading orders once, delay, the check for transient directory and getting orders.
- A new media logic was added; it provides uploading result, extract link, first failure message, post upload and uploading media.
- A new manufacturing logic was added; it provides box details, manufacturing data, getting manufacturing result, getting manufacturing and saving manufacturing.
- A new auth logic was added; it provides stored user, login result, login, getting access token, refresh access token, getting stored user and logout.
- A new uploading queue logic was added; it provides stage key, queue item, getting queue, setting queue, enqueue, removing from queue, getting queue for order, getting upload error, processing result and processing queue.
- A new home screen in the tabs area was added; it takes over home screen from other parts of the code.
- A new image meta logic was added; it provides image meta, getting meta map, saving map, setting meta, getting meta, copy meta and formatting when.
- A new API logic in the constants area was added; it provides working out media link.
- A new aaziko splash component was added; it provides aaziko splash.
- 1 settings and data file was added.
- 3 image files were added in the images area.

### What was changed

- The layout screen was changed: the logic for root layout was updated; it now also relies on the expo network library, the react library, the react native library, the aaziko splash part of the code and the uploading queue part of the code.
- The external library @react-native-async-storage/async-storage was added (version 2.2.0).
- The external library expo-document-picker was added (version ~14.0.8).
- The external library expo-file-system was added (version ~19.0.24).
- The external library expo-image-picker was added (version ~17.0.11).
- The external library expo-location was added (version ~19.0.8).
- The external library expo-network was added (version ~8.0.8).
- The external library expo-video was added (version ~3.0.16).
- The external library expo-video-thumbnails was added (version ~10.0.8).
- The external library react-native-webview was added (version 13.15.0).
- The android command of the project was changed.
- The ios command of the project was changed.
- The layout screen in the tabs area was changed: the logic for tab layout was updated.
- 1 dependency lock file was updated.
- 1 settings and data file was updated.
- 1 written documentation file was updated.
- 5 image files were updated in the images area.

### What was removed

- The resetting project logic in the scripts area was removed; it provided index, root layout and move directories.
- The tabs screen was removed.

### Impact

- External libraries changed, so they must be installed again and the application rebuilt before deploying.

---

## 24 August 2026 — main branch (history)

### Summary

On 24 August 2026, the main branch received changes to 41 files: 41 added, 0 changed and 0 removed, with 14162 lines added and 0 lines removed in total. Most of the work was in the main project folder, the images area, the tabs area, the screen area and the constants area.

### What was added

- A new explore screen in the tabs area was added; it provides tab two screen.
- A new resetting project logic in the scripts area was added; it provides index, root layout and move directories.
- A new tabs screen was added; it provides home screen.
- A new parallax scroll view component was added; it provides props and parallax scroll view.
- A new themed text component was added; it provides themed text props and themed text.
- A new theme logic in the constants area was added.
- The external library @expo/vector-icons was added (version ^15.0.3).
- The external library @react-navigation/bottom-tabs was added (version ^7.4.0).
- The external library @react-navigation/elements was added (version ^2.6.3).
- The external library @react-navigation/native was added (version ^7.1.8).
- The external library expo was added (version ~54.0.36).
- The external library expo-constants was added (version ~18.0.13).
- The external library expo-font was added (version ~14.0.12).
- The external library expo-haptics was added (version ~15.0.8).
- The external library expo-image was added (version ~3.0.11).
- The external library expo-linking was added (version ~8.0.12).
- The external library expo-router was added (version ~6.0.24).
- The external library expo-splash-screen was added (version ~31.0.13).
- The external library expo-status-bar was added (version ~3.0.9).
- The external library expo-symbols was added (version ~1.0.8).
- The external library expo-system-ui was added (version ~6.0.9).
- The external library expo-web-browser was added (version ~15.0.11).
- The external library react was added (version 19.1.0).
- The external library react-dom was added (version 19.1.0).
- The external library react-native was added (version 0.81.5).
- The external library react-native-gesture-handler was added (version ~2.28.0).
- The external library react-native-worklets was added (version 0.5.1).
- The external library react-native-reanimated was added (version ~4.1.1).
- The external library react-native-safe-area-context was added (version ~5.6.0).
- The external library react-native-screens was added (version ~4.16.0).
- The external library react-native-web was added (version ~0.21.0).
- The development tool @types/react was added (version ~19.1.0).
- The development tool typescript was added (version ~5.9.2).
- The development tool eslint was added (version ^9.25.0).
- The development tool eslint-config-expo was added (version ~10.0.0).
- The start command of the project was added.
- The reset project command of the project was added.
- The android command of the project was added.
- The ios command of the project was added.
- The web command of the project was added.
- The lint command of the project was added.
- A new collapsible component in the screen area was added; it provides collapsible.
- A new icon symbol component in the screen area was added; it provides icon mapping, icon symbol name and icon symbol.
- A new layout screen in the tabs area was added; it provides tab layout.
- A new icon symbol ios component in the screen area was added; it provides icon symbol.
- A new modal screen was added; it provides modal screen.
- A new external link component was added; it provides props and external link; it uses the expo os setting.
- A new layout screen was added; it provides root layout.
- A new shared logic for color scheme web was added; it provides shared logic for color scheme.
- A new shared logic for theme color was added; it provides shared logic for theme color.
- A new hello wave component was added; it provides hello wave.
- A new haptic tab component was added; it provides haptic tab; it uses the expo os setting.
- A new themed view component was added; it provides themed view props and themed view.
- A new eslint configuration was added.
- A new shared logic for color scheme was added.
- 1 dependency lock file was added.
- 3 written documentation files were added.
- 5 settings and data files were added.
- 1 other file was added.
- 10 image files were added in the images area.

### Impact

- Before deploying, the expo os setting must be configured on the server.
- External libraries changed, so they must be installed again and the application rebuilt before deploying.
- Build or deployment settings changed, so the build and the deployment should be checked.

---
