/**
 * Global dialog store + imperative API.
 *
 * Punto renders every confirmation and system message through its own styled
 * dialog (§5, §7) instead of the native `Alert`. A single `<DialogHost />` is
 * mounted in the root layout; any screen (or async handler, or helper outside
 * React) triggers a dialog by calling `showMessage` / `showConfirm`, mirroring
 * the ergonomics of `Alert.alert` while keeping full control of the visuals.
 *
 * Only one dialog can be visible at a time; opening a new one replaces the
 * current request. `showConfirm`/`showMessage` dismiss first and then invoke
 * callbacks, so a handler that opens another dialog works as expected.
 */

import { create } from 'zustand';

import type { DialogTone } from '@/components/app-dialog';

/** Acknowledge-only message dialog (success / error / info). */
export type MessageDialogOptions = {
  title?: string;
  message?: string;
  tone?: DialogTone;
  /** Label of the single dismiss button; defaults to `common.actions.ok`. */
  closeLabel?: string;
};

/** Two-action confirmation dialog (cancel + confirm). */
export type ConfirmDialogOptions = {
  title: string;
  message?: string;
  tone?: DialogTone;
  /** Label of the confirm button; defaults to `common.actions.confirm`. */
  confirmLabel?: string;
  /** Label of the cancel button; defaults to `common.actions.cancel`. */
  cancelLabel?: string;
  /** Emphasis of the confirm button. Use 'danger' for destructive actions. */
  confirmTone?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel?: () => void;
};

export type DialogRequest =
  | { kind: 'message'; options: MessageDialogOptions }
  | { kind: 'confirm'; options: ConfirmDialogOptions };

type DialogStoreState = {
  dialog: DialogRequest | null;
  open: (request: DialogRequest) => void;
  close: () => void;
};

export const useDialogStore = create<DialogStoreState>()((set) => ({
  dialog: null,
  open: (dialog) => set({ dialog }),
  close: () => set({ dialog: null }),
}));

/** Show an acknowledge-only dialog. */
export function showMessage(options: MessageDialogOptions): void {
  useDialogStore.getState().open({ kind: 'message', options });
}

/** Show a cancel/confirm dialog. */
export function showConfirm(options: ConfirmDialogOptions): void {
  useDialogStore.getState().open({ kind: 'confirm', options });
}

/** Dismiss the active dialog without invoking any callback. */
export function dismissDialog(): void {
  useDialogStore.getState().close();
}
