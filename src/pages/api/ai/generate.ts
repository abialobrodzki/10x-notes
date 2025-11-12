import {
  OpenRouterTimeoutError,
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterNetworkError,
  OpenRouterServiceError,
  OpenRouterValidationError,
  OpenRouterError,
} from "../../../lib/errors/openrouter.errors";
import { checkRateLimit, createRateLimitResponse } from "../../../lib/middleware/rate-limit.middleware";
import { generateAiSummarySchema, type GenerateAiSummaryInput } from "../../../lib/validators/ai.schemas";
import type { AiSummaryDTO } from "../../../types";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * POST /api/ai/generate
 *
 * Generate AI summary from raw meeting notes
 * Anonymous endpoint - no authentication required
 * Rate limit: 100 requests per day per IP address
 *
 * @param request.body - { original_content: string, model_name?: string }
 * @returns 200 - AI summary with generation metrics
 * @returns 400 - Invalid input data
 * @returns 504 - AI generation timeout (>60s)
 * @returns 429 - Rate limit exceeded
 * @returns 500 - Internal server error
 * @returns 503 - AI service unavailable
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Rate limiting check
    const rateLimitResult = checkRateLimit(request);

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfter ?? 0);
    }

    // Step 2: Parse and validate request body
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

    // Step 3: Validate input with Zod schema
    const validationResult = generateAiSummarySchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return new Response(
        JSON.stringify({
          error: "Validation failed",
          message: "Invalid input data",
          details: errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validatedInput: GenerateAiSummaryInput = validationResult.data;

    // Step 4: Optional authentication - check if user is logged in
    let userId: string | null = null;
    try {
      const {
        data: { user },
      } = await locals.supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch (error) {
      // Ignore auth errors - this is an anonymous endpoint
      // If auth fails, userId remains null
      // eslint-disable-next-line no-console
      console.log("Auth check failed (expected for anonymous calls):", error);
    }

    // Step 5: Generate AI summary
    let result: AiSummaryDTO;

    try {
      // Dynamically import the service to avoid global scope issues on Cloudflare
      const { AiGenerationService } = await import("../../../lib/services/ai-generation.service");

      // Get API key from Cloudflare runtime.env (production) or process.env (local dev)
      const apiKey = locals.runtime?.env?.OPENROUTER_API_KEY;
      const aiService = new AiGenerationService(locals.supabase, { apiKey });
      result = await aiService.generateSummary(validatedInput, userId);
    } catch (error) {
      // Handle specific OpenRouter error types with instanceof checks
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Authentication error - missing or invalid API key (503)
      if (error instanceof OpenRouterAuthError) {
        // eslint-disable-next-line no-console
        console.error("❌ AI Service Configuration Error:", errorMessage);
        return new Response(
          JSON.stringify({
            error: "Service unavailable",
            message: "AI service is not configured",
            details: "Please contact the administrator",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Timeout error - request exceeded 60s limit (504 Gateway Timeout)
      if (error instanceof OpenRouterTimeoutError) {
        // eslint-disable-next-line no-console
        console.error("AI generation timeout:", errorMessage);
        return new Response(
          JSON.stringify({
            error: "Gateway timeout",
            message: "AI generation exceeded time limit (60 seconds)",
            details: "Try again with shorter content or contact support",
          }),
          {
            status: 504,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Rate limit error - too many requests (429)
      if (error instanceof OpenRouterRateLimitError) {
        // eslint-disable-next-line no-console
        console.error("OpenRouter rate limit exceeded:", errorMessage);
        return new Response(
          JSON.stringify({
            error: "Too many requests",
            message: "OpenRouter API rate limit exceeded",
            details: "Please wait a moment and try again",
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Service/Network errors - OpenRouter unavailable or connection issues (503)
      if (error instanceof OpenRouterServiceError || error instanceof OpenRouterNetworkError) {
        // eslint-disable-next-line no-console
        console.error("AI service unavailable:", errorMessage);
        return new Response(
          JSON.stringify({
            error: "Service unavailable",
            message: "AI service temporarily unavailable",
            details: "Please try again in a few moments",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Validation error - invalid input to OpenRouter (400)
      if (error instanceof OpenRouterValidationError) {
        // eslint-disable-next-line no-console
        console.error("OpenRouter validation error:", errorMessage);
        return new Response(
          JSON.stringify({
            error: "Bad request",
            message: "Invalid request to AI service",
            details: errorMessage,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Catch-all for any other OpenRouter errors (503)
      if (error instanceof OpenRouterError) {
        // eslint-disable-next-line no-console
        console.error("OpenRouter error:", errorMessage);
        return new Response(
          JSON.stringify({
            error: "Service unavailable",
            message: "AI service encountered an error",
            details: "Please try again in a few moments",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic error for non-OpenRouter errors (500)
      // eslint-disable-next-line no-console
      console.error("AI generation error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to generate AI summary",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": rateLimitResult.remaining?.toString() ?? "0",
      },
    });
  } catch (error) {
    // Catch-all for unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/ai/generate:", error);

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
