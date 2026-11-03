import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { WordsFocusLine } from './WordsFocusLine';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

type Props = ComponentProps<typeof WordsFocusLine>;

function renderAt(lines: Props['lines'], lineIndex: number) {
  return render(<WordsFocusLine {...({ lines, lineIndex, settings: {}, selectedLines: new Set() } as unknown as Props)} />);
}

describe('WordsFocusLine', () => {
  it('renders nothing when the cursor is past the end of the lines', () => {
    // Happens when a collaborator deletes lines, or lines load empty, under a saved cursor.
    expect(renderAt([], 5).container.firstChild).toBeNull();
    expect(renderAt([{ id: 'a', text: 'one' }], 7).container.firstChild).toBeNull();
  });
});
