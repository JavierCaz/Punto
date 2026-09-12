/**
 * Business logo picker + durable storage.
 *
 * A picked image URI points into the OS cache (especially on iOS after crop),
 * which the OS may evict at any time. The logo must outlive that, so the picked
 * file is copied into the app's document directory (`logos/`) and the persistent
 * URI is what gets stored on the `business.logo_uri` column.
 *
 * Uses the SDK 57 object-oriented `expo-file-system` API (`File` / `Directory` /
 * `Paths`) — the legacy `documentDirectory` / `copyAsync` API is not used.
 * On web (preview only) there is no durable native filesystem, so the picker
 * URI is returned as-is.
 */

import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type BusinessLogoPickResult =
  | { status: 'picked'; uri: string }
  | { status: 'canceled' }
  | { status: 'permission-denied' };

const LOGO_DIRECTORY = 'logos';

function fileExtension(value: string | null | undefined): string | undefined {
  if (!value || !value.includes('.')) {
    return undefined;
  }
  const extension = value.split('.').pop();
  if (!extension || extension.length === 0 || extension.length > 5) {
    return undefined;
  }
  return extension.toLowerCase();
}

/** Best-effort file extension for the persisted copy (never empty). */
export function deriveImageExtension(asset: {
  fileName?: string | null;
  mimeType?: string | null;
  uri: string;
}): string {
  const fromName = fileExtension(asset.fileName);
  if (fromName) {
    return fromName;
  }
  const fromMime = asset.mimeType?.split('/').pop();
  if (fromMime && fromMime.length > 0 && fromMime.length <= 5) {
    return fromMime.toLowerCase();
  }
  return fileExtension(asset.uri) ?? 'jpg';
}

/**
 * Launch the system photo library, then copy the selection into a durable
 * document-directory location. Returns a discriminated result so callers can
 * distinguish "user canceled" (silent) from "permission denied" (explain).
 */
export async function pickBusinessLogo(): Promise<BusinessLogoPickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { status: 'permission-denied' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled) {
    return { status: 'canceled' };
  }

  const asset = result.assets[0];
  if (!asset) {
    return { status: 'canceled' };
  }

  // Web preview has no durable native filesystem: use the picker URI directly.
  if (Platform.OS === 'web') {
    return { status: 'picked', uri: asset.uri };
  }

  const extension = deriveImageExtension(asset);
  const logosDir = new Directory(Paths.document, LOGO_DIRECTORY);
  logosDir.create({ intermediates: true, idempotent: true });

  const destination = new File(logosDir, `logo-${Crypto.randomUUID()}.${extension}`);
  const source = new File(asset.uri);
  await source.copy(destination);

  return { status: 'picked', uri: destination.uri };
}

export function deleteBusinessLogo(uri: string | null | undefined): void {
  if (!uri || Platform.OS === 'web') {
    return;
  }
  // Only ever delete files this app created inside its own logos directory —
  // never an arbitrary URI (e.g. one introduced by a JSON import).
  const logosRoot = new Directory(Paths.document, LOGO_DIRECTORY).uri;
  const logosPrefix = logosRoot.endsWith('/') ? logosRoot : `${logosRoot}/`;
  if (!uri.startsWith(logosPrefix)) {
    return;
  }
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Noop — orphan cleanup is opportunistic, never blocks the UI.
  }
}
