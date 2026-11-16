// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/app/i18n';
import PrivacySettings from './PrivacySettings';

vi.mock('@/features/auth/useAuthContext', () => ({
  useAuthContext: () => ({ user: { accountName: 'ana', permissions: [], preferences: {} }, setUser: vi.fn() }),
}));
vi.mock('./BlockedUsersSettings', () => ({ default: () => null }));
vi.mock('../SettingsDraftContext', () => ({ useReportDraft: () => {} }));

describe('PrivacySettings AI disclosure', () => {
  it('is shown without a search and found by searching "groq", and hidden by an unrelated search', () => {
    const { rerender } = render(<PrivacySettings />);
    expect(screen.getByText('AI suggestions')).toBeTruthy();
    rerender(<PrivacySettings searchTerm="groq" />);
    expect(screen.getByText('AI suggestions')).toBeTruthy();
    rerender(<PrivacySettings searchTerm="zzzz-nothing" />);
    expect(screen.queryByText('AI suggestions')).toBeNull();
  });
});
