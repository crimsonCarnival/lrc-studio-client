import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ui/tooltip';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: {} }) }));

import { EditorLineMenuButton } from './EditorLineContextMenu';
import type { EditorLine } from '@/features/editor/editor.types';

const line = { id: 'l1', text: 'Hello there', timestamp: 12.5 } as EditorLine;
const named = (label: string) => new RegExp(label.replace(/\./g, '\\.'));

function open(over: Partial<Parameters<typeof EditorLineMenuButton>[0]> = {}) {
  const props = {
    line, lineIndex: 0, sectionLines: [line],
    handleDeleteLine: vi.fn(), handleToggleCounterpart: vi.fn(), onPlayLine: vi.fn(), onEditLine: vi.fn(),
    handleAssignSinger: vi.fn(), songArtists: ['Ana'],
    ...over,
  };
  render(<TooltipProvider><EditorLineMenuButton {...props} /></TooltipProvider>);
  return userEvent.click(screen.getByRole('button', { name: 'editor.lineOptions' })).then(() => props);
}

describe('EditorLineMenuButton', () => {
  it('offers what right-click offers: play, edit, singers, counterpart', async () => {
    const props = await open();
    expect(await screen.findByRole('menuitem', { name: named('editor.assignSingerToLines') })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: named('editor.markCounterpart') })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: named('editor.words.playFromHere') }));
    expect(props.onPlayLine).toHaveBeenCalled();
  });

  it('honours the collab lock on delete', async () => {
    await open({ deleteDisabled: true });
    // Disabled items are blocked by pointer-events in the browser, which jsdom does not apply.
    expect(await screen.findByRole('menuitem', { name: named('editor.removeLine') })).toHaveAttribute('aria-disabled', 'true');
  });

  it('leaves play out until the line has a time', async () => {
    await open({ line: { ...line, timestamp: null } as EditorLine });
    await screen.findByRole('menuitem', { name: named('editor.editLine') });
    expect(screen.queryByRole('menuitem', { name: named('editor.words.playFromHere') })).not.toBeInTheDocument();
  });
});
