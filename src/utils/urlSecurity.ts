/**
 * URL Security Utilities (SEC-19)
 * Guarding untrusted image and PDF document URLs
 */

export function isSafeImageUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Relative path starting with single '/' (reject '//' protocol-relative URLs)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }

  // Absolute HTTPS URL
  if (/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Safe data:image URIs (png, jpeg, gif, webp)
  if (/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(trimmed)) {
    return true;
  }

  return false;
}

export function getSafeImageUrl(url: unknown): string | null {
  return isSafeImageUrl(url) ? String(url).trim() : null;
}

export function isSafePdfUri(uri: unknown): boolean {
  if (typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  if (trimmed.startsWith('data:application/pdf;base64,')) {
    return true;
  }
  if (trimmed.startsWith('blob:')) {
    return true;
  }
  return false;
}

export function getSafePdfUri(uri: unknown): string | null {
  return isSafePdfUri(uri) ? String(uri).trim() : null;
}
