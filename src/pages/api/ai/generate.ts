import { checkRateLimit, createRateLimitResponse } from "../../../lib/middleware/rate-limit.middleware";
import { AiGenerationService } from "../../../lib/services/ai-generation.service";
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
 * @returns 408 - AI generation timeout (>30s)
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
    const aiService = new AiGenerationService(locals.supabase);
    let result: AiSummaryDTO;

    try {
      result = await aiService.generateSummary(validatedInput, userId);
    } catch (error) {
      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Timeout error (408)
      if (errorMessage.includes("timeout")) {
        return new Response(
          JSON.stringify({
            error: "Request timeout",
            message: "AI generation timeout (exceeded 30 seconds)",
            details: "Try again with shorter content or contact support",
          }),
          {
            status: 408,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // OpenRouter API error (503)
      if (errorMessage.includes("OpenRouter")) {
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

      // Generic error (500)
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
