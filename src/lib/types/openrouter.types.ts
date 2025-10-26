/**
 * OpenRouter Service Type Definitions
 *
 * Type-safe contracts for OpenRouter API interactions.
 */

/**
 * JSON Schema definition for structured responses
 * Used to enforce strict output format from LLM
 */
export interface JSONSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown; // Allow additional schema properties
}

/**
 * Model generation parameters
 * Controls LLM behavior and output characteristics
 */
export interface ModelParameters {
  /** Temperature for randomness (0-2, lower = more deterministic) */
  temperature?: number;
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** Top-p sampling (0-1) */
  top_p?: number;
  /** Frequency penalty (-2 to 2) */
  frequency_penalty?: number;
  /** Presence penalty (-2 to 2) */
  presence_penalty?: number;
}

/**
 * Request to OpenRouter service
 * Generic type T represents expected response structure
 */
export interface OpenRouterRequest<_T = string> {
  /** System message defining LLM behavior/role */
  systemMessage: string;
  /** User message with the actual prompt/task */
  userMessage: string;
  /** Model name in format: provider/model-name */
  modelName?: string;
  /** JSON Schema for structured output (when T is not string) */
  responseSchema?: JSONSchema & { name: string };
  /** Model generation parameters */
  parameters?: ModelParameters;
  /** User ID for telemetry tracking */
  userId?: string;
  /** Note ID for telemetry tracking */
  noteId?: string;
}

/**
 * Response metadata from generation
 * Includes model, token usage, and performance metrics
 */
export interface GenerationMetadata {
  /** Model that was actually used for generation */
  modelUsed: string;
  /** Total tokens consumed (prompt + completion) */
  tokensUsed?: number;
  /** Time taken for generation in milliseconds */
  generationTimeMs: number;
}

/**
 * Response from OpenRouter service
 * Generic type T represents the actual response data structure
 */
export interface OpenRouterResponse<T = string> {
  /** Generated data (typed according to schema or string) */
  data: T;
  /** Metadata about the generation */
  metadata: GenerationMetadata;
}

/**
 * Configuration options for OpenRouter service
 */
export interface OpenRouterServiceOptions {
  /** Request timeout in milliseconds (default: 60000) */
  timeoutMs?: number;
  /** Number of retry attempts for transient failures (default: 2) */
  retryAttempts?: number;
  /** Base delay between retries in milliseconds (default: 1000) */
  retryDelayMs?: number;
  /** Default model to use if not specified in request */
  defaultModel?: string;
  /** Application URL for OpenRouter tracking */
  appUrl?: string;
  /** Application name for OpenRouter tracking */
  appName?: string;
}

/**
 * Internal: OpenRouter API request payload
 * Matches OpenRouter API specification
 */
export interface OpenRouterPayload {
  model: string;
  messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: JSONSchema;
    };
  };
}

/**
 * Internal: OpenRouter API response structure
 * Based on OpenAI-compatible format
 */
export interface OpenRouterApiResponse {
  id: string;
  model: string;
  created: number;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
