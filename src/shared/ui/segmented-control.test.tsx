// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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

  describe('disabledDetail', () => {
    const lockedOptions = (detail?: ReactNode) => [
      { value: 'lines', label: 'Líneas' },
      { value: 'words', label: 'Palabras', disabled: true, disabledDetail: detail },
    ]
    const renderLocked = (detail: ReactNode, onChange = vi.fn()) =>
      render(<SegmentedControl semantics="tabs" label="Modo" options={lockedOptions(detail)} value="lines" onChange={onChange} />)

    it('disabled option with disabledDetail opens it on click and does not call onChange', async () => {
      const onChange = vi.fn()
      renderLocked('Why it is locked', onChange)

      await userEvent.click(screen.getByRole('tab', { name: 'Palabras' }))

      expect(await screen.findByText('Why it is locked')).toBeInTheDocument()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('opens on Enter when focused', async () => {
      renderLocked('Why it is locked')
      screen.getByRole('tab', { name: 'Palabras' }).focus()

      await userEvent.keyboard('{Enter}')

      expect(await screen.findByText('Why it is locked')).toBeInTheDocument()
    })

    it('disabled option without disabledDetail stays inert', async () => {
      const onChange = vi.fn()
      renderLocked(undefined, onChange)

      await userEvent.click(screen.getByRole('tab', { name: 'Palabras' }))

      expect(screen.queryByRole('dialog')).toBeNull()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('returns focus to the option when Escape closes the explanation', async () => {
      renderLocked('Why it is locked')
      const tab = screen.getByRole('tab', { name: 'Palabras' })
      tab.focus()
      await userEvent.keyboard('{Enter}')
      await screen.findByText('Why it is locked')

      await userEvent.keyboard('{Escape}')

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(document.activeElement).toBe(tab)
    })

    it('leaves focus on the control the user moved to when it closes', async () => {
      render(
        <>
          <SegmentedControl semantics="tabs" label="Modo" options={lockedOptions('Why it is locked')} value="lines" onChange={vi.fn()} />
          <input aria-label="Other" />
        </>,
      )
      await userEvent.click(screen.getByRole('tab', { name: 'Palabras' }))
      await screen.findByText('Why it is locked')

      await userEvent.click(screen.getByRole('textbox', { name: 'Other' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(screen.getByRole('textbox', { name: 'Other' })).toHaveFocus()
    })

    it('closes when a link inside the detail is clicked', async () => {
      renderLocked(<a href="#words" onClick={(e) => e.preventDefault()}>How it works</a>)
      await userEvent.click(screen.getByRole('tab', { name: 'Palabras' }))

      await userEvent.click(await screen.findByRole('link', { name: 'How it works' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    })
  })
})
