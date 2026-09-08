import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentType, type Ref } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCaptures } from '@/context/CaptureContext';
import { useColors } from '@/hooks/useColors';
import { t } from '@/lib/i18n';

const CompatibleCameraView = CameraView as unknown as ComponentType<{
  ref?: Ref<CameraView>;
  style?: object;
  facing?: CameraType;
}>;

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { addCapture, captures, deleteImportedAfterUpload } = useCaptures();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturing, setCapturing] = useState(false);
  const [importing, setImporting] = useState(false);

  if (!permission) {
    return <View style={[styles.permission, { backgroundColor: colors.foreground }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permission, { backgroundColor: colors.foreground, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.permissionIcon, { backgroundColor: colors.primary }]}><Feather name="camera" size={30} color={colors.primaryForeground} /></View>
       <Text style={[styles.permissionTitle, { color: colors.primaryForeground }]}>{t('cameraAccessPrivate')}</Text>
       <Text style={[styles.permissionText, { color: 'rgba(255,255,255,0.7)' }]}>{t('cameraPrivacyDescription')}</Text>
        <Pressable testID="camera-permission-button" onPress={permission.canAskAgain ? requestPermission : Linking.openSettings} style={[styles.permissionButton, { backgroundColor: colors.primary }]}>
          <Text style={[styles.permissionButtonText, { color: colors.primaryForeground }]}>{permission.canAskAgain ? t('allowCamera') : t('openSettings')}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}><Text style={styles.cancelText}>{t('notNow')}</Text></Pressable>
      </View>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.82, exif: false, skipProcessing: true });
       if (!photo?.uri) throw new Error(t('photoCouldNotBeCreated'));
      await addCapture(photo.uri, {
        source: 'camera',
        mimeType: 'image/jpeg',
        fileName: `xmix-${Date.now()}.jpg`,
      });
    } catch (error) {
       Alert.alert(t('couldNotCapture'), error instanceof Error ? error.message : t('tryAgain'));
    } finally {
      setCapturing(false);
    }
  };

  const importFromGallery = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain && Platform.OS !== 'web') {
           Alert.alert(t('photoAccessOff'), t('enablePhotoAccess'), [
             { text: t('notNow'), style: 'cancel' },
             { text: t('openSettings'), onPress: () => void Linking.openSettings() },
          ]);
        } else {
          Alert.alert(t('photoAccessNeeded'), t('allowPhotoAccess'));
        }
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.82,
      });
      if (result.canceled) return;
      await Promise.all(result.assets.map((asset) => addCapture(asset.uri, {
        source: 'gallery',
        deleteAfterUpload: deleteImportedAfterUpload,
         mimeType: asset.mimeType ?? undefined,
         fileName: asset.fileName ?? undefined,
      })));
      if (result.assets.length) router.replace('/review');
    } catch (error) {
       Alert.alert(t('couldNotImport'), error instanceof Error ? error.message : t('tryAgain'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <View style={styles.cameraScreen}>
      <CompatibleCameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable testID="close-camera-button" onPress={() => router.back()} style={styles.darkButton}><Feather name="x" size={22} color="#fff" /></Pressable>
         <View style={styles.privacyPill}><Feather name="lock" size={12} color="#fff" /><Text style={styles.privacyPillText}>{t('appOnlyPhoto')}</Text></View>
        <Pressable testID="flip-camera-button" onPress={() => setFacing((current) => current === 'back' ? 'front' : 'back')} style={styles.darkButton}><Feather name="refresh-cw" size={20} color="#fff" /></Pressable>
      </View>
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.sessionRow}>
           <Text style={styles.helperText}>{captures.length ? t('photosCaptured', { count: captures.length }) : t('tapToCapture')}</Text>
          {captures.length ? (
            <Pressable testID="camera-done-button" onPress={() => router.replace('/review')} style={styles.doneButton}>
               <Text style={styles.doneText}>{t('review')}</Text>
               <Feather name="arrow-left" size={15} color="#fff" />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.captureActions}>
          <Pressable testID="import-gallery-button" onPress={importFromGallery} disabled={importing} style={({ pressed }) => [styles.importButton, { opacity: pressed || importing ? 0.65 : 1 }]}>
            <Feather name="image" size={18} color="#fff" />
             <Text style={styles.importText}>{importing ? t('importing') : t('gallery')}</Text>
          </Pressable>
          <Pressable testID="capture-button" onPress={takePhoto} disabled={capturing || importing} style={({ pressed }) => [styles.shutterOuter, { opacity: pressed || capturing || importing ? 0.72 : 1 }]}>
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.actionSpacer} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraScreen: { flex: 1, backgroundColor: '#10191b' },
  topBar: { paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  darkButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(18,34,48,0.7)', alignItems: 'center', justifyContent: 'center' },
  privacyPill: { backgroundColor: 'rgba(18,34,48,0.7)', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  privacyPillText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 16 },
  captureActions: { width: '100%', paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  importButton: { minWidth: 92, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: 'rgba(18,34,48,0.7)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  importText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  actionSpacer: { width: 92 },
  sessionRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 14 },
  helperText: { color: 'rgba(255,255,255,0.76)', fontFamily: 'Inter_500Medium', fontSize: 12 },
  doneButton: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'rgba(31,143,114,0.9)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  doneText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 12 },
  shutterOuter: { width: 78, height: 78, borderRadius: 39, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff' },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 18 },
  permissionIcon: { width: 74, height: 74, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  permissionTitle: { fontFamily: 'Inter_700Bold', fontSize: 26, lineHeight: 31, textAlign: 'center', marginTop: 10 },
  permissionText: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  permissionButton: { minWidth: 190, borderRadius: 16, alignItems: 'center', paddingVertical: 16, marginTop: 10 },
  permissionButtonText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  cancelText: { color: 'rgba(255,255,255,0.66)', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});