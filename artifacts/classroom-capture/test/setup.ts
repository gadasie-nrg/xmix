import React from 'react';
import { beforeEach, vi } from 'vitest';

export const testState = {
  alerts: [] as Array<{ title: string; message?: string }>,
  localSearchParams: {} as Record<string, string | string[]>,
  router: {
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  },
  enrollment: {
    mutate: vi.fn(),
    isPending: false,
    error: null as Error | null,
  },
  camera: {
    permission: { granted: true, canAskAgain: true },
    requestPermission: vi.fn(),
    photo: { uri: 'file:///camera-photo.jpg' } as { uri: string } | null,
  },
  picker: {
    permission: { granted: true, canAskAgain: true },
    requestPermission: vi.fn(),
    result: {
      canceled: false,
      assets: [{ uri: 'file:///gallery-photo.png', mimeType: 'image/png', fileName: 'gallery-photo.png' }],
    },
  },
  fileSystem: {
    cacheDirectory: 'file:///cache/',
    readAsStringAsync: vi.fn(async () => 'base64-photo'),
    makeDirectoryAsync: vi.fn(async () => undefined),
    deleteAsync: vi.fn(async () => undefined),
    copyAsync: vi.fn(async () => undefined),
    getInfoAsync: vi.fn(async () => ({ exists: true, size: 10 })),
  },
  xmixSharing: {
    shareImages: vi.fn(async () => undefined),
  } as { shareImages: ReturnType<typeof vi.fn> } | null,
  sharing: {
    isAvailableAsync: vi.fn(async () => true),
    shareAsync: vi.fn(async () => undefined),
  },
  storage: new Map<string, string>(),
  fetch: vi.fn(),
};

function nativeElement(name: string) {
  return function NativeElement({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) {
    return React.createElement(name, props, children);
  };
}

Object.assign(globalThis, { __xmixTestState: testState });

vi.mock('@expo/vector-icons', () => ({ Feather: nativeElement('Feather') }));
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: nativeElement('SafeAreaProvider'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock('react-native-keyboard-controller', () => ({
  KeyboardProvider: nativeElement('KeyboardProvider'),
  KeyboardAwareScrollView: nativeElement('KeyboardAwareScrollView'),
}));
vi.mock('@/components/AppMark', () => ({ AppMark: nativeElement('AppMark') }));
vi.mock('@/components/CaptureTile', () => ({
  CaptureTile: ({ capture }: { capture: { id: string } }) => React.createElement('CaptureTile', { testID: `capture-${capture.id}` }),
}));
vi.mock('@/components/KeyboardAwareScrollViewCompat', () => ({
  KeyboardAwareScrollViewCompat: nativeElement('KeyboardAwareScrollViewCompat'),
}));
vi.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    background: '#fff',
    foreground: '#000',
    primary: '#147d68',
    primaryForeground: '#fff',
    secondary: '#e7f3ed',
    mutedForeground: '#65736b',
    card: '#f7faf8',
    border: '#d8e1db',
    accent: '#f2c66d',
    accentForeground: '#352700',
  }),
}));

vi.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => React.createElement('Redirect', { href }),
  useLocalSearchParams: () => testState.localSearchParams,
  useRouter: () => testState.router,
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => testState.storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      testState.storage.set(key, value);
    }),
  },
}));
vi.mock('expo-file-system/legacy', () => ({
  cacheDirectory: testState.fileSystem.cacheDirectory,
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: testState.fileSystem.readAsStringAsync,
  makeDirectoryAsync: testState.fileSystem.makeDirectoryAsync,
  deleteAsync: testState.fileSystem.deleteAsync,
  copyAsync: testState.fileSystem.copyAsync,
  getInfoAsync: testState.fileSystem.getInfoAsync,
}));
vi.mock('expo-camera', () => ({
  CameraView: React.forwardRef(function CameraView(_props, ref) {
    React.useImperativeHandle(ref, () => ({
      takePictureAsync: vi.fn(async () => testState.camera.photo),
    }));
    return React.createElement('CameraView');
  }),
  useCameraPermissions: () => [testState.camera.permission, testState.camera.requestPermission],
}));
vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: testState.picker.requestPermission,
  launchImageLibraryAsync: vi.fn(async () => testState.picker.result),
}));
vi.mock('@workspace/api-client-react', () => ({
  useEnrollMobileUser: () => testState.enrollment,
}));
vi.mock('@/modules/xmix-sharing/src/XmixSharingModule', () => ({
  getXmixSharingModule: () => testState.xmixSharing,
}));
vi.mock('expo-sharing', () => ({
  isAvailableAsync: testState.sharing.isAvailableAsync,
  shareAsync: testState.sharing.shareAsync,
}));

vi.stubGlobal('fetch', testState.fetch);

beforeEach(() => {
  testState.alerts.length = 0;
  testState.localSearchParams = {};
  testState.router.back.mockReset();
  testState.router.push.mockReset();
  testState.router.replace.mockReset();
  testState.enrollment.mutate.mockReset();
  testState.enrollment.isPending = false;
  testState.enrollment.error = null;
  testState.camera.permission = { granted: true, canAskAgain: true };
  testState.camera.requestPermission.mockReset();
  testState.camera.photo = { uri: 'file:///camera-photo.jpg' };
  testState.picker.permission = { granted: true, canAskAgain: true };
  testState.picker.requestPermission.mockReset();
  testState.picker.requestPermission.mockResolvedValue(testState.picker.permission);
  testState.picker.result = {
    canceled: false,
    assets: [{ uri: 'file:///gallery-photo.png', mimeType: 'image/png', fileName: 'gallery-photo.png' }],
  };
  testState.fileSystem.readAsStringAsync.mockClear();
  testState.fileSystem.makeDirectoryAsync.mockClear();
  testState.fileSystem.deleteAsync.mockClear();
  testState.fileSystem.copyAsync.mockClear();
  testState.fileSystem.getInfoAsync.mockClear();
  testState.xmixSharing = { shareImages: vi.fn(async () => undefined) };
  testState.sharing.isAvailableAsync.mockReset();
  testState.sharing.isAvailableAsync.mockResolvedValue(true);
  testState.sharing.shareAsync.mockReset();
  testState.storage.clear();
  testState.fetch.mockReset();
});