/**
 * Unit tests for the business-logo helper. The native modules are mocked so the
 * pick → copy-to-document-directory → return-durable-URI flow can be asserted
 * without a device (and without a real filesystem).
 */

import * as ImagePicker from 'expo-image-picker';

import { deriveImageExtension, deleteBusinessLogo, pickBusinessLogo } from '@/lib/business-logo';

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'test-uuid',
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => {
  const copy = jest.fn(async () => {});
  const create = jest.fn(() => {});
  const remove = jest.fn(() => {});

  class MockFile {
    uri: string;
    exists = true;
    copy = copy;
    delete = remove;

    constructor(...args: unknown[]) {
      const [first, second] = args as [unknown, unknown];
      if (typeof first === 'string') {
        this.uri = first;
      } else if (first && typeof first === 'object' && second) {
        this.uri = `${(first as { uri: string }).uri}/${String(second)}`;
      } else {
        this.uri = '';
      }
    }
  }

  class MockDirectory {
    uri: string;
    create = create;

    constructor(...args: unknown[]) {
      const [first, second] = args as [{ uri: string }, string];
      this.uri = `${first.uri}${second}`;
    }
  }

  return {
    Paths: { document: { uri: 'file:///doc/' } },
    File: MockFile,
    Directory: MockDirectory,
    __fsMocks: { copy, create, remove },
  };
});

const picker = ImagePicker as unknown as {
  requestMediaLibraryPermissionsAsync: jest.Mock;
  launchImageLibraryAsync: jest.Mock;
};

const fsMocks = (
  jest.requireMock('expo-file-system') as {
    __fsMocks: { copy: jest.Mock; create: jest.Mock; remove: jest.Mock };
  }
).__fsMocks;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('deriveImageExtension', () => {
  it('prefers the file name extension', () => {
    expect(deriveImageExtension({ fileName: 'logo.PNG', mimeType: 'image/jpeg', uri: 'a.bmp' })).toBe(
      'png',
    );
  });

  it('falls back to the mime type', () => {
    expect(deriveImageExtension({ fileName: null, mimeType: 'image/webp', uri: 'a.bmp' })).toBe(
      'webp',
    );
  });

  it('falls back to the URI, then to jpg', () => {
    expect(deriveImageExtension({ fileName: null, mimeType: null, uri: 'file:///a.heic' })).toBe(
      'heic',
    );
    expect(deriveImageExtension({ fileName: null, mimeType: null, uri: 'file:///noext' })).toBe(
      'jpg',
    );
  });

  it('does not treat an extension-less name as an extension', () => {
    expect(deriveImageExtension({ fileName: 'foto', mimeType: null, uri: 'file:///noext' })).toBe(
      'jpg',
    );
  });
});

describe('pickBusinessLogo', () => {
  it('returns permission-denied and never launches the picker when denied', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });

    const result = await pickBusinessLogo();

    expect(result).toEqual({ status: 'permission-denied' });
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('returns canceled when the user dismisses the picker', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });

    const result = await pickBusinessLogo();

    expect(result).toEqual({ status: 'canceled' });
    expect(fsMocks.copy).not.toHaveBeenCalled();
  });

  it('copies the picked image into the document directory and returns the durable URI', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/pick.png', fileName: 'pick.png', mimeType: 'image/png' }],
    });

    const result = await pickBusinessLogo();

    expect(result).toEqual({ status: 'picked', uri: 'file:///doc/logos/logo-test-uuid.png' });
    expect(fsMocks.create).toHaveBeenCalledTimes(1);
    expect(fsMocks.copy).toHaveBeenCalledTimes(1);
  });
});

describe('deleteBusinessLogo', () => {
  it('deletes a file inside the app logos directory and ignores empty URIs', () => {
    deleteBusinessLogo('file:///doc/logos/old.png');
    expect(fsMocks.remove).toHaveBeenCalledTimes(1);

    deleteBusinessLogo(null);
    expect(fsMocks.remove).toHaveBeenCalledTimes(1);
  });

  it('never deletes a file outside the app logos directory', () => {
    deleteBusinessLogo('file:///elsewhere/secret.txt');
    expect(fsMocks.remove).not.toHaveBeenCalled();
  });
});
