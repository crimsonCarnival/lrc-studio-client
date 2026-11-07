import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { TooltipProvider } from '@ui/tooltip';
import ActionDrawer, { DrawerItem } from './ActionDrawer';

function Host({ onItem = vi.fn() }: { onItem?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipProvider>
      <button onClick={() => setOpen(true)}>opener</button>
      <ActionDrawer isOpen={open} onClose={() => setOpen(false)} title="Sheet">
        <DrawerItem label="First" onClick={onItem} />
        <DrawerItem label="Second" disabled description="why" />
      </ActionDrawer>
    </TooltipProvider>
  );
}

describe('ActionDrawer', () => {
  it('is a labelled modal dialog that takes focus and gives it back on close', async () => {
    render(<Host />);
    const opener = screen.getByText('opener');
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Sheet' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(opener).toHaveFocus();
  });

  it('closes on Escape and returns focus to the opener', async () => {
    render(<Host />);
    const opener = screen.getByText('opener');
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(opener).toHaveFocus();
  });

  it('keeps Tab inside the dialog', () => {
    render(<Host />);
    fireEvent.click(screen.getByText('opener'));
    const dialog = screen.getByRole('dialog');
    const close = screen.getByRole('button', { name: /close/i });
    const last = screen.getByRole('button', { name: /second/i });
    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('a disabled item announces itself and does not fire', () => {
    const onItem = vi.fn();
    render(<Host onItem={onItem} />);
    fireEvent.click(screen.getByText('opener'));
    const second = screen.getByRole('button', { name: /second/i });
    expect(second).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(second);
    fireEvent.click(screen.getByRole('button', { name: 'First' }));
    expect(onItem).toHaveBeenCalledTimes(1);
  });

  it('focuses the panel, not a text field, so the keyboard stays down', () => {
    render(
      <TooltipProvider>
        <ActionDrawer isOpen onClose={() => {}} title="Form">
          <input aria-label="Name" />
          <DrawerItem label="Go" />
        </ActionDrawer>
      </TooltipProvider>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveFocus();
    expect(screen.getByLabelText('Name')).not.toHaveFocus();
    // The trap still works from the panel.
    const close = screen.getByRole('button', { name: /close/i });
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Go' })).toHaveFocus();
    expect(close).not.toHaveFocus();
  });

  describe('backdrop guard', () => {
    function Guarded({ onClose }: { onClose: () => void }) {
      return (
        <TooltipProvider>
          <ActionDrawer isOpen onClose={onClose} title="Sheet" backdropGuardMs={300}>
            <DrawerItem label="First" />
          </ActionDrawer>
        </TooltipProvider>
      );
    }
    const backdrop = () => document.body.querySelector<HTMLElement>('.fixed.inset-0')!;

    it('ignores a backdrop click right after opening, accepts it later', () => {
      vi.useFakeTimers();
      try {
        const onClose = vi.fn();
        render(<Guarded onClose={onClose} />);
        fireEvent.click(backdrop());
        expect(onClose).not.toHaveBeenCalled();
        act(() => { vi.advanceTimersByTime(350); });
        fireEvent.click(backdrop());
        expect(onClose).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
