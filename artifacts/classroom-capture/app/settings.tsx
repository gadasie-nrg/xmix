import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppMark } from '@/components/AppMark';
import { useCaptures } from '@/context/CaptureContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { ensureTempFolder } from '@/lib/drive';
import { useColors } from '@/hooks/useColors';

const OPTIONS = [
  { value: 1, label: 'After 1 hour', note: 'Best for sensitive moments' },
  { value: 24, label: 'After 24 hours', note: 'Recommended for an institution day' },
  { value: 72, label: 'After 3 days', note: 'Keep a little longer for review' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { cleanupHours, setCleanupHours, deleteImportedAfterUpload, setDeleteImportedAfterUpload } = useCaptures();
  const { profile } = useOnboarding();
  const [connecting, setConnecting] = useState(false);

  const connect = async () => {
    setConnecting(true);
    try {
      await ensureTempFolder();
      Alert.alert('Google Drive connected', 'Your private temporary folder is ready.');
    } catch (error) {
      Alert.alert('Could not connect', error instanceof Error ? error.message : 'Try again shortly.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 }]}>
        <View style={styles.header}><Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card }]}><Feather name="arrow-left" size={20} color={colors.foreground} /></Pressable><AppMark /></View>
        <View style={styles.intro}><Text style={[styles.title, { color: colors.foreground }]}>Settings</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>You’re in control of how long classroom photos stay on this device.</Text></View>

        <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Temporary photo cleanup</Text><Text style={[styles.sectionText, { color: colors.mutedForeground }]}>Photos are stored in the app cache only. Once this window passes, the local copy is deleted automatically.</Text><View style={styles.options}>{OPTIONS.map((option) => <Pressable key={option.value} testID={`cleanup-${option.value}`} onPress={() => void setCleanupHours(option.value)} style={[styles.option, { backgroundColor: colors.card, borderColor: cleanupHours === option.value ? colors.primary : colors.border }]}><View style={[styles.radio, { borderColor: cleanupHours === option.value ? colors.primary : colors.border }]}>{cleanupHours === option.value ? <View style={[styles.radioInner, { backgroundColor: colors.primary }]} /> : null}</View><View style={styles.optionCopy}><Text style={[styles.optionLabel, { color: colors.foreground }]}>{option.label}</Text><Text style={[styles.optionNote, { color: colors.mutedForeground }]}>{option.note}</Text></View></Pressable>)}</View></View>

        <View style={styles.section}>
          <View style={styles.toggleHeader}>
            <View style={styles.toggleCopy}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Delete imported photos after upload</Text>
              <Text style={[styles.sectionText, { color: colors.mutedForeground }]}>When enabled, imported gallery photos are removed from this device after they upload successfully to Drive.</Text>
            </View>
            <Switch
              testID="delete-imported-after-upload-toggle"
              value={deleteImportedAfterUpload}
              onValueChange={(value) => void setDeleteImportedAfterUpload(value)}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor={deleteImportedAfterUpload ? colors.primary : colors.mutedForeground}
            />
          </View>
          <Text style={[styles.deletionNote, { color: colors.mutedForeground }]}>
            Note: Deletion only applies to photos stored locally on this device. Photos hosted only on cloud services like Google Photos or iCloud cloud backup cannot be automatically deleted from the cloud.
          </Text>
        </View>

        <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Google Drive</Text><Text style={[styles.sectionText, { color: colors.mutedForeground }]}>Google sign-in is used only for Drive sync. There is no separate XmiX password.</Text><Pressable testID="settings-connect-drive" onPress={connect} disabled={connecting} style={[styles.connectButton, { backgroundColor: colors.secondary }]}><Feather name="cloud" size={18} color={colors.primary} /><Text style={[styles.connectButtonText, { color: colors.foreground }]}>{connecting ? 'Connecting…' : 'Connect Google Drive'}</Text><Feather name="arrow-up-right" size={16} color={colors.primary} /></Pressable></View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Institution workspace</Text>
          <Text style={[styles.sectionText, { color: colors.mutedForeground }]}>
            {profile?.mode === 'institution'
              ? 'This device is linked to an institution. Enter another activation code to change institutions.'
              : 'This device is currently independent. Enter an institution activation code when you are ready to link it.'}
          </Text>
          <Pressable testID="settings-link-institution" onPress={() => router.push('/join')} style={[styles.connectButton, { backgroundColor: colors.secondary }]}>
            <Feather name="users" size={18} color={colors.primary} />
            <Text style={[styles.connectButtonText, { color: colors.foreground }]}>{profile?.mode === 'institution' ? 'Change institution' : 'Link to institution'}</Text>
            <Feather name="arrow-up-right" size={16} color={colors.primary} />
          </Pressable>
        </View>

        <View style={[styles.footerNote, { backgroundColor: colors.accent }]}><Feather name="shield" size={17} color={colors.accentForeground} /><Text style={[styles.footerText, { color: colors.accentForeground }]}>Your photos never enter the native Camera Roll unless you explicitly save them outside this app.</Text></View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, gap: 28 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  intro: { gap: 9 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -1 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
  section: { gap: 10 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  sectionText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  options: { gap: 9, marginTop: 4 },
  option: { borderWidth: 1, borderRadius: 17, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  optionCopy: { gap: 3 },
  optionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  optionNote: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  toggleHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleCopy: { flex: 1, gap: 5 },
  deletionNote: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  connectButton: { borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 },
  connectButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, flex: 1 },
  footerNote: { borderRadius: 18, padding: 15, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  footerText: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, flex: 1 },
});