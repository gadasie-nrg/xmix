# Xmix Capture device QA

**Date:** 2026-09-08  
**Status:** Native acceptance pass attempted; physical iOS and Android targets unavailable

This pass could not satisfy the real-device acceptance criteria. The Replit
workspace has no connected devices (`artifacts/classroom-capture/.expo/devices.json`
contains `{"devices":[]}`), and no `adb`, `xcrun`, `ios-deploy`, or Android
emulator tooling is available. The managed Expo workflow was started and
exposed a QR/session URL, but there was no physical target available to scan
it. The stock Expo Go 57 flow was therefore not tested on either platform.

## Acceptance matrix

| Flow | iOS | Android | Result |
| --- | --- | --- | --- |
| Onboarding and independent start | Not run | Not run | Requires separate physical targets |
| Institution linking and keyboard-aware join form | Not run | Not run | Requires separate physical targets |
| Navigation, capture review, and settings controls | Not run | Not run | Requires separate physical targets |
| Camera permission and camera capture | Not run | Not run | Requires OS permission prompt and camera |
| Gallery permission, multi-select import, and review | Not run | Not run | Requires device photo library |
| Native share sheet and receiving app | Not run | Not run | Requires installed receiving apps and OS share sheet |
| Google Drive sign-in, folder list, and upload | Not run | Not run | Requires device sign-in and Drive account |

No platform-specific regression was filed because no iOS or Android
reproduction was possible.

## Checks completed in the workspace

- The camera screen uses `expo-camera` permissions and `CameraView.takePictureAsync`.
- Gallery import uses `expo-image-picker` with multiple image selection and
  explicit photo-library permission handling.
- Review uses app-cache copies with preserved image extensions/MIME types before
  native sharing.
- Drive sharing loads the temporary folder and user folders, uploads selected
  images, records the Drive file ID, and optionally deletes imported gallery
  files after a successful upload.
- Onboarding/institution linking, keyboard-aware join fields, navigation, and
  settings controls are present for the device pass.
- The Expo Go code path intentionally reports that the custom native module is
  unavailable. Multi-photo native sharing requires the XmiX development build;
  the custom Android/iOS bridge is not included in stock Expo Go. A physical
  stock Expo Go check should record this expected message instead of treating
  the absent native share sheet as a regression.

## Verification blockers

| Check | Result | Evidence |
| --- | --- | --- |
| iOS physical Expo Go 57 | **Not run** | No iOS target or simulator is available |
| Android physical Expo Go 57 | **Not run** | No Android target, emulator, or `adb` is available |
| Expo workflow | **Passed** | The managed `artifacts/classroom-capture: expo` workflow is running Metro and exposes an Expo Go QR/session URL |
| Automated tests | **Passed** | `pnpm --filter @workspace/classroom-capture run test`: 3 files and 10 tests passed |
| Typecheck | **Passed** | `pnpm --filter @workspace/classroom-capture run typecheck` completes without errors |
| Static build | **Passed** | `pnpm --filter @workspace/classroom-capture run build` creates fresh iOS and Android bundles/manifests |

The next device pass must use separate iOS and Android targets and replace
each `Not run` entry with the observed result and exact platform-specific
reproduction steps for any regression.