/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Security & Sanitization Utilities for Expo PP
 */

const DEFAULT_SALT = 'expo-pp-salt-2026';
const ADMIN_PASSWORD_SALT = 'expo-pp-admin-salt';
// SHA-256 hash of 'expo-pp-admin-salt:ecos-admin123'
const ADMIN_PASSWORD_HASH = 'c1a1a2fa5bf8e6f8e87511509210ba2a157df2cc68b466a1902422fb9b48cb4b';

/**
 * Hashes a string using standard Web Crypto API SHA-256.
 */
export async function hashPassword(pinOrPassword: string, salt: string = DEFAULT_SALT): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${pinOrPassword}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies a password/PIN against a stored hash.
 */
export async function verifyPassword(input: string, storedHash: string, salt: string = DEFAULT_SALT): Promise<boolean> {
  if (!input || !storedHash) return false;
  const computed = await hashPassword(input, salt);
  return computed === storedHash;
}

/**
 * Verifies the admin password without exposing the plaintext password in the bundle.
 */
export async function verifyAdminPassword(passwordInput: string): Promise<boolean> {
  if (!passwordInput) return false;
  const computed = await hashPassword(passwordInput, ADMIN_PASSWORD_SALT);
  return computed === ADMIN_PASSWORD_HASH;
}

/**
 * Sanitizes user input string: strips HTML tags, control characters, and truncates to maxLength.
 */
export function sanitizeInput(input: string, maxLength: number = 100): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags to prevent XSS injection
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Strip ASCII control characters
    .trim()
    .slice(0, maxLength);
}

/**
 * Splits an array into chunks to comply with Firestore writeBatch limits (<= 500 ops).
 * Defaults to 400 items per chunk.
 */
export function chunkArray<T>(items: T[], chunkSize: number = 400): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Defensive file upload validator.
 * Validates file presence, maximum size, and mime-type.
 */
export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
}

export function validateFileUpload(
  file: File | null | undefined, 
  options: FileValidationOptions = {}
): { isValid: boolean; error?: string } {
  const maxSizeBytes = options.maxSizeBytes ?? 2 * 1024 * 1024; // 2MB default
  const allowedMimeTypes = options.allowedMimeTypes ?? ['image/jpeg', 'image/png', 'image/webp'];

  if (!file) {
    return { isValid: false, error: 'Nenhum arquivo foi selecionado.' };
  }

  if (file.size > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return { 
      isValid: false, 
      error: `Arquivo excede o limite de ${maxMb}MB. Envie um arquivo menor.` 
    };
  }

  if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
    return { 
      isValid: false, 
      error: `Formato de arquivo não permitido (${file.type}). Tipos aceitos: ${allowedMimeTypes.join(', ')}.` 
    };
  }

  return { isValid: true };
}
