import { Feather } from '@expo/vector-icons';
import { useEnrollMobileUser } from '@workspace/api-client-react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppMark } from '@/components/AppMark';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useOnboarding } from '@/context/OnboardingContext';
import { useColors } from '@/hooks/useColors';
import { t } from '@/lib/i18n';

export default function JoinInstitutionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { hydrated, joinInstitution } = useOnboarding();
  const enroll = useEnrollMobileUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deviceId] = useState(() => `xmix-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const params = useLocalSearchParams<{ code?: string | string[]; institutionId?: string | string[]; schoolId?: string | string[] }>();
  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
  const [joinCode, setJoinCode] = useState(typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '');
  const rawInstitutionId = Array.isArray(params.institutionId) ? params.institutionId[0] : params.institutionId;
  const legacyInstitutionId = Array.isArray(params.schoolId) ? params.schoolId[0] : params.schoolId;
  const institutionId = typeof rawInstitutionId === 'string' ? rawInstitutionId.trim() : typeof legacyInstitutionId === 'string' ? legacyInstitutionId.trim() : '';

  if (!hydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const acceptInvite = async () => {
    if (!joinCode.trim() && !institutionId) {
      Alert.alert(t('institutionCodeMissing'), t('askManagerForCode'));
      return;
    }
    if (!name.trim() || !email.trim() || !phone.trim()) {
      Alert.alert(t('addYourDetails'), t('detailsRequired'));
      return;
    }
    enroll.mutate(
      { data: { ...(institutionId ? { institutionId } : {}), ...(joinCode.trim() ? { joinCode: joinCode.trim().toUpperCase() } : {}), name: name.trim(), email: email.trim(), phone: phone.trim(), deviceId } },
      {
        onSuccess: async (user) => {
          await joinInstitution(user.institutionId);
          Alert.alert(t('institutionConnected'), t('deviceLinked'));
          router.replace('/');
        },
        onError: (error) => Alert.alert(t('couldNotJoin'), error instanceof Error ? error.message : t('tryAgainShortly')),
      },
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}
        bottomOffset={80}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            testID="join-back-button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="arrow-right" size={20} color={colors.foreground} />
          </Pressable>
          <AppMark />
        </View>

        <>
            <View style={styles.intro}>
       <Text style={[styles.eyebrow, { color: colors.primary }]}>{t('joinInstitution')}</Text>
       <Text style={[styles.title, { color: colors.foreground }]}>{t('enterInstitutionCode')}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
         {t('codeLinksDevice')}
              </Text>
            </View>

            <View style={[styles.inviteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.inviteIcon, { backgroundColor: colors.secondary }]}>
                <Feather name="users" size={22} color={colors.primary} />
              </View>
              <View style={styles.inviteCopy}>
                  <Text style={[styles.inviteLabel, { color: colors.mutedForeground }]}>{t('institutionCode')}</Text>
                 <TextInput
                   testID="institution-code-input"
                   value={joinCode}
                   onChangeText={(value) => setJoinCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                   placeholder="ABC123"
                   placeholderTextColor={colors.mutedForeground}
                   autoCapitalize="characters"
                   autoCorrect={false}
                   maxLength={8}
                   style={[styles.codeInput, { color: colors.foreground }]}
                 />
              </View>
              <Feather name={joinCode.length >= 6 || institutionId ? 'check-circle' : 'key'} size={21} color={colors.primary} />
            </View>

            <View style={styles.form}>
                 <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{t('yourDetails')}</Text>
              <TextInput
                testID="institution-join-name-input"
                value={name}
                onChangeText={setName}
                 placeholder={t('fullName')}
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              />
              <TextInput
                testID="institution-join-email-input"
                value={email}
                onChangeText={setEmail}
                 placeholder={t('workEmail')}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              />
               <TextInput
                 testID="institution-join-phone-input"
                 value={phone}
                 onChangeText={setPhone}
                 placeholder={t('phoneNumber')}
                 placeholderTextColor={colors.mutedForeground}
                 keyboardType="phone-pad"
                 autoComplete="tel"
                 style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
               />
            </View>

            <Pressable
              testID="accept-institution-invite-button"
              onPress={() => void acceptInvite()}
              disabled={enroll.isPending}
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed || enroll.isPending ? 0.7 : 1 }]}
            >
               <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>{enroll.isPending ? t('connecting') : t('joinInstitutionWorkspace')}</Text>
              <Feather name={enroll.isPending ? 'loader' : 'arrow-up-right'} size={20} color={colors.primaryForeground} />
            </Pressable>
            {enroll.error ? <Text style={[styles.errorText, { color: colors.accentForeground }]}>{enroll.error instanceof Error ? enroll.error.message : t('couldNotConnectInstitution')}</Text> : null}
        </>

        <View style={[styles.note, { borderTopColor: colors.border }]}>
          <Feather name="lock" size={16} color={colors.mutedForeground} />
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
             {t('photosPrivateUntilShare')}
          </Text>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, gap: 28 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  intro: { gap: 10, marginTop: 26 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.5 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 34, lineHeight: 39, letterSpacing: -1.3 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 },
  inviteCard: { borderWidth: 1, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  inviteIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  inviteCopy: { flex: 1, gap: 5 },
  inviteLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1 },
  inviteId: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  codeInput: { minHeight: 34, padding: 0, fontFamily: 'Inter_700Bold', fontSize: 21, letterSpacing: 3, textAlign: 'left', writingDirection: 'ltr' },
  form: { gap: 9 },
  fieldLabel: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, fontFamily: 'Inter_400Regular', fontSize: 14, writingDirection: 'ltr' },
  primaryButton: { minHeight: 58, borderRadius: 18, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  errorText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 17 },
  note: { borderTopWidth: 1, paddingTop: 16, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  noteText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
});