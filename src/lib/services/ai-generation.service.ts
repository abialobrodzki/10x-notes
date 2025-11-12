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
      description: "Brief summary (1-2 sentences, 20-40 words) in same language as input",
    },
    goal_status: {
      type: "string",
      enum: ["achieved", "not_achieved", "undefined"],
      description: "Meeting goal achievement status",
    },
    suggested_tag: {
      type: ["string", "null"],
      description:
        "Project or feature name (1-3 words) in input language. NOT status/goal. Examples: 'OAuth API', 'CRM Dashboard'",
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

  constructor(supabase: SupabaseClient<Database>, options?: { apiKey?: string }) {
    // Initialize OpenRouter service with Supabase for telemetry
    // For Cloudflare Pages, API key must be passed from runtime.env
    this.openRouterService = new OpenRouterService(supabase, {
      defaultModel: "x-ai/grok-4-fast", // Grok-4-Fast: excellent JSON Schema support, fast, currently free on OpenRouter
      timeoutMs: 60000, // 60 seconds (1 minute)
      retryAttempts: 2, // Retry transient failures
      appUrl: "https://10xnotes.app",
      appName: "10xNotes",
      apiKey: options?.apiKey, // Pass through API key from runtime.env (Cloudflare) or env var (local)
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
   * Prompt is in English for better model performance (models trained primarily on English).
   * Output language matching is handled via explicit instructions in the prompt.
   * JSON Schema (AI_SUMMARY_SCHEMA) enforces structure and constraints.
   *
   * @param content - Raw meeting notes content
   * @returns System and user prompts for AI model
   */
  private buildPrompt(content: string): {
    system: string;
    user: string;
  } {
    const system = `Summarize meeting notes focusing on BUSINESS OUTCOMES. Output 1-2 sentences (20-40 words max) in the SAME LANGUAGE as input.

Extract ONE key business decision/outcome/blocker.

Goal status (choose one, prefer binary):
- "achieved" - goals met OR progress made
- "not_achieved" - goals missed/blocked OR no clear goals
- "undefined" - ONLY if unable to determine (use rarely)

Suggested tag - EXTRACT PROJECT/FEATURE NAME (1-3 words in input language):
- Identify PROJECT or FEATURE name from notes (NOT status, NOT goal)
- GOOD tags: "Reporting Module", "OAuth API", "CRM Dashboard", "Push Notifications"
- BAD tags: "Sprint Complete", "Goals Achieved", "Priorities" (statuses, not projects!)
- If multiple projects: pick MAIN one

Examples:

Input (English): "Team completed reporting module with Excel export. Product Owner accepted deliverables."
Output:
- summary_text: "Completed reporting module with Excel export, accepted by PO."
- goal_status: "achieved"
- suggested_tag: "Reporting Module" (project name, NOT "Sprint Complete")

Input (Polish): "Zespół ukończył moduł raportowania z eksportem do Excela. PO zaakceptował."
Output:
- summary_text: "Ukończono moduł raportowania z eksportem do Excela, zaakceptowany przez PO."
- goal_status: "achieved"
- suggested_tag: "Moduł raportowania" (nazwa projektu, NIE "Sprint ukończony")`;

    const user = `Meeting notes:

${content}`;

    return { system, user };
  }
}
