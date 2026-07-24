/**
 * Utility for ECOS Summit Secure QR Code Generation & Validation
 */

export const QR_PREFIX = 'ECOS-SUMMIT-SECURE:v1:';

/**
 * Generates the secure proprietary QR payload for an agency.
 * Standard phone camera apps will treat this as unclickable raw text,
 * preventing any link sharing or remote clicks outside the ECOS Summit app.
 */
export function generateSecureQRPayload(agencyId: string, agencyToken: string): string {
  return `${QR_PREFIX}${agencyId.toLowerCase().trim()}:${agencyToken.trim()}`;
}

/**
 * Validates and extracts agency information from scanned QR code text
 */
export function parseSecureQRPayload(scannedText: string): {
  isValid: boolean;
  agencyId?: string;
  agencyToken?: string;
  error?: string;
} {
  const text = scannedText.trim();

  // 1. Check if it's the proprietary secure format
  if (text.startsWith(QR_PREFIX)) {
    const payload = text.slice(QR_PREFIX.length);
    const parts = payload.split(':');
    if (parts.length >= 2) {
      const agencyId = parts[0].toLowerCase().trim();
      const agencyToken = parts.slice(1).join(':').trim();
      return {
        isValid: true,
        agencyId,
        agencyToken
      };
    }
  }

  // If it's a URL or plain web link, reject it to prevent link sharing/remote fraud
  if (text.includes('/investir/') || text.startsWith('http://') || text.startsWith('https://')) {
    return {
      isValid: false,
      error: 'Links da web não são aceitos. Por razões de segurança e controle antifraude do evento, você deve escanear o QR Code oficial impresso no estande.'
    };
  }

  return {
    isValid: false,
    error: 'QR Code não reconhecido. Certifique-se de estar escaneando o QR Code oficial da agência no estande.'
  };
}
