// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Input } from './input'
import { FloatingInput } from './floating-input'

describe('Input side padding', () => {
  it('keeps a caller’s side padding at desktop widths over the base lg:px-2.5', () => {
    const { container } = render(<Input className="pl-9" />)
    const cls = container.querySelector('input')!.className.split(/\s+/)
    // The base lg:px-2.5 still sets the right side; lg:pl-9 after it wins on the left.
    expect(cls.indexOf('lg:pl-9')).toBeGreaterThan(cls.indexOf('lg:px-2.5'))
  })

  it('lets a trailing button keep its room in a FloatingInput', () => {
    const { container } = render(<FloatingInput id="n" label="Name" value="" onChange={() => {}} className="pr-12" />)
    const cls = container.querySelector('input')!.className.split(/\s+/)
    // lg:pr-12 must come after the field's own lg:px-4 so the right padding wins.
    expect(cls).toContain('lg:pr-12')
    expect(cls.indexOf('lg:pr-12')).toBeGreaterThan(cls.indexOf('lg:px-4'))
  })

  it('leaves the base padding alone when the caller sets none', () => {
    const { container } = render(<Input />)
    expect(container.querySelector('input')!.className).toContain('lg:px-2.5')
  })
})
