import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppMark } from '@/components/AppMark';
import { useOnboarding } from '@/context/OnboardingContext';
import { useColors } from '@/hooks/useColors';
import { t } from '@/lib/i18n';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { hydrated, continueIndependently } = useOnboarding();

  if (!hydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const chooseIndependent = async () => {
    await continueIndependently();
    router.replace('/');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <AppMark />

        <View style={styles.intro}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{t('welcomeToXmix')}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('privateClassroomMoments')}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t('chooseHowUse')}
          </Text>
        </View>

        <View style={styles.options}>
          <Pressable
            testID="join-institution-button"
            onPress={() => router.push('/join')}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <View style={[styles.optionIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Feather name="users" size={22} color={colors.primaryForeground} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={[styles.optionTitle, { color: colors.primaryForeground }]}>{t('joinYourInstitution')}</Text>
              <Text style={[styles.optionDescription, { color: 'rgba(255,255,255,0.76)' }]}>
                {t('enterManagerCode')}
              </Text>
            </View>
            <Feather name="arrow-up-right" size={20} color={colors.primaryForeground} />
          </Pressable>

          <Pressable
            testID="continue-independent-button"
            onPress={() => void chooseIndependent()}
            style={({ pressed }) => [
              styles.option,
              styles.secondaryOption,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="camera" size={22} color={colors.primary} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={[styles.optionTitle, { color: colors.foreground }]}>{t('useIndependently')}</Text>
              <Text style={[styles.optionDescription, { color: colors.mutedForeground }]}>
                {t('startPrivately')}
              </Text>
            </View>
            <Feather name="arrow-left" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={[styles.note, { borderTopColor: colors.border }]}>
          <Feather name="shield" size={16} color={colors.mutedForeground} />
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            {t('noPasswordGoogle')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, gap: 28 },
  intro: { gap: 10, marginTop: 26 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.5 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 34, lineHeight: 39, letterSpacing: -1.3 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 },
  options: { gap: 12 },
  option: { minHeight: 108, borderRadius: 22, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 13 },
  secondaryOption: { borderWidth: 1 },
  optionIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1, gap: 5 },
  optionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  optionDescription: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  note: { borderTopWidth: 1, paddingTop: 16, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  noteText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
});