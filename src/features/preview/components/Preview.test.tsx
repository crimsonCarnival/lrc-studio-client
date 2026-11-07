import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@ui/tooltip';
import { DEFAULT_SETTINGS } from '@/features/settings/settings-defaults';
import Preview from './Preview';

vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({ settings: DEFAULT_SETTINGS, updateSetting: vi.fn(), updateSettings: vi.fn() }),
}));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: { id: 'u1' } }) }));
// The playback bar and the viewport read the player and measure layout; this test is about
// which controls the preview offers, not how it draws.
vi.mock('@/features/project-view/PublicPlaybackBar', () => ({ default: () => null }));
vi.mock('./PreviewViewport', () => ({ default: () => <div data-testid="preview-viewport" /> }));

const SLOTS = ['status', 'center', 'actions'] as const;

beforeEach(() => {
  for (const slot of SLOTS) {
    const el = document.createElement('div');
    el.id = `workspace-header-${slot}`;
    document.body.appendChild(el);
  }
});
afterEach(() => {
  for (const slot of SLOTS) document.getElementById(`workspace-header-${slot}`)?.remove();
});

const base = {
  lines: [{ id: 'a', text: 'Line one', timestamp: 1 }, { id: 'b', text: 'Line two', timestamp: 2 }],
  playbackPosition: 0,
  editorMode: 'lrc',
  exportToUrl: vi.fn(),
  setShareModal: vi.fn(),
  activepublicId: 'abc123',
  hasMedia: true,
  playerSlot: 'phone' as const,
};

function renderPreview(extra: Record<string, unknown> = {}) {
  return render(<TooltipProvider><Preview {...base} {...extra} /></TooltipProvider>);
}

describe('Preview as the phone Preview tab', () => {
  it('is the existing preview: viewport, header actions and the path back to the editor', () => {
    renderPreview({ onShowEditor: vi.fn() });
    expect(screen.getByTestId('preview-viewport')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to editor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
  });

  it('a session viewer gets neither Publish, nor a way into the editor, nor Share', () => {
    renderPreview({ viewerMode: true, sessionMode: true });
    expect(screen.queryByRole('button', { name: /publish/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Back to editor' })).toBeNull();
    expect(screen.getByText(/view only/i)).toBeInTheDocument();
  });
});
