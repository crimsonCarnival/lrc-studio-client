// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { installOverflowMarquee } from './overflow-marquee';

/** jsdom has no layout, so the sizes the behaviour reads are stubbed. */
function box(scrollWidth: number, clientWidth: number, ellipsis = true): HTMLElement {
  const el = document.createElement('span');
  el.textContent = 'A rather long project title that does not fit';
  if (ellipsis) el.style.textOverflow = 'ellipsis';
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth });
  Object.defineProperty(el, 'clientWidth', { value: clientWidth });
  document.body.appendChild(el);
  return el;
}

const over = (el: Element) => el.dispatchEvent(new Event('pointerover', { bubbles: true }));
const out = (el: Element, to: Element | null = null) =>
  el.dispatchEvent(Object.assign(new Event('pointerout', { bubbles: true }), { relatedTarget: to }));

let uninstall = () => {};
afterEach(() => { uninstall(); document.body.innerHTML = ''; });

describe('installOverflowMarquee', () => {
  it('scrolls clipped text while hovered, by exactly the hidden width, and stops on leave', () => {
    uninstall = installOverflowMarquee();
    const el = box(300, 120);
    over(el);
    expect(el.dataset.marquee).toBe('');
    expect(el.style.getPropertyValue('--marquee-distance')).toBe('180px');
    out(el, document.body);
    expect(el.dataset.marquee).toBeUndefined();
    expect(el.style.getPropertyValue('--marquee-distance')).toBe('');
  });

  it('finds the clipped box from a child inside it', () => {
    uninstall = installOverflowMarquee();
    const el = box(300, 120);
    const icon = document.createElement('i');
    el.prepend(icon);
    over(icon);
    expect(el.dataset.marquee).toBe('');
  });

  it('on touch, a tap plays one pass out and back without the finger staying down', () => {
    vi.useFakeTimers();
    try {
      uninstall = installOverflowMarquee();
      const el = box(300, 120);
      const touch = (type: string, target: Element, relatedTarget: Element | null = null) =>
        target.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), { pointerType: 'touch', relatedTarget }));

      touch('pointerover', el);
      touch('pointerout', el, document.body); // the finger lifted
      expect(el.dataset.marquee).toBe('');

      const seconds = parseFloat(el.style.getPropertyValue('--marquee-duration'));
      vi.advanceTimersByTime(seconds * 2 * 1000);
      expect(el.dataset.marquee).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('on touch, tapping elsewhere ends the pass early', () => {
    uninstall = installOverflowMarquee();
    const el = box(300, 120);
    el.dispatchEvent(Object.assign(new Event('pointerover', { bubbles: true }), { pointerType: 'touch' }));
    document.body.dispatchEvent(Object.assign(new Event('pointerdown', { bubbles: true }), { pointerType: 'touch' }));
    expect(el.dataset.marquee).toBeUndefined();
  });

  it('leaves text alone that fits, or that is not ellipsis-clipped', () => {
    uninstall = installOverflowMarquee();
    const fits = box(100, 120);
    const plain = box(300, 120, false);
    over(fits);
    over(plain);
    expect(fits.dataset.marquee).toBeUndefined();
    expect(plain.dataset.marquee).toBeUndefined();
  });
});
