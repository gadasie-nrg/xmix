import { Feather } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CaptureRecord } from '@/context/CaptureContext';
import { useColors } from '@/hooks/useColors';
import { t } from '@/lib/i18n';

export function CaptureTile({
  capture,
  selected,
  onPress,
}: {
  capture: CaptureRecord;
  selected?: boolean;
  onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      testID={`capture-${capture.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { borderColor: selected ? colors.primary : colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {capture.uri ? (
        <Image source={{ uri: capture.uri }} style={styles.image} />
      ) : (
        <View style={[styles.cleaned, { backgroundColor: colors.secondary }]}>
          <Feather name="shield" size={22} color={colors.primary} />
          <Text style={[styles.cleanedText, { color: colors.secondaryForeground }]}>{t('localCopyCleaned')}</Text>
        </View>
      )}
      <View style={[styles.status, { backgroundColor: capture.status === 'sent' ? colors.primary : colors.accent }]}>
        <Feather
          name={capture.status === 'sent' ? 'check' : 'clock'}
          size={12}
          color={capture.status === 'sent' ? colors.primaryForeground : colors.accentForeground}
        />
      </View>
      {selected ? <View style={[styles.selectedRing, { borderColor: colors.primary }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { width: 108, height: 132, borderWidth: 2, borderRadius: 18, overflow: 'hidden', position: 'relative', backgroundColor: '#fff' },
  image: { width: '100%', height: '100%' },
  cleaned: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10, gap: 8 },
  cleanedText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, textAlign: 'center' },
  status: { position: 'absolute', right: 8, top: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  selectedRing: { ...StyleSheet.absoluteFill, borderWidth: 3, borderRadius: 16 },
});