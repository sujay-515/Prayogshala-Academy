/**
 * Single source of truth for site-wide metadata, contact details, and operator information.
 * Placeholders are marked with brackets (e.g. [CONTACT_EMAIL]) and must be configured for production.
 */

export const SITE_CONFIG = {
  siteName: 'Prayogshala Academy',
  SITE_NAME: 'Prayogshala Academy',
  SITE_TAGLINE: 'Laboratory Medicine Question Bank & Examination Platform',
  SITE_DESCRIPTION:
    'Comprehensive Medical Laboratory Science examination preparation question bank covering Hematology, Clinical Chemistry, Microbiology, Immunology, and Blood Banking.',
  CONTACT_EMAIL: '[CONTACT_EMAIL]',
  OPERATOR_NAME: 'Prithak Kandel',
  OPERATOR_COUNTRY: 'Nepal',
  LAST_UPDATED: 'October 28, 2026',
  SITE_URL:
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SITE_URL) ||
    (typeof window !== 'undefined' && window.location && window.location.origin) ||
    '',
};

/**
 * Returns true if the configuration value is non-empty and not an unresolved placeholder like bracketed tokens.
 */
export const isConfigured = (value?: string): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && !(trimmed.startsWith('[') && trimmed.endsWith(']'));
};
