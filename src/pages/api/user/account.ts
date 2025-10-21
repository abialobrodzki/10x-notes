import { requireAuth } from "../../../lib/middleware/auth.middleware";
import { UserService } from "../../../lib/services/user.service";
import { deleteAccountSchema, type DeleteAccountInput } from "../../../lib/validators/user.schemas";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * Rate limiting for account deletion
 * Very restrictive: 10 requests per hour per user
 * Storage: In-memory (Map) - resets on server restart
 */
interface AccountDeletionRateLimitEntry {
  /** Number of deletion attempts */
  count: number;
  /** Timestamp when the rate limit window started (milliseconds) */
  windowStart: number;
}

const accountDeletionRateLimitStore = new Map<string, AccountDeletionRateLimitEntry>();

const ACCOUNT_DELETION_RATE_LIMIT = {
  /** Maximum requests per window */
  maxRequests: 10,
  /** Window duration in milliseconds (1 hour) */
  windowMs: 60 * 60 * 1000,
} as const;

/**
 * Check if user is within rate limit for account deletion
 * More restrictive than regular rate limits due to sensitive nature
 */
function checkAccountDeletionRateLimit(userId: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  let entry = accountDeletionRateLimitStore.get(userId);

  // If no entry exists or window expired, create new entry
  if (!entry || now - entry.windowStart > ACCOUNT_DELETION_RATE_LIMIT.windowMs) {
    entry = {
      count: 0,
      windowStart: now,
    };
    accountDeletionRateLimitStore.set(userId, entry);
  }

  // Check if rate limit exceeded
  if (entry.count >= ACCOUNT_DELETION_RATE_LIMIT.maxRequests) {
    const resetTime = entry.windowStart + ACCOUNT_DELETION_RATE_LIMIT.windowMs;
    const retryAfter = Math.ceil((resetTime - now) / 1000);
    return {
      allowed: false,
      retryAfter,
    };
  }

  // Increment request count
  entry.count++;
  accountDeletionRateLimitStore.set(userId, entry);

  return {
    allowed: true,
  };
}

/**
 * DELETE /api/user/account
 *
 * Delete user account and all associated data
 *
 * CRITICAL OPERATION - IRREVERSIBLE!
 * This endpoint implements GDPR "right to be forgotten" by permanently deleting:
 * - All user notes (CASCADE deletes public_links)
 * - All user tags (CASCADE deletes tag_access where user is owner)
 * - All tag_access entries where user is recipient
 * - User authentication record
 *
 * Security measures:
 * - Requires email confirmation (must match account email)
 * - Rate limited to 10 requests per hour per user
 * - Requires authentication
 * - All deletions performed in sequence to respect FK constraints
 *
 * @param request.body.confirmation_email - User's email for confirmation (must match)
 * @returns 204 - No Content (successful deletion, user logged out)
 * @returns 400 - Invalid confirmation email or validation error
 * @returns 401 - Missing or invalid authentication token
 * @returns 429 - Rate limit exceeded (too many deletion attempts)
 * @returns 500 - Internal server error
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Require authentication
    const { userId } = await requireAuth(locals.supabase);

    // Step 2: Check rate limit (abuse prevention)
    const rateLimitCheck = checkAccountDeletionRateLimit(userId);

    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `Too many account deletion attempts. Try again in ${rateLimitCheck.retryAfter} seconds`,
          retry_after_seconds: rateLimitCheck.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": rateLimitCheck.retryAfter?.toString() ?? "3600",
          },
        }
      );
    }

    // Step 3: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON",
          message: "Request body must be valid JSON",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Validate request body with Zod schema
    const validationResult = deleteAccountSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return new Response(
        JSON.stringify({
          error: "Validation failed",
          message: "Invalid request body",
          details: errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validatedInput: DeleteAccountInput = validationResult.data;

    // Step 5: Delete account via service
    const userService = new UserService(locals.supabase);

    try {
      await userService.deleteAccount(userId, validatedInput.confirmation_email);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Handle specific error cases
      if (errorMessage === "EMAIL_CONFIRMATION_MISMATCH") {
        return new Response(
          JSON.stringify({
            error: "Bad request",
            message: "Email confirmation does not match",
            details: "The confirmation email must match your account email",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (errorMessage === "USER_NOT_FOUND") {
        // Edge case - authenticated user not found in database
        // eslint-disable-next-line no-console
        console.error("USER_NOT_FOUND during account deletion:", {
          userId,
          error: errorMessage,
        });

        return new Response(
          JSON.stringify({
            error: "Not found",
            message: "User account not found",
            details: "The authenticated user does not exist in the system",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic service error
      // eslint-disable-next-line no-console
      console.error("UserService.deleteAccount error:", {
        userId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to delete account",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Log successful account deletion (for compliance/audit)
    // eslint-disable-next-line no-console
    console.log("Account deleted successfully (GDPR compliance):", {
      userId,
      timestamp: new Date().toISOString(),
    });

    // Step 7: Return 204 No Content (successful deletion)
    // User session is invalidated on client side
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Catch authentication errors (thrown as Response by requireAuth)
    if (error instanceof Response) {
      return error;
    }

    // Catch-all for unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in DELETE /api/user/account:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "An unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
