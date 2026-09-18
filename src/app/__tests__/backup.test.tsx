/**
 * Component test for the Backup screen (data portability, AGENTS §3.3).
 *
 * The native file/clipboard flows, expo-router, expo-constants and the '@/db'
 * data layer are mocked so the screen renders offline without SQLite. The pure
 * backup-format helpers (parse / summarize / build) are the real shipped code.
 * Dialogs render through the real <DialogHost /> (custom in-app alerts).
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import BackupScreen from '@/app/backup';
import { clearAllData, exportDatabase, importDatabase, inspectBackup, isDatabaseEmpty } from '@/db';
import { DialogHost, dismissDialog } from '@/dialog';
import { i18n } from '@/i18n';
import * as backupFiles from '@/lib/backup-files';
import {
  buildBackupDocument,
  emptyBackupTables,
  summarizeBackup,
  type BackupDocument,
} from '@/lib/backup-format';

const mockReplace = jest.fn();
const mockSignOut = jest.fn();
const mockAdminUser = { id: 'admin-1', role: 'ADMIN' as const };
const mockResetToOnboarding = jest.fn(async () => {});

jest.mock('expo-router', () => ({
  router: { replace: mockReplace, push: jest.fn() },
  Stack: { Screen: () => null },
}));

jest.mock('@/auth', () => ({
  useAuthStore: {
    getState: () => ({ user: mockAdminUser, signOut: mockSignOut, resetToOnboarding: mockResetToOnboarding }),
  },
}));

jest.mock('@/db', () => ({
  exportDatabase: jest.fn(),
  inspectBackup: jest.fn(),
  importDatabase: jest.fn(),
  clearAllData: jest.fn(),
  isDatabaseEmpty: jest.fn(),
  getBusinessProfile: jest.fn(async () => null),
  isRepoError: jest.fn(() => false),
  REPO_ERROR: {
    BACKUP_INVALID: 'REPO_BACKUP_INVALID',
    BACKUP_CONFLICT: 'REPO_BACKUP_CONFLICT',
  },
}));

jest.mock('@/lib/backup-files', () => ({
  writeBackupFile: jest.fn(() => 'file:///cache/punto-backup.json'),
  pickBackupFile: jest.fn(),
  shareBackupFile: jest.fn(async () => {}),
  copyBackupToClipboard: jest.fn(async () => {}),
  readBackupFromClipboard: jest.fn(async () => ''),
  backupSharingAvailable: jest.fn(async () => true),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es' }],
}));

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => {}),
    removeItemAsync: jest.fn(async () => {}),
  },
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const mockMaterialCommunityIcons = () => null;
  return { __esModule: true, default: mockMaterialCommunityIcons };
});

jest.mock('expo-image', () => ({ Image: () => null }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

function makeDocument(counts: {
  product?: number;
  sale?: number;
  inventory_item?: number;
}): BackupDocument {
  const tables = emptyBackupTables();
  tables.product = Array.from({ length: counts.product ?? 0 }, (_, index) => ({
    id: `product-${index}`,
  }));
  tables.sale = Array.from({ length: counts.sale ?? 0 }, (_, index) => ({ id: `sale-${index}` }));
  tables.inventory_item = Array.from({ length: counts.inventory_item ?? 0 }, (_, index) => ({
    id: `item-${index}`,
  }));
  return buildBackupDocument({
    schemaVersion: 1,
    exportedAt: '2026-09-17T00:00:00.000Z',
    tables,
    appVersion: '1.0.0',
  });
}

function renderBackup() {
  return render(
    <>
      <BackupScreen />
      <DialogHost />
    </>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  dismissDialog();
  jest.mocked(exportDatabase).mockResolvedValue(makeDocument({}));
  jest.mocked(isDatabaseEmpty).mockResolvedValue(false);
  jest.mocked(backupFiles.backupSharingAvailable).mockResolvedValue(true);
  jest.mocked(backupFiles.writeBackupFile).mockReturnValue('file:///cache/punto-backup.json');
});

afterEach(async () => {
  dismissDialog();
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('BackupScreen', () => {
  it('renders the sections and dataset summary in Spanish', async () => {
    jest
      .mocked(exportDatabase)
      .mockResolvedValue(makeDocument({ product: 2, sale: 1, inventory_item: 1 }));

    const { getByText, getByTestId } = await renderBackup();

    expect(getByText('Estado de los datos')).toBeTruthy();
    expect(getByText('Exportar')).toBeTruthy();
    expect(getByText('Importar')).toBeTruthy();
    expect(getByText('Zona de riesgo')).toBeTruthy();

    await waitFor(() => expect(getByText('4 registros en total')).toBeTruthy());
    expect(getByTestId('backup-summary')).toBeTruthy();
    expect(getByTestId('backup-export-button')).toBeTruthy();
    expect(getByTestId('backup-copy-button')).toBeTruthy();
    expect(getByTestId('backup-import-button')).toBeTruthy();
    expect(getByTestId('backup-erase-button')).toBeTruthy();
  });

  it('localizes the sections and summary in English', async () => {
    await i18n.changeLanguage('en');
    jest
      .mocked(exportDatabase)
      .mockResolvedValue(makeDocument({ product: 1, sale: 2, inventory_item: 0 }));

    const { getByText } = await renderBackup();

    expect(getByText('Data status')).toBeTruthy();
    expect(getByText('Export')).toBeTruthy();
    expect(getByText('Import')).toBeTruthy();
    expect(getByText('Risk zone')).toBeTruthy();

    await waitFor(() => expect(getByText('3 records in total')).toBeTruthy());
  });

  it('exports by writing a file and shows the success dialog', async () => {
    const { getByTestId, getByText } = await renderBackup();

    await fireEvent.press(getByTestId('backup-export-button'));

    await waitFor(() => expect(backupFiles.writeBackupFile).toHaveBeenCalledTimes(1));
    expect(backupFiles.shareBackupFile).toHaveBeenCalledTimes(1);
    expect(backupFiles.copyBackupToClipboard).not.toHaveBeenCalled();
    await waitFor(() => expect(getByText('Copia exportada')).toBeTruthy());
  });

  it('imports a valid backup after the destructive confirmation', async () => {
    const document = makeDocument({ product: 1, sale: 1, inventory_item: 1 });
    jest.mocked(backupFiles.pickBackupFile).mockResolvedValue({
      name: 'backup.json',
      json: JSON.stringify(document),
    });
    jest
      .mocked(inspectBackup)
      .mockResolvedValue({ ok: true, document, stats: summarizeBackup(document) });

    const { getByTestId, getByText } = await renderBackup();
    await fireEvent.press(getByTestId('backup-import-button'));

    await waitFor(() => expect(getByText('¿Reemplazar todos los datos?')).toBeTruthy());

    await fireEvent.press(getByTestId('app-dialog-confirm'));

    await waitFor(() =>
      expect(importDatabase).toHaveBeenCalledWith(mockAdminUser, document, { mode: 'replace' }),
    );
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('surfaces an error for an invalid backup file without importing', async () => {
    jest.mocked(backupFiles.pickBackupFile).mockResolvedValue({
      name: 'bad.json',
      json: '{ not valid json',
    });

    const { getByTestId, getByText } = await renderBackup();
    await fireEvent.press(getByTestId('backup-import-button'));

    await waitFor(() => expect(getByText('Archivo no válido')).toBeTruthy());
    expect(importDatabase).not.toHaveBeenCalled();
  });

  it('erases all data after a strong confirmation', async () => {
    const { getByTestId, getByText } = await renderBackup();
    await fireEvent.press(getByTestId('backup-erase-button'));

    await waitFor(() => expect(getByText('¿Borrar todos los datos?')).toBeTruthy());

    await fireEvent.press(getByTestId('app-dialog-confirm'));

    await waitFor(() => expect(clearAllData).toHaveBeenCalledTimes(1));
    expect(mockResetToOnboarding).toHaveBeenCalledTimes(1);
  });
});
