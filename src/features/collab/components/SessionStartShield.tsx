import { createPortal } from 'react-dom'

/**
 * Covers the page while a session starts. Portalled: under a transformed ancestor (the reorderable
 * panels) a fixed element would not cover the page. Its own module so surfaces outside the editor
 * (the project menus in Library and Home) can show it without loading the session modal.
 */
export function SessionStartShield() {
  return createPortal(
    <div data-testid="session-starting-shield" className="fixed inset-0 z-[100] cursor-wait" aria-busy="true" />,
    document.body,
  )
}
