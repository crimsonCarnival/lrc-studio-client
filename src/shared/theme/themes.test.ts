// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import { THEME_PALETTES, contrast, ensureContrast, isKnownTheme, shapeOf, themeTokens } from './themes'
import { applyTheme, THEME_CACHE_KEY } from './apply-theme'

describe('palette themes', () => {
  it('have unique kebab-case ids that never shadow the built-in themes', () => {
    const ids = THEME_PALETTES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/)
    expect(ids).not.toContain('dark')
    expect(ids).not.toContain('light')
  })

  it.each(THEME_PALETTES.map((p) => [p.id, p] as const))('%s keeps text, accents and primary-button text readable', (_id, p) => {
    const { vars } = themeTokens(p)
    expect(contrast(vars['--foreground'], vars['--background'])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(vars['--subtle'], vars['--background'])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(vars['--primary-ink'], vars['--background'])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(vars['--primary-foreground'], vars['--primary'])).toBeGreaterThanOrEqual(4.5)
  })

  it('treats a light background as a light theme and a dark one as dark', () => {
    expect(themeTokens(THEME_PALETTES.find((p) => p.id === 'paper')!).dark).toBe(false)
    expect(themeTokens(THEME_PALETTES.find((p) => p.id === 'dracula')!).dark).toBe(true)
  })
})

describe('theme shapes', () => {
  it('sharp themes square every corner, round ones enlarge them, soft ones leave index.css alone', () => {
    const by = (id: string) => themeTokens(THEME_PALETTES.find((p) => p.id === id)!).vars
    expect(shapeOf('matrix')).toBe('sharp')
    expect(by('matrix')['--radius']).toBe('0px')
    expect(by('matrix')['--radius-card']).toBe('0px')
    expect(by('matrix')['--radius-pill']).toBe('0px')
    expect(by('sakura')['--radius-pill']).toBeUndefined()
    expect(shapeOf('sakura')).toBe('round')
    expect(by('sakura')['--radius']).toBe('1rem')
    expect(shapeOf('dracula')).toBe('soft')
    expect(by('dracula')['--radius']).toBeUndefined()
  })

  it('only name palettes that exist', () => {
    for (const id of ['matrix', 'sakura']) expect(THEME_PALETTES.some((p) => p.id === id)).toBe(true)
  })
})

describe('ensureContrast', () => {
  it('leaves a readable colour alone and fixes an unreadable one', () => {
    expect(ensureContrast('#ffffff', '#000000', 4.5)).toBe('#ffffff')
    expect(contrast(ensureContrast('#4a4d4e', '#1a0b0c', 4.5), '#1a0b0c')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('isKnownTheme', () => {
  it('accepts the built-ins and palettes, and rejects anything else', () => {
    expect(isKnownTheme('dark')).toBe(true)
    expect(isKnownTheme('light')).toBe(true)
    expect(isKnownTheme('dracula')).toBe(true)
    expect(isKnownTheme('cobalt')).toBe(false)
    expect(isKnownTheme(undefined)).toBe(false)
  })
})

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style')
    document.documentElement.className = ''
    localStorage.clear()
  })

  it('writes a palette theme as inline properties plus a cache, and a built-in theme removes them', () => {
    applyTheme('paper')
    const root = document.documentElement
    expect(root.classList.contains('dark')).toBe(false)
    expect(root.style.getPropertyValue('--background')).toBe('#eeeeee')
    expect(JSON.parse(localStorage.getItem(THEME_CACHE_KEY)!).id).toBe('paper')

    applyTheme('dracula')
    expect(root.classList.contains('dark')).toBe(true)
    expect(root.style.getPropertyValue('--background')).toBe('#282a36')

    applyTheme('dark')
    expect(root.classList.contains('dark')).toBe(true)
    expect(root.style.getPropertyValue('--background')).toBe('')
    expect(localStorage.getItem(THEME_CACHE_KEY)).toBeNull()
  })

  it('falls back to dark for an unknown or missing id', () => {
    applyTheme('cobalt')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyTheme(undefined)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
