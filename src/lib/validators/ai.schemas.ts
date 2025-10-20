import { z } from "zod";

/**
 * Validation schema for POST /api/ai/generate
 * Validates input for AI summary generation
 */
export const generateAiSummarySchema = z.object({
  /**
   * Raw meeting notes content
   * - Required field
   * - Min 1 character (cannot be empty)
   * - Max 5000 characters (prevents abuse and excessive API costs)
   */
  original_content: z.string().min(1, "Content is required").max(5000, "Content exceeds 5000 character limit"),

  /**
   * AI model name for generation
   * - Optional field
   * - Defaults to 'openai/gpt-4o-mini' (cost-effective model)
   * - Must follow OpenRouter model naming convention: 'provider/model-name'
   */
  model_name: z
    .string()
    .regex(/^[\w-]+\/[\w-]+$/, "Model name must follow format: 'provider/model-name'")
    .optional()
    .default("openai/gpt-4o-mini"),
});

/**
 * TypeScript type inferred from Zod schema
 * Use this type for validated input data in service layer
 */
export type GenerateAiSummaryInput = z.infer<typeof generateAiSummarySchema>;
