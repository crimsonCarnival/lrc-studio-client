import { describe, expect, it } from 'vitest'

import { wordSpan } from './word-span'

describe('wordSpan', () => {
  it('runs from a word to the next stamped word', () => {
    const words = [{ time: 1 }, { time: 2.5 }, { time: 4 }]
    expect(wordSpan(words, 0)).toEqual({ start: 1, end: 2.5 })
  })

  it('skips unstamped words when looking for the end', () => {
    const words = [{ time: 1 }, { time: null }, { time: 3 }]
    expect(wordSpan(words, 0)).toEqual({ start: 1, end: 3 })
  })

  it('ignores a successor stamped at the same instant', () => {
    const words = [{ time: 1 }, { time: 1 }, { time: 2 }]
    expect(wordSpan(words, 0)).toEqual({ start: 1, end: 2 })
  })

  it('gives the last word the mean gap of the line', () => {
    const words = [{ time: 1 }, { time: 2 }, { time: 4 }]
    expect(wordSpan(words, 2)).toEqual({ start: 4, end: 5.5 })
  })

  it('falls back to one second when there is nothing to average', () => {
    expect(wordSpan([{ time: 5 }], 0)).toEqual({ start: 5, end: 6 })
  })

  it('returns null for an unstamped word', () => {
    expect(wordSpan([{ time: null }, { time: 2 }], 0)).toBeNull()
  })
})
