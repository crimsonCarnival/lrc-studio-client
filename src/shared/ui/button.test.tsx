// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Button } from './button'

describe('Button loading', () => {
  it('swallows clicks, stays focusable and announces busy', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Exportando
      </Button>,
    )
    const btn = screen.getByRole('button', { name: 'Exportando' })

    await userEvent.click(btn)
    btn.focus()

    expect(onClick).not.toHaveBeenCalled()
    expect(btn).toHaveFocus()
    expect(btn).not.toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
    expect(btn).toHaveAttribute('aria-disabled', 'true')
    expect(btn.querySelectorAll('.eq-bars > i')).toHaveLength(3)
  })

  it('behaves normally when not loading', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Exportar</Button>)
    const btn = screen.getByRole('button', { name: 'Exportar' })

    await userEvent.click(btn)

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(btn).not.toHaveAttribute('aria-busy')
    expect(btn).not.toHaveAttribute('aria-disabled')
    expect(btn.querySelector('.eq-bars')).toBeNull()
  })

  it('does not inject bars under asChild (Slot needs a single child)', () => {
    render(
      <Button asChild loading>
        <a href="/x">Ir</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Ir' })

    expect(link.querySelector('.eq-bars')).toBeNull()
    expect(link).toHaveAttribute('aria-busy', 'true')
  })
})
