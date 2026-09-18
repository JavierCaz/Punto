import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ListRow } from './list-row';
import { SectionHeader } from './section-header';
import { ThemedView } from './themed-view';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SetupEntry = {
  id: string;
  title: string;
  subtitle?: string;
};

export type SetupEntryListProps = {
  title: string;
  entries: readonly SetupEntry[];
  /** Reveals a per-entry edit action. */
  onEdit?: (id: string) => void;
  /** Reveals a per-entry delete action. */
  onDelete?: (id: string) => void;
};

/**
 * Card list of the items already added in a setup step, with a running count in
 * the section header and optional edit/delete actions per row. Renders nothing
 * while the step is still empty so the "add" form stays the primary focus.
 */
export function SetupEntryList({ title, entries, onEdit, onDelete }: SetupEntryListProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  if (entries.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionHeader level="section" title={`${title} · ${entries.length}`} />
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        {entries.map((entry, index) => (
          <ListRow
            key={entry.id}
            title={entry.title}
            subtitle={entry.subtitle}
            icon="check-circle-outline"
            divided={index < entries.length - 1}
            trailing={
              onEdit || onDelete ? (
                <View style={styles.actions}>
                  {onEdit ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('common.actions.edit')}
                      onPress={() => onEdit(entry.id)}
                      testID={`setup-edit-${entry.id}`}
                      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={20}
                        color={theme.textSecondary}
                      />
                    </Pressable>
                  ) : null}
                  {onDelete ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('common.actions.delete')}
                      onPress={() => onDelete(entry.id)}
                      testID={`setup-delete-${entry.id}`}
                      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={20}
                        color={theme.danger}
                      />
                    </Pressable>
                  ) : null}
                </View>
              ) : undefined
            }
          />
        ))}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  action: {
    minWidth: TouchTarget.min,
    minHeight: TouchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
