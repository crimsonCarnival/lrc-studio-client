// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import '@/app/i18n';
import { SingerLabelsReview } from './SingerLabelsReview';
import type { EditorLine } from '@/features/editor/editor.types';

const OPENED: EditorLine[] = [
  { id: 'a', text: 'Hello darkness' },
  { id: 'b', text: 'My old friend', singers: ['Ann'] },
];

beforeEach(async () => { await i18n.changeLanguage('en'); });

const setup = (labels: { lineIndex: number; singers: string[] }[]) => {
  const onApply = vi.fn();
  const onOpenChange = vi.fn();
  render(<SingerLabelsReview open onOpenChange={onOpenChange} labels={labels} opened={OPENED} onApply={onApply} />);
  return { onApply, onOpenChange };
};

describe('SingerLabelsReview', () => {
  it('lists proposals and calls onApply only on Apply', () => {
    const labels = [{ lineIndex: 0, singers: ['Ann', 'Bob'] }, { lineIndex: 1, singers: ['Bob'] }];
    const { onApply, onOpenChange } = setup(labels);
    expect(screen.getByText('Hello darkness')).toBeTruthy();
    expect(screen.getByText('Ann, Bob')).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(labels, OPENED);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Cancel does not apply', () => {
    const { onApply, onOpenChange } = setup([{ lineIndex: 0, singers: ['Ann'] }]);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onApply).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows the no-changes message', () => {
    setup([{ lineIndex: 1, singers: ['Ann'] }]);
    expect(screen.getByText('No singer changes to suggest')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
  });
});
