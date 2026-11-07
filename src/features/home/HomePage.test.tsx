import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const env = vi.hoisted(() => ({ narrow: true }));
const api = vi.hoisted(() => ({ list: vi.fn(), remove: vi.fn(), patch: vi.fn() }));
const nav = vi.hoisted(() => ({ navigate: vi.fn() }));

const tr = (k: string, o?: { count?: number }) => (o?.count !== undefined ? `${k}:${o.count}` : k);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tr, i18n: { language: 'en' } }),
}));
vi.mock('@/shared/hooks/useDynamicTranslation', () => ({
  default: () => ({ t: tr, dt: (k: string) => k, i18n: { language: 'en' } }),
}));
vi.mock('@/shared/hooks/useBreakpoint', () => ({ useIsNarrow: () => env.narrow }));
vi.mock('@/features/auth/useAuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'u1', accountName: 'ana', displayName: 'Ana', permissions: [] } }),
}));
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: { advanced: { confirmDestructive: true } } }) }));
vi.mock('@/app/api', () => ({ projects: api }));
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => nav.navigate }));
// Neighbours that fetch their own data are covered elsewhere.
vi.mock('./components/ActivityBand', () => ({
  ActivityBand: ({ compact }: { compact?: boolean }) => <div data-testid="activity" data-compact={String(!!compact)} />,
}));
vi.mock('./components/FollowingBand', () => ({ FollowingBand: () => null }));
vi.mock('@features/editor/components/setup/ProjectSetupModal', () => ({ default: () => null }));
// A native <select> keeps the sort test off Radix's pointer-capture paths.
vi.mock('@ui/select-field', () => ({
  SelectField: ({ value, onValueChange, options, 'aria-label': label }: {
    value: string; onValueChange: (v: string) => void; options: { value: string; label: string }[]; 'aria-label': string;
  }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}));
vi.mock('@/shared/hooks/useHapticFeedback', () => ({ default: () => ({ trigger: vi.fn() }) }));

import HomePage from './HomePage';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const PROJECTS = [
  { publicId: 'p1', title: 'Beta Song', lineCount: 10, syncedLineCount: 4, metadata: { songArtist: 'Zed' }, createdAt: hoursAgo(50), contentUpdatedAt: hoursAgo(1), upload: { source: 'youtube' } },
  { publicId: 'p2', title: 'Alpha Song', lineCount: 10, syncedLineCount: 10, metadata: { songArtist: 'Yan' }, createdAt: hoursAgo(10), contentUpdatedAt: hoursAgo(5), public: true },
  { publicId: 'p3', title: 'Gamma Song', lineCount: 10, syncedLineCount: 0, metadata: { songArtist: 'Xu', tags: ['indie'] }, createdAt: hoursAgo(90), contentUpdatedAt: hoursAgo(80) },
];

async function renderHome() {
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  await screen.findAllByText('Alpha Song');
}

const rowFor = (title: string) => screen.getAllByText(title).map((el) => el.closest('li')).find(Boolean)!;
const rowTitles = () => screen.getAllByRole('listitem').map((li) => li.querySelector('span.truncate')?.textContent);

describe('HomePage', () => {
  beforeEach(() => {
    env.narrow = true;
    nav.navigate.mockReset();
    api.list.mockReset().mockResolvedValue(PROJECTS);
    api.remove.mockReset().mockResolvedValue(undefined);
  });

  describe('phone layout', () => {
    it('renders compact rows with title, artist, progress and a menu button', async () => {
      await renderHome();
      const row = rowFor('Beta Song');
      expect(within(row).getByText(/Zed/)).toBeInTheDocument();
      expect(within(row).getByText('40%')).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: 'common.moreActions' })).toBeInTheDocument();
      // Rows, not cards: the card is a role=button labelled with the title.
      expect(screen.queryByRole('button', { name: 'Beta Song' })).toBeNull();
    });

    it('shows a check, not a percentage, for a completed project', async () => {
      await renderHome();
      const row = rowFor('Alpha Song');
      expect(within(row).getByRole('img', { name: 'home.statusComplete' })).toBeInTheDocument();
      expect(within(row).queryByText('100%')).toBeNull();
    });

    it('opens the editor from the row body', async () => {
      await renderHome();
      await userEvent.click(within(rowFor('Beta Song')).getByText('Beta Song'));
      expect(nav.navigate).toHaveBeenCalledWith(expect.stringContaining('/ana/'));
    });

    it('offers edit and delete in the row menu, and deletes after confirming', async () => {
      await renderHome();
      await userEvent.click(within(rowFor('Gamma Song')).getByRole('button', { name: 'common.moreActions' }));
      expect(await screen.findByRole('menuitem', { name: 'profile.editProject' })).toBeInTheDocument();
      await userEvent.click(screen.getByRole('menuitem', { name: 'profile.deleteProject' }));
      const dialog = await screen.findByRole('alertdialog');
      const buttons = within(dialog).getAllByRole('button');
      await userEvent.click(buttons[buttons.length - 1]);
      expect(api.remove).toHaveBeenCalledWith('p3');
    });

    it('filter chips filter the rows and their counts match', async () => {
      await renderHome();
      const group = screen.getByRole('group', { name: 'home.yourProjects' });
      const chip = (label: string) => within(group).getByRole('button', { name: new RegExp(label) });
      expect(chip('home.all')).toHaveTextContent('3');
      expect(chip('home.inProgress')).toHaveTextContent('1');
      expect(chip('home.completed')).toHaveTextContent('1');
      expect(chip('home.notStarted')).toHaveTextContent('1');

      await userEvent.click(chip('home.inProgress'));
      expect(chip('home.inProgress')).toHaveAttribute('aria-pressed', 'true');
      expect(rowTitles()).toEqual(['Beta Song']);
      await userEvent.click(chip('home.completed'));
      expect(rowTitles()).toEqual(['Alpha Song']);
    });

    it('hides the Not started chip when it has no projects, and shows it otherwise', async () => {
      api.list.mockResolvedValue(PROJECTS.filter((p) => p.publicId !== 'p3'));
      await renderHome();
      const group = screen.getByRole('group', { name: 'home.yourProjects' });
      expect(within(group).queryByRole('button', { name: /home\.notStarted/ })).toBeNull();
      expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['home.all2', 'home.inProgress1', 'home.completed1']);
    });

    it('shows the Not started chip when a project is not started', async () => {
      await renderHome();
      const group = screen.getByRole('group', { name: 'home.yourProjects' });
      expect(within(group).getByRole('button', { name: /home\.notStarted/ })).toHaveTextContent('1');
    });

    it('sorts by edit time, title and creation time', async () => {
      await renderHome();
      expect(rowTitles()).toEqual(['Beta Song', 'Alpha Song', 'Gamma Song']);
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'home.sortBy' }), 'title');
      expect(rowTitles()).toEqual(['Alpha Song', 'Beta Song', 'Gamma Song']);
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'home.sortBy' }), 'created');
      // Created newest first: Alpha (10h), Beta (50h), Gamma (90h).
      expect(rowTitles()).toEqual(['Alpha Song', 'Beta Song', 'Gamma Song']);
    });

    it('search narrows the rows (title or tag) and the chip counts follow it', async () => {
      await renderHome();
      await userEvent.type(screen.getByRole('searchbox', { name: 'home.search' }), 'indie');
      expect(rowTitles()).toEqual(['Gamma Song']);
      const group = screen.getByRole('group', { name: 'home.yourProjects' });
      expect(within(group).getByRole('button', { name: /home\.all/ })).toHaveTextContent('1');
      expect(within(group).getByRole('button', { name: /home\.completed/ })).toHaveTextContent('0');
    });

    it('does not render the "Start another" card, and keeps one New project button', async () => {
      await renderHome();
      expect(screen.queryByText('home.startAnother')).toBeNull();
      expect(screen.getAllByRole('link', { name: 'home.createNew' })).toHaveLength(1);
    });

    it('renders the resume row and a compact activity band', async () => {
      await renderHome();
      expect(screen.getByRole('button', { name: /home\.resume: Beta Song/ })).toBeInTheDocument();
      expect(screen.getByTestId('activity')).toHaveAttribute('data-compact', 'true');
    });
  });

  describe('desktop layout', () => {
    beforeEach(() => { env.narrow = false; });

    it('keeps the project cards and the "Start another" card', async () => {
      await renderHome();
      expect(screen.getByRole('button', { name: 'Beta Song' })).toBeInTheDocument();
      expect(screen.getByText('home.startAnother')).toBeInTheDocument();
      expect(screen.getByTestId('activity')).toHaveAttribute('data-compact', 'false');
    });
  });
});
