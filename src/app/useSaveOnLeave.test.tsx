import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSaveOnLeave } from './useSaveOnLeave';

let nav: ReturnType<typeof useNavigate>;
let rerender: () => void;

/** `inline` passes a fresh function every render, like useAppState does. */
function Harness({ flush, inline }: { flush: (p: string) => void; inline?: boolean }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => { nav = navigate; });
  useSaveOnLeave(pathname, inline ? (p) => flush(p) : flush);
  return null;
}

function mount(path: string, flush: (p: string) => void, inline = false) {
  const view = render(<MemoryRouter initialEntries={[path]}><Harness flush={flush} inline={inline} /></MemoryRouter>);
  rerender = () => view.rerender(<MemoryRouter initialEntries={[path]}><Harness flush={flush} inline={inline} /></MemoryRouter>);
  return view;
}

const EDIT = '/someone/projects/song-abcdefghij/edit';
const setVisibility = (state: 'hidden' | 'visible') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
};

afterEach(() => { cleanup(); setVisibility('visible'); });

describe('useSaveOnLeave: leaving the editor', () => {
  it('flushes once, with the page left, when navigating from an editor path to a non-editor path', () => {
    const flush = vi.fn();
    mount(EDIT, flush);
    act(() => nav('/explore'));
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith(EDIT);
  });

  it.each(['/project/local', '/project/new'])('flushes when leaving %s', (path) => {
    const flush = vi.fn();
    mount(path, flush);
    act(() => nav('/'));
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith(path);
  });

  it('flushes on history Back out of the editor', () => {
    const flush = vi.fn();
    mount('/', flush);
    act(() => nav('/project/local'));
    act(() => nav(-1));
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('does not flush between editor paths (setup to the local draft)', () => {
    const flush = vi.fn();
    mount('/project/new', flush);
    act(() => nav('/project/local'));
    expect(flush).not.toHaveBeenCalled();
  });

  it('does not flush leaving a live session or a page that holds no edits', () => {
    const flush = vi.fn();
    mount('/session/abc123', flush);
    act(() => nav('/explore'));
    act(() => nav('/home'));
    expect(flush).not.toHaveBeenCalled();
  });

  it('does not re-run on re-renders, even with a new inline function each time', () => {
    const flush = vi.fn();
    mount(EDIT, flush, true);
    for (let i = 0; i < 5; i++) act(() => rerender());
    expect(flush).not.toHaveBeenCalled();
    act(() => nav('/explore'));
    for (let i = 0; i < 5; i++) act(() => rerender());
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when only the query string changes on the editor route', () => {
    const flush = vi.fn();
    mount(EDIT, flush);
    act(() => nav(`${EDIT}?t=12`));
    expect(flush).not.toHaveBeenCalled();
  });

  it('calls the latest function, not the one from the first render', () => {
    const first = vi.fn();
    const second = vi.fn();
    const view = render(<MemoryRouter initialEntries={[EDIT]}><Harness flush={first} /></MemoryRouter>);
    view.rerender(<MemoryRouter initialEntries={[EDIT]}><Harness flush={second} /></MemoryRouter>);
    act(() => nav('/explore'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('useSaveOnLeave: page hide', () => {
  it('flushes on visibilitychange to hidden and on pagehide while on an editor route', () => {
    const flush = vi.fn();
    mount(EDIT, flush);
    act(() => setVisibility('hidden'));
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith(EDIT);
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it('ignores becoming visible, and hiding on a page with no edits', () => {
    const flush = vi.fn();
    mount('/explore', flush);
    act(() => setVisibility('hidden'));
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    act(() => setVisibility('visible'));
    expect(flush).not.toHaveBeenCalled();
  });

  it('uses the current route after navigating, and removes its listeners on unmount', () => {
    const flush = vi.fn();
    const view = mount('/explore', flush);
    act(() => nav(EDIT));
    act(() => setVisibility('hidden'));
    expect(flush).toHaveBeenCalledWith(EDIT);
    flush.mockClear();
    view.unmount();
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(flush).not.toHaveBeenCalled();
  });
});

