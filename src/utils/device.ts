/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hashPassword } from './security';

const DEVICE_ID_KEY = 'expo_pp_device_id';
const REGISTERED_CPF_KEY = 'expo_pp_registered_cpf';
const REGISTERED_NAME_KEY = 'expo_pp_registered_name';
const REGISTERED_AT_KEY = 'expo_pp_registered_at';

/**
 * Retrieves or generates a persistent device identifier stored in localStorage.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server_side_env';
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    }
    try {
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    } catch (e) {
      console.warn('Unable to persist deviceId in localStorage:', e);
    }
  }
  return deviceId;
}

/**
 * Computes a deterministic browser/hardware fingerprint.
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'server_fingerprint';

  const deviceId = getDeviceId();
  const screenSignal = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
  const navSignal = `${navigator?.userAgent || ''}|${navigator?.language || ''}|${navigator?.hardwareConcurrency || 0}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const rawSignal = `${deviceId}::${screenSignal}::${navSignal}::${tz}`;
  return await hashPassword(rawSignal, 'expo-pp-device-salt');
}

/**
 * Gets the CPF already registered on this physical device/browser.
 */
export function getDeviceRegisteredCpf(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REGISTERED_CPF_KEY);
}

/**
 * Gets the participant name already registered on this device.
 */
export function getDeviceRegisteredName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REGISTERED_NAME_KEY);
}

/**
 * Records that this device registered a specific CPF.
 */
export function setDeviceRegisteredCpf(cpf: string, name?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REGISTERED_CPF_KEY, cpf);
    if (name) localStorage.setItem(REGISTERED_NAME_KEY, name);
    localStorage.setItem(REGISTERED_AT_KEY, new Date().toISOString());
  } catch (e) {
    console.warn('Unable to save registered CPF in localStorage:', e);
  }
}

/**
 * Clears the local device registration lock (Admin testing feature).
 */
export function clearDeviceRegistration(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REGISTERED_CPF_KEY);
    localStorage.removeItem(REGISTERED_NAME_KEY);
    localStorage.removeItem(REGISTERED_AT_KEY);
  } catch (e) {
    console.warn('Unable to clear device registration in localStorage:', e);
  }
}

/**
 * Helper to mask a CPF for privacy in UI messages (e.g. 123.***.***-09).
 */
export function maskCpf(cleanCpf: string): string {
  if (!cleanCpf || cleanCpf.length !== 11) return cleanCpf;
  return `${cleanCpf.slice(0, 3)}.***.***-${cleanCpf.slice(9, 11)}`;
}
