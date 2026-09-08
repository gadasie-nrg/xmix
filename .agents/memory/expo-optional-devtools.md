---
name: Expo optional DevTools
description: Headless Expo preview behavior when the host lacks the standalone React Native DevTools library
---

Managed Expo previews may set `EXPO_UNSTABLE_HEADLESS=true` to skip preparation of the optional standalone React Native DevTools shell when the host image lacks its native library.

**Why:** The shell is not required for Metro or Expo Go sessions, and its failed preparation otherwise appears as an app startup error even though the packager is healthy.

**How to apply:** Keep the setting scoped to the managed preview environment and log that only optional DevTools is disabled; do not disable Metro, QR/session routing, or Expo Go.