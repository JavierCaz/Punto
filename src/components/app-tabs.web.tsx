import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TabIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const TABS: { name: string; href: '/' | '/pos' | '/sales' | '/inventory' | '/more'; icon: TabIconName }[] = [
  { name: 'index', href: '/', icon: 'view-dashboard-outline' },
  { name: 'pos', href: '/pos', icon: 'point-of-sale' },
  { name: 'sales', href: '/sales', icon: 'receipt-text-outline' },
  { name: 'inventory', href: '/inventory', icon: 'package-variant-closed' },
  { name: 'more', href: '/more', icon: 'dots-horizontal' },
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
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon}>{t(TAB_LABEL_KEY[tab.name as keyof typeof TAB_LABEL_KEY])}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  icon,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: TabIconName }) {
  const theme = useTheme();

  const tint = isFocused ? theme.text : theme.textSecondary;

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabPressable, pressed && styles.pressed]}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : undefined}
        style={[
          styles.tabButtonView,
          isFocused ? { borderColor: theme.backgroundSelected } : { borderColor: theme.border },
        ]}>
        <MaterialCommunityIcons name={icon} size={18} color={tint} />
        <ThemedText
          type="smallBold"
          themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        type="backgroundElement"
        style={[styles.innerContainer, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={styles.brandText}>
          {t('common.appName')}
        </ThemedText>

        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.one,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  tabPressable: {
    minHeight: TouchTarget.min,
    justifyContent: 'center',
  },
  tabButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
