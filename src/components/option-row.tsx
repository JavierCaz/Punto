import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ListRow } from './list-row';
import type { MaterialIconName } from './empty-state';

import { useTheme } from '@/hooks/use-theme';

export type OptionRowProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: MaterialIconName;
  divided?: boolean;
  testID?: string;
};

/** Selectable settings row: trailing primary check when `selected`. */
export function OptionRow({ label, selected, onPress, icon, divided, testID }: OptionRowProps) {
  const theme = useTheme();

  return (
    <ListRow
      icon={icon}
      title={label}
      onPress={onPress}
      divided={divided}
      testID={testID}
      trailing={
        selected ? <MaterialCommunityIcons name="check" size={22} color={theme.primary} /> : null
      }
    />
  );
}
