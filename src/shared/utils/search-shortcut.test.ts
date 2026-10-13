// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { isSearchShortcut, pickShortcutTarget } from './search-shortcut'

function mount(html: string) {
  document.body.innerHTML = html
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('pickShortcutTarget', () => {
  it('returns null when the page has no search field', () => {
    mount('<input id="plain" />')
    expect(pickShortcutTarget(document)).toBeNull()
  })

  it('prefers a page-level field over the header fallback, whatever the order', () => {
    mount('<input id="header" data-search-shortcut="fallback" /><input id="page" data-search-shortcut="primary" />')
    expect(pickShortcutTarget(document)?.id).toBe('page')
  })

  it('uses the fallback when it is the only field', () => {
    mount('<input id="header" data-search-shortcut="fallback" />')
    expect(pickShortcutTarget(document)?.id).toBe('header')
  })

  it('breaks ties between page-level fields by document order', () => {
    mount('<input id="first" data-search-shortcut="primary" /><input id="second" data-search-shortcut="primary" />')
    expect(pickShortcutTarget(document)?.id).toBe('first')
  })

  it('skips disabled fields', () => {
    mount('<input id="off" data-search-shortcut="primary" disabled /><input id="on" data-search-shortcut="primary" />')
    expect(pickShortcutTarget(document)?.id).toBe('on')
  })

  it('only considers fields inside an open dialog', () => {
    mount(`
      <input id="page" data-search-shortcut="primary" />
      <div role="dialog" data-state="open"><input id="modal" data-search-shortcut="primary" /></div>
    `)
    expect(pickShortcutTarget(document)?.id).toBe('modal')
  })

  it('never reaches behind an open dialog that has no search field', () => {
    mount('<input id="page" data-search-shortcut="primary" /><div role="dialog" data-state="open"></div>')
    expect(pickShortcutTarget(document)).toBeNull()
  })

  it('ignores a closed dialog', () => {
    mount('<input id="page" data-search-shortcut="primary" /><div role="dialog" data-state="closed"></div>')
    expect(pickShortcutTarget(document)?.id).toBe('page')
  })
})

describe('isSearchShortcut', () => {
  const press = (target: Element, init: KeyboardEventInit) => {
    let seen = false
    const handler = (e: Event) => { seen = isSearchShortcut(e as KeyboardEvent) }
    window.addEventListener('keydown', handler)
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))
    window.removeEventListener('keydown', handler)
    return seen
  }

  it('accepts a bare "/" outside text inputs', () => {
    mount('<button id="b">x</button>')
    expect(press(document.getElementById('b')!, { key: '/' })).toBe(true)
  })

  it('rejects "/" typed into a text input, textarea or select', () => {
    mount('<input id="i" /><textarea id="t"></textarea><select id="s"></select>')
    for (const id of ['i', 't', 's']) {
      expect(press(document.getElementById(id)!, { key: '/' })).toBe(false)
    }
  })

  it('rejects modified presses and other keys', () => {
    mount('<button id="b">x</button>')
    const b = document.getElementById('b')!
    expect(press(b, { key: '/', ctrlKey: true })).toBe(false)
    expect(press(b, { key: '/', metaKey: true })).toBe(false)
    expect(press(b, { key: 'a' })).toBe(false)
  })
})
