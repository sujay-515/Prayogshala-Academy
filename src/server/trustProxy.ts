/**
 * Resolves the Express 'trust proxy' setting from the environment.
 *
 * Rules:
 * - When TRUST_PROXY is unset or empty, the default is 1 in production and false (0) otherwise.
 * - When TRUST_PROXY is a valid non-negative integer string, that hop count is used.
 * - When TRUST_PROXY is set to an invalid value (e.g. non-numeric, negative, or boolean string),
 *   a security warning is logged and the same environment default (1 in production, false/0 otherwise)
 *   is used.
 */
export function resolveTrustProxy(
  rawTrustProxy: string | undefined,
  nodeEnv: string | undefined
): number | false {
  const isProduction = nodeEnv === 'production';
  const defaultSetting: number | false = isProduction ? 1 : false;

  const trimmed = rawTrustProxy?.trim();
  if (trimmed === undefined || trimmed === '') {
    return defaultSetting;
  }

  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  const fallbackDesc = defaultSetting === false ? '0' : String(defaultSetting);
  console.warn(
    `[Security Warning] Invalid TRUST_PROXY value "${trimmed}". TRUST_PROXY must be a non-negative integer hop count (e.g., '1' for a single reverse proxy). Falling back to default (${fallbackDesc}).`
  );
  return defaultSetting;
}
