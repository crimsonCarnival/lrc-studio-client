import { useCallback, useEffect, useRef, useState } from 'react';

type ShareFlowInput = {
  /** The project's server id; null/'local'/'new' until it has been saved. */
  publicId: string | null | undefined;
  isPublic: boolean;
  /** Presents the link of an already-public project. Never publishes. */
  showLink: () => void;
  /** The editor's manual save. Used to give an unsaved project a (private) server id. */
  save?: () => Promise<boolean>;
  /** Reports a visibility the server accepted. */
  onVisibilityChange?: (isPublic: boolean, listed?: boolean) => void;
};

/**
 * "Share project" never publishes by itself. A public project shows its link; a private one
 * goes through the publish confirmation and shows the link only once that confirms; a project
 * with no server id is saved (private) first, then offered the same confirmation.
 */
export function useShareFlow({ publicId, isPublic, showLink, save, onVisibilityChange }: ShareFlowInput) {
  const [publishOpen, setPublishOpenState] = useState(false);
  const [waitingForId, setWaitingForId] = useState(false);
  const shareAfterPublish = useRef(false);
  const hasId = !!publicId && publicId !== 'local' && publicId !== 'new';

  const setPublishOpen = useCallback((open: boolean) => {
    if (!open) shareAfterPublish.current = false;
    setPublishOpenState(open);
  }, []);

  const decide = useCallback(() => {
    if (isPublic) { showLink(); return; }
    shareAfterPublish.current = true;
    setPublishOpenState(true);
  }, [isPublic, showLink]);

  const requestShare = useCallback(() => {
    if (hasId) { decide(); return; }
    setWaitingForId(true);
    void save?.();
  }, [hasId, decide, save]);

  useEffect(() => {
    if (!waitingForId || !hasId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWaitingForId(false);
    decide();
  }, [waitingForId, hasId, decide]);

  const onPublished = useCallback((next: boolean, listed?: boolean) => {
    onVisibilityChange?.(next, listed);
    if (next && shareAfterPublish.current) {
      shareAfterPublish.current = false;
      showLink();
    }
  }, [onVisibilityChange, showLink]);

  return { publishOpen, setPublishOpen, requestShare, onPublished };
}
