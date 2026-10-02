/**
 * Native PDF export for reports (iOS / Android).
 *
 * Renders report HTML to a PDF with `expo-print`, gives it a readable file name
 * in the cache directory and opens the system share sheet (save to Files,
 * WhatsApp, email…). Web/desktop use `report-pdf.ts` (browser print dialog);
 * Metro picks this file on native via the `.native.ts` extension.
 */

import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/** iOS page margins in points; Android honours the CSS `@page` margin instead. */
const PAGE_MARGINS = { top: 36, right: 32, bottom: 36, left: 32 };

/** Render `html` to `fileName` and open the share sheet for it. */
export async function exportReportPdf(
  html: string,
  fileName: string,
  dialogTitle: string,
): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html, margins: PAGE_MARGINS });

  const target = new File(Paths.cache, fileName);
  await new File(uri).move(target, { overwrite: true });

  if (!(await Sharing.isAvailableAsync())) {
    return;
  }
  await Sharing.shareAsync(target.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle,
  });
}

/**
 * Inline the business logo for the PDF: the print WebView cannot reliably read
 * app-sandbox `file://` URIs, so the image is embedded as a base64 data URI.
 * Returns null when there is no logo or it cannot be read.
 */
export async function readLogoDataUri(logoUri: string | null | undefined): Promise<string | null> {
  if (!logoUri) {
    return null;
  }
  try {
    const file = new File(logoUri);
    if (!file.exists) {
      return null;
    }
    const mime = file.type && file.type.startsWith('image/') ? file.type : 'image/png';
    return `data:${mime};base64,${await file.base64()}`;
  } catch {
    return null;
  }
}
