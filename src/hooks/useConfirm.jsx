import { useState, useCallback } from 'react';
import { useSettings } from '../contexts/useSettings';
import ConfirmModal from '../components/shared/ConfirmModal';

/**
 * Hook that provides a consistent confirm-before-destructive-action pattern.
 * Returns [requestConfirm, ConfirmModalElement].
 *
 * Usage:
 *   const [requestConfirm, confirmModal] = useConfirm();
 *   requestConfirm('Are you sure?', () => { doThing(); }, { variant: 'danger', title: 'Delete Project' });
 *   // Render {confirmModal} somewhere in the JSX tree
 */
export default function useConfirm() {
  const { settings } = useSettings();
  const [config, setConfig] = useState({
    isOpen: false,
    message: '',
    title: '',
    variant: 'danger',
    onConfirm: null,
  });

  const requestConfirm = useCallback((message, action, options = {}) => {
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
