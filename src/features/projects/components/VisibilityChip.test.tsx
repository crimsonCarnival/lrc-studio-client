import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import { VisibilityChip } from './VisibilityChip';

describe('VisibilityChip', () => {
  it('shows the current state and opens the publish flow on press', () => {
    const onOpen = vi.fn();
    render(<VisibilityChip isPublic={false} onOpen={onOpen} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveTextContent('project.visibilityChipPrivate');
    expect(chip).toHaveAttribute('data-visibility', 'private');
    fireEvent.click(chip);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows Public when public', () => {
    render(<VisibilityChip isPublic onOpen={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('project.visibilityChipPublic');
  });
});
