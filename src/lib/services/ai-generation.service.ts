import { OpenRouterService } from "./openrouter.service";
import type { Database } from "../../db/database.types";
import type { AiSummaryDTO, GoalStatus } from "../../types";
import type { JSONSchema } from "../types/openrouter.types";
import type { GenerateAiSummaryInput } from "../validators/ai.schemas";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * AI-generated summary structure (parsed from OpenRouter response)
 */
interface AiGeneratedSummary {
  summary_text: string;
  goal_status: GoalStatus;
  suggested_tag: string | null;
}

/**
 * JSON Schema for AI-generated summary
 * Enforces strict output format from LLM
 */
const AI_SUMMARY_SCHEMA: JSONSchema & { name: string } = {
  name: "ai_summary_response",
  type: "object",
  properties: {
    summary_text: {
      type: "string",
      description: "1-2 sentences, 20-40 words, same language as input",
    },
    goal_status: {
      type: "string",
      enum: ["achieved", "not_achieved", "undefined"],
      description: "Goal achievement status",
    },
    suggested_tag: {
      type: ["string", "null"],
      description: "1-3 word tag, same language as input",
    },
  },
  required: ["summary_text", "goal_status", "suggested_tag"],
  additionalProperties: false,
};

/**
 * AI Generation Service
 * Handles AI summary generation using OpenRouter API via OpenRouterService
 */
export class AiGenerationService {
  private readonly openRouterService: OpenRouterService;

  constructor(supabase: SupabaseClient<Database>) {
    // Initialize OpenRouter service with Supabase for telemetry
    this.openRouterService = new OpenRouterService(supabase, {
      defaultModel: "x-ai/grok-4-fast", // Grok-4-Fast: excellent JSON Schema support, fast, currently free on OpenRouter
      timeoutMs: 60000, // 60 seconds (1 minute)
      retryAttempts: 2, // Retry transient failures
      appUrl: "https://10xnotes.app",
      appName: "10xNotes",
    });
  }

  /**
   * Generate AI summary from meeting notes
   *
   * @param input - Validated input data
   * @param userId - Optional user ID (null for anonymous calls)
   * @returns AI summary with generation metrics
   * @throws OpenRouterError if generation fails or times out
   */
  async generateSummary(input: GenerateAiSummaryInput, userId: string | null = null): Promise<AiSummaryDTO> {
    // Build prompt messages
    const { system, user } = this.buildPrompt(input.original_content);

    // Call OpenRouter service with structured output
    const response = await this.openRouterService.generate<AiGeneratedSummary>({
      systemMessage: system,
      userMessage: user,
      modelName: input.model_name,
      responseSchema: AI_SUMMARY_SCHEMA,
      parameters: {
        temperature: 0.3, // Lower temperature for more consistent outputs
        max_tokens: 1000, // Conservative limit - can be reduced based on actual usage
      },
      userId: userId ?? undefined,
      noteId: undefined, // No note ID for anonymous generation
    });

    // Map response to DTO format
    const result: AiSummaryDTO = {
      summary_text: response.data.summary_text,
      goal_status: response.data.goal_status,
      suggested_tag: response.data.suggested_tag,
      generation_time_ms: response.metadata.generationTimeMs,
      tokens_used: response.metadata.tokensUsed ?? 0,
    };

    return result;
  }

  /**
   * Build prompt template for AI generation
   *
   * Note: Output structure and constraints (word limits, language matching, etc.)
   * are enforced by JSON Schema (AI_SUMMARY_SCHEMA), keeping prompt concise.
   *
   * @param content - Raw meeting notes content
   * @returns System and user prompts for AI model
   */
  private buildPrompt(content: string): {
    system: string;
    user: string;
  } {
    const system = `Summarize meeting notes focusing on BUSINESS OUTCOMES in 1-2 sentences (20-40 words max) in the same language as input.

Extract ONE key business decision/outcome/blocker.

Goal status (choose one, prefer binary values):
- "achieved" - meeting goals were clearly met OR progress was made
- "not_achieved" - goals were missed, blocked, or no clear goals mentioned
- "undefined" - ONLY if truly unable to determine goal achievement (use rarely)

Suggest 1-3 word tag in same language.

Example: "Extended deadline 2 weeks due to resource constraints. Prioritizing revenue-generating features."`;

    const user = `Summarize:

${content}`;

    return { system, user };
  }
}
