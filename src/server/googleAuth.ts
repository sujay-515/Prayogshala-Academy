import { OAuth2Client } from 'google-auth-library';

export interface VerifiedGoogleUser {
  sub: string;
  email: string;
  name?: string;
  emailVerified: boolean;
}

export type GoogleTokenVerifier = (
  credential: string,
  expectedClientId: string
) => Promise<VerifiedGoogleUser | null>;

let customVerifier: GoogleTokenVerifier | null = null;

/**
 * Injects a mock or custom token verifier for testing.
 * When null, the real Google OAuth2Client.verifyIdToken is used.
 */
export function setGoogleTokenVerifier(verifier: GoogleTokenVerifier | null): void {
  customVerifier = verifier;
}

/**
 * Verifies a Google ID token with OAuth2Client.verifyIdToken.
 * Validates audience, issuer, existence of sub and email, and email_verified === true.
 * Returns normalized user data or null on any failure.
 * Never logs credentials or token payloads.
 */
export async function verifyGoogleIdToken(
  credential: string,
  expectedClientId: string
): Promise<VerifiedGoogleUser | null> {
  if (!credential || typeof credential !== 'string' || !expectedClientId) {
    return null;
  }

  if (customVerifier) {
    return customVerifier(credential, expectedClientId);
  }

  try {
    const client = new OAuth2Client(expectedClientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: expectedClientId,
    });
    const payload = ticket.getPayload();
    if (!payload) return null;

    const sub = typeof payload.sub === 'string' ? payload.sub.trim() : '';
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const emailVerified = payload.email_verified === true;

    if (!sub || !email || !emailVerified) {
      return null;
    }

    const iss = payload.iss;
    if (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com') {
      return null;
    }

    return {
      sub,
      email,
      name: typeof payload.name === 'string' ? payload.name.trim() : undefined,
      emailVerified: true,
    };
  } catch {
    // Return null without logging the raw token or detailed rejection hints
    return null;
  }
}
