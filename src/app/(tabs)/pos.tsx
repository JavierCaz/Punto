import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { listActiveEmployees, useAuthStore, useCan } from '@/auth';
import { BottomSheet } from '@/components/bottom-sheet';
import { CartPanel } from '@/components/cart-panel';
import { CatalogFilterBar } from '@/components/catalog-filter-bar';
import { EmptyState } from '@/components/empty-state';
import { OptionRow } from '@/components/option-row';
import { PaymentPanel } from '@/components/payment-panel';
import { ProductCard } from '@/components/product-card';
import { PulseHighlight } from '@/components/pulse-highlight';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import {
  cancelSale,
  ensureDefaultPaymentMethods,
  expireStaleHeldSales,
  listSales,
  type PaymentInput,
  type PaymentMethod,
  type Sale,
} from '@/db';
import { useCatalog } from '@/hooks/use-catalog';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatDateTime, formatMoney } from '@/i18n/format';
import { i18n } from '@/i18n';
import { filterProducts } from '@/lib/catalog-form';
import { cartItemCount, cartSubtotalMinor } from '@/pos/cart-math';
import { useCartStore } from '@/pos/cart-store';

const TABLET_BREAKPOINT = 768;
const CART_PANE_WIDTH = 360;

type ActiveSheet = 'none' | 'cart' | 'payment' | 'held' | 'employee';

function fullName(firstName: string, lastName: string | null): string {
  return lastName ? `${firstName} ${lastName}` : firstName;
}

/**
 * POS — the primary daily task. Catalog on the left; on mobile a cart bar opens
 * the cart sheet (Catalog → Cart → Payment → Receipt), on tablet the cart lives
 * in a persistent split-view pane (§8.2).
 */
export default function PosScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  const { products, categories, recipeProductIds, productCostMinor, currency, loading, loadFailed, reload } =
    useCatalog();
  const user = useAuthStore((state) => state.user);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>('none');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [heldSales, setHeldSales] = useState<Sale[]>([]);
  const [employees, setEmployees] = useState<Awaited<ReturnType<typeof listActiveEmployees>>>([]);
  const [heldPulseToken, setHeldPulseToken] = useState(0);

  const lines = useCartStore((state) => state.lines);
  const busy = useCartStore((state) => state.busy);
  const cartError = useCartStore((state) => state.error);
  const cartEmployeeId = useCartStore((state) => state.employeeId);
  const addProduct = useCartStore((state) => state.addProduct);
  const resumeCart = useCartStore((state) => state.resume);
  const checkout = useCartStore((state) => state.checkout);
  const hold = useCartStore((state) => state.hold);
  const setEmployee = useCartStore((state) => state.setEmployee);
  const cartSaleId = useCartStore((state) => state.saleId);
  const discardCart = useCartStore((state) => state.discard);

  const today = formatDate(new Date().toISOString());
  const count = cartItemCount(lines);
  const cartTotal = cartSubtotalMinor(lines);

  const isAdmin = user?.role === 'ADMIN';
  const canManageSales = useCan('sales.refund');
  const attributedEmployee = employees.find((employee) => employee.id === cartEmployeeId);
  const employeeName = attributedEmployee
    ? fullName(attributedEmployee.firstName, attributedEmployee.lastName)
    : cartEmployeeId != null && cartEmployeeId === user?.id && user
      ? fullName(user.firstName, user.lastName)
      : null;

  const loadHeld = useCallback(async () => {
    try {
      // Drop stale held carts before listing so the sheet matches the dashboard
      // (best-effort: a failure here must not hide the carts that still exist).
      try {
        await expireStaleHeldSales();
      } catch {
        // Maintenance only.
      }
      const page = await listSales({ status: 'HELD' });
      setHeldSales(page.items);
    } catch {
      setHeldSales([]);
    }
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const methods = await ensureDefaultPaymentMethods(i18n.language === 'en' ? 'en' : 'es');
      setPaymentMethods(methods);
    } catch {
      setPaymentMethods([]);
    }
  }, []);


  useEffect(() => {
    setEmployee(user?.id ?? null);
  }, [user?.id, setEmployee]);

  useFocusEffect(
    useCallback(() => {
      void reload();
      void loadHeld();
      void loadPaymentMethods();
      void listActiveEmployees()
        .then(setEmployees)
        .catch(() => setEmployees([]));
    }, [reload, loadHeld, loadPaymentMethods]),
  );

  const visible = filterProducts(products, { search, categoryId: categoryFilter });
  const resolveCategoryName = (categoryId: string | null): string | null =>
    categories.find((category) => category.id === categoryId)?.name ?? null;

  const handleAddProduct = (productId: string, name: string, priceMinor: number): void => {
    void addProduct({
      productId,
      productName: name,
      unitPriceMinor: priceMinor,
      unitCostMinor: productCostMinor.get(productId) ?? 0,
    });
  };

  const handlePaymentSubmit = async (payments: PaymentInput[]): Promise<void> => {
    const detail = await checkout(payments);
    if (!detail) {
      return;
    }
    setActiveSheet('none');
    await loadHeld();
    // Defer past the sheet dismissal so iOS does not present while dismissing.
    setTimeout(() => {
      router.push({ pathname: '/receipt/[id]', params: { id: detail.id } });
    }, 0);
  };

  const handleHold = async (): Promise<void> => {
    await hold();
    setActiveSheet('none');
    await loadHeld();
    setHeldPulseToken((token) => token + 1);
  };

  const resumeHeld = async (saleId: string): Promise<void> => {
    await resumeCart(saleId);
    setActiveSheet(isTablet ? 'none' : 'cart');
  };

  const discardHeld = async (saleId: string): Promise<void> => {
    try {
      if (saleId === cartSaleId) {
        await discardCart();
      } else {
        await cancelSale(saleId);
      }
    } finally {
      await loadHeld();
    }
  };

  const chargeError =
    cartError?.operation === 'charge'
      ? cartError.code === 'INVENTORY_INSUFFICIENT_STOCK'
        ? t('pos.payment.insufficientStock')
        : t('pos.payment.failed')
      : null;

  const renderCatalogState = () => {
    if (loading && products.length === 0) {
      return (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.loading')}
          </ThemedText>
        </View>
      );
    }
    if (loadFailed && products.length === 0) {
      return (
        <View style={styles.state}>
          <ThemedText type="body1">{t('common.status.error')}</ThemedText>
          <SecondaryButton label={t('common.actions.retry')} icon="refresh" onPress={() => void reload()} />
        </View>
      );
    }
    if (products.length === 0) {
      return (
        <View style={styles.state}>
          <EmptyState icon="shopping-outline" title={t('pos.empty.title')} message={t('pos.empty.message')} />
        </View>
      );
    }
    return null;
  };

  const catalogList = (
    <FlatList
      key={isTablet ? 'grid' : 'list'}
      data={visible}
      keyExtractor={(item) => item.id}
      numColumns={isTablet ? 2 : 1}
      {...(isTablet ? { columnWrapperStyle: styles.gridRow } : {})}
      contentContainerStyle={styles.listContent}
      style={styles.list}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <ProductCard
          product={item}
          categoryName={resolveCategoryName(item.categoryId)}
          currency={currency}
          hasRecipe={recipeProductIds.has(item.id)}
          variant={isTablet ? 'grid' : 'list'}
          onPress={() => handleAddProduct(item.id, item.name, item.priceMinor)}
        />
      )}
      ListEmptyComponent={
        <View style={styles.state}>
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.empty')}
          </ThemedText>
        </View>
      }
    />
  );

  const heldSheetContent =
    heldSales.length === 0 ? (
      <ThemedText type="body2" themeColor="textSecondary">
        {t('pos.held.empty')}
      </ThemedText>
    ) : (
      heldSales.map((held) => (
        <View key={held.id} style={[styles.heldRow, { borderColor: theme.border }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void resumeHeld(held.id)}
            testID={`held-sale-${held.id}`}
            style={styles.heldMain}>
            <ThemedText type="code">{held.saleNumber}</ThemedText>
            <ThemedText type="body2" themeColor="textSecondary">
              {formatDateTime(held.createdAt)}
            </ThemedText>
            <ThemedText type="code">{formatMoney(held.totalMinor, currency)}</ThemedText>
          </Pressable>
          {canManageSales || held.id === cartSaleId ? (
            <SecondaryButton label={t('pos.held.discard')} onPress={() => void discardHeld(held.id)} />
          ) : null}
        </View>
      ))
    );

  const employeeSheetContent = employees.map((employee, index) => (
    <OptionRow
      key={employee.id}
      label={fullName(employee.firstName, employee.lastName)}
      selected={cartEmployeeId === employee.id}
      onPress={() => {
        setEmployee(employee.id);
        setActiveSheet('none');
      }}
      divided={index < employees.length - 1}
    />
  ));

  const cartPanel = (
    <CartPanel
      currency={currency}
      onCharge={() => setActiveSheet('payment')}
      onHold={() => void handleHold()}
      employeeName={employeeName}
      {...(isAdmin ? { onChangeEmployee: () => setActiveSheet('employee') } : {})}
    />
  );

  return (
    <>
      <Screen underWebTabBar contentContainerStyle={[styles.screen, isTablet ? styles.screenWide : null]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText type="heading1">{t('pos.title')}</ThemedText>
            <ThemedText type="body2" themeColor="textSecondary">
              {today}
            </ThemedText>
          </View>
          {heldSales.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              testID="pos-held-button"
              onPress={() => {
                void loadHeld();
                setActiveSheet('held');
              }}
              style={[styles.heldButton, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <PulseHighlight
                token={heldPulseToken}
                color={theme.warning}
                borderRadius={Radius.md}
                testID="pos-held-pulse"
              />
              <MaterialCommunityIcons name="clock-outline" size={18} color={theme.warning} />
              <ThemedText type="body2">{heldSales.length}</ThemedText>
            </Pressable>
          ) : null}
        </View>

        {products.length > 0 ? (
          <CatalogFilterBar
            search={search}
            onSearchChange={setSearch}
            categories={categories}
            selectedCategoryId={categoryFilter}
            onCategoryChange={setCategoryFilter}
            searchPlaceholder={t('pos.searchPlaceholder')}
            searchTestID="pos-search"
          />
        ) : null}

        {isTablet ? (
          <View style={styles.split}>
            <View style={styles.catalogPane}>
              {renderCatalogState() ?? catalogList}
            </View>
            <View style={[styles.cartPane, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              {cartPanel}
            </View>
          </View>
        ) : (
          <>
            {renderCatalogState() ?? catalogList}
            {count > 0 ? (
              <Pressable
                accessibilityRole="button"
                testID="pos-cart-bar"
                onPress={() => setActiveSheet('cart')}
                style={[styles.cartBar, { backgroundColor: theme.primary }]}>
                <View style={styles.cartBarInfo}>
                  <MaterialCommunityIcons name="cart-outline" size={20} color={theme.onPrimary} />
                  <ThemedText style={{ color: theme.onPrimary }}>
                    {t('pos.cart.itemCount', { count })}
                  </ThemedText>
                </View>
                <ThemedText type="code" style={{ color: theme.onPrimary }}>
                  {formatMoney(cartTotal, currency)}
                </ThemedText>
                <ThemedText style={[styles.cartBarAction, { color: theme.onPrimary }]}>
                  {t('pos.cart.open')}
                </ThemedText>
              </Pressable>
            ) : null}
          </>
        )}
      </Screen>

      {!isTablet ? (
        <BottomSheet
          visible={activeSheet === 'cart'}
          onClose={() => setActiveSheet('none')}
          title={t('pos.cart.title')}
          scroll={false}
          testID="cart-sheet">
          <View style={{ height: Math.round(height * 0.7) }}>{cartPanel}</View>
        </BottomSheet>
      ) : null}

      <BottomSheet
        visible={activeSheet === 'payment'}
        onClose={() => setActiveSheet('none')}
        title={t('pos.payment.title')}
        testID="payment-sheet">
        <PaymentPanel
          totalMinor={cartTotal}
          currency={currency}
          methods={paymentMethods}
          submitting={busy}
          errorMessage={chargeError}
          onSubmit={(payments) => void handlePaymentSubmit(payments)}
        />
      </BottomSheet>

      <BottomSheet
        visible={activeSheet === 'held'}
        onClose={() => setActiveSheet('none')}
        title={t('pos.held.title')}
        testID="held-sheet">
        <View style={styles.heldList}>{heldSheetContent}</View>
      </BottomSheet>

      <BottomSheet
        visible={activeSheet === 'employee'}
        onClose={() => setActiveSheet('none')}
        title={t('pos.cart.attributedTo')}
        testID="employee-sheet">
        <View>{employeeSheetContent}</View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: Spacing.three,
  },
  screenWide: {
    maxWidth: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerText: {
    gap: Spacing.one,
  },
  heldButton: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    overflow: 'hidden',
  },
  split: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.three,
  },
  catalogPane: {
    flex: 1,
    gap: Spacing.three,
  },
  cartPane: {
    width: CART_PANE_WIDTH,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  gridRow: {
    gap: Spacing.three,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  cartBar: {
    minHeight: TouchTarget.action,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  cartBarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cartBarAction: {
    fontWeight: '700',
  },
  heldList: {
    gap: Spacing.two,
  },
  heldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.two,
  },
  heldMain: {
    flex: 1,
    gap: Spacing.half,
  },
});
