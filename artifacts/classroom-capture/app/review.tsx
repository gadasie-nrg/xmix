import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { CaptureTile } from '@/components/CaptureTile';
import { useCaptures } from '@/context/CaptureContext';
import { ensureTempFolder, getDriveFolders, type DriveFolder, uploadPhoto } from '@/lib/drive';
import { useColors } from '@/hooks/useColors';
import { getXmixSharingModule } from '../modules/xmix-sharing/src/XmixSharingModule';

type Destination = 'drive' | 'apps';

function extensionForPhoto(uri: string, mimeType?: string, fileName?: string) {
  const byMime: Record<string, string> = {
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  if (mimeType && byMime[mimeType.toLowerCase()]) return byMime[mimeType.toLowerCase()];
  const match = (fileName || uri.split('?')[0]).match(/\.([a-z0-9]{2,5})$/i);
  return match?.[1]?.toLowerCase() || 'jpg';
}

function mimeTypeForPhoto(extension: string, mimeType?: string) {
  if (mimeType?.toLowerCase() === 'image/jpg') return 'image/jpeg';
  if (mimeType?.toLowerCase().startsWith('image/')) return mimeType.toLowerCase();
  const byExtension: Record<string, string> = {
    heic: 'image/heic',
    heif: 'image/heif',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return byExtension[extension] || 'image/jpeg';
}

async function preparePhotoForSharing(capture: {
  id: string;
  uri?: string;
  mimeType?: string;
  fileName?: string;
}) {
  if (!capture.uri) throw new Error('The selected photo is no longer available on this device.');
  if (!FileSystem.cacheDirectory) throw new Error('The device cache is unavailable.');

  const extension = extensionForPhoto(capture.uri, capture.mimeType, capture.fileName);
  const mimeType = mimeTypeForPhoto(extension, capture.mimeType);
  const shareDirectory = `${FileSystem.cacheDirectory}xmix-sharing/`;
  const shareUri = `${shareDirectory}xmix-${capture.id}.${extension}`;

  await FileSystem.makeDirectoryAsync(shareDirectory, { intermediates: true });
  await FileSystem.deleteAsync(shareUri, { idempotent: true });
  await FileSystem.copyAsync({ from: capture.uri, to: shareUri });
  const fileInfo = await FileSystem.getInfoAsync(shareUri);
  if (!fileInfo.exists || !fileInfo.size) {
    throw new Error('The photo could not be prepared for sharing.');
  }

  return { uri: shareUri, mimeType };
}

async function sharePhotosOnWeb(
  captures: { id: string; uri?: string; mimeType?: string; fileName?: string }[],
  note: string,
) {
  if (!navigator.share) throw new Error('File sharing is not supported by this browser.');

  const files = await Promise.all(captures.map(async (capture) => {
    if (!capture.uri) throw new Error('The selected photo is no longer available.');

    const extension = extensionForPhoto(capture.uri, capture.mimeType, capture.fileName);
    const mimeType = mimeTypeForPhoto(extension, capture.mimeType);
    const response = await fetch(capture.uri);
    if (!response.ok) throw new Error('The browser could not read the selected photo.');
    const blob = await response.blob();
    if (!blob.size) throw new Error('The selected photo is empty.');

    return new File([blob], `xmix-${capture.id}.${extension}`, { type: mimeType });
  }));
  const shareData: ShareData = {
    files,
    title: 'XmiX classroom photo',
    ...(note ? { text: note } : {}),
  };
  if (navigator.canShare && !navigator.canShare(shareData)) {
    throw new Error('This browser cannot send image files to other apps. Use the XmiX development build instead.');
  }
  await navigator.share(shareData);
}

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { captures, updateCapture } = useCaptures();
  const [caption, setCaption] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [sharing, setSharing] = useState(false);

  // AsyncStorage hydration happens after the first render. Seed the initial
  // selection when those captures arrive, without re-selecting photos when a
  // user intentionally deselects every photo.
  useEffect(() => {
    setSelectedIds((current) => {
      const valid = current.filter((id) => captures.some((capture) => capture.id === id && capture.uri));
      if (current.length === 0 && valid.length === 0) {
        return captures.filter((capture) => capture.uri).map((capture) => capture.id);
      }
      return valid;
    });
  }, [captures]);

  const selectedCaptures = useMemo(
    () => captures.filter((capture) => selectedIds.includes(capture.id) && capture.uri),
    [captures, selectedIds],
  );
  const canShareMultipleNatively = Platform.OS !== 'web' && getXmixSharingModule() !== null;
  const shareDestinationDescription = Platform.OS === 'web'
    ? 'Share selected photos through your browser'
    : canShareMultipleNatively
      ? 'Send all selected photos together'
      : 'Use the XmiX development build to send all selected photos together';

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const openDrive = async () => {
    setDestination('drive');
    setLoadingFolders(true);
    try {
      const [folderResponse, tempResponse] = await Promise.all([getDriveFolders(), ensureTempFolder()]);
      const allFolders = folderResponse.folders.filter((folder) => folder.id !== tempResponse.folder.id);
      setFolders([tempResponse.folder, ...allFolders]);
    } catch (error) {
      setDestination(null);
      Alert.alert('Google Drive unavailable', error instanceof Error ? error.message : 'Try again in a moment.');
    } finally {
      setLoadingFolders(false);
    }
  };

  const shareToDrive = async (folder: DriveFolder) => {
    if (!selectedCaptures.length) return;
    setSharing(true);
    try {
      for (const capture of selectedCaptures) {
        if (!capture.uri) continue;
        const result = await uploadPhoto({
          uri: capture.uri,
          filename: `classroom-${new Date(capture.createdAt).toISOString().replace(/[:.]/g, '-')}.jpg`,
          folderId: folder.id,
          caption,
        });
        const shouldDeleteImported = capture.source === 'gallery' && capture.deleteAfterUpload;
        if (shouldDeleteImported) {
          await FileSystem.deleteAsync(capture.uri, { idempotent: true }).catch(() => undefined);
        }
        await updateCapture(capture.id, {
          status: 'sent',
          caption,
          driveFileId: result.file.id,
          destination: folder.name,
          ...(shouldDeleteImported ? { uri: undefined } : {}),
        });
      }
      setDestination(null);
      Alert.alert('Shared safely', `${selectedCaptures.length} photo${selectedCaptures.length === 1 ? '' : 's'} uploaded to ${folder.name}.`);
    } catch (error) {
      Alert.alert('Some photos were not shared', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSharing(false);
    }
  };

  const shareToApp = async () => {
    const photos = selectedCaptures.filter((capture) => capture.uri);
    if (!photos.length) return;
    setSharing(true);
    try {
      const note = caption.trim();

      if (Platform.OS === 'web') {
        await sharePhotosOnWeb(photos, note);
      } else {
        const nativeModule = getXmixSharingModule();
        if (!nativeModule) {
          throw new Error('Multi-photo sharing requires the XmiX development build. Expo Go cannot send multiple attachments in one share action.');
        }

        const shareFiles = await Promise.all(photos.map(preparePhotoForSharing));
        await nativeModule.shareImages(
          shareFiles.map((file) => file.uri),
          'image/*',
          'Share XmiX photos',
          note || undefined,
        );
      }
      await Promise.all(photos.map((photo) => updateCapture(photo.id, {
        status: 'sent',
        caption,
        destination: 'Device sharing sheet',
      })));

      setDestination(null);
      Alert.alert(
        'Sharing complete',
        `${photos.length} photo${photos.length === 1 ? '' : 's'} opened in the sharing sheet.`,
      );
    } catch (error) {
      Alert.alert('Could not share photos', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable testID="review-back-button" onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card }]}><Feather name="arrow-left" size={20} color={colors.foreground} /></Pressable>
          <View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.foreground }]}>Review & share</Text><Text style={[styles.headerMeta, { color: colors.mutedForeground }]}>{selectedCaptures.length} selected</Text></View>
          <View style={[styles.sentCount, { backgroundColor: colors.secondary }]}><Feather name="check" size={13} color={colors.primary} /><Text style={[styles.sentCountText, { color: colors.primary }]}>{captures.filter((capture) => capture.status === 'sent').length}</Text></View>
        </View>

        <View style={styles.selectionIntro}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose photos</Text>
          <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>Tap a photo to include or remove it from this share.</Text>
        </View>
        <View style={styles.grid}>{captures.map((capture) => <CaptureTile key={capture.id} capture={capture} selected={selectedIds.includes(capture.id)} onPress={() => capture.uri && toggleSelected(capture.id)} />)}</View>

        <View style={styles.captionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Add a note</Text><Text style={[styles.optional, { color: colors.mutedForeground }]}>Optional</Text></View>
        <TextInput
          testID="caption-input"
          value={caption}
          onChangeText={setCaption}
          placeholder="e.g. Year 4 building bridges with recycled materials"
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />

        <Pressable
          testID="share-button"
          onPress={() => selectedCaptures.length ? setDestination('apps') : Alert.alert('Select a photo', 'Choose at least one photo to share.')}
          style={({ pressed }) => [styles.shareButton, { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 }]}
        >
          <Feather name="send" size={18} color={colors.primaryForeground} />
          <Text style={[styles.shareButtonText, { color: colors.primaryForeground }]}>Share {selectedCaptures.length ? `${selectedCaptures.length} photo${selectedCaptures.length === 1 ? '' : 's'}` : 'photos'}</Text>
          <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
        </Pressable>

        <View style={[styles.legend, { borderTopColor: colors.border }]}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>Sent</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.accent }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>Not sent</Text></View>
          <Text style={[styles.legendHint, { color: colors.mutedForeground }]}>Copies expire automatically</Text>
        </View>
      </ScrollView>

      <Modal visible={destination !== null} animationType="slide" transparent onRequestClose={() => !sharing && setDestination(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}><View><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Choose where to share</Text><Text style={[styles.sheetMeta, { color: colors.mutedForeground }]}>{caption.trim() ? 'Your note will be included when the selected app supports it.' : 'Selected photos stay private until you choose an app.'}</Text></View><Pressable onPress={() => !sharing && setDestination(null)}><Feather name="x" size={21} color={colors.foreground} /></Pressable></View>
            {destination === 'apps' ? (
               <View style={styles.destinationList}>
                <Pressable testID="drive-destination-button" onPress={openDrive} style={[styles.destination, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.destinationIcon, { backgroundColor: colors.secondary }]}><Feather name="folder" size={21} color={colors.primary} /></View>
                  <View style={styles.destinationCopy}><Text style={[styles.destinationTitle, { color: colors.foreground }]}>Google Drive folder</Text><Text style={[styles.destinationText, { color: colors.mutedForeground }]}>Upload selected photos with your note</Text></View><Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </Pressable>
                <Pressable testID="native-share-button" onPress={shareToApp} disabled={sharing} style={[styles.destination, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.destinationIcon, { backgroundColor: colors.accent }]}><Feather name="share-2" size={21} color={colors.accentForeground} /></View>
                  <View style={styles.destinationCopy}><Text style={[styles.destinationTitle, { color: colors.foreground }]}>WhatsApp or another app</Text><Text style={[styles.destinationText, { color: colors.mutedForeground }]}>{shareDestinationDescription}</Text></View><Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ) : loadingFolders ? (
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading your Drive folders…</Text>
             ) : (
              <ScrollView style={styles.folderList}>
                {folders.map((folder) => <Pressable key={folder.id} testID={`drive-folder-${folder.id}`} onPress={() => shareToDrive(folder)} disabled={sharing} style={[styles.folder, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.folderIcon, { backgroundColor: folder.name === 'Classroom Capture Temporary' ? colors.accent : colors.secondary }]}><Feather name="folder" size={18} color={folder.name === 'Classroom Capture Temporary' ? colors.accentForeground : colors.primary} /></View><Text style={[styles.folderName, { color: colors.foreground }]}>{folder.name}</Text><Feather name="arrow-up-right" size={16} color={colors.mutedForeground} /></Pressable>)}
              </ScrollView>
            )}
             {sharing ? <Text style={[styles.loadingText, { color: colors.primary }]}>Sharing securely…</Text> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 3 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 21 },
  headerMeta: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  sentCount: { height: 30, minWidth: 40, borderRadius: 15, paddingHorizontal: 10, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  sentCountText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  selectionIntro: { gap: 4, marginTop: 10 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  sectionMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  captionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  optional: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  input: { minHeight: 100, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, textAlignVertical: 'top' },
  shareButton: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  shareButtonText: { fontFamily: 'Inter_700Bold', fontSize: 15, flex: 1, textAlign: 'center' },
  legend: { borderTopWidth: 1, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  legendHint: { marginLeft: 'auto', fontFamily: 'Inter_400Regular', fontSize: 10 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(18,34,48,0.42)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, minHeight: 290, maxHeight: '78%' },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#c6cdc7', alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 20, marginBottom: 18 },
  sheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 21 },
  sheetMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 5 },
  destinationList: { gap: 12 },
  destination: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  destinationIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  destinationCopy: { flex: 1, gap: 4 },
  destinationTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  destinationText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  loadingText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  folderList: { maxHeight: 360 },
  folder: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 9 },
  folderIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  folderName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1 },
});