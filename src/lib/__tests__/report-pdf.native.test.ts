/**
 * @jest-environment node
 *
 * Native PDF seam: expo-print renders, the file is renamed in the cache and
 * handed to the share sheet as a PDF. Native modules are mocked.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { exportReportPdf, readLogoDataUri } from '@/lib/report-pdf.native';

const mockMove = jest.fn(async (_destination: unknown, _options: unknown) => {});
const mockFiles: Record<string, { exists: boolean; type: string; base64: () => Promise<string> }> = {};

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async () => ({ uri: 'file:///tmp/print-123.pdf' })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: class {
    uri: string;
    exists: boolean;
    type: string;
    base64: () => Promise<string>;
    constructor(base: string, name?: string) {
      this.uri = name ? `${base}/${name}` : base;
      const known = mockFiles[this.uri];
      this.exists = known?.exists ?? false;
      this.type = known?.type ?? '';
      this.base64 = known?.base64 ?? (async () => '');
    }
    move(destination: unknown, options: unknown) {
      return mockMove(destination, options);
    }
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('exportReportPdf (native)', () => {
  it('prints, renames into the cache and shares as application/pdf', async () => {
    await exportReportPdf('<html></html>', 'punto-flujo-2026-09.pdf', 'Compartir reporte');

    expect(Print.printToFileAsync).toHaveBeenCalledWith(
      expect.objectContaining({ html: '<html></html>' }),
    );
    expect(mockMove).toHaveBeenCalledWith(
      expect.objectContaining({ uri: 'file:///cache/punto-flujo-2026-09.pdf' }),
      { overwrite: true },
    );
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/punto-flujo-2026-09.pdf', {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Compartir reporte',
    });
  });

  it('skips the share sheet when sharing is unavailable', async () => {
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);
    await exportReportPdf('<html></html>', 'r.pdf', 'x');
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});

describe('readLogoDataUri (native)', () => {
  it('embeds an existing logo as a base64 data URI', async () => {
    mockFiles['file:///logos/logo.jpg'] = {
      exists: true,
      type: 'image/jpeg',
      base64: async () => 'QUJD',
    };
    await expect(readLogoDataUri('file:///logos/logo.jpg')).resolves.toBe(
      'data:image/jpeg;base64,QUJD',
    );
  });

  it('returns null for a missing or absent logo', async () => {
    await expect(readLogoDataUri(null)).resolves.toBeNull();
    await expect(readLogoDataUri('file:///logos/gone.png')).resolves.toBeNull();
  });
});
