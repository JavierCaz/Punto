/**
 * @jest-environment node
 */

import { i18n } from '@/i18n';
import { buildCashflowReport } from '@/lib/cashflow-report';
import {
  escapeHtml,
  formatReportMonth,
  renderCashflowReportHtml,
} from '@/lib/cashflow-report-html';

import { entry, septemberData } from './fakes/cashflow-report-fixtures';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es' }],
}));

const SEPTEMBER = { year: 2026, month: 9 };

function render(language: 'es' | 'en', data = septemberData()) {
  const report = buildCashflowReport(data, SEPTEMBER, '2026-10-02T16:00:00.000Z');
  return renderCashflowReportHtml(report, {
    t: i18n.getFixedT(language),
    language,
    accent: 'emerald',
    logoUri: 'data:image/png;base64,AAAA',
  });
}

describe('escapeHtml', () => {
  it('escapes markup-significant characters', () => {
    expect(escapeHtml(`<b>"Tom" & 'Jerry'</b>`)).toBe(
      '&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;',
    );
  });
});

describe('formatReportMonth', () => {
  it('capitalizes the localized month name', () => {
    expect(formatReportMonth(SEPTEMBER, 'es')).toBe('Septiembre 2026');
    expect(formatReportMonth(SEPTEMBER, 'en')).toBe('September 2026');
  });
});

describe('renderCashflowReportHtml', () => {
  it('renders the fiscal header, statement, payment methods and detail in Spanish', () => {
    const html = render('es');
    expect(html).toContain('<html lang="es">');
    expect(html).toContain('Café Punto S.A. de C.V.');
    expect(html).toContain('Calle 1 #23, 01000 CDMX, CDMX, MX');
    expect(html).toContain('555-0100 · hola@punto.app');
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).toContain('Estado de flujo de efectivo');
    expect(html).toContain('Septiembre 2026');
    expect(html).toContain('Moneda: MXN');
    expect(html).toContain('Total de ingresos');
    expect(html).toContain('$17,500.00');
    expect(html).toContain('Resultado neto');
    expect(html).toContain('$5,300.00');
    expect(html).toContain('120 ventas');
    expect(html).toContain('1 reembolso');
    expect(html).toContain('Ingresos por método de pago');
    expect(html).toContain('Efectivo');
    expect(html).toContain('Renta septiembre');
    expect(html).toContain('Lácteos del Valle');
    expect(html).toContain('Sin proveedor');
    // The accent tints headings only.
    expect(html).toContain('#047857');
  });

  it('renders English copy and number formatting', () => {
    const html = render('en');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('Cash flow statement');
    expect(html).toContain('September 2026');
    expect(html).toContain('Net result');
    expect(html).toContain('120 sales');
    expect(html).toContain('Income by payment method');
    expect(html).toContain('MX$17,500.00');
  });

  it('is accounting-only: no operational sections', () => {
    const html = render('es');
    expect(html).not.toContain('Productos más vendidos');
    expect(html).not.toContain('Ticket promedio');
    expect(html).not.toContain('Caja');
  });

  it('escapes user-entered text', () => {
    const data = septemberData();
    data.financialEntries = [
      entry({ id: 'evil', description: '<script>alert(1)</script>', categoryName: 'A & B' }),
    ];
    const html = render('es', data);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('A &amp; B');
  });

  it('shows an empty-state line instead of empty tables', () => {
    const data = septemberData();
    data.paymentMethods = [];
    data.financialEntries = [];
    data.purchases = [];
    const html = render('es', data);
    expect(html.match(/Sin movimientos en este periodo\./g)).toHaveLength(4);
  });

  it('omits the legal name when it equals the trade name and skips the logo when absent', () => {
    const data = septemberData();
    data.business = { ...data.business!, legalName: 'Café Punto', phone: null, email: null };
    const report = buildCashflowReport(data, SEPTEMBER);
    const html = renderCashflowReportHtml(report, {
      t: i18n.getFixedT('es'),
      language: 'es',
      accent: 'royal',
    });
    expect(html.match(/Café Punto/g)).toHaveLength(1);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('hola@punto.app');
  });
});
