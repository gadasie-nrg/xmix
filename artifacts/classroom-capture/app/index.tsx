import { Feather } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppMark } from '@/components/AppMark';
import { CaptureTile } from '@/components/CaptureTile';
import { useCaptures } from '@/context/CaptureContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { ensureTempFolder } from '@/lib/drive';
import { useColors } from '@/hooks/useColors';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { captures, cleanupExpired } = useCaptures();
  const { profile, hydrated } = useOnboarding();
  const [driveReady, setDriveReady] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    void cleanupExpired();
  }, []);

  if (!hydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!profile) return <Redirect href="/onboarding" />;

  const connectDrive = async () => {
    setConnecting(true);
    try {
      await ensureTempFolder();
      setDriveReady(true);
    } catch (error) {
      Alert.alert('Google Drive unavailable', error instanceof Error ? error.message : 'Try again in a moment.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 34 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <AppMark />
          <Pressable
            testID="settings-button"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="settings" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.intro}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>PRIVATE BY DEFAULT</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Keep the moment.{'\n'}Not the clutter.</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Capture classroom moments safely. Photos stay in this app until you decide where they go.
          </Text>
        </View>

          <View style={[styles.workspaceCard, { backgroundColor: colors.secondary }]}>
          <View style={[styles.workspaceIcon, { backgroundColor: colors.card }]}>
            <Feather name={profile.mode === 'institution' ? 'users' : 'user'} size={17} color={colors.primary} />
          </View>
          <View style={styles.workspaceCopy}>
            <Text style={[styles.workspaceTitle, { color: colors.foreground }]}>
              {profile.mode === 'institution' ? 'Institution workspace' : 'Independent workspace'}
            </Text>
            <Text style={[styles.workspaceDescription, { color: colors.mutedForeground }]}>
                {profile.mode === 'institution' ? 'Your institution invite is connected.' : 'Private capture. Activate with a manager code when ready.'}
            </Text>
          </View>
            {profile.mode === 'institution' ? (
              <Feather name="check-circle" size={17} color={colors.primary} />
            ) : (
              <Pressable
                testID="activate-institution-button"
                onPress={() => router.push('/join')}
                style={({ pressed }) => [styles.activateButton, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.activateButtonText, { color: colors.primary }]}>Activate</Text>
                <Feather name="arrow-up-right" size={14} color={colors.primary} />
              </Pressable>
            )}
        </View>

        <Pressable
          testID="open-camera-button"
          onPress={() => router.push('/camera')}
          style={({ pressed }) => [styles.cameraButton, { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          <View style={[styles.cameraIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Feather name="camera" size={25} color={colors.primaryForeground} />
          </View>
          <View style={styles.cameraCopy}>
            <Text style={[styles.cameraLabel, { color: colors.primaryForeground }]}>Open camera</Text>
            <Text style={[styles.cameraHint, { color: 'rgba(255,255,255,0.72)' }]}>Photos won’t enter your gallery</Text>
          </View>
          <Feather name="arrow-up-right" size={22} color={colors.primaryForeground} />
        </Pressable>

        <View style={[styles.driveCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.driveBadge, { backgroundColor: driveReady ? colors.secondary : colors.accent }]}>
            <Feather name="cloud" size={18} color={driveReady ? colors.primary : colors.accentForeground} />
          </View>
          <View style={styles.driveCopy}>
            <Text style={[styles.driveTitle, { color: colors.foreground }]}>
              {driveReady ? 'Google Drive is ready' : 'Set up private Drive sync'}
            </Text>
            <Text style={[styles.driveDescription, { color: colors.mutedForeground }]}>
              {driveReady ? 'Temporary folder connected for this session.' : 'A private staging folder keeps captures safe before sharing.'}
            </Text>
          </View>
          <Pressable testID="connect-drive-button" onPress={connectDrive} disabled={connecting}>
            <Text style={[styles.link, { color: colors.primary }]}>{connecting ? '...' : driveReady ? 'Ready' : 'Connect'}</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent captures</Text>
            <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>
              {captures.length ? `${captures.length} photo${captures.length === 1 ? '' : 's'} in your workspace` : 'Nothing saved yet'}
            </Text>
          </View>
          {captures.length ? (
            <Pressable testID="review-button" onPress={() => router.push('/review')}>
              <Text style={[styles.link, { color: colors.primary }]}>Review all</Text>
            </Pressable>
          ) : null}
        </View>

        {captures.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tileRow}>
            {captures.slice(0, 8).map((capture) => <CaptureTile key={capture.id} capture={capture} />)}
          </ScrollView>
        ) : (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="image" size={21} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your classroom moments will land here</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Open the camera when something worth remembering happens.</Text>
          </View>
        )}

        <View style={[styles.privacyNote, { borderTopColor: colors.border }]}>
          <Feather name="lock" size={15} color={colors.mutedForeground} />
          <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>No native Camera Roll access. Local copies expire automatically.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 22, gap: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  intro: { gap: 10, marginTop: 18 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.5 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 36, lineHeight: 40, letterSpacing: -1.5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, maxWidth: 330 },
  workspaceCard: { borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  workspaceIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  workspaceCopy: { flex: 1, gap: 3 },
  workspaceTitle: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  workspaceDescription: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15 },
  activateButton: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  activateButtonText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  cameraButton: { minHeight: 92, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  cameraIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cameraCopy: { flex: 1, gap: 5 },
  cameraLabel: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  cameraHint: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  driveCard: { borderWidth: 1, borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  driveBadge: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  driveCopy: { flex: 1, gap: 4 },
  driveTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  driveDescription: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  link: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  sectionMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  tileRow: { gap: 10 },
  empty: { minHeight: 168, borderWidth: 1, borderRadius: 20, padding: 22, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, textAlign: 'center' },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 260 },
  privacyNote: { borderTopWidth: 1, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  privacyText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, flex: 1 },
});