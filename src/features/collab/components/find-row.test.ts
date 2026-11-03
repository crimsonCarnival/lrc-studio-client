import { describe, expect, it } from 'vitest'
import { findRow, pointerOnRow } from './find-row'

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

describe('pointerOnRow', () => {
  const box = (rect: Partial<DOMRect>) => {
    const el = document.createElement('div')
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0, ...rect }) as DOMRect
    return el
  }

  it('is the position as a fraction of the element, clamped to it', () => {
    const el = box({ left: 100, top: 50, width: 200, height: 40 })
    expect(pointerOnRow(el, 'l1', 150, 60)).toEqual({ area: 'lines', lineId: 'l1', xRatio: 0.25, yRatio: 0.25 })
    expect(pointerOnRow(el, 'l1', 999, -5)).toEqual({ area: 'lines', lineId: 'l1', xRatio: 1, yRatio: 0 })
  })

  it('sends nothing for an element with no box', () => {
    expect(pointerOnRow(box({}), 'l1', 10, 10)).toBeUndefined()
  })
})
