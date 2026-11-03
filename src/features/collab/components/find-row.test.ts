import { describe, expect, it } from 'vitest'
import { findRow } from './find-row'

describe('findRow', () => {
  it('resolves the row element, not the pointer that names the line', () => {
    const list = document.createElement('div')
    list.innerHTML = '<div id="layer"><div data-pointer-line="l1"></div></div><div id="row" data-line-id="l1"></div>'
    document.body.append(list)
    const layer = list.querySelector<HTMLElement>('#layer')!
    expect(findRow(layer, 'l1')?.id).toBe('row')
    expect(findRow(layer, 'nope')).toBeNull()
    list.remove()
  })
})
