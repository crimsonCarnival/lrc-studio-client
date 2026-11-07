import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Icon } from './Icon';

describe('Icon', () => {
  it.each(['center_focus_strong', 'subtitles', 'upload_file'])('draws %s without an unknown-icon warning', (name) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<Icon name={name} />);
    expect(container.querySelector(`svg[data-icon="${name}"] path`)).not.toBeNull();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
