import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import PlayerDemo from './PlayerDemo';

beforeEach(async () => { await i18n.changeLanguage('en'); });

describe('PlayerDemo', () => {
  it('nudges the stamped line by a tenth of a second each way', () => {
    render(<PlayerDemo />);
    expect(screen.getByText('00:06.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /0\.1 seconds later/ }));
    expect(screen.getByText('00:06.10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /0\.1 seconds earlier/ }));
    fireEvent.click(screen.getByRole('button', { name: /0\.1 seconds earlier/ }));
    expect(screen.getByText('00:05.90')).toBeInTheDocument();
  });
});
