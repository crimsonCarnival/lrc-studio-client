// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SegmentedControl } from './segmented-control'

const options = [
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
] as const

describe('SegmentedControl', () => {
  it('marks only the selected segment as pressed', () => {
    render(<SegmentedControl label="Velocidad" options={options} value={1} onChange={() => {}} />)

    expect(screen.getByRole('group', { name: 'Velocidad' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1×' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '0.5×' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports the clicked value with its original type', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl label="Velocidad" options={options} value={1} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: '0.5×' }))

    expect(onChange).toHaveBeenCalledWith(0.5)
  })

  it('exposes tablist semantics in tabs mode', () => {
    render(
      <SegmentedControl
        semantics="tabs"
        label="Modo"
        options={[
          { value: 'lines', label: 'Líneas' },
          { value: 'words', label: 'Palabras' },
        ]}
        value="words"
        onChange={() => {}}
      />,
    )

    expect(screen.getByRole('tablist', { name: 'Modo' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Palabras' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Líneas' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('ignores clicks on a disabled segment but keeps it focusable', async () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        semantics="tabs"
        label="Modo"
        options={[
          { value: 'lines', label: 'Líneas' },
          { value: 'words', label: 'Palabras', disabled: true },
        ]}
        value="lines"
        onChange={onChange}
      />,
    )
    const locked = screen.getByRole('tab', { name: 'Palabras' })

    await userEvent.click(locked)
    locked.focus()

    expect(onChange).not.toHaveBeenCalled()
    expect(locked).toHaveAttribute('aria-disabled', 'true')
    expect(locked).not.toBeDisabled()
    expect(locked).toHaveFocus()
  })

  it('uses ariaLabel as the accessible name when given', () => {
    render(
      <SegmentedControl
        label="Vista"
        options={[{ value: 'a', label: '▦', ariaLabel: 'Cuadrícula' }]}
        value="a"
        onChange={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Cuadrícula' })).toBeInTheDocument()
  })
})
