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
      description: "ULTRA-SHORT summary in same language as input (1-2 sentences MAXIMUM, 20-40 words)",
    },
    goal_status: {
      type: "string",
      enum: ["achieved", "not_achieved", "undefined"],
      description: "Whether meeting goals were achieved",
    },
    suggested_tag: {
      type: ["string", "null"],
      description: "Suggested tag/category in the same language as input (1-3 words)",
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
      timeoutMs: 30000, // 30 seconds
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
   * Note: JSON output format is enforced by JSON Schema (AI_SUMMARY_SCHEMA)
   * passed to OpenRouterService, so no need for JSON format instructions in prompt.
   *
   * @param content - Raw meeting notes content
   * @returns System and user prompts for AI model
   */
  private buildPrompt(content: string): {
    system: string;
    user: string;
  } {
    const system = `You are an AI assistant that creates ULTRA-SHORT summaries of meeting notes.

Your task is to:
1. Detect the language of the input notes
2. Create an EXTREMELY BRIEF summary (MAXIMUM 1-2 sentences, 20-40 words ONLY) in the SAME language as the input
   - Extract ONLY the single most important point or decision
   - ONE key takeaway - nothing more
   - Skip ALL details, context, background, explanations
   - Use absolute minimum words
3. Determine if meeting goals were achieved:
   - "achieved" - goals were clearly met
   - "not_achieved" - goals were not met or missed
   - "undefined" - no clear goal was mentioned
4. Suggest a relevant tag/category (1-3 words) in the SAME language as the input

CRITICAL RULES - FOLLOW STRICTLY:
- MAXIMUM 1-2 sentences for summary_text
- MAXIMUM 20-40 words total
- If you write more than 40 words, you FAILED
- Extract ONLY the most critical information
- Omit everything that is not absolutely essential
- The summary_text and suggested_tag MUST be in the same language as the input notes
- Think: "What is the ONE thing someone must know?" - write only that

Example of correct length:
❌ BAD (too long): "During the meeting we discussed project timeline and decided to extend the deadline by two weeks due to resource constraints. The team agreed to prioritize the core features first."
✅ GOOD (correct): "Extended project deadline by 2 weeks. Prioritizing core features."

Your summary must be like a telegram - shortest possible message.`;

    const user = `Create an ULTRA-SHORT summary (1-2 sentences MAX, 20-40 words) in the same language as these notes:

${content}`;

    return { system, user };
  }
}
