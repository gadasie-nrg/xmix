import * as FileSystem from 'expo-file-system/legacy';

const apiBase = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) throw new Error('The app API domain is not configured.');
  return `https://${domain}/api`;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? 'The request could not be completed.');
  return body;
}

export type DriveFolder = { id: string; name: string; mimeType?: string };

export async function getDriveFolders() {
  return request<{ folders: DriveFolder[] }>('/drive/folders');
}

export async function ensureTempFolder() {
  return request<{ folder: DriveFolder }>('/drive/temp-folder', { method: 'POST' });
}

export async function uploadPhoto({
  uri,
  filename,
  folderId,
  caption,
}: {
  uri: string;
  filename: string;
  folderId: string;
  caption: string;
}) {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return request<{ file: { id: string; name: string; webViewLink?: string } }>('/drive/upload', {
    method: 'POST',
    body: JSON.stringify({ base64, filename, folderId, caption }),
  });
}