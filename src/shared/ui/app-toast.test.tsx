// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast, type Toast } from 'react-hot-toast'

import { AppToast } from './app-toast'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

function make(overrides: Partial<Toast>): Toast {
  return {
    id: 't1',
    type: 'success',
    message: 'LRC exportado',
    visible: true,
    dismissed: false,
    pauseDuration: 0,
    createdAt: 0,
    duration: 2000,
    ariaProps: { role: 'status', 'aria-live': 'polite' },
    ...overrides,
  } as Toast
}

describe('AppToast', () => {
  it('shows the message with the toast role and a draining timer', () => {
    const { container } = render(<AppToast item={make({})} />)

    expect(screen.getByRole('status')).toHaveTextContent('LRC exportado')
    expect(container.querySelector('.toast-timer')).not.toBeNull()
  })

  it('has no timer while loading or when it never expires', () => {
    const loading = render(<AppToast item={make({ type: 'loading' })} />)
    expect(loading.container.querySelector('.toast-timer')).toBeNull()
    loading.unmount()

    const sticky = render(<AppToast item={make({ type: 'error', duration: Infinity })} />)
    expect(sticky.container.querySelector('.toast-timer')).toBeNull()
  })

  it('dismisses its own toast from the close button', async () => {
    const dismiss = vi.spyOn(toast, 'dismiss').mockImplementation(() => {})
    render(<AppToast item={make({ id: 'abc' })} />)

    await userEvent.click(screen.getByRole('button', { name: 'common.close' }))

    expect(dismiss).toHaveBeenCalledWith('abc')
    dismiss.mockRestore()
  })

  it('renders function messages, as the custom notification toasts use', () => {
    render(<AppToast item={make({ type: 'blank', message: (item) => <span>id {item.id}</span> })} />)

    expect(screen.getByText('id t1')).toBeInTheDocument()
  })
})
