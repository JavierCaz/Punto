/**
 * Web / desktop PDF export for reports.
 *
 * Browsers cannot write a PDF file directly, so the report HTML is loaded into
 * a hidden iframe and the browser print dialog is opened — the user picks
 * "Save as PDF" there (works in the Electron desktop build too). Native builds
 * use `report-pdf.native.ts` (expo-print + share sheet) with the same API.
 */

/** Delay before removing the iframe, so print dialogs that return early keep their document. */
const IFRAME_CLEANUP_MS = 60_000;

/** Open the print dialog for `html`. `fileName` becomes the suggested document title. */
export async function exportReportPdf(
  html: string,
  fileName: string,
  _dialogTitle: string,
): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('report iframe failed to load'));
      iframe.srcdoc = html;
    });

    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      throw new Error('report iframe has no window');
    }
    // Chrome/Electron suggest the document title as the PDF file name.
    frameWindow.document.title = fileName.replace(/\.pdf$/i, '');
    frameWindow.focus();
    frameWindow.print();
  } finally {
    setTimeout(() => iframe.remove(), IFRAME_CLEANUP_MS);
  }
}

/** On web the stored logo URI (blob/data/http) is directly loadable. */
export async function readLogoDataUri(logoUri: string | null | undefined): Promise<string | null> {
  return logoUri ?? null;
}
