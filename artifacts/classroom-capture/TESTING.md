# Xmix Capture validation

Run the focused regression suite from the workspace root:

```sh
pnpm test:classroom-capture
```

The suite covers onboarding choices, institution-code normalization and
submission, camera and gallery capture state, review-to-native-sharing state,
and the Google Drive request boundary. Device APIs and network calls are
mocked at their boundaries so the suite is deterministic.

This command does not replace physical iOS and Android checks. Camera and
photo-library permissions, native share sheets, receiving apps, keyboards, and
Google Drive sign-in still require the device checklist in `DEVICE_QA.md`.