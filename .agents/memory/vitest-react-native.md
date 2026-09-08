---
name: Vitest React Native harness
description: Node-based Vitest coverage for Expo screens and native boundaries
---

Vitest can exercise Expo screen handlers with React 19's test renderer, but the
Metro/Flow React Native package must be replaced by a test-only module alias.
Mock native modules and network/file APIs at their boundaries; use the real
providers and screen handlers underneath.

**Why:** Loading the Expo React Native package directly in the Node test
worker produced parser failures, while a small alias plus test-renderer keeps
the suite deterministic without changing runtime app behavior.

**How to apply:** Keep the alias and boundary mocks scoped to the classroom
capture Vitest config. Prefer direct test-renderer interactions over adding
browser-oriented DOM tooling to the Expo package.