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

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as OnboardingProfile;
        if (parsed.mode === 'independent' && typeof parsed.completedAt === 'number') {
          setProfile(parsed);
        } else {
          const legacy = parsed as unknown as LegacyOnboardingProfile;
          if (legacy.mode === 'school' && typeof legacy.schoolId === 'string' && typeof legacy.completedAt === 'number') {
            setProfile({ mode: 'institution', institutionId: legacy.schoolId, completedAt: legacy.completedAt });
          }
        }
      })
      .finally(() => setHydrated(true));
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