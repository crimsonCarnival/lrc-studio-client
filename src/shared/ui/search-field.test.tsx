// @vitest-environment jsdom
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SearchField } from './search-field'

function Harness(props: { initial?: string; clearLabel?: string; focusShortcut?: boolean }) {
  const [value, setValue] = useState(props.initial ?? '')
  return (
    <>
      <SearchField label="Buscar" value={value} onValueChange={setValue} clearLabel={props.clearLabel} focusShortcut={props.focusShortcut} />
      <textarea aria-label="otro" />
    </>
  )
}

describe('SearchField', () => {
  it('reports typed text through onValueChange', async () => {
    const onValueChange = vi.fn()
    render(<SearchField label="Buscar" value="" onValueChange={onValueChange} />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'a')

    expect(onValueChange).toHaveBeenCalledWith('a')
  })

  it('shows a clear button only while there is text, and clears it', async () => {
    render(<Harness initial="abc" clearLabel="Borrar" />)

    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))

    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Borrar' })).toBeNull()
  })

  it('focuses on "/" outside text fields and types nothing', async () => {
    render(<Harness focusShortcut />)

    await userEvent.keyboard('/')

    expect(screen.getByRole('searchbox')).toHaveFocus()
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('leaves "/" alone while typing in another field', async () => {
    render(<Harness focusShortcut />)
    const other = screen.getByRole('textbox', { name: 'otro' })

    await userEvent.click(other)
    await userEvent.keyboard('/')

    expect(other).toHaveFocus()
    expect(other).toHaveValue('/')
  })
})
