// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SharedAudioNotice } from './SharedAudioNotice'

const base = { source: null, ownerDuration: null, localDuration: null, onFileChange: () => {} } as const

describe('SharedAudioNotice', () => {
  it('shows when the session has no shared media', () => {
    render(<SharedAudioNotice {...base} />)
    expect(screen.getByText(/load your own copy of the audio/i)).toBeInTheDocument()
  })

  it('stays out of the way when the session carries its own media', () => {
    const { container } = render(<SharedAudioNotice {...base} source="youtube" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('hands the chosen file to the player input path', async () => {
    const onFileChange = vi.fn()
    render(<SharedAudioNotice {...base} onFileChange={onFileChange} />)
    const input = screen.getByLabelText(/choose audio file/i)
    await userEvent.upload(input, new File(['x'], 'song.mp3', { type: 'audio/mpeg' }))
    expect(onFileChange).toHaveBeenCalledTimes(1)
  })

  it('warns with both durations when they differ by more than 1 s', () => {
    render(<SharedAudioNotice {...base} ownerDuration={200} localDuration={201.5} />)
    const warning = screen.getByRole('alert')
    expect(warning).toHaveTextContent('3:20')
    expect(warning).toHaveTextContent('3:21')
  })

  it('does not warn at 1 s or less, or when either duration is unknown', () => {
    const { rerender } = render(<SharedAudioNotice {...base} ownerDuration={200} localDuration={201} />)
    expect(screen.queryByRole('alert')).toBeNull()
    rerender(<SharedAudioNotice {...base} ownerDuration={null} localDuration={201} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
