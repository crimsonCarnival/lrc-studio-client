// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { fileReport } = vi.hoisted(() => ({ fileReport: vi.fn() }));
vi.mock('./reports.service', async importOriginal => ({ ...(await importOriginal<object>()), fileReport }));

import { ReportForm } from './ReportDialog';

describe('ReportForm', () => {
  beforeEach(() => {
    fileReport.mockReset().mockResolvedValue(undefined);
  });

  it('offers the reasons that fit the target type', () => {
    const { unmount } = render(<ReportForm targetType="project" targetId="p1" onSent={() => {}} />);
    expect(screen.getByText('Copyright infringement')).toBeInTheDocument();
    expect(screen.queryByText('Harassment or bullying')).not.toBeInTheDocument();
    unmount();
    render(<ReportForm targetType="user" targetId="u1" blockName="ann" onSent={() => {}} />);
    expect(screen.getByText('Pretending to be someone else')).toBeInTheDocument();
    expect(screen.queryByText('Copyright infringement')).not.toBeInTheDocument();
  });

  it('sends the reason and the trimmed note', async () => {
    const onSent = vi.fn();
    render(<ReportForm targetType="wall_comment" targetId="c1" onSent={onSent} />);
    fireEvent.click(screen.getByText('Spam'));
    fireEvent.change(screen.getByLabelText('Anything the moderators should know? (optional)'), { target: { value: '  bots  ' } });
    // No block option for a comment.
    expect(screen.queryByText(/Also block/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Send report'));
    await waitFor(() => expect(onSent).toHaveBeenCalledWith(false));
    expect(fileReport).toHaveBeenCalledWith({ targetType: 'wall_comment', targetId: 'c1', reason: 'spam', note: 'bots', alsoBlock: false });
  });

  it('can block the reported account in the same step', async () => {
    const onSent = vi.fn();
    render(<ReportForm targetType="user" targetId="u1" blockName="ann" onSent={onSent} />);
    fireEvent.click(screen.getByText('Pretending to be someone else'));
    fireEvent.click(screen.getByLabelText(/Also block @ann/));
    fireEvent.click(screen.getByText('Send report'));
    await waitFor(() => expect(onSent).toHaveBeenCalledWith(true));
    expect(fileReport).toHaveBeenCalledWith(expect.objectContaining({ targetType: 'user', reason: 'impersonation', alsoBlock: true }));
  });

  it('keeps the form open when the report fails', async () => {
    fileReport.mockRejectedValue({ graphqlErrors: [{ extensions: { code: 'RATE_LIMITED' } }] });
    const onSent = vi.fn();
    render(<ReportForm targetType="playlist" targetId="l1" onSent={onSent} />);
    fireEvent.click(screen.getByText('Spam'));
    fireEvent.click(screen.getByText('Send report'));
    await waitFor(() => expect(fileReport).toHaveBeenCalled());
    expect(onSent).not.toHaveBeenCalled();
    expect(screen.getByText('Send report')).toBeInTheDocument();
  });
});
