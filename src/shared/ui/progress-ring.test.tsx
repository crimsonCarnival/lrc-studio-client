// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ProgressRing } from './progress-ring'

const offset = () => Number(document.querySelectorAll('circle')[1].getAttribute('stroke-dashoffset'))
const length = () => Number(document.querySelectorAll('circle')[1].getAttribute('stroke-dasharray'))

describe('ProgressRing', () => {
  it('exposes the percentage as a progressbar value', () => {
    render(<ProgressRing value={62} label="Subida" />)

    const ring = screen.getByRole('progressbar', { name: 'Subida' })
    expect(ring).toHaveAttribute('aria-valuenow', '62')
  })

  it('draws an arc proportional to the value', () => {
    const { rerender } = render(<ProgressRing value={0} label="x" />)
    expect(offset()).toBeCloseTo(length())

    rerender(<ProgressRing value={50} label="x" />)
    expect(offset()).toBeCloseTo(length() / 2)

    rerender(<ProgressRing value={100} label="x" />)
    expect(offset()).toBeCloseTo(0)
  })

  it('clamps out-of-range and non-finite values', () => {
    const { rerender } = render(<ProgressRing value={140} label="x" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')

    rerender(<ProgressRing value={-5} label="x" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')

    rerender(<ProgressRing value={Number.NaN} label="x" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })
})
