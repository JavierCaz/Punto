/**
 * Product image picker + durable storage.
 *
 * Mirrors `@/lib/business-logo`: a picked image URI points into the OS cache,
 * which the OS may evict, so the file is copied into the app's document
 * directory (`products/`) and the persistent URI is what gets stored on
 * `product.image_uri`.
 *
 * Uses the SDK 57 object-oriented `expo-file-system` API (`File` / `Directory`
 * / `Paths`). On web (preview only) there is no durable native filesystem, so
 * the picker URI is returned as-is.
 *
 * Camera capture is intentionally not offered: `app.json` configures
 * `expo-image-picker` with `cameraPermission: false`. Flip that to a usage
 * string to enable capture later.
 */

import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type ProductImagePickResult =
  | { status: 'picked'; uri: string }
  | { status: 'canceled' }
  | { status: 'permission-denied' };

const PRODUCT_IMAGE_DIRECTORY = 'products';

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
export function deriveProductImageExtension(asset: {
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
export async function pickProductImage(): Promise<ProductImagePickResult> {
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

  const extension = deriveProductImageExtension(asset);
  const productsDir = new Directory(Paths.document, PRODUCT_IMAGE_DIRECTORY);
  productsDir.create({ intermediates: true, idempotent: true });

  const destination = new File(productsDir, `product-${Crypto.randomUUID()}.${extension}`);
  const source = new File(asset.uri);
  await source.copy(destination);

  return { status: 'picked', uri: destination.uri };
}

export function deleteProductImage(uri: string | null | undefined): void {
  if (!uri || Platform.OS === 'web') {
    return;
  }
  // Only ever delete files this app created inside its own products directory —
  // never an arbitrary URI (e.g. one introduced by a JSON import).
  const productsRoot = new Directory(Paths.document, PRODUCT_IMAGE_DIRECTORY).uri;
  const productsPrefix = productsRoot.endsWith('/') ? productsRoot : `${productsRoot}/`;
  if (!uri.startsWith(productsPrefix)) {
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
