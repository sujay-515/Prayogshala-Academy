import { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

export type UserResolver = (req: Request) => { userId?: string } | null | undefined;

/**
 * Normalizes an IP address for rate limiting:
 * - IPv4 addresses: uses the exact address.
 * - IPv6 addresses: uses the /64 subnet prefix.
 * - IPv4-mapped IPv6 addresses (::ffff:x.x.x.x): maps to IPv4.
 */
export function resolveClientIpKey(ip?: string | null): string {
  if (!ip) return '127.0.0.1';
  return ipKeyGenerator(ip, 64);
}

/**
 * Shared rate-limit key generator:
 * - For logged-in users: returns the user ID.
 * - For unauthenticated clients: returns the normalized IP key (IPv4 address or IPv6 /64 prefix).
 */
export function getRateLimitKey(
  reqOrIp: Request | { ip?: string; _sessionUser?: { userId?: string } | null; user?: { id?: string } | null } | string,
  userResolverOrId?: UserResolver | string | null
): string {
  if (typeof reqOrIp === 'string') {
    if (typeof userResolverOrId === 'string' && userResolverOrId.trim()) {
      return userResolverOrId;
    }
    return resolveClientIpKey(reqOrIp);
  }

  // Explicit user ID passed
  if (typeof userResolverOrId === 'string' && userResolverOrId.trim()) {
    return userResolverOrId;
  }

  // Resolver function passed
  if (typeof userResolverOrId === 'function') {
    const user = userResolverOrId(reqOrIp as Request);
    if (user?.userId) return user.userId;
  }

  // Pre-resolved session or user object attached to request
  const attached = (reqOrIp as any)._sessionUser?.userId || (reqOrIp as any).user?.id;
  if (attached) {
    return attached;
  }

  return resolveClientIpKey(reqOrIp.ip);
}

function isValidHextet(part: string): boolean {
  return /^[0-9a-f]{1,4}$/i.test(part);
}

function expandIPv6(ip: string): string[] | null {
  const clean = ip.split('%')[0].trim().toLowerCase();
  const doubleColonIndex = clean.indexOf('::');
  if (doubleColonIndex !== -1) {
    if (clean.indexOf('::', doubleColonIndex + 1) !== -1) return null;
    const left = clean.slice(0, doubleColonIndex).split(':').filter(Boolean);
    const right = clean.slice(doubleColonIndex + 2).split(':').filter(Boolean);
    const missing = 8 - (left.length + right.length);
    if (missing < 0) return null;
    const middle = Array(missing).fill('0');
    return [...left, ...middle, ...right];
  }
  const parts = clean.split(':');
  return parts.length === 8 ? parts : null;
}

/**
 * Minimizes an IP address for privacy-conscious session storage:
 * - IPv4: Truncated to a /24 subnet (e.g., "192.168.1.0/24").
 * - IPv6: Truncated to a /48 prefix (first 3 hextets, e.g., "2001:db8:abcd::/48").
 * - IPv4-mapped IPv6 (::ffff:x.x.x.x): handled as IPv4 /24.
 * - Empty, invalid, or unrecognized input: returned as empty string or sliced fallback.
 */
export function minimizeIp(ip?: string | null): string {
  if (!ip) return '';
  const trimmed = ip.trim();
  if (!trimmed) return '';

  // Handle IPv4-mapped IPv6 (::ffff:192.0.2.1)
  const v4Mapped = trimmed.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  const target = v4Mapped ? v4Mapped[1] : trimmed;

  // Check IPv4
  const v4Match = target.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4Match) {
    const [, a, b, c, d] = v4Match;
    if (Number(a) <= 255 && Number(b) <= 255 && Number(c) <= 255 && Number(d) <= 255) {
      return `${a}.${b}.${c}.0/24`;
    }
  }

  // Check IPv6
  if (target.includes(':')) {
    const expanded = expandIPv6(target);
    if (expanded && expanded.every(isValidHextet)) {
      const h1 = expanded[0].replace(/^0+/, '') || '0';
      const h2 = expanded[1].replace(/^0+/, '') || '0';
      const h3 = expanded[2].replace(/^0+/, '') || '0';
      if (h1 === '0' && h2 === '0' && h3 === '0') {
        return '::/48';
      }
      if (h2 === '0' && h3 === '0') {
        return `${h1}::/48`;
      }
      return `${h1}:${h2}:${h3}::/48`;
    }
  }

  return target.slice(0, 45);
}

/**
 * Trims a User-Agent header string to at most 200 characters for privacy and storage hygiene.
 */
export function minimizeUserAgent(ua?: string | null): string {
  if (!ua) return '';
  return String(ua).trim().slice(0, 200);
}

