---
name: Native photo sharing
description: Cross-app image sharing requirements for the Expo mobile app
---

On native devices, stage each image in an app-owned cache file with a matching extension and MIME type. Expo Go uses Expo Sharing's reliable single-file path; a native development build can use the local XmiX bridge to send all staged files in one platform share action. In the browser preview, fetch the capture URI into a real `File` and pass it through the Web Share API's `files` field.

**Why:** Manual JavaScript content-URI intents did not reliably grant Google Photos, WhatsApp, and WhatsApp Business permission to read multiple attachments. The native bridge reuses Expo Sharing's configured FileProvider, creates real content URIs, grants read access to each resolved receiver, and sends Android `ACTION_SEND_MULTIPLE` or iOS `UIActivityViewController` arrays. Expo Sharing's web implementation shares its argument as a URL, not a file.

**How to apply:** Preserve MIME type and filename metadata when captures are created or imported. Use the platform-specific file path; do not use Expo Sharing on web. Treat the combined-share behavior as native-development-build-only; keep the Expo Go fallback because Expo Go cannot load the custom bridge. Captions may be included, but receiving apps do not attach native share text consistently.