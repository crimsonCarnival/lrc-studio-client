// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EditorLine } from '@/features/editor/editor.types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), i18n: { language: 'en' } }),
}));
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: {} }) }));
// The stage, player bar, timeline and list are not what is under test.
vi.mock('./VideoStage', () => ({ VideoStage: () => null }));
vi.mock('./PlayerBar', () => ({ PlayerBar: () => null }));
vi.mock('./CueTimeline', () => ({ CueTimeline: () => null }));
vi.mock('./CueList', () => ({ CueList: () => null }));
vi.mock('./TranslationBar', () => ({ TranslationBar: () => null }));
vi.mock('@/features/player/components/ChangeMediaDialog', () => ({ ChangeMediaDialog: () => null }));

import SubtitleStudio from './SubtitleStudio';

const line = (text: string, timestamp: number | null, endTime: number | null = null): EditorLine =>
  ({ id: crypto.randomUUID(), text, timestamp, endTime }) as EditorLine;

const renderStudio = (lines: EditorLine[]) =>
  render(<SubtitleStudio lines={lines} setLines={vi.fn()} duration={60} playerRef={{ current: null }} onSave={vi.fn()} />);

describe('SubtitleStudio counters', () => {
  it('counts every caption, timed or not, and how many are timed', () => {
    renderStudio([line('Hello', 1, 2), line('', null), line('Second', null)]);
    expect(screen.getByText('editor.studio.listTitle:{"count":3}')).toBeInTheDocument();
    expect(screen.getByTestId('timed-count')).toHaveTextContent('editor.studio.timedCount:{"timed":1,"count":3}');
  });

  it('counts a freshly added, untimed caption', () => {
    renderStudio([line('', null)]);
    expect(screen.getByText('editor.studio.listTitle:{"count":1}')).toBeInTheDocument();
    expect(screen.getByTestId('timed-count')).toHaveTextContent('"timed":0');
  });

  it('shows no timed counter for an empty project, and skips section markers', () => {
    const { unmount } = renderStudio([]);
    expect(screen.getByText('editor.studio.listTitle:{"count":0}')).toBeInTheDocument();
    expect(screen.queryByTestId('timed-count')).not.toBeInTheDocument();
    unmount();
    renderStudio([{ id: 's', type: 'section', text: 'Intro', timestamp: null } as EditorLine, line('A', 1, 2)]);
    expect(screen.getByText('editor.studio.listTitle:{"count":1}')).toBeInTheDocument();
  });
});
