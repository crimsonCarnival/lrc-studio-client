import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectionActionBar from './SelectionActionBar';

// handleApplyOffset takes a direction (+1/-1); the hook multiplies by shiftAllAmount itself.
describe('SelectionActionBar shift all', () => {
  it('passes a direction, not the amount, to handleApplyOffset', async () => {
    const handleApplyOffset = vi.fn();
    render(
      <SelectionActionBar
        selectedLines={new Set([0])}
        settings={{ editor: { showShiftAll: true, shiftAllAmount: 0.5 } }}
        handleBulkClearTimestamps={vi.fn()}
        handleBulkShift={vi.fn()}
        handleBulkDelete={vi.fn()}
        clearSelection={vi.fn()}
        handleApplyOffset={handleApplyOffset}
      />,
    );
    const user = userEvent.setup();
    const byIcon = (name: string) =>
      screen.getAllByRole('button').find((b) => b.querySelector(`[data-icon="${name}"]`)) as HTMLElement;
    const left = byIcon('keyboard_double_arrow_left');
    const right = byIcon('keyboard_double_arrow_right');
    await user.click(left);
    await user.click(right);
    expect(handleApplyOffset).toHaveBeenNthCalledWith(1, -1);
    expect(handleApplyOffset).toHaveBeenNthCalledWith(2, 1);
  });
});
