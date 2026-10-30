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
