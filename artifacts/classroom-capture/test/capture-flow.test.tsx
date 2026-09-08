import { describe, expect, it } from 'vitest';
import CameraScreen from '@/app/camera';
import ReviewScreen from '@/app/review';
import { CaptureProvider, useCaptures } from '@/context/CaptureContext';
import { testState } from './setup';
import { fireEvent, render } from './test-render';
import { t } from '@/lib/i18n';

function CaptureProbe() {
  const { captures } = useCaptures();
  return (
    <>
      {captures.map((capture) => (
        <Text key={capture.id} testID={`capture-${capture.source}`}>
          {capture.uri ?? 'removed'}
        </Text>
      ))}
    </>
  );
}

function Text(props: { children: string; testID: string }) {
  return <text {...props} />;
}

async function renderCamera() {
  return render(
    <CaptureProvider>
      <CameraScreen />
      <CaptureProbe />
    </CaptureProvider>,
  );
}

describe('capture inputs', () => {
  it('stores a camera photo and allows the session to continue to review', async () => {
    const screen = await renderCamera();

    await fireEvent.press(screen.getByTestId('capture-button'));
    expect(screen.getByTestId('capture-camera')).toBeTruthy();
    expect(screen.getByTestId('capture-camera').props.children).toBe('file:///camera-photo.jpg');

    await fireEvent.press(screen.getByTestId('camera-done-button'));
    expect(testState.router.replace).toHaveBeenCalledWith('/review');
  });

  it('stores gallery metadata and routes imported photos to review', async () => {
    const screen = await renderCamera();

    await fireEvent.press(screen.getByTestId('import-gallery-button'));
    expect(screen.getByTestId('capture-gallery')).toBeTruthy();

    expect(screen.getByTestId('capture-gallery').props.children).toBe('file:///gallery-photo.png');
    expect(testState.router.replace).toHaveBeenCalledWith('/review');
  });
});

describe('review sharing', () => {
  it('stages selected photos and marks them sent after native sharing succeeds', async () => {
    const capture = {
      id: 'camera-1',
      uri: 'file:///camera-photo.jpg',
      createdAt: Date.now(),
      status: 'not_sent',
      source: 'camera',
    };
    testState.storage.set('@classroom-capture/captures', JSON.stringify([capture]));
    const screen = await render(
      <CaptureProvider>
        <ReviewScreen />
      </CaptureProvider>,
    );

    expect(screen.getByTestId('share-button')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('share-button'));
    await fireEvent.press(screen.getByTestId('native-share-button'));

    expect(testState.xmixSharing?.shareImages).toHaveBeenCalledWith(
      ['file:///cache/xmix-sharing/xmix-camera-1.jpg'],
      'image/*',
      t('shareXmixPhotos'),
      undefined,
    );
    expect(JSON.parse(testState.storage.get('@classroom-capture/captures') ?? '[]')[0]).toMatchObject({
      id: 'camera-1',
      status: 'sent',
      destination: 'Device sharing sheet',
    });
  });

  it('shares one photo through Expo Go when the development module is unavailable', async () => {
    testState.xmixSharing = null;
    const capture = {
      id: 'camera-1',
      uri: 'file:///camera-photo.jpg',
      createdAt: Date.now(),
      status: 'not_sent',
      source: 'camera',
    };
    testState.storage.set('@classroom-capture/captures', JSON.stringify([capture]));
    const screen = await render(
      <CaptureProvider>
        <ReviewScreen />
      </CaptureProvider>,
    );

    await fireEvent.press(screen.getByTestId('share-button'));
    await fireEvent.press(screen.getByTestId('native-share-button'));

    expect(testState.sharing.shareAsync).toHaveBeenCalledWith(
      'file:///cache/xmix-sharing/xmix-camera-1.jpg',
      {
        mimeType: 'image/jpeg',
        dialogTitle: t('shareXmixPhoto'),
        UTI: 'public.image',
      },
    );
    expect(JSON.parse(testState.storage.get('@classroom-capture/captures') ?? '[]')[0]).toMatchObject({
      id: 'camera-1',
      status: 'sent',
      destination: 'Device sharing sheet',
    });
  });

  it('keeps multi-photo sharing restricted to the development build in Expo Go', async () => {
    testState.xmixSharing = null;
    const captures = [1, 2].map((index) => ({
      id: `camera-${index}`,
      uri: `file:///camera-photo-${index}.jpg`,
      createdAt: Date.now() + index,
      status: 'not_sent' as const,
      source: 'camera' as const,
    }));
    testState.storage.set('@classroom-capture/captures', JSON.stringify(captures));
    const screen = await render(
      <CaptureProvider>
        <ReviewScreen />
      </CaptureProvider>,
    );

    await fireEvent.press(screen.getByTestId('share-button'));
    await fireEvent.press(screen.getByTestId('native-share-button'));

    expect(testState.sharing.shareAsync).not.toHaveBeenCalled();
    expect(testState.alerts.at(-1)).toMatchObject({
      title: t('couldNotShare'),
      message: t('multipleShareBuild'),
    });
  });
});