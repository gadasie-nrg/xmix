---
name: Expo workspace install state
description: Recover missing Expo and test-tool links before changing a valid mobile project
---

When an Expo workspace reports missing CLI, `expo/tsconfig.base`, or test-tool modules while the manifest and lockfile are aligned, refresh the workspace installation with a frozen lockfile install before editing app code.

**Why:** pnpm workspace links are generated state and can become stale after merged dependency changes, making a valid lockfile appear broken.

**How to apply:** Run `pnpm install --frozen-lockfile` from the workspace root, then verify the artifact workflow, typecheck, and build. An offline install may fail when a required tarball is not already cached; retry through the configured registry.