/**
 * HTML template for the monthly cash-flow PDF (the accountant report).
 *
 * Pure string rendering: takes the composed `CashflowReport`, the i18n `t`,
 * the language and the brand accent, and returns a self-contained HTML
 * document (inline CSS, logo as a data URI) that `expo-print` on native and the
 * browser print dialog on web both turn into a PDF.
 *
 * Content is deliberately accounting-only (header with fiscal data, income
 * statement, income by payment method, itemized movements) — no operational
 * metrics. Colors come from the §7 palette; money is monospace. Every
 * user-entered string is HTML-escaped.
 */

import type { TFunction } from 'i18next';

import { palette, getAccentPalette, type Accent } from '@/constants/theme';
import type { BusinessProfile, ReportFinancialEntry } from '@/db/repositories';
import type { SupportedLanguage } from '@/i18n';
import { formatDate, formatDateTime, formatMoney } from '@/i18n/format';
import type { CashflowReport, ReportMonth } from '@/lib/cashflow-report';
import { dayjs } from '@/lib/dayjs';

export interface CashflowReportHtmlOptions {
  t: TFunction;
  language: SupportedLanguage;
  accent: Accent;
  /** Business logo as a `data:` URI (or any URI the renderer can load). */
  logoUri?: string | null;
}

const NUMBER_LOCALE: Record<SupportedLanguage, string> = { es: 'es-MX', en: 'en-US' };

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape a string for safe interpolation into HTML text or attributes. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/** Localized, capitalized month label, e.g. "Septiembre 2026" / "September 2026". */
export function formatReportMonth(month: ReportMonth, language: SupportedLanguage): string {
  const label = dayjs(new Date(month.year, month.month - 1, 1))
    .locale(language)
    .format('MMMM YYYY');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function businessAddress(business: BusinessProfile): string | null {
  const cityLine = [business.postalCode, business.city].filter(Boolean).join(' ');
  const parts = [business.addressLine1, cityLine, business.state, business.countryCode].filter(
    (part): part is string => typeof part === 'string' && part.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(', ') : null;
}

function styles(accentHex: string): string {
  const c = palette.light;
  return `
  @page { margin: 36px 32px; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, system-ui, Roboto, 'Segoe UI', sans-serif;
    font-size: 11px;
    line-height: 1.45;
    color: ${c.neutral900};
    background: ${c.neutral0};
  }
  td.money, .mono { font-family: ui-monospace, SFMono-Regular, 'Roboto Mono', Menlo, monospace; white-space: nowrap; }
  .money { text-align: right; }
  .muted { color: ${c.neutral600}; }
  header.report { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 16px; border-bottom: 2px solid ${accentHex}; }
  .biz { display: flex; gap: 12px; align-items: flex-start; }
  .biz img { width: 56px; height: 56px; object-fit: contain; border-radius: 8px; border: 1px solid ${c.neutral200}; }
  .biz h1 { font-size: 18px; margin: 0 0 2px; }
  .biz p, .doc p { margin: 0; }
  .doc { text-align: right; }
  .doc h2 { font-size: 16px; margin: 0 0 2px; color: ${accentHex}; }
  section { margin-top: 20px; }
  section > h3 { font-size: 13px; margin: 0 0 8px; color: ${accentHex}; text-transform: uppercase; letter-spacing: 0.04em; }
  h4 { font-size: 12px; margin: 14px 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  th { text-align: left; font-weight: 600; color: ${c.neutral600}; border-bottom: 1px solid ${c.neutral200}; padding: 6px 4px; }
  th.money { text-align: right; }
  td { padding: 5px 4px; border-bottom: 1px solid ${c.neutral200}; vertical-align: top; }
  tr.group td { font-weight: 600; background: ${c.neutral50}; }
  tr.indent td:first-child { padding-left: 16px; }
  tr.total td { font-weight: 700; border-top: 1px solid ${c.neutral900}; border-bottom: none; }
  tr.net td { font-size: 13px; font-weight: 700; border-top: 2px solid ${c.neutral900}; border-bottom: none; padding-top: 8px; }
  .negative { color: ${c.danger500}; }
  .empty { padding: 8px 4px; color: ${c.neutral600}; font-style: italic; }
  .note { margin: 6px 0 0; color: ${c.neutral600}; }
  footer.report { margin-top: 28px; padding-top: 8px; border-top: 1px solid ${c.neutral200}; color: ${c.neutral600}; font-size: 10px; }
  `;
}

/** Render the full report as a standalone HTML document. */
export function renderCashflowReportHtml(
  report: CashflowReport,
  { t, language, accent, logoUri }: CashflowReportHtmlOptions,
): string {
  const locale = NUMBER_LOCALE[language];
  const money = (minor: number) =>
    `<td class="money${minor < 0 ? ' negative' : ''}">${escapeHtml(
      formatMoney(minor, report.currency, { locale }),
    )}</td>`;
  const date = (iso: string) => escapeHtml(formatDate(iso, { locale: language }));
  const text = (value: string | null | undefined) =>
    value && value.trim().length > 0 ? escapeHtml(value) : '<span class="muted">—</span>';

  const s = report.summary;
  const business = report.business;
  const monthLabel = formatReportMonth(report.month, language);

  // --- Header -------------------------------------------------------------
  const bizLines: string[] = [];
  if (business) {
    if (business.legalName && business.legalName.trim() !== business.name.trim()) {
      bizLines.push(`<p>${escapeHtml(business.legalName)}</p>`);
    }
    const address = businessAddress(business);
    if (address) {
      bizLines.push(`<p class="muted">${escapeHtml(address)}</p>`);
    }
    const contact = [business.phone, business.email].filter(
      (part): part is string => typeof part === 'string' && part.trim().length > 0,
    );
    if (contact.length > 0) {
      bizLines.push(`<p class="muted">${escapeHtml(contact.join(' · '))}</p>`);
    }
  }
  const logo = logoUri
    ? `<img src="${escapeHtml(logoUri)}" alt="" />`
    : '';
  const header = `
  <header class="report">
    <div class="biz">
      ${logo}
      <div>
        <h1>${business ? escapeHtml(business.name) : ''}</h1>
        ${bizLines.join('\n')}
      </div>
    </div>
    <div class="doc">
      <h2>${escapeHtml(t('reports.pdf.documentTitle'))}</h2>
      <p><strong>${escapeHtml(monthLabel)}</strong></p>
      <p class="muted">${escapeHtml(t('reports.pdf.period', {
        from: formatDate(report.range.from, { locale: language }),
        to: formatDate(report.range.to, { locale: language }),
      }))}</p>
      <p class="muted">${escapeHtml(t('reports.pdf.currency', { currency: report.currency }))}</p>
    </div>
  </header>`;

  // --- Summary (income statement) -----------------------------------------
  const categoryRows = report.expenseCategories
    .map(
      (group) =>
        `<tr class="indent"><td>${escapeHtml(group.categoryName)}</td>${money(group.totalMinor)}</tr>`,
    )
    .join('');
  const summary = `
  <section>
    <h3>${escapeHtml(t('reports.pdf.summaryTitle'))}</h3>
    <table>
      <tbody>
        <tr class="group"><td colspan="2">${escapeHtml(t('reports.pdf.incomeTitle'))}</td></tr>
        <tr class="indent"><td>${escapeHtml(t('reports.pdf.grossSales'))} <span class="muted">(${escapeHtml(t(
          'reports.pdf.salesCount',
          { count: s.salesCount },
        ))})</span></td>${money(s.grossSalesMinor)}</tr>
        <tr class="indent"><td>${escapeHtml(t('reports.pdf.otherIncome'))}</td>${money(s.otherIncomeMinor)}</tr>
        <tr class="total"><td>${escapeHtml(t('reports.pdf.totalIncome'))}</td>${money(s.totalIncomeMinor)}</tr>
        <tr class="group"><td colspan="2">${escapeHtml(t('reports.pdf.expenseTitle'))}</td></tr>
        <tr class="indent"><td>${escapeHtml(t('reports.pdf.refunds'))} <span class="muted">(${escapeHtml(t(
          'reports.pdf.refundCount',
          { count: s.refundCount },
        ))})</span></td>${money(s.refundsMinor)}</tr>
        ${categoryRows}
        <tr class="indent"><td>${escapeHtml(t('reports.pdf.purchases'))}</td>${money(s.purchasesMinor)}</tr>
        <tr class="total"><td>${escapeHtml(t('reports.pdf.totalExpense'))}</td>${money(s.totalExpenseMinor)}</tr>
        <tr class="net"><td>${escapeHtml(t('reports.pdf.net'))}</td>${money(s.netMinor)}</tr>
      </tbody>
    </table>
  </section>`;

  // --- Income by payment method -------------------------------------------
  const methodRows = report.paymentMethods
    .map(
      (m) =>
        `<tr><td>${escapeHtml(m.name)}</td><td class="money">${m.saleCount}</td>${money(m.totalMinor)}</tr>`,
    )
    .join('');
  const methods = `
  <section>
    <h3>${escapeHtml(t('reports.pdf.paymentMethodsTitle'))}</h3>
    ${
      report.paymentMethods.length === 0
        ? `<p class="empty">${escapeHtml(t('reports.pdf.none'))}</p>`
        : `<table>
      <thead><tr><th>${escapeHtml(t('reports.pdf.method'))}</th><th class="money">${escapeHtml(t(
        'reports.pdf.salesColumn',
      ))}</th><th class="money">${escapeHtml(t('reports.pdf.amount'))}</th></tr></thead>
      <tbody>
        ${methodRows}
        <tr class="total"><td colspan="2">${escapeHtml(t('reports.pdf.total'))}</td>${money(
          report.paymentMethodsTotalMinor,
        )}</tr>
      </tbody>
    </table>`
    }
    <p class="note">${escapeHtml(t('reports.pdf.paymentMethodsNote'))}</p>
  </section>`;

  // --- Detail tables --------------------------------------------------------
  const entryTable = (
    entries: ReportFinancialEntry[],
    totalMinor: number,
    withMethod: boolean,
  ): string => {
    if (entries.length === 0) {
      return `<p class="empty">${escapeHtml(t('reports.pdf.none'))}</p>`;
    }
    const colspan = withMethod ? 4 : 3;
    const rows = entries
      .map(
        (e) =>
          `<tr><td class="mono">${date(e.createdAt)}</td><td>${escapeHtml(
            e.categoryName,
          )}</td><td>${text(e.description ?? e.supplierName)}</td>${
            withMethod ? `<td>${text(e.paymentMethodName)}</td>` : ''
          }${money(e.amountMinor)}</tr>`,
      )
      .join('');
    return `<table>
      <thead><tr><th>${escapeHtml(t('reports.pdf.date'))}</th><th>${escapeHtml(t(
        'reports.pdf.category',
      ))}</th><th>${escapeHtml(t('reports.pdf.description'))}</th>${
        withMethod ? `<th>${escapeHtml(t('reports.pdf.paymentMethod'))}</th>` : ''
      }<th class="money">${escapeHtml(t('reports.pdf.amount'))}</th></tr></thead>
      <tbody>
        ${rows}
        <tr class="total"><td colspan="${colspan}">${escapeHtml(t('reports.pdf.subtotal'))}</td>${money(
          totalMinor,
        )}</tr>
      </tbody>
    </table>`;
  };

  const purchaseTable =
    report.purchases.length === 0
      ? `<p class="empty">${escapeHtml(t('reports.pdf.none'))}</p>`
      : `<table>
      <thead><tr><th>${escapeHtml(t('reports.pdf.date'))}</th><th>${escapeHtml(t(
        'reports.pdf.purchaseNumber',
      ))}</th><th>${escapeHtml(t('reports.pdf.supplier'))}</th><th class="money">${escapeHtml(t(
        'reports.pdf.amount',
      ))}</th></tr></thead>
      <tbody>
        ${report.purchases
          .map(
            (p) =>
              `<tr><td class="mono">${date(p.createdAt)}</td><td class="mono">${escapeHtml(
                p.purchaseNumber,
              )}</td><td>${p.supplierName ? escapeHtml(p.supplierName) : escapeHtml(t(
                'reports.pdf.noSupplier',
              ))}</td>${money(p.totalMinor)}</tr>`,
          )
          .join('')}
        <tr class="total"><td colspan="3">${escapeHtml(t('reports.pdf.subtotal'))}</td>${money(
          s.purchasesMinor,
        )}</tr>
      </tbody>
    </table>`;

  const detail = `
  <section>
    <h3>${escapeHtml(t('reports.pdf.detailTitle'))}</h3>
    <h4>${escapeHtml(t('reports.pdf.expensesTitle'))}</h4>
    ${entryTable(report.expenses, s.manualExpenseMinor, true)}
    <h4>${escapeHtml(t('reports.pdf.purchasesTitle'))}</h4>
    ${purchaseTable}
    <h4>${escapeHtml(t('reports.pdf.otherIncomeTitle'))}</h4>
    ${entryTable(report.otherIncome, s.otherIncomeMinor, true)}
  </section>`;

  const footer = `
  <footer class="report">
    ${escapeHtml(t('reports.pdf.generatedAt', {
      date: formatDateTime(report.generatedAt, { locale: language }),
    }))}
  </footer>`;

  const accentHex = getAccentPalette(accent, 'light').primary500;
  const title = `${String(t('reports.pdf.documentTitle'))} — ${monthLabel}`;

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${styles(accentHex)}</style>
</head>
<body>
${header}
${summary}
${methods}
${detail}
${footer}
</body>
</html>`;
}
