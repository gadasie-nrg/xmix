---
name: Metro image dimensions
description: Compatibility constraint when replacing vulnerable image-size releases in Expo/Metro workspaces.
---

Metro's asset transformer calls image-size synchronously with a file path. A maintained security fork that only accepts buffers or returns an ESM-shaped export can make every Android bundle fail before application code loads.

**Why:** The Android bundle is the real validation path for image-size replacements; typechecks and web builds do not exercise Metro's asset transformer.

**How to apply:** Preserve the original callable CommonJS path-or-buffer contract with a small adapter, and verify a real Android entry bundle through the Expo tunnel.