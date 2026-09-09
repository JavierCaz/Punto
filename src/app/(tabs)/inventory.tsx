import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';

import { Spacing } from '@/constants/theme';

export default function InventoryScreen() {
  const { t } = useTranslation();

  return (
    <Screen underWebTabBar>
      <SectionHeader title={t('inventory.title')} />
      <View style={styles.body}>
        <EmptyState
          icon="package-variant-closed"
          title={t('inventory.empty.title')}
          message={t('inventory.empty.message')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.four,
  },
});
