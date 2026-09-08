---
name: Expo device QA
description: Native classroom-capture behaviors that static or web checks cannot validate
---

Physical iOS and Android testing is required for camera permissions, photo-library access, keyboards, native share sheets, and Google Drive behavior; Expo web/static builds are not evidence for those flows.

**Why:** Native permissions and receiving-app behavior are implemented by the operating system and installed apps, and cannot be exercised by Metro exports or browser previews.

**How to apply:** Keep device QA results separated by iOS and Android, and record the exact blocker when no physical target or Expo Go session is available instead of claiming a pass.