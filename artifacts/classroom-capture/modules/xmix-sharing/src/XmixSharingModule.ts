import { NativeModule, requireNativeModule } from 'expo';

export type XmixSharingNativeModule = NativeModule<{}> & {
  shareImages(
    paths: string[],
    mimeType?: string,
    title?: string,
    text?: string,
  ): Promise<void>;
};

let cachedModule: XmixSharingNativeModule | null | undefined;

export function getXmixSharingModule(): XmixSharingNativeModule | null {
  if (cachedModule !== undefined) return cachedModule;

  try {
    cachedModule = requireNativeModule<XmixSharingNativeModule>('XmixSharing');
  } catch {
    // Expo Go does not contain this custom module, so multi-photo sharing
    // remains unavailable until the XmiX development build is installed.
    cachedModule = null;
  }

  return cachedModule;
}
