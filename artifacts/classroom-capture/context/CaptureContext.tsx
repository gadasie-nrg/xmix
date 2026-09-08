import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type CaptureStatus = 'not_sent' | 'sent';

export type CaptureRecord = {
  id: string;
  uri?: string;
  mimeType?: string;
  fileName?: string;
  createdAt: number;
  status: CaptureStatus;
  source: 'camera' | 'gallery';
  deleteAfterUpload?: boolean;
  caption?: string;
  driveFileId?: string;
  destination?: string;
};

type CaptureContextValue = {
  captures: CaptureRecord[];
  cleanupHours: number;
  setCleanupHours: (hours: number) => Promise<void>;
  deleteImportedAfterUpload: boolean;
  setDeleteImportedAfterUpload: (enabled: boolean) => Promise<void>;
  addCapture: (uri: string, metadata?: Pick<CaptureRecord, 'source' | 'deleteAfterUpload' | 'mimeType' | 'fileName'>) => Promise<CaptureRecord>;
  updateCapture: (id: string, patch: Partial<CaptureRecord>) => Promise<void>;
  cleanupExpired: () => Promise<void>;
};

const CAPTURES_KEY = '@classroom-capture/captures';
const CLEANUP_KEY = '@classroom-capture/cleanup-hours';
const DELETE_IMPORTED_KEY = '@classroom-capture/delete-imported-after-upload';
const DEFAULT_CLEANUP_HOURS = 24;

const CaptureContext = createContext<CaptureContextValue | null>(null);

function createId() {
  return `${Date.now().toString()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CaptureProvider({ children }: { children: React.ReactNode }) {
  const [captures, setCaptures] = useState<CaptureRecord[]>([]);
  const [cleanupHours, setCleanupHoursState] = useState(DEFAULT_CLEANUP_HOURS);
  const [deleteImportedAfterUpload, setDeleteImportedAfterUploadState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      AsyncStorage.getItem(CAPTURES_KEY),
      AsyncStorage.getItem(CLEANUP_KEY),
      AsyncStorage.getItem(DELETE_IMPORTED_KEY),
    ])
      .then(async ([storedCaptures, storedHours, storedDeleteImported]) => {
        if (!active) return;
        const parsed = storedCaptures ? (JSON.parse(storedCaptures) as CaptureRecord[]) : [];
        const hours = storedHours ? Number(storedHours) : DEFAULT_CLEANUP_HOURS;
        const deleteImported = storedDeleteImported === 'true';
         setCaptures(
           Array.isArray(parsed)
             ? parsed.map((capture) => ({
                 ...capture,
                 source: capture.source === 'gallery' ? 'gallery' as const : 'camera' as const,
                 deleteAfterUpload: capture.deleteAfterUpload ?? false,
               }))
             : [],
         );
        setCleanupHoursState(Number.isFinite(hours) ? hours : DEFAULT_CLEANUP_HOURS);
        setDeleteImportedAfterUploadState(deleteImported);
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(CAPTURES_KEY, JSON.stringify(captures));
  }, [captures, hydrated]);

  const cleanupExpired = async () => {
    const cutoff = Date.now() - cleanupHours * 60 * 60 * 1000;
    // Never remove an unsent photo. A teacher's active capture session is
    // intentionally durable until the teacher completes a share.
    const expired = captures.filter(
        (capture) => capture.uri && capture.status === 'sent' && capture.createdAt < cutoff,
    );
    await Promise.all(
      expired.map((capture) => FileSystem.deleteAsync(capture.uri as string, { idempotent: true }).catch(() => undefined)),
    );
    if (expired.length) {
      setCaptures((current) =>
        current.map((capture) =>
          expired.some((item) => item.id === capture.id) ? { ...capture, uri: undefined } : capture,
        ),
      );
    }
  };

  useEffect(() => {
    if (hydrated) void cleanupExpired();
  }, [hydrated, cleanupHours]);

  const value = useMemo<CaptureContextValue>(
    () => ({
      captures,
      cleanupHours,
      deleteImportedAfterUpload,
      setCleanupHours: async (hours) => {
        setCleanupHoursState(hours);
        await AsyncStorage.setItem(CLEANUP_KEY, String(hours));
      },
      setDeleteImportedAfterUpload: async (enabled) => {
        setDeleteImportedAfterUploadState(enabled);
        await AsyncStorage.setItem(DELETE_IMPORTED_KEY, String(enabled));
      },
       addCapture: async (uri, metadata?: Pick<CaptureRecord, 'source' | 'deleteAfterUpload' | 'mimeType' | 'fileName'>) => {
        const record: CaptureRecord = {
          id: createId(),
          uri,
           mimeType: metadata?.mimeType,
           fileName: metadata?.fileName,
          createdAt: Date.now(),
          status: 'not_sent',
          source: metadata?.source ?? 'camera',
          deleteAfterUpload: metadata?.deleteAfterUpload ?? false,
        };
        setCaptures((current) => [record, ...current]);
        return record;
      },
      updateCapture: async (id, patch) => {
        setCaptures((current) =>
          current.map((capture) => (capture.id === id ? { ...capture, ...patch } : capture)),
        );
      },
      cleanupExpired,
    }),
    [captures, cleanupHours, deleteImportedAfterUpload, hydrated],
  );

  return <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>;
}

export function useCaptures() {
  const context = useContext(CaptureContext);
  if (!context) throw new Error('useCaptures must be used inside CaptureProvider');
  return context;
}