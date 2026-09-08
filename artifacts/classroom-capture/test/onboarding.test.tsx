import { describe, expect, it } from 'vitest';
import HomeScreen from '@/app/index';
import OnboardingScreen from '@/app/onboarding';
import JoinInstitutionScreen from '@/app/join';
import { CaptureProvider } from '@/context/CaptureContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { testState } from './setup';
import { fireEvent, render } from './test-render';
import { t } from '@/lib/i18n';

async function renderOnboardingScreen() {
  return render(
    <OnboardingProvider>
      <OnboardingScreen />
    </OnboardingProvider>,
  );
}

async function renderJoinScreen() {
  return render(
    <OnboardingProvider>
      <JoinInstitutionScreen />
    </OnboardingProvider>,
  );
}

async function renderHomeScreen() {
  return render(
    <OnboardingProvider>
      <CaptureProvider>
        <HomeScreen />
      </CaptureProvider>
    </OnboardingProvider>,
  );
}

describe('onboarding choices', () => {
  it('routes institution users to the invite form', async () => {
    const screen = await renderOnboardingScreen();

    expect(screen.getByTestId('join-institution-button')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('join-institution-button'));

    expect(testState.router.push).toHaveBeenCalledWith('/join');
  });

  it('saves independent users and returns them to the home route', async () => {
    const screen = await renderOnboardingScreen();

    expect(screen.getByTestId('continue-independent-button')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('continue-independent-button'));

    expect(testState.router.replace).toHaveBeenCalledWith('/');
    expect(JSON.parse(testState.storage.get('@xmix/onboarding') ?? '{}')).toMatchObject({ mode: 'independent' });
  });
});

describe('stored onboarding profiles', () => {
  it('migrates legacy school profiles, persists the current profile, and keeps the home route connected', async () => {
    testState.storage.set(
      '@xmix/onboarding',
      JSON.stringify({ mode: 'school', schoolId: ' school-42 ', completedAt: 1234 }),
    );

    const screen = await renderHomeScreen();

    expect(JSON.parse(testState.storage.get('@xmix/onboarding') ?? '{}')).toEqual({
      mode: 'institution',
      institutionId: 'school-42',
      completedAt: 1234,
    });
    expect(screen.getByTestId('open-camera-button')).toBeTruthy();
    expect(screen.renderer.root.findAllByProps({ href: '/onboarding' })).toHaveLength(0);
  });

  it('treats malformed stored profiles as incomplete onboarding', async () => {
    testState.storage.set('@xmix/onboarding', '{not valid json');

    const screen = await renderHomeScreen();

    expect(screen.renderer.root.findByProps({ href: '/onboarding' })).toBeTruthy();
    expect(screen.renderer.root.findAllByProps({ testID: 'open-camera-button' })).toHaveLength(0);
  });
});

describe('institution code form', () => {
  it('normalizes pasted codes and blocks incomplete details', async () => {
    const screen = await renderJoinScreen();

    expect(screen.getByTestId('institution-code-input')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('institution-code-input'), ' ab-12 xyz789 ');

    expect(screen.getByTestId('institution-code-input').props.value).toBe('AB12XYZ7');
    await fireEvent.press(screen.getByTestId('accept-institution-invite-button'));

    expect(testState.alerts).toEqual([
      {
        title: t('addYourDetails'),
        message: t('detailsRequired'),
      },
    ]);
    expect(testState.enrollment.mutate).not.toHaveBeenCalled();
  });

  it('submits the normalized code and saves the returned institution', async () => {
    const screen = await renderJoinScreen();

    expect(screen.getByTestId('institution-code-input')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('institution-code-input'), 'abc-123');
    await fireEvent.changeText(screen.getByTestId('institution-join-name-input'), ' Ada Lovelace ');
    await fireEvent.changeText(screen.getByTestId('institution-join-email-input'), ' ada@example.com ');
    await fireEvent.changeText(screen.getByTestId('institution-join-phone-input'), ' 555-0100 ');
    await fireEvent.press(screen.getByTestId('accept-institution-invite-button'));

    expect(testState.enrollment.mutate).toHaveBeenCalledTimes(1);
    const [request, callbacks] = testState.enrollment.mutate.mock.calls[0];
    expect(request.data).toMatchObject({
      joinCode: 'ABC123',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '555-0100',
    });

    await callbacks.onSuccess({ institutionId: 'institution-42' });
    expect(testState.router.replace).toHaveBeenCalledWith('/');
    expect(JSON.parse(testState.storage.get('@xmix/onboarding') ?? '{}')).toMatchObject({
      mode: 'institution',
      institutionId: 'institution-42',
    });
  });
});