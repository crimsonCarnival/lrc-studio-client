import { request } from '@/app/api.client.js';
import { gqlRequest } from '@/app/graphql.client.js';

export const authService = {
  // ── Kept as REST — involves token issuance, cookies, reCAPTCHA ──
  /**
   * @param {object} params
   * @param {string} params.accountName
   * @param {string} [params.displayName]
   * @param {string} params.email
   * @param {string} params.password
   * @param {string} [params.recaptchaToken]
   * @param {string} [params.claimToken]
   * @param {string} [params.projectId]
   */
  async register({ accountName, displayName, email, password, recaptchaToken, claimToken, projectId }) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ accountName, displayName, email, password, recaptchaToken, claimToken, projectId }),
    });
  },

  async checkIdentifier(identifier) {
    return request('/auth/check-identifier', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  /**
   * @param {object} params
   * @param {string} params.identifier
   * @param {string} params.password
   * @param {string} [params.recaptchaToken]
   * @param {string} [params.claimToken]
   * @param {string} [params.projectId]
   */
  async login({ identifier, password, recaptchaToken, claimToken, projectId }) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, recaptchaToken, claimToken, projectId }),
    });
  },

  async refresh() {
    return request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async logout() {
    return request('/auth/logout', {
      method: 'POST',
    });
  },

  async submitAppeal(appealText) {
    return request('/auth/appeal', {
      method: 'POST',
      body: JSON.stringify({ appealText }),
    });
  },

  async changePassword({ currentPassword, newPassword, confirmPassword }) {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
  },

  async setPassword({ newPassword, confirmPassword }) {
    return request('/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword, confirmPassword }),
    });
  },

  async validateResetToken(token) {
    return request(`/auth/reset-password/validate?token=${token}`);
  },

  async resetPassword({ token, newPassword, confirmPassword }) {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    });
  },

  // ── Migrated to GraphQL ──
  async me() {
    const data = await gqlRequest(`
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
          xpHistory { type source delta totalXpAfter reason createdAt }
          ban { active reason until }
          appeal { text status submittedAt resolvedAt }
          wasJustUnbanned
          role
          createdAt
          passwordChangedAt
          hasPassword
          google { connected googleId email name pictureUrl }
          showFollowers
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

  async updateProfile(input) {
    const data = await gqlRequest(`
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
          lastAccountNameChangedAt
        }
      }
    `, { input });
    return data.updateProfile;
  },

  async sendVerificationEmail() {
    await gqlRequest(`
      mutation SendVerificationEmail {
        sendVerificationEmail
      }
    `);
  },

  // ── Session Management ──
  getSessions() {
    return request('/auth/sessions');
  },

  revokeSession(sessionId) {
    return request(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
  },

  logoutAll(keepCurrent = false) {
    return request('/auth/logout-all', {
      method: 'POST',
      body: JSON.stringify({ keepCurrent }),
    });
  },

  // ── WebAuthn Passkeys ──
  async getPasskeyRegistrationOptions() {
    return request('/auth/passkey/register/options', { method: 'GET' });
  },

  async verifyPasskeyRegistration(response) {
    return request('/auth/passkey/register/verify', {
      method: 'POST',
      body: JSON.stringify(response),
    });
  },

  async getPasskeyLoginOptions(identifier) {
    return request('/auth/passkey/login/options', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  async verifyPasskeyLogin(identifier, response) {
    return request('/auth/passkey/login/verify', {
      method: 'POST',
      body: JSON.stringify({ identifier, response }),
    });
  },

  async getPasskeys() {
    return request('/auth/passkeys');
  },

  async deletePasskey(id) {
    return request(`/auth/passkeys/${id}`, {
      method: 'DELETE',
    });
  },
  
  async deactivateAccount() {
    return request('/auth/deactivate', {
      method: 'POST',
    });
  },
};

