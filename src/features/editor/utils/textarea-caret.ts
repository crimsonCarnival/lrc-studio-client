/**
 * Compute the pixel position of a character offset inside a <textarea>.
 *
 * A textarea exposes no API for caret coordinates, so we mirror it: build a
 * hidden <div> that copies the textarea's box and text styling, fill it with the
 * text up to `position`, and measure a marker span. Returned coords are relative
 * to the textarea's own padding box (caller adds the textarea's offset within its
 * positioned ancestor and subtracts scrollTop/Left).
 */
const MIRRORED: (keyof CSSStyleDeclaration)[] = [
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant',
  'letterSpacing', 'lineHeight', 'textTransform', 'textIndent',
  'wordSpacing', 'tabSize',
];

export function getCaretCoords(ta: HTMLTextAreaElement, position: number): { top: number; left: number } {
  const div = document.createElement('div');
  const computed = window.getComputedStyle(ta);
  const s = div.style;
  s.position = 'absolute';
  s.visibility = 'hidden';
  s.whiteSpace = 'pre-wrap';
  s.wordWrap = 'break-word';
  s.overflowWrap = 'break-word';
  // Force border-box + the textarea's full border-box width so the mirror wraps
  // text at the same column the textarea does (mixing content width with the
  // textarea's own box-sizing would wrap differently and skew the line offset).
  s.boxSizing = 'border-box';
  s.width = `${ta.offsetWidth}px`;
  for (const prop of MIRRORED) {
    // CSSStyleDeclaration is indexable by camelCase property names.
    (s as unknown as Record<string, string>)[prop as string] = computed[prop] as string;
  }

  div.textContent = ta.value.slice(0, position);
  const marker = document.createElement('span');
  // Non-empty so it has a layout box; trailing newline needs a glyph to measure.
  marker.textContent = ta.value.slice(position) || '.';
  div.appendChild(marker);

  document.body.appendChild(div);
  const top = marker.offsetTop;
  const left = marker.offsetLeft;
  document.body.removeChild(div);
  return { top, left };
}
