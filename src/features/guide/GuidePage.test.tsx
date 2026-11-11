import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import GuidePage from './GuidePage';
import { GUIDE_SECTION_IDS } from './guide-sections';
import { lastEditorPath, requestTourReplay } from '@/features/editor/tour/tour-launch';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('@/features/editor/tour/tour-launch', () => ({
  lastEditorPath: vi.fn(() => null),
  requestTourReplay: vi.fn(),
}));

const renderGuide = () => render(<MemoryRouter><GuidePage /></MemoryRouter>);

beforeEach(async () => {
  await i18n.changeLanguage('en');
  navigate.mockClear();
  vi.mocked(requestTourReplay).mockClear();
  vi.mocked(lastEditorPath).mockReturnValue(null);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe('GuidePage', () => {
  it('renders both group headings and one nav pill per section', () => {
    renderGuide();
    expect(screen.getByRole('heading', { name: 'Basics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Features' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation');
    const hrefs = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(GUIDE_SECTION_IDS.map((id) => `#${id}`));
  });

  it('has an anchor element for every section and the legacy #import alias', async () => {
    const { container } = renderGuide();
    for (const id of GUIDE_SECTION_IDS) expect(container.querySelector(`section#${id}`)).not.toBeNull();
    expect(container.querySelector('#import')).not.toBeNull();
    expect(await screen.findByText(/Paste or import your lyrics/)).toBeInTheDocument();
  });

  it('hides the replay button when no editor path is remembered', () => {
    renderGuide();
    expect(screen.queryByRole('button', { name: /Replay editor tour/ })).toBeNull();
  });

  it('replays the tour and navigates to the remembered editor path', () => {
    vi.mocked(lastEditorPath).mockReturnValue('/project/abc123');
    renderGuide();
    fireEvent.click(screen.getByRole('button', { name: /Replay editor tour/ }));
    expect(requestTourReplay).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/project/abc123');
  });
});
