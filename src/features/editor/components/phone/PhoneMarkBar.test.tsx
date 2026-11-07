import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneMarkBar from './PhoneMarkBar';
import PhoneSyncTab from './PhoneSyncTab';

function renderBar(overrides: Partial<Parameters<typeof PhoneMarkBar>[0]> = {}) {
  const props = { onMark: vi.fn(), onUndo: vi.fn(), canUndo: true, label: 'Mark line 3', ...overrides };
  render(<PhoneMarkBar {...props} />);
  return { ...props, mark: screen.getByRole('button', { name: 'Mark line 3' }) };
}

describe('PhoneMarkBar', () => {
  it('marks on pointerdown, before the click arrives', () => {
    const { onMark, mark } = renderBar();
    fireEvent.pointerDown(mark, { isPrimary: true, button: 0, pointerType: 'touch' });
    expect(onMark).toHaveBeenCalledTimes(1);
  });

  it('marks once per tap: the click that follows the pointerdown does not mark again', async () => {
    const { onMark, mark } = renderBar();
    await userEvent.setup().click(mark);
    expect(onMark).toHaveBeenCalledTimes(1);
  });

  it('marks once per tap across consecutive taps', async () => {
    const { onMark, mark } = renderBar();
    const user = userEvent.setup();
    await user.click(mark);
    await user.click(mark);
    await user.click(mark);
    expect(onMark).toHaveBeenCalledTimes(3);
  });

  it('ignores a second finger and non-primary buttons', () => {
    const { onMark, mark } = renderBar();
    fireEvent.pointerDown(mark, { isPrimary: false, button: 0, pointerType: 'touch' });
    fireEvent.pointerDown(mark, { isPrimary: true, button: 2, pointerType: 'mouse' });
    expect(onMark).not.toHaveBeenCalled();
  });

  it('still marks from the keyboard, where there is no pointerdown', async () => {
    const { onMark, mark } = renderBar();
    mark.focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(onMark).toHaveBeenCalledTimes(1);
  });

  it('keeps Enter on the button away from window shortcuts, so one press is one mark', async () => {
    const windowKey = vi.fn();
    window.addEventListener('keydown', windowKey);
    const { mark } = renderBar();
    mark.focus();
    await userEvent.setup().keyboard('{Enter}');
    window.removeEventListener('keydown', windowKey);
    expect(windowKey).not.toHaveBeenCalled();
  });

  it('swallows a click with detail 0 that arrives right after the tap, so one tap is one stamp', () => {
    const { onMark, mark } = renderBar();
    fireEvent.pointerDown(mark, { isPrimary: true, button: 0, pointerType: 'touch' });
    fireEvent.click(mark, { detail: 0 });
    expect(onMark).toHaveBeenCalledTimes(1);
  });

  it('marks on an assistive-tech click that comes two seconds after a tap whose click never came', () => {
    vi.useFakeTimers();
    try {
      const { onMark, mark } = renderBar();
      fireEvent.pointerDown(mark, { isPrimary: true, button: 0, pointerType: 'touch' });
      fireEvent.pointerUp(mark, { isPrimary: true, pointerType: 'touch' });
      vi.advanceTimersByTime(2000);
      fireEvent.click(mark, { detail: 0 });
      expect(onMark).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('marks on a keyboard press right after a tap: keydown clears the pending tap', () => {
    const { onMark, mark } = renderBar();
    fireEvent.pointerDown(mark, { isPrimary: true, button: 0, pointerType: 'touch' });
    fireEvent.keyDown(mark, { key: 'Enter' });
    fireEvent.click(mark, { detail: 0 });
    expect(onMark).toHaveBeenCalledTimes(2);
  });

  it('marks on an assistive-tech click after a cancelled pointer', () => {
    const { onMark, mark } = renderBar();
    fireEvent.pointerDown(mark, { isPrimary: true, button: 0, pointerType: 'touch' });
    fireEvent.pointerCancel(mark, { isPrimary: true, pointerType: 'touch' });
    fireEvent.click(mark, { detail: 0 });
    expect(onMark).toHaveBeenCalledTimes(2);
  });

  it('swallows the tap click even when pointerup and pointerleave come first, as on touch', () => {
    const { onMark, mark } = renderBar();
    fireEvent.pointerDown(mark, { isPrimary: true, button: 0, pointerType: 'touch' });
    fireEvent.pointerUp(mark, { isPrimary: true, pointerType: 'touch' });
    fireEvent.pointerLeave(mark, { isPrimary: true, pointerType: 'touch' });
    fireEvent.click(mark, { detail: 1 });
    expect(onMark).toHaveBeenCalledTimes(1);
  });

  it('announces the Mark label politely when it changes', () => {
    const props = { onMark: vi.fn(), onUndo: vi.fn(), canUndo: true };
    const { rerender } = render(<PhoneMarkBar {...props} label="Mark line 1" />);
    rerender(<PhoneMarkBar {...props} label="Mark line 2" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Mark line 2');
  });

  it('does not mark while disabled', async () => {
    const { onMark, mark } = renderBar({ disabled: true });
    fireEvent.pointerDown(mark, { isPrimary: true, button: 0 });
    await userEvent.setup().click(mark);
    expect(onMark).not.toHaveBeenCalled();
  });

  it('opts out of double-tap zoom, text selection and the iOS callout', () => {
    const { mark } = renderBar();
    expect(mark.className).toContain('touch-manipulation');
    expect(mark.className).toContain('select-none');
    expect(mark.className).toContain('[-webkit-touch-callout:none]');
  });

  it('undoes through its own button', async () => {
    const { onUndo, onMark } = renderBar();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onMark).not.toHaveBeenCalled();
  });
});

describe('PhoneSyncTab', () => {
  it('puts the Mark control outside the list, so scrolling the list can never stamp', () => {
    render(
      <PhoneSyncTab
        list={<div data-testid="scroller" className="overflow-y-auto"><p>line</p></div>}
        player={<div />}
        markBar={<PhoneMarkBar onMark={vi.fn()} onUndo={vi.fn()} canUndo label="Mark line 1" />}
      />,
    );
    const mark = screen.getByRole('button', { name: 'Mark line 1' });
    expect(screen.getByTestId('scroller').contains(mark)).toBe(false);
    expect(screen.getByTestId('phone-list-pane').contains(mark)).toBe(false);
  });
});
