import { supabaseAdmin } from "./supabase-admin";
import type { AiSummaryDTO, GoalStatus } from "../../types";
import type { GenerateAiSummaryInput } from "../validators/ai.schemas";

/**
 * OpenRouter API response structure
 */
interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * AI-generated summary structure (parsed from OpenRouter response)
 */
interface AiGeneratedSummary {
  summary_text: string;
  goal_status: GoalStatus;
  suggested_tag: string | null;
}

/**
 * AI Generation Service
 * Handles AI summary generation using OpenRouter API
 */
export class AiGenerationService {
  private readonly openRouterApiKey: string;
  private readonly openRouterApiUrl = "https://openrouter.ai/api/v1/chat/completions";
  private readonly timeoutMs = 30000; // 30 seconds

  constructor() {
    const apiKey = import.meta.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY environment variable");
    }

    this.openRouterApiKey = apiKey;
  }

  /**
   * Generate AI summary from meeting notes
   *
   * @param input - Validated input data
   * @param userId - Optional user ID (null for anonymous calls)
   * @returns AI summary with generation metrics
   * @throws Error if generation fails or times out
   */
  async generateSummary(input: GenerateAiSummaryInput, userId: string | null = null): Promise<AiSummaryDTO> {
    const startTime = Date.now();

    try {
      // Call OpenRouter API with timeout
      const openRouterResponse = await this.callOpenRouter(input.original_content, input.model_name);

      // Parse AI response
      const aiSummary = this.parseResponse(openRouterResponse);

      // Calculate generation time
      const generationTimeMs = Date.now() - startTime;

      // Build response DTO
      const result: AiSummaryDTO = {
        summary_text: aiSummary.summary_text,
        goal_status: aiSummary.goal_status,
        suggested_tag: aiSummary.suggested_tag,
        generation_time_ms: generationTimeMs,
        tokens_used: openRouterResponse.usage.total_tokens,
      };

      // Log generation asynchronously (don't await, don't block response)
      this.logGeneration({
        userId,
        noteId: null, // No note ID for anonymous generation
        modelName: input.model_name,
        status: "success",
        generationTimeMs,
        tokensUsed: openRouterResponse.usage.total_tokens,
        errorMessage: null,
      }).catch((error) => {
        // Log error but don't throw - logging failure shouldn't block response
        // eslint-disable-next-line no-console
        console.error("Failed to log generation to database:", error);
      });

      return result;
    } catch (error) {
      const generationTimeMs = Date.now() - startTime;

      // Log failed generation asynchronously
      this.logGeneration({
        userId,
        noteId: null,
        modelName: input.model_name,
        status: "error",
        generationTimeMs,
        tokensUsed: null,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      }).catch((logError) => {
        // eslint-disable-next-line no-console
        console.error("Failed to log error to database:", logError);
      });

      // Re-throw error to be handled by API endpoint
      throw error;
    }
  }

  /**
   * Build prompt template for AI generation
   *
   * @param content - Raw meeting notes content
   * @returns System and user prompts for AI model
   */
  private buildPrompt(content: string): {
    system: string;
    user: string;
  } {
    const system = `You are an AI assistant that analyzes meeting notes and generates structured summaries.

Your task is to:
1. Create a concise summary of the meeting (2-4 sentences)
2. Determine if meeting goals were achieved ("achieved", "not_achieved", or "undefined" if no clear goal mentioned)
3. Suggest a relevant tag/category for this meeting (e.g., "Project Alpha", "Team Sync", "Client Meeting")

Respond ONLY with valid JSON in this exact format:
{
  "summary_text": "Your summary here...",
  "goal_status": "achieved|not_achieved|undefined",
  "suggested_tag": "Tag name or null"
}

Rules:
- summary_text: Must be 2-4 sentences, factual and concise
- goal_status: Must be exactly one of: "achieved", "not_achieved", "undefined"
- suggested_tag: Should be 1-3 words, descriptive; use null if no clear category
- Output MUST be valid JSON only, no additional text`;

    const user = `Analyze these meeting notes and provide a structured summary:

${content}`;

    return { system, user };
  }

  /**
   * Call OpenRouter API with timeout
   *
   * @param content - Meeting notes content
   * @param modelName - AI model to use
   * @returns OpenRouter API response
   * @throws Error if API call fails or times out
   */
  private async callOpenRouter(content: string, modelName: string): Promise<OpenRouterResponse> {
    const { system, user } = this.buildPrompt(content);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.openRouterApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.openRouterApiKey}`,
          "HTTP-Referer": "https://10xnotes.app", // Optional: your app URL
          "X-Title": "10xNotes", // Optional: your app name
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.3, // Lower temperature for more consistent outputs
          response_format: { type: "json_object" }, // Request JSON response
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as OpenRouterResponse;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout error
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("AI generation timeout (exceeded 30 seconds)");
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Parse AI response and validate structure
   *
   * @param response - OpenRouter API response
   * @returns Parsed AI summary
   * @throws Error if response is invalid or missing required fields
   */
  private parseResponse(response: OpenRouterResponse): AiGeneratedSummary {
    // Validate response structure
    if (!response.choices || response.choices.length === 0) {
      throw new Error("OpenRouter response missing choices");
    }

    const messageContent = response.choices[0].message.content;

    if (!messageContent) {
      throw new Error("OpenRouter response missing message content");
    }

    // Parse JSON response
    let parsed: unknown;
    try {
      parsed = JSON.parse(messageContent);
    } catch (error) {
      throw new Error(
        `Failed to parse AI response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // Validate parsed structure
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("summary_text" in parsed) ||
      !("goal_status" in parsed) ||
      !("suggested_tag" in parsed)
    ) {
      throw new Error("AI response missing required fields");
    }

    const { summary_text, goal_status, suggested_tag } = parsed as {
      summary_text: unknown;
      goal_status: unknown;
      suggested_tag: unknown;
    };

    // Validate field types
    if (typeof summary_text !== "string" || summary_text.length === 0) {
      throw new Error("Invalid summary_text in AI response");
    }

    if (typeof goal_status !== "string" || !["achieved", "not_achieved", "undefined"].includes(goal_status)) {
      throw new Error("Invalid goal_status in AI response");
    }

    if (suggested_tag !== null && typeof suggested_tag !== "string") {
      throw new Error("Invalid suggested_tag in AI response");
    }

    return {
      summary_text,
      goal_status: goal_status as GoalStatus,
      suggested_tag: suggested_tag as string | null,
    };
  }

  /**
   * Log generation metrics to database (asynchronous)
   *
   * @param data - Generation log data
   */
  private async logGeneration(data: {
    userId: string | null;
    noteId: string | null;
    modelName: string;
    status: string;
    generationTimeMs: number;
    tokensUsed: number | null;
    errorMessage: string | null;
  }): Promise<void> {
    try {
      const { error } = await supabaseAdmin.from("llm_generations").insert({
        user_id: data.userId,
        note_id: data.noteId,
        model_name: data.modelName,
        status: data.status,
        generation_time_ms: data.generationTimeMs,
        tokens_used: data.tokensUsed,
        error_message: data.errorMessage,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      // Log error but don't throw - this is fire-and-forget
      // eslint-disable-next-line no-console
      console.error("Failed to write to llm_generations table:", error);
    }
  }
}
