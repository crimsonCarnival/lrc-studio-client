import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminSubNav } from './AdminSubNav';

describe('AdminSubNav', () => {
  it('wraps instead of scrolling and keeps 44px targets', () => {
    render(
      <MemoryRouter>
        <AdminSubNav tab="audit" current="log" items={[{ id: 'log', label: 'Log' }, { id: 'tasks', label: 'Tasks' }]} />
      </MemoryRouter>,
    );
    const list = screen.getByRole('tablist');
    expect(list.className).toContain('flex-wrap');
    expect(list.className).toContain('lg:flex-nowrap');
    expect(list.className).toContain('lg:overflow-x-auto');
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    for (const t of tabs) {
      expect(t.className).toContain('min-h-11');
      expect(t.className).toContain('lg:min-h-0');
    }
  });
});
