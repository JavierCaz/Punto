import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/hooks/use-theme';

type TabIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const TABS: { name: 'index' | 'pos' | 'sales' | 'inventory' | 'more'; icon: TabIconName }[] = [
  { name: 'index', icon: 'view-dashboard-outline' },
  { name: 'pos', icon: 'point-of-sale' },
  { name: 'sales', icon: 'receipt-text-outline' },
  { name: 'inventory', icon: 'package-variant-closed' },
  { name: 'more', icon: 'dots-horizontal' },
];

const TAB_LABEL_KEY = {
  index: 'tabs.dashboard',
  pos: 'tabs.pos',
  sales: 'tabs.sales',
  inventory: 'tabs.inventory',
  more: 'tabs.more',
} as const;

export default function AppTabs() {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.primary}
      iconColor={{ default: colors.textSecondary, selected: colors.primary }}
      tintColor={colors.primary}
      labelStyle={{ selected: { color: colors.text } }}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{t(TAB_LABEL_KEY[tab.name])}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            renderingMode="template"
            src={
              <NativeTabs.Trigger.VectorIcon family={MaterialCommunityIcons} name={tab.icon} />
            }
          />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
