/**
 * Single source of truth for site-wide metadata, contact details, and operator information.
 * Placeholders are marked with brackets (e.g. [CONTACT_EMAIL]) and must be configured for production.
 */

export const SITE_CONFIG = {
  SITE_NAME: 'Prayogshala Academy',
  SITE_TAGLINE: 'Laboratory Medicine Question Bank & Examination Platform',
  SITE_DESCRIPTION:
    'Comprehensive Medical Laboratory Science examination preparation question bank covering Hematology, Clinical Chemistry, Microbiology, Immunology, and Blood Banking.',
  CONTACT_EMAIL: '[CONTACT_EMAIL]',
  OPERATOR_NAME: '[OPERATOR_NAME]',
  OPERATOR_COUNTRY: '[OPERATOR_COUNTRY]',
  LAST_UPDATED: 'October 28, 2026',
  SITE_URL:
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SITE_URL) ||
    (typeof window !== 'undefined' && window.location && window.location.origin) ||
    '',
};
