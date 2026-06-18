import { request } from '@/app/api.client';
import { withSudo } from './sudo.js';

interface BanOptions {
  reason?: string;
  bannedUntil?: string | null;
  banIp?: boolean;
}

interface AdjustXPParams {
  action: string;
  amount: number;
  target: string;
  userId?: string;
  userIds?: string[];
}

export const adminService = {
  async getUsers(params: Record<string, string>): Promise<unknown> {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/users?${query}`);
  },

  // Destructive actions are wrapped in withSudo: if the server demands a fresh
  // sudo grant (403 sudo_required), the password prompt fires and the call is
  // retried automatically. (F24)
  async banUser(userId: string, { reason, bannedUntil, banIp }: BanOptions): Promise<unknown> {
    return withSudo(() => request(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason, bannedUntil, banIp }),
    }));
  },

  async unbanUser(userId: string): Promise<unknown> {
    return withSudo(() => request(`/admin/users/${userId}/unban`, {
      method: 'POST',
    }));
  },

  async rejectAppeal(userId: string): Promise<unknown> {
    return withSudo(() => request(`/admin/users/${userId}/reject-appeal`, {
      method: 'POST',
    }));
  },

  async changeRole(userId: string, role: string): Promise<unknown> {
    return withSudo(() => request(`/admin/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    }));
  },

  async deleteUser(userId: string): Promise<unknown> {
    return withSudo(() => request(`/admin/users/${userId}`, {
      method: 'DELETE',
    }));
  },

  async reactivateUser(userId: string): Promise<unknown> {
    return withSudo(() => request(`/admin/users/${userId}/reactivate`, {
      method: 'POST',
    }));
  },

  async getStats(): Promise<unknown> {
    return request('/admin/stats');
  },

  async getBannedIps(): Promise<unknown> {
    return request('/admin/banned-ips');
  },

  async blockIp(ip: string, reason?: string): Promise<unknown> {
    return withSudo(() => request('/admin/banned-ips', {
      method: 'POST',
      body: JSON.stringify({ ip, reason }),
    }));
  },

  async unblockIp(ipId: string): Promise<unknown> {
    return withSudo(() => request(`/admin/banned-ips/${ipId}`, {
      method: 'DELETE',
    }));
  },

  async getBannedDevices(): Promise<unknown> {
    return request('/admin/banned-devices');
  },

  async blockDevice(deviceId: string, reason?: string): Promise<unknown> {
    return withSudo(() => request('/admin/banned-devices', {
      method: 'POST',
      body: JSON.stringify({ deviceId, reason }),
    }));
  },

  async unblockDevice(deviceIdId: string): Promise<unknown> {
    return withSudo(() => request(`/admin/banned-devices/${deviceIdId}`, {
      method: 'DELETE',
    }));
  },

  async getAuditLogs(params: Record<string, string>): Promise<unknown> {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/audit-logs?${query}`);
  },

  async adjustXP({ action, amount, target, userId, userIds }: AdjustXPParams): Promise<unknown> {
    return withSudo(() => request('/admin/xp', {
      method: 'POST',
      body: JSON.stringify({ action, amount, target, userId, userIds }),
    }));
  },
};
