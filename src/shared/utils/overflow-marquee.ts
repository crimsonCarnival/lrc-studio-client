/**
 * App-wide: text cut off with an ellipsis scrolls to show the rest while it is hovered,
 * touched or focused, then returns.
 *
 * One delegated listener instead of a component, so every existing `truncate` (and
 * anything else with `text-overflow: ellipsis`) gets it without being rewritten. The
 * motion is a `text-indent` animation (see `[data-marquee]` in index.css): it moves the
 * text inside the element's own clip, so layout never changes. Only elements that really
 * overflow are touched, and nothing runs for people who asked for reduced motion.
 */

// Ancestors checked above the hovered element: enough to reach the truncating box from
// an icon or a highlighted word inside it, without walking the whole tree on every move.
const MAX_DEPTH = 4;
// Scroll speed, and the pause at each end (part of the keyframes).
const PX_PER_SECOND = 45;
const MIN_DURATION_S = 2.5;

function truncatingAncestor(start: EventTarget | null): HTMLElement | null {
  let el = start instanceof HTMLElement ? start : null;
  for (let i = 0; el && i <= MAX_DEPTH; i++, el = el.parentElement) {
    if (el.dataset.marquee !== undefined) return el;
    // Overflow first: it is cheap, and most elements fail it.
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow === 'ellipsis') return el;
  }
  return null;
}

// Inline min-width an element had before the marquee pinned it, restored on stop.
const savedMinWidth = new WeakMap<HTMLElement, string>();

function start(el: HTMLElement): void {
  if (el.dataset.marquee !== undefined) return;
  const distance = el.scrollWidth - el.clientWidth;
  if (distance <= 1) return;
  // The keyframes spend 70% of each pass moving; the rest is the pause at either end.
  const duration = Math.max(MIN_DURATION_S, distance / PX_PER_SECOND / 0.7);
  // A negative text-indent shrinks the element's max-content width, so a box sized to
  // its content (flex item, inline-block, grid `auto` track) narrows as the text scrolls:
  // the text jitters, neighbours shift, and the pointer can slip off and restart it.
  // Pinning the current width for the pass keeps the box still.
  savedMinWidth.set(el, el.style.minWidth);
  el.style.minWidth = `${el.offsetWidth}px`;
  el.style.setProperty('--marquee-distance', `${distance}px`);
  el.style.setProperty('--marquee-duration', `${duration}s`);
  el.dataset.marquee = '';
}

function stop(el: HTMLElement): void {
  delete el.dataset.marquee;
  el.style.removeProperty('--marquee-distance');
  el.style.removeProperty('--marquee-duration');
  el.style.minWidth = savedMinWidth.get(el) ?? '';
  savedMinWidth.delete(el);
}

/** Installs the behaviour on the document; returns the uninstaller. */
export function installOverflowMarquee(doc: Document = document): () => void {
  const view = doc.defaultView;
  if (view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {};

  let active: HTMLElement | null = null;
  let touchTimer: ReturnType<typeof setTimeout> | null = null;
  const clearTouchTimer = () => {
    if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
  };
  const activate = (target: EventTarget | null) => {
    const el = truncatingAncestor(target);
    if (el === active) return;
    clearTouchTimer();
    if (active) stop(active);
    active = el;
    if (el) start(el);
  };
  const deactivate = (from: EventTarget | null, to: EventTarget | null) => {
    if (!active || !(from instanceof Node) || !active.contains(from)) return;
    if (to instanceof Node && active.contains(to)) return; // still inside it
    clearTouchTimer();
    stop(active);
    active = null;
  };

  // A touch "leaves" the moment the finger lifts, so tying the scroll to it would mean
  // holding the finger down, which opens the long-press menu. A tap instead plays one
  // full pass (out and back), ended early by tapping something else.
  const onOver = (e: PointerEvent) => {
    activate(e.target);
    if (e.pointerType !== 'touch' || !active) return;
    const el = active;
    const seconds = parseFloat(el.style.getPropertyValue('--marquee-duration')) || 0;
    touchTimer = setTimeout(() => {
      touchTimer = null;
      if (active !== el) return;
      stop(el);
      active = null;
    }, seconds * 2 * 1000);
  };
  const onOut = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') deactivate(e.target, e.relatedTarget);
  };
  // Tapping an empty spot (nothing clipped under it) ends a touch-started pass.
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch' && active && !(e.target instanceof Node && active.contains(e.target))) {
      clearTouchTimer();
      stop(active);
      active = null;
    }
  };
  const onFocusIn = (e: FocusEvent) => activate(e.target);
  const onFocusOut = (e: FocusEvent) => deactivate(e.target, e.relatedTarget);

  doc.addEventListener('pointerover', onOver, { passive: true });
  doc.addEventListener('pointerout', onOut, { passive: true });
  doc.addEventListener('pointerdown', onDown, { passive: true });
  doc.addEventListener('focusin', onFocusIn);
  doc.addEventListener('focusout', onFocusOut);
  return () => {
    clearTouchTimer();
    doc.removeEventListener('pointerover', onOver);
    doc.removeEventListener('pointerout', onOut);
    doc.removeEventListener('pointerdown', onDown);
    doc.removeEventListener('focusin', onFocusIn);
    doc.removeEventListener('focusout', onFocusOut);
    if (active) stop(active);
  };
}
