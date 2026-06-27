import { request } from '@/app/api.client';
import { gqlRequest } from '@/app/graphql.client';
import type { User, UpdateProfileInput, UserPreferences } from '@/types';

interface RegisterParams {
  accountName: string;
  displayName?: string;
  email: string;
  password: string;
  recaptchaToken?: string;
  claimToken?: string;
  publicId?: string;
}

interface LoginParams {
  identifier: string;
  password: string;
  recaptchaToken?: string;
  claimToken?: string;
  publicId?: string;
}

interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface SetPasswordParams {
  newPassword: string;
  confirmPassword: string;
}

interface ResetPasswordParams {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export const authService = {
  // ── Kept as REST — involves token issuance, cookies, reCAPTCHA ──
  async register(params: RegisterParams): Promise<unknown> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async checkIdentifier(identifier: string): Promise<unknown> {
    return request('/auth/check-identifier', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  async login(params: LoginParams): Promise<unknown> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async refresh(): Promise<unknown> {
    return request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async logout(): Promise<unknown> {
    return request('/auth/logout', {
      method: 'POST',
    });
  },

  async submitAppeal(appealText: string): Promise<unknown> {
    return request('/auth/appeal', {
      method: 'POST',
      body: JSON.stringify({ appealText }),
    });
  },

  async changePassword(params: ChangePasswordParams): Promise<unknown> {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async setPassword(params: SetPasswordParams): Promise<unknown> {
    return request('/auth/set-password', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async validateResetToken(token: string): Promise<unknown> {
    return request(`/auth/reset-password/validate?token=${token}`);
  },

  async resetPassword(params: ResetPasswordParams): Promise<unknown> {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // ── Migrated to GraphQL ──

  // Lightweight startup query — only what the app needs before any page renders.
  async meCore(): Promise<User | null> {
    const data = await gqlRequest<{ me: User | null }>(/* GraphQL */ `
      query MeCore {
        me {
          id
          accountName
          displayName
          email
          avatarUrl
          isVerified
          ban { active reason until }
          appeal { text status submittedAt resolvedAt }
          wasJustUnbanned
          role
          permissions
          hasPassword
          google { connected googleId email name pictureUrl }
          badges { id grantedAt grantedBy }
          showcasedBadges
          progression { xp level }
          showcaseSlots
        }
      }
    `);
    return data.me;
  },

  // Heavy profile/settings fields — fetched lazily when the user opens settings.
  async meProfile(): Promise<Partial<User> | null> {
    const data = await gqlRequest<{ me: Partial<User> | null; myPreferences: UserPreferences | null }>(/* GraphQL */ `
      query MeProfile {
        me {
          id
          pendingEmail
          bio
          createdAt
          passwordChangedAt
          lastAccountNameChangedAt
          accountNameChangeCount
          previousAccountNames { from to changedAt }
          emailHistory { from to changedAt }
          showFollowers
          onlineVisibility
          miniProfileBadgesEnabled
          miniProfileBadgeIds
          stats { minutesSynced wordsSynced karaokeLines }
          streak { current longest lastActiveDate }
        }
        myPreferences {
          showFollowers
          onlineVisibility
          miniProfileBadgesEnabled
          miniProfileBadgeIds
          notifications { follow reaction star fork badge_awarded xp_changed }
        }
      }
    `);
    if (!data.me) return null;
    return { ...data.me, preferences: data.myPreferences ?? undefined };
  },

  async me(): Promise<User | null> {
    const data = await gqlRequest<{ me: User | null }>(/* GraphQL */ `
      query Me {
        me {
          id
          accountName
          displayName
          email
          pendingEmail
          avatarUrl
          bio
          isVerified
          lastAccountNameChangedAt
          accountNameChangeCount
          previousAccountNames { from to changedAt }
          emailHistory { from to changedAt }
          ban { active reason until }
          appeal { text status submittedAt resolvedAt }
          wasJustUnbanned
          role
          permissions
          createdAt
          passwordChangedAt
          hasPassword
          google { connected googleId email name pictureUrl }
          showFollowers
          onlineVisibility
          miniProfileBadgesEnabled
          miniProfileBadgeIds
          badges { id grantedAt grantedBy }
          showcasedBadges
          stats { minutesSynced wordsSynced karaokeLines }
          streak { current longest lastActiveDate }
          progression { xp level }
          showcaseSlots
        }
      }
    `);
    return data.me;
  },

  async updateProfile(input: UpdateProfileInput): Promise<User> {
    const data = await gqlRequest<{ updateProfile: User }>(/* GraphQL */ `
      mutation UpdateProfile($input: UpdateProfileInput!) {
        updateProfile(input: $input) {
          id
          accountName
          displayName
          email
          pendingEmail
          avatarUrl
          bio
          showFollowers
          onlineVisibility
          miniProfileBadgesEnabled
          miniProfileBadgeIds
          lastAccountNameChangedAt
        }
      }
    `, { input });
    return data.updateProfile;
  },

  async sendVerificationEmail(): Promise<void> {
    await gqlRequest<{ sendVerificationEmail: boolean }>(/* GraphQL */ `
      mutation SendVerificationEmail {
        sendVerificationEmail
      }
    `);
  },

  // ── Session Management ──
  getSessions(): Promise<unknown> {
    return request('/auth/sessions');
  },

  revokeSession(sessionId: string): Promise<unknown> {
    return request(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
  },

  logoutAll(keepCurrent = false): Promise<unknown> {
    return request('/auth/logout-all', {
      method: 'POST',
      body: JSON.stringify({ keepCurrent }),
    });
  },

  // ── WebAuthn Passkeys ──
  async getPasskeyRegistrationOptions(): Promise<unknown> {
    return request('/auth/passkey/register/options', { method: 'GET' });
  },

  async verifyPasskeyRegistration(response: unknown): Promise<unknown> {
    return request('/auth/passkey/register/verify', {
      method: 'POST',
      body: JSON.stringify(response),
    });
  },

  async getPasskeyLoginOptions(identifier: string): Promise<unknown> {
    return request('/auth/passkey/login/options', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  async verifyPasskeyLogin(identifier: string, response: unknown): Promise<unknown> {
    return request('/auth/passkey/login/verify', {
      method: 'POST',
      body: JSON.stringify({ identifier, response }),
    });
  },

  async getPasskeys(): Promise<unknown> {
    return request('/auth/passkeys');
  },

  async deletePasskey(id: string): Promise<unknown> {
    return request(`/auth/passkeys/${id}`, {
      method: 'DELETE',
    });
  },

  async deactivateAccount(): Promise<unknown> {
    return request('/auth/deactivate', {
      method: 'POST',
    });
  },
};
