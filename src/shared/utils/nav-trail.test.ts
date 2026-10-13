// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import { findPrevious, readTrail, recordVisit } from './nav-trail'

describe('findPrevious', () => {
  it('returns the page one step back', () => {
    expect(findPrevious({ 0: '/home', 1: '/explore' }, 1, '/explore')).toEqual({ path: '/home', delta: -1 })
  })

  it('skips earlier entries of the same page', () => {
    const trail = { 0: '/home', 1: '/search', 2: '/search', 3: '/search' }
    expect(findPrevious(trail, 3, '/search')).toEqual({ path: '/home', delta: -3 })
  })

  it('is null on the first entry', () => {
    expect(findPrevious({ 0: '/library' }, 0, '/library')).toBeNull()
  })

  it('is null when the earlier entry is unknown (tab opened mid-history)', () => {
    expect(findPrevious({ 4: '/library' }, 4, '/library')).toBeNull()
  })

  it('is null when every earlier entry is the same page', () => {
    expect(findPrevious({ 0: '/search', 1: '/search' }, 1, '/search')).toBeNull()
  })
})

describe('recordVisit', () => {
  beforeEach(() => sessionStorage.clear())

  it('stores the path at its history index', () => {
    recordVisit(0, '/home', true)
    recordVisit(1, '/explore', true)

    expect(readTrail()).toEqual({ 0: '/home', 1: '/explore' })
  })

  it('drops forward entries on a push, as the browser does', () => {
    recordVisit(0, '/home', true)
    recordVisit(1, '/explore', true)
    recordVisit(2, '/feed', true)
    // back twice, then navigate somewhere new
    recordVisit(1, '/library', true)

    expect(readTrail()).toEqual({ 0: '/home', 1: '/library' })
  })

  it('keeps forward entries on back/forward traversal', () => {
    recordVisit(0, '/home', true)
    recordVisit(1, '/explore', true)
    recordVisit(0, '/home', false)

    expect(readTrail()).toEqual({ 0: '/home', 1: '/explore' })
  })

  it('survives corrupt storage', () => {
    sessionStorage.setItem('lrc-nav-trail', '{not json')
    expect(readTrail()).toEqual({})
  })
})
