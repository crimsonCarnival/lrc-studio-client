// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FloatingInput } from './floating-input'

describe('FloatingInput outline', () => {
  it('opens a gap for the label only once the label is raised', () => {
    const { container, rerender } = render(<FloatingInput id="x" label="Album" value="" onChange={() => {}} />)
    const legend = () => container.querySelector('fieldset legend')!
    expect(legend().className).toContain('max-w-[0.01px]')
    rerender(<FloatingInput id="x" label="Album" value="castles" onChange={() => {}} />)
    expect(legend().className).toContain('max-w-full')
    // The gap is sized by an invisible copy of the label; the real label stays the accessible name.
    expect(container.querySelector('fieldset')!.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByLabelText('Album')).toBe(container.querySelector('input'))
  })

  it('has no fill of its own on the label, so the field can be transparent', () => {
    const { container } = render(<FloatingInput id="x" label="Album" value="a" onChange={() => {}} />)
    expect(container.querySelector('label')!.className).not.toContain('bg-card')
    expect(container.querySelector('input')!.className).toContain('bg-field')
  })
})
