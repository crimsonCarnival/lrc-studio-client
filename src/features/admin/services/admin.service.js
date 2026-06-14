import { request } from '@/app/api.client.js';
import { withSudo } from './sudo.js';

export const adminService = {
  async getUsers(params) {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/users?${query}`);
  },

  // Destructive actions are wrapped in withSudo: if the server demands a fresh
  // sudo grant (403 sudo_required), the password prompt fires and the call is
  // retried automatically. (F24)
  async banUser(userId, { reason, bannedUntil, banIp }) {
    return withSudo(() => request(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason, bannedUntil, banIp }),
    }));
  },

  async unbanUser(userId) {
    return withSudo(() => request(`/admin/users/${userId}/unban`, {
      method: 'POST',
    }));
  },

  async rejectAppeal(userId) {
    return withSudo(() => request(`/admin/users/${userId}/reject-appeal`, {
      method: 'POST',
    }));
  },

  async changeRole(userId, role) {
    return withSudo(() => request(`/admin/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    }));
  },

  async deleteUser(userId) {
    return withSudo(() => request(`/admin/users/${userId}`, {
      method: 'DELETE',
    }));
  },

  async reactivateUser(userId) {
    return withSudo(() => request(`/admin/users/${userId}/reactivate`, {
      method: 'POST',
    }));
  },

  async getStats() {
    return request('/admin/stats');
  },

  async getBannedIps() {
    return request('/admin/banned-ips');
  },

  async blockIp(ip, reason) {
    return withSudo(() => request('/admin/banned-ips', {
      method: 'POST',
      body: JSON.stringify({ ip, reason }),
    }));
  },

  async unblockIp(ipId) {
    return withSudo(() => request(`/admin/banned-ips/${ipId}`, {
      method: 'DELETE',
    }));
  },

  async getBannedDevices() {
    return request('/admin/banned-devices');
  },

  async blockDevice(deviceId, reason) {
    return withSudo(() => request('/admin/banned-devices', {
      method: 'POST',
      body: JSON.stringify({ deviceId, reason }),
    }));
  },

  async unblockDevice(deviceIdId) {
    return withSudo(() => request(`/admin/banned-devices/${deviceIdId}`, {
      method: 'DELETE',
    }));
  },

  async getAuditLogs(params) {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/audit-logs?${query}`);
  },

  async adjustXP({ action, amount, target, userId, userIds }) {
    return withSudo(() => request('/admin/xp', {
      method: 'POST',
      body: JSON.stringify({ action, amount, target, userId, userIds }),
    }));
  },
};
