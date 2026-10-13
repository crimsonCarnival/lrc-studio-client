// "/" focuses the page's search box. The rules live here so that every search field and
// the app header agree on which single element reacts to the key.

export const SEARCH_SHORTCUT_ATTR = 'data-search-shortcut'

function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** A bare "/" pressed outside any text input. */
export function isSearchShortcut(e: KeyboardEvent): boolean {
  return e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTextTarget(e.target)
}

export function findOpenDialog(doc: Document): Element | null {
  return doc.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], dialog[open]')
}

/**
 * The one search field "/" should focus right now, or null.
 * - Hidden fields (e.g. the desktop copy of a field while the mobile one shows) are skipped.
 * - While a dialog is open, only fields inside it count, so "/" never reaches behind a modal.
 * - A page-level ("primary") field beats a "fallback" one; ties go to document order.
 * Every mounted field runs this and only the winner acts, so two fields never fight.
 */
export function pickShortcutTarget(doc: Document): HTMLInputElement | null {
  const openDialog = findOpenDialog(doc)
  const usable = [...doc.querySelectorAll<HTMLInputElement>(`input[${SEARCH_SHORTCUT_ATTR}]`)].filter((input) => {
    if (input.disabled) return false
    if (openDialog && !openDialog.contains(input)) return false
    // checkVisibility is missing in older engines and in jsdom; assume visible there.
    return input.checkVisibility?.() ?? true
  })
  return usable.find((input) => input.getAttribute(SEARCH_SHORTCUT_ATTR) === 'primary') ?? usable[0] ?? null
}
