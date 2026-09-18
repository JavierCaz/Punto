import { useTranslation } from 'react-i18next';

import { AppDialog } from '@/components/app-dialog';
import { useDialogStore } from './dialog-store';

/**
 * Renders the active global dialog. Mount exactly once, near the app root, so
 * dialogs survive navigation (e.g. a success message shown right after a
 * `router.replace`). Renders nothing when no dialog is open.
 */
export function DialogHost() {
  const { t } = useTranslation();
  const dialog = useDialogStore((state) => state.dialog);
  const toggleValue = useDialogStore((state) => state.toggleValue);
  const setToggleValue = useDialogStore((state) => state.setToggleValue);
  const close = useDialogStore((state) => state.close);

  if (dialog == null) {
    return null;
  }

  if (dialog.kind === 'message') {
    const { title, message, tone, closeLabel } = dialog.options;
    return (
      <AppDialog
        visible
        tone={tone}
        title={title}
        message={message}
        primaryLabel={closeLabel ?? t('common.actions.ok')}
        onPrimaryPress={close}
        onDismiss={close}
        testID="app-dialog"
      />
    );
  }

  const {
    title,
    message,
    tone,
    confirmLabel,
    cancelLabel,
    confirmTone,
    toggle,
    onConfirm,
    onCancel,
  } = dialog.options;

  // Dismiss before invoking a handler so a handler that opens another dialog
  // (e.g. "delete failed" after confirming a delete) is not wiped out.
  const handleCancel = (): void => {
    close();
    onCancel?.();
  };
  const handleConfirm = (): void => {
    close();
    onConfirm(toggleValue);
  };

  return (
    <AppDialog
      visible
      tone={tone}
      title={title}
      message={message}
      toggleLabel={toggle?.label}
      toggleHint={toggle?.hint}
      toggleValue={toggleValue}
      onToggleChange={setToggleValue}
      toggleTestID={toggle?.testID}
      primaryLabel={confirmLabel ?? t('common.actions.confirm')}
      primaryTone={confirmTone}
      onPrimaryPress={handleConfirm}
      secondaryLabel={cancelLabel ?? t('common.actions.cancel')}
      onSecondaryPress={handleCancel}
      onDismiss={handleCancel}
      testID="app-dialog"
    />
  );
}
