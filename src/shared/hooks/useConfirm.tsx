import { useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import { useSettings } from '@/features/settings/useSettings';
import ConfirmModal from '@shared/ui/ConfirmModal';

type ConfirmVariant = 'default' | 'danger';

interface ConfirmConfig {
  isOpen: boolean;
  message: string;
  title: string;
  variant: ConfirmVariant;
  onConfirm: (() => void) | null;
}

interface ConfirmOptions {
  title?: string;
  variant?: ConfirmVariant;
}

type RequestConfirm = (message: string, action: () => void, options?: ConfirmOptions) => void;

/**
 * Hook that provides a consistent confirm-before-destructive-action pattern.
 * Returns [requestConfirm, ConfirmModalElement].
 *
 * Usage:
 *   const [requestConfirm, confirmModal] = useConfirm();
 *   requestConfirm('Are you sure?', () => { doThing(); }, { variant: 'danger', title: 'Delete Project' });
 *   // Render {confirmModal} somewhere in the JSX tree
 */
/**
 * Whether destructive actions should ask for confirmation at all.
 *
 * `confirmDestructive` is a policy, not a property of this hook's modal:
 * surfaces that confirm inline (a button that morphs into "Confirm", a
 * swipe-to-delete row) or that drive their own ConfirmModal must honour it
 * too, or the setting silently means "confirm in some places". Those surfaces
 * keep their own UI and just consult this.
 */
export function useConfirmDestructive(): boolean {
  const { settings } = useSettings();
  return settings.advanced?.confirmDestructive !== false;
}

export default function useConfirm(): [RequestConfirm, ReactElement] {
  const { settings } = useSettings();
  const [config, setConfig] = useState<ConfirmConfig>({
    isOpen: false,
    message: '',
    title: '',
    variant: 'danger',
    onConfirm: null,
  });

  const requestConfirm = useCallback<RequestConfirm>((message, action, options = {}) => {
    if (settings.advanced?.confirmDestructive) {
      setConfig({
        isOpen: true,
        message,
        title: options.title || '',
        variant: options.variant ?? 'danger',
        onConfirm: action,
      });
    } else {
      action();
    }
  }, [settings.advanced?.confirmDestructive]);

  const modal = (
    <ConfirmModal
      isOpen={config.isOpen}
      title={config.title}
      message={config.message}
      variant={config.variant}
      onConfirm={() => {
        const action = config.onConfirm;
        setConfig({ isOpen: false, message: '', title: '', variant: 'danger', onConfirm: null });
        if (action) setTimeout(action, 0);
      }}
      onCancel={() => setConfig({ isOpen: false, message: '', title: '', variant: 'danger', onConfirm: null })}
    />
  );

  return [requestConfirm, modal];
}
