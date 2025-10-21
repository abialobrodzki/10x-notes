/**
 * Generate a cryptographically secure UUID v4 token for public links
 *
 * Uses the built-in crypto.randomUUID() which generates a random UUID v4
 * compliant with RFC 4122. This is cryptographically secure and suitable
 * for use as a public link token.
 *
 * @returns UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440099")
 *
 * @example
 * const token = generatePublicLinkToken();
 * // => "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6"
 */
export function generatePublicLinkToken(): string {
  return crypto.randomUUID();
}
