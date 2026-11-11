/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const NPS_FORM_URL = 'https://forms.gle/sn21yYQ8YARkWHUv6';
const NPS_INTERACTED_KEY = 'expo_pp_nps_responded';

/**
 * Checks whether the user has already clicked / interacted with the NPS survey link.
 */
export function hasInteractedWithNps(): boolean {
  try {
    return localStorage.getItem(NPS_INTERACTED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks the NPS survey as interacted so it will not pop up automatically anymore.
 */
export function markNpsAsInteracted(): void {
  try {
    localStorage.setItem(NPS_INTERACTED_KEY, 'true');
  } catch (err) {
    console.error('Failed to set NPS flag:', err);
  }
}

/**
 * Resets the NPS survey state (useful for testing or admin resets).
 */
export function resetNpsInteraction(): void {
  try {
    localStorage.removeItem(NPS_INTERACTED_KEY);
  } catch (err) {
    console.error('Failed to reset NPS flag:', err);
  }
}

/**
 * Opens the NPS Google Form in a new tab safely and records that the user accessed it.
 */
export function openNpsForm(): void {
  markNpsAsInteracted();
  window.open(NPS_FORM_URL, '_blank', 'noopener,noreferrer');
}
