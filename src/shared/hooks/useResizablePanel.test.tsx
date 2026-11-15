// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { PanelResizeHandle } from '@ui/panel-resize-handle';
import { clampWidth, resizedWidth, useResizablePanel } from './useResizablePanel';

const KEY = 'test_panel_width';

function Panel({ edge = 'left' as 'left' | 'right' }) {
  const { width, handleProps } = useResizablePanel({ storageKey: KEY, defaultWidth: 380, min: 280, max: 560, edge });
  return (
    <aside data-testid="panel" style={{ width }} className="relative">
      <PanelResizeHandle label="Resize" {...handleProps} />
    </aside>
  );
}

const widthOf = (el: HTMLElement) => parseInt(el.style.width, 10);

describe('resizedWidth', () => {
  it('narrows a right-hand panel when its left edge moves right', () => {
    expect(resizedWidth(380, 40, 'left', 280, 560)).toBe(340);
    expect(resizedWidth(380, -40, 'left', 280, 560)).toBe(420);
  });

  it('widens a left-hand panel when its right edge moves right', () => {
    expect(resizedWidth(300, 40, 'right', 200, 480)).toBe(340);
  });

  it('stays inside the limits', () => {
    expect(resizedWidth(380, 1000, 'left', 280, 560)).toBe(280);
    expect(resizedWidth(380, -1000, 'left', 280, 560)).toBe(560);
    expect(clampWidth(333.6, 280, 560)).toBe(334);
  });
});

describe('useResizablePanel', () => {
  beforeEach(() => localStorage.clear());

  it('starts at the default width and exposes it on the separator', () => {
    const { getByTestId, getByRole } = render(<Panel />);
    expect(widthOf(getByTestId('panel'))).toBe(380);
    const sep = getByRole('separator');
    expect(sep.getAttribute('aria-valuenow')).toBe('380');
    expect(sep.getAttribute('aria-valuemin')).toBe('280');
    expect(sep.getAttribute('aria-valuemax')).toBe('560');
  });

  it('restores a stored width, clamped to the limits', () => {
    localStorage.setItem(KEY, '9999');
    const { getByTestId } = render(<Panel />);
    expect(widthOf(getByTestId('panel'))).toBe(560);
  });

  it('ignores a stored value that is not a number', () => {
    localStorage.setItem(KEY, 'wide');
    const { getByTestId } = render(<Panel />);
    expect(widthOf(getByTestId('panel'))).toBe(380);
  });

  it('follows a drag and stores the width when it ends', () => {
    const { getByTestId, getByRole } = render(<Panel />);
    fireEvent.pointerDown(getByRole('separator'), { button: 0, clientX: 500 });
    act(() => { window.dispatchEvent(new MouseEvent('pointermove', { clientX: 440 })); });
    expect(widthOf(getByTestId('panel'))).toBe(440);
    expect(localStorage.getItem(KEY)).toBeNull();
    act(() => { window.dispatchEvent(new MouseEvent('pointerup', { clientX: 440 })); });
    expect(localStorage.getItem(KEY)).toBe('440');
    // The drag is over: further movement changes nothing.
    act(() => { window.dispatchEvent(new MouseEvent('pointermove', { clientX: 300 })); });
    expect(widthOf(getByTestId('panel'))).toBe(440);
  });

  it('resizes with the arrow keys, Home and End', () => {
    const { getByTestId, getByRole } = render(<Panel />);
    const sep = getByRole('separator');
    fireEvent.keyDown(sep, { key: 'ArrowLeft' });
    expect(widthOf(getByTestId('panel'))).toBe(396);
    fireEvent.keyDown(sep, { key: 'ArrowRight', shiftKey: true });
    expect(widthOf(getByTestId('panel'))).toBe(332);
    fireEvent.keyDown(sep, { key: 'Home' });
    expect(widthOf(getByTestId('panel'))).toBe(280);
    fireEvent.keyDown(sep, { key: 'End' });
    expect(widthOf(getByTestId('panel'))).toBe(560);
    expect(localStorage.getItem(KEY)).toBe('560');
  });

  it('goes back to the default width on a double click', () => {
    localStorage.setItem(KEY, '500');
    const { getByTestId, getByRole } = render(<Panel />);
    fireEvent.doubleClick(getByRole('separator'));
    expect(widthOf(getByTestId('panel'))).toBe(380);
    expect(localStorage.getItem(KEY)).toBe('380');
  });

  it('moves the other way for a panel docked on the left', () => {
    const { getByTestId, getByRole } = render(<Panel edge="right" />);
    fireEvent.keyDown(getByRole('separator'), { key: 'ArrowRight' });
    expect(widthOf(getByTestId('panel'))).toBe(396);
  });
});
