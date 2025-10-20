/**
 * Rate limiting middleware for anonymous AI generation endpoint
 *
 * Limits: 100 requests per day per IP address
 * Storage: In-memory (Map) - resets on server restart
 * Scope: Applied to POST /api/ai/generate endpoint
 */

interface RateLimitEntry {
  /** Number of requests made */
  count: number;
  /** Timestamp when the rate limit window started (milliseconds) */
  windowStart: number;
}

/**
 * In-memory store for rate limit tracking
 * Key: IP address
 * Value: { count, windowStart }
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit configuration
 */
const RATE_LIMIT_CONFIG = {
  /** Maximum requests per window */
  maxRequests: 100,
  /** Window duration in milliseconds (24 hours) */
  windowMs: 24 * 60 * 60 * 1000,
} as const;

/**
 * Clean up expired entries from rate limit store
 * Runs periodically to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];

  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_CONFIG.windowMs) {
      expiredKeys.push(ip);
    }
  }

  expiredKeys.forEach((key) => rateLimitStore.delete(key));
}

// Schedule cleanup every hour
setInterval(cleanupExpiredEntries, 60 * 60 * 1000);

/**
 * Extract client IP address from request
 * Checks common headers used by proxies and load balancers
 */
function getClientIp(request: Request): string {
  // Check X-Forwarded-For header (used by proxies)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }

  // Check X-Real-IP header (used by some proxies)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to "unknown" if no IP found
  // Note: In production, this should rarely happen
  return "unknown";
}

/**
 * Calculate seconds until rate limit window resets
 */
function getResetTimeSeconds(windowStart: number): number {
  const resetTime = windowStart + RATE_LIMIT_CONFIG.windowMs;
  const now = Date.now();
  return Math.ceil((resetTime - now) / 1000);
}

/**
 * Check if request is within rate limit
 * Returns { allowed: true } if request is allowed
 * Returns { allowed: false, retryAfter: number } if rate limit exceeded
 */
export function checkRateLimit(request: Request): {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
} {
  const ip = getClientIp(request);
  const now = Date.now();

  // Get or create rate limit entry for this IP
  let entry = rateLimitStore.get(ip);

  // If no entry exists or window expired, create new entry
  if (!entry || now - entry.windowStart > RATE_LIMIT_CONFIG.windowMs) {
    entry = {
      count: 0,
      windowStart: now,
    };
    rateLimitStore.set(ip, entry);
  }

  // Check if rate limit exceeded
  if (entry.count >= RATE_LIMIT_CONFIG.maxRequests) {
    const retryAfter = getResetTimeSeconds(entry.windowStart);
    return {
      allowed: false,
      retryAfter,
    };
  }

  // Increment request count
  entry.count++;
  rateLimitStore.set(ip, entry);

  // Calculate remaining requests
  const remaining = RATE_LIMIT_CONFIG.maxRequests - entry.count;

  return {
    allowed: true,
    remaining,
  };
}

/**
 * Create rate limit exceeded response
 * Returns 429 Too Many Requests with Retry-After header
 */
export function createRateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      message: `Too many requests. Try again in ${retryAfter} seconds`,
      retry_after_seconds: retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        "X-RateLimit-Limit": RATE_LIMIT_CONFIG.maxRequests.toString(),
        "X-RateLimit-Reset": (Date.now() + retryAfter * 1000).toString(),
      },
    }
  );
}
