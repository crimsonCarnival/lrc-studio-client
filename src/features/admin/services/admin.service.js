import { request } from '@/app/api.client.js';

export const adminService = {
  async getUsers(params) {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/users?${query}`);
  },

  async banUser(userId, { reason, bannedUntil, banIp }) {
    return request(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason, bannedUntil, banIp }),
    });
  },

  async unbanUser(userId) {
    return request(`/admin/users/${userId}/unban`, {
      method: 'POST',
    });
  },
  
  async rejectAppeal(userId) {
    return request(`/admin/users/${userId}/reject-appeal`, {
      method: 'POST',
    });
  },

  async changeRole(userId, role) {
    return request(`/admin/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  async deleteUser(userId) {
    return request(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async reactivateUser(userId) {
    return request(`/admin/users/${userId}/reactivate`, {
      method: 'POST',
    });
  },
  
  async getStats() {
    return request('/admin/stats');
  },

  async getBannedIps() {
    return request('/admin/banned-ips');
  },

  async blockIp(ip, reason) {
    return request('/admin/banned-ips', {
      method: 'POST',
      body: JSON.stringify({ ip, reason }),
    });
  },

  async unblockIp(ipId) {
    return request(`/admin/banned-ips/${ipId}`, {
      method: 'DELETE',
    });
  },

  async getBannedDevices() {
    return request('/admin/banned-devices');
  },

  async blockDevice(deviceId, reason) {
    return request('/admin/banned-devices', {
      method: 'POST',
      body: JSON.stringify({ deviceId, reason }),
    });
  },

  async unblockDevice(deviceIdId) {
    return request(`/admin/banned-devices/${deviceIdId}`, {
      method: 'DELETE',
    });
  },

  async getAuditLogs(params) {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/audit-logs?${query}`);
  },

  async adjustXP({ action, amount, target, userId, userIds }) {
    return request('/admin/xp', {
      method: 'POST',
      body: JSON.stringify({ action, amount, target, userId, userIds }),
    });
  },
};
