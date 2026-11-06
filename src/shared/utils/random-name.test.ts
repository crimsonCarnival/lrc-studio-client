import { describe, expect, it } from 'vitest'
import { RANDOM_NAMES, randomDisplayName } from './random-name'

describe('random display names', () => {
  it('every name fits the guest-name limit and survives trimming', () => {
    for (const name of RANDOM_NAMES) {
      expect(name.length).toBeGreaterThan(0)
      expect(name.length).toBeLessThanOrEqual(40)
      expect(name).toBe(name.trim())
    }
  })

  it('has no duplicates', () => {
    expect(new Set(RANDOM_NAMES).size).toBe(RANDOM_NAMES.length)
  })

  it('never repeats the excluded name', () => {
    for (let i = 0; i < 200; i++) expect(randomDisplayName('Bad Egg')).not.toBe('Bad Egg')
  })
})
