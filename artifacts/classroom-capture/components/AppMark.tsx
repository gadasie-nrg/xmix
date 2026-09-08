import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function AppMark() {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <View style={[styles.mark, { backgroundColor: colors.primary }]}>
        <Feather name="aperture" size={18} color={colors.primaryForeground} />
      </View>
      <View>
        <Text style={[styles.name, { color: colors.foreground }]}>XmiX</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'Inter_700Bold', fontSize: 15, lineHeight: 16, letterSpacing: -0.4 },
});