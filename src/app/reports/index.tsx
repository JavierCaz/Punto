import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAuthStore } from '@/auth';
import { MonthStepper } from '@/components/month-stepper';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { getCashflowReportData } from '@/db';
import { showMessage } from '@/dialog';
import { useTheme } from '@/hooks/use-theme';
import { resolveLanguage } from '@/i18n';
import { formatMoney } from '@/i18n/format';
import {
  buildCashflowReport,
  compareMonths,
  defaultReportMonth,
  isEmptyReport,
  monthKey,
  monthOf,
  monthRange,
  reportFileName,
  shiftMonth,
  type CashflowReport,
  type ReportMonth,
} from '@/lib/cashflow-report';
import { formatReportMonth, renderCashflowReportHtml } from '@/lib/cashflow-report-html';
import { exportReportPdf, readLogoDataUri } from '@/lib/report-pdf';
import { useAccentStore } from '@/theme/accent-store';

async function loadReport(month: ReportMonth): Promise<CashflowReport> {
  const data = await getCashflowReportData(useAuthStore.getState().user, monthRange(month));
  return buildCashflowReport(data, month);
}

/**
 * Monthly cash-flow report (accountant PDF). The user picks a month, checks
 * the income / expense / net preview, and generates a PDF that opens in the
 * share sheet (native) or the print dialog (web/desktop).
 */
export default function ReportsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const language = resolveLanguage(i18n.language);

  const [month, setMonth] = useState<ReportMonth>(() => defaultReportMonth());
  const [report, setReport] = useState<CashflowReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const isCurrentOrLater = compareMonths(month, monthOf()) >= 0;

  const changeMonth = useCallback((delta: number) => {
    setLoading(true);
    setMonth((current) => shiftMonth(current, delta));
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadReport(month)
      .then((next) => {
        if (!cancelled) {
          setReport(next);
          setLoadFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReport(null);
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [month]);

  const handleGenerate = useCallback(async () => {
    setBusy(true);
    try {
      // Reload so the PDF reflects the ledger at generation time.
      const fresh = await loadReport(month);
      setReport(fresh);
      const logoUri = await readLogoDataUri(fresh.business?.logoUri);
      const html = renderCashflowReportHtml(fresh, {
        t,
        language,
        accent: useAccentStore.getState().accent,
        logoUri,
      });
      await exportReportPdf(html, reportFileName(month), t('reports.shareTitle'));
    } catch {
      showMessage({
        title: t('reports.errorTitle'),
        message: t('reports.errorMessage'),
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  }, [language, month, t]);

  const summary = report?.summary;
  const currency = report?.currency ?? 'USD';
  const previewRows = summary
    ? [
        { key: 'income', label: t('reports.pdf.totalIncome'), amount: summary.totalIncomeMinor },
        { key: 'expense', label: t('reports.pdf.totalExpense'), amount: summary.totalExpenseMinor },
      ]
    : [];

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('reports.title'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
        }}
      />

      <View style={styles.section}>
        <SectionHeader level="section" title={t('reports.cashflowTitle')} />
        <ThemedText type="body2" themeColor="textSecondary">
          {t('reports.cashflowDescription')}
        </ThemedText>
      </View>

      <MonthStepper
        label={formatReportMonth(month, language)}
        onPrevious={() => changeMonth(-1)}
        onNext={() => changeMonth(1)}
        nextDisabled={isCurrentOrLater || busy}
        previousDisabled={busy}
        previousLabel={t('reports.previousMonth')}
        nextLabel={t('reports.nextMonth')}
        testID="reports-month"
      />

      <View style={styles.section}>
        <SectionHeader level="section" title={t('reports.previewTitle')} />
        <ThemedView
          type="backgroundElement"
          style={[styles.card, { borderColor: theme.border }]}
          testID={`reports-preview-${monthKey(month)}`}>
          {loading ? (
            <ThemedText type="body2" themeColor="textSecondary">
              {t('reports.loading')}
            </ThemedText>
          ) : loadFailed || !summary || !report ? (
            <ThemedText type="body2" themeColor="textSecondary" testID="reports-load-failed">
              {t('reports.loadFailed')}
            </ThemedText>
          ) : (
            <>
              {previewRows.map((row) => (
                <View key={row.key} style={styles.row}>
                  <ThemedText type="body1">{row.label}</ThemedText>
                  <ThemedText type="body1" style={styles.money} testID={`reports-${row.key}`}>
                    {formatMoney(row.amount, currency)}
                  </ThemedText>
                </View>
              ))}
              <View style={[styles.row, styles.netRow, { borderTopColor: theme.border }]}>
                <ThemedText type="heading2">{t('reports.pdf.net')}</ThemedText>
                <ThemedText
                  type="heading2"
                  testID="reports-net"
                  style={[styles.money, summary.netMinor < 0 && { color: theme.danger }]}>
                  {formatMoney(summary.netMinor, currency)}
                </ThemedText>
              </View>
              {isEmptyReport(report) ? (
                <ThemedText type="body2" themeColor="textSecondary" testID="reports-empty">
                  {t('reports.emptyMonth')}
                </ThemedText>
              ) : null}
            </>
          )}
        </ThemedView>
      </View>

      <PrimaryButton
        label={busy ? t('reports.generating') : t('reports.generateAction')}
        icon="file-pdf-box"
        disabled={busy || loading || loadFailed}
        onPress={handleGenerate}
        style={styles.action}
        testID="reports-generate-button"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  netRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  money: {
    fontFamily: Fonts.mono,
  },
  action: {
    minHeight: TouchTarget.action,
  },
});
