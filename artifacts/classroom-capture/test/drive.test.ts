import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureTempFolder, getDriveFolders, hasConnectedTempFolder, uploadPhoto } from '@/lib/drive';
import { testState } from './setup';

describe('Google Drive API boundary', () => {
  beforeEach(() => {
    vi.stubEnv('EXPO_PUBLIC_DOMAIN', 'classroom.example.test');
  });

  it('loads folders through the configured API domain', async () => {
    testState.fetch.mockResolvedValue(
      new Response(JSON.stringify({ folders: [{ id: 'folder-1', name: 'Year 4' }] }), { status: 200 }),
    );

    await expect(getDriveFolders()).resolves.toEqual({
      folders: [{ id: 'folder-1', name: 'Year 4' }],
    });
    expect(testState.fetch).toHaveBeenCalledWith(
      'https://classroom.example.test/api/drive/folders',
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
    );
  });

  it('creates a temporary folder and uploads encoded photo data', async () => {
    testState.fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ folder: { id: 'temp', name: 'Temporary' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ file: { id: 'file-1', name: 'classroom.jpg' } }), { status: 200 }));

    await expect(ensureTempFolder()).resolves.toMatchObject({ folder: { id: 'temp' } });
    await expect(hasConnectedTempFolder()).resolves.toBe(true);
    await expect(uploadPhoto({
      uri: 'file:///camera-photo.jpg',
      filename: 'classroom.jpg',
      folderId: 'temp',
      caption: 'Bridge building',
    })).resolves.toMatchObject({ file: { id: 'file-1' } });

    expect(testState.fileSystem.readAsStringAsync).toHaveBeenCalledWith(
      'file:///camera-photo.jpg',
      { encoding: 'base64' },
    );
    expect(testState.fetch).toHaveBeenLastCalledWith(
      'https://classroom.example.test/api/drive/upload',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          base64: 'base64-photo',
          filename: 'classroom.jpg',
          folderId: 'temp',
          caption: 'Bridge building',
        }),
      }),
    );
  });

  it('surfaces API errors instead of silently treating Drive as ready', async () => {
    testState.fetch.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Drive authorization expired.' }), { status: 401 }),
    );

    await expect(ensureTempFolder()).rejects.toThrow('Drive authorization expired.');
  });
});