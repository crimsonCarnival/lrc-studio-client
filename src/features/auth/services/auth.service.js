import { request } from '@/app/api.client.js';
import { gqlRequest } from '@/app/graphql.client.js';

export const authService = {
  // ── Kept as REST — involves token issuance, cookies, reCAPTCHA ──
  async register({ username, email, password, recaptchaToken, claimToken, projectId }) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, recaptchaToken, claimToken, projectId }),
    });
  },

  async checkIdentifier(identifier) {
    return request('/auth/check-identifier', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  async login({ identifier, password, recaptchaToken, claimToken, projectId }) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, recaptchaToken, claimToken, projectId }),
    });
  },

  async refresh() {
    return request('/auth/refresh', {
      method: 'POST',
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

  async clearUnbanMessage() {
    return request('/auth/clear-unban-message', { method: 'POST' });
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
          username
          email
          avatarUrl
          bio
          isVerified
          isBanned
          role
          createdAt
          passwordChangedAt
          hasPassword
          spotify { connected spotifyId isPremium profilePictureUrl }
          google { connected googleId email name pictureUrl }
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
          username
          email
          avatarUrl
          bio
        }
      }
    `, { input });
    return data.updateProfile;
  },
};
