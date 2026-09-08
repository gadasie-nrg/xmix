import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ONBOARDING_KEY = '@xmix/onboarding';

export type OnboardingProfile =
  | { mode: 'independent'; completedAt: number }
  | { mode: 'institution'; institutionId: string; completedAt: number };

type LegacyOnboardingProfile = { mode: 'school'; schoolId: string; completedAt: number };

type OnboardingContextValue = {
  profile: OnboardingProfile | null;
  hydrated: boolean;
  continueIndependently: () => Promise<void>;
  joinInstitution: (institutionId: string) => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function isCompletedAt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readStoredProfile(value: unknown): { profile: OnboardingProfile | null; migrated: boolean } {
  if (!value || typeof value !== 'object') return { profile: null, migrated: false };

  const stored = value as Record<string, unknown>;
  if (stored.mode === 'independent' && isCompletedAt(stored.completedAt)) {
    return {
      profile: { mode: 'independent', completedAt: stored.completedAt },
      migrated: false,
    };
  }

  if (
    stored.mode === 'institution' &&
    typeof stored.institutionId === 'string' &&
    stored.institutionId.trim() &&
    isCompletedAt(stored.completedAt)
  ) {
    return {
      profile: {
        mode: 'institution',
        institutionId: stored.institutionId.trim(),
        completedAt: stored.completedAt,
      },
      migrated: false,
    };
  }

  if (
    stored.mode === 'school' &&
    typeof stored.schoolId === 'string' &&
    stored.schoolId.trim() &&
    isCompletedAt(stored.completedAt)
  ) {
    return {
      profile: {
        mode: 'institution',
        institutionId: stored.schoolId.trim(),
        completedAt: stored.completedAt,
      },
      migrated: true,
    };
  }

  return { profile: null, migrated: false };
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const stored = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!stored) return;

        let parsed: unknown;
        try {
          parsed = JSON.parse(stored);
        } catch {
          return;
        }

        const { profile: storedProfile, migrated } = readStoredProfile(parsed);
        if (!storedProfile || !active) return;

        setProfile(storedProfile);
        if (migrated) {
          await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(storedProfile));
        }
      } catch {
        // Treat storage failures and malformed profiles as incomplete onboarding.
      } finally {
        if (active) setHydrated(true);
      }
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  const saveProfile = useCallback(async (nextProfile: OnboardingProfile) => {
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(nextProfile));
    setProfile(nextProfile);
  }, []);

  const continueIndependently = useCallback(
    async () => saveProfile({ mode: 'independent', completedAt: Date.now() }),
    [saveProfile],
  );

  const joinInstitution = useCallback(
    async (institutionId: string) => {
      const normalizedInstitutionId = institutionId.trim();
      if (!normalizedInstitutionId) throw new Error('This institution invite is missing its institution ID.');
      await saveProfile({ mode: 'institution', institutionId: normalizedInstitutionId, completedAt: Date.now() });
    },
    [saveProfile],
  );

  const value = useMemo(
    () => ({ profile, hydrated, continueIndependently, joinInstitution }),
    [profile, hydrated, continueIndependently, joinInstitution],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return context;
}