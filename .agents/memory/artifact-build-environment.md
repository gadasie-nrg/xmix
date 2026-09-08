---
name: Artifact build environment
description: Environment requirements for validating artifact builds outside managed workflows
---

Standalone builds for the web artifacts may require the artifact-specific `PORT` and `BASE_PATH` environment variables that managed workflows inject automatically.

**Why:** A workspace-wide build can fail before compiling an otherwise healthy artifact when those runtime routing values are absent.

**How to apply:** Prefer managed workflow validation; when running an individual web build, provide its configured port and base path explicitly.