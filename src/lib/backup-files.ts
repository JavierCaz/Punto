/**
 * Native file / clipboard flows for JSON backups (AGENTS §3.3).
 *
 * The pure backup format + validation live in `@/lib/backup-format`; this
 * module is the thin platform seam that turns a serialized backup into a file
 * on disk, opens the system share sheet, and reads a picked file back. It is
 * deliberately small and free of UI so it can be mocked in component tests.
 *
 * Uses the SDK 57 object-oriented `expo-file-system` API (`File` / `Paths`) —
 * `File.write()` is synchronous and returns void.
 */

import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Write `json` to a cache file named `fileName` and return its `file://` URI. */
export function writeBackupFile(json: string, fileName: string): string {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true, intermediates: true });
  file.write(json);
  return file.uri;
}

/**
 * Open the system document picker and read the selected file as text.
 * Returns `null` when the user cancels or the picker yields no asset.
 */
export async function pickBackupFile(): Promise<{ name: string; json: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset) {
    return null;
  }

  const json = await new File(asset.uri).text();
  return { name: asset.name, json };
}

/** True when the platform exposes a share sheet (false on web). */
export function backupSharingAvailable(): Promise<boolean> {
  return Sharing.isAvailableAsync();
}

/** Open the share sheet for a backup file. No-op when sharing is unavailable. */
export async function shareBackupFile(uri: string, dialogTitle: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    return;
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle,
  });
}

/** Copy the serialized backup JSON to the system clipboard. */
export async function copyBackupToClipboard(json: string): Promise<void> {
  await Clipboard.setStringAsync(json);
}

/** Read the clipboard contents (used as a fallback import source). */
export function readBackupFromClipboard(): Promise<string> {
  return Clipboard.getStringAsync();
}
