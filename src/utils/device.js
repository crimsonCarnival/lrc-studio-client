/**
 * Utility to generate and persist a unique device identifier.
 * This is used to identify specific machines/browsers for granular moderation.
 */

const STORAGE_KEY = 'syncify_device_id';

export function getDeviceId() {
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    // Generate a new UUID-like string
    deviceId = 'dv_' + Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Resetting the device ID (useful for testing or if the user requests data deletion)
 */
export function resetDeviceId() {
  localStorage.removeItem(STORAGE_KEY);
  return getDeviceId();
}
