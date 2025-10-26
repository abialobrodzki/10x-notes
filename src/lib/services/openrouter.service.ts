/**
 * OpenRouter Service
 *
 * Secure, type-safe communication layer for OpenRouter API.
 * Provides LLM response generation with retry logic, telemetry, and error handling.
 */

import {
  OpenRouterValidationError,
  OpenRouterAuthError,
  OpenRouterTimeoutError,
  OpenRouterNetworkError,
  OpenRouterServiceError,
  OpenRouterParseError,
  OpenRouterApiError,
  OpenRouterRateLimitError,
} from "../errors/openrouter.errors";
import type { Database } from "../../db/database.types";
import type {
  JSONSchema,
  ModelParameters,
  OpenRouterRequest,
  OpenRouterResponse,
  OpenRouterServiceOptions,
  OpenRouterPayload,
  OpenRouterApiResponse,
} from "../types/openrouter.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * OpenRouter Service
 * Main service for LLM generation via OpenRouter API
 */
export class OpenRouterService {
  private readonly openRouterApiKey: string;
  private readonly openRouterApiUrl: string = "https://openrouter.ai/api/v1/chat/completions";
  private readonly timeoutMs: number;
  private readonly retryAttempts: number;
  private readonly retryDelayMs: number;
  private readonly defaultModel: string;
  private readonly appUrl?: string;
  private readonly appName?: string;
  private readonly supabase?: SupabaseClient<Database>;

  constructor(supabase?: SupabaseClient<Database>, options?: OpenRouterServiceOptions) {
    // Validate and load API key from environment
    const apiKey = import.meta.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      throw new OpenRouterAuthError("OPENROUTER_API_KEY environment variable is required");
    }
    this.openRouterApiKey = apiKey;

    // Store Supabase client for telemetry (optional)
    this.supabase = supabase;

    // Set configuration with defaults
    this.timeoutMs = options?.timeoutMs ?? 30000; // 30 seconds
    this.retryAttempts = options?.retryAttempts ?? 2;
    this.retryDelayMs = options?.retryDelayMs ?? 1000; // 1 second base delay
    this.defaultModel = options?.defaultModel ?? "openai/gpt-5-nano";
    this.appUrl = options?.appUrl;
    this.appName = options?.appName;
  }

  /**
   * Main generation method with full type safety
   * Generic type T represents the expected response structure
   *
   * @param request - Generation request with messages, model, schema, and parameters
   * @returns Typed response with data and metadata
   * @throws OpenRouterError subclasses for various failure scenarios
   */
  async generate<T = string>(request: OpenRouterRequest<T>): Promise<OpenRouterResponse<T>> {
    const startTime = Date.now();

    try {
      // Step 1: Validate request
      this.validateRequest(request);

      // Step 2: Build OpenRouter payload
      const payload = this.buildOpenRouterPayload(request);

      // Step 3: Call API with retry logic
      const apiResponse = await this.callWithRetry(payload);

      // Step 4: Parse and validate response
      const parsedData = this.parseResponse<T>(apiResponse, request.responseSchema);

      // Step 5: Prepare response with metadata
      const generationTimeMs = Date.now() - startTime;
      const response: OpenRouterResponse<T> = {
        data: parsedData,
        metadata: {
          modelUsed: apiResponse.model,
          tokensUsed: apiResponse.usage?.total_tokens,
          generationTimeMs,
        },
      };

      // Step 6: Log telemetry (fire-and-forget, non-blocking)
      this.logGeneration({
        userId: request.userId,
        noteId: request.noteId,
        modelName: apiResponse.model,
        status: "success",
        generationTimeMs,
        tokensUsed: apiResponse.usage?.total_tokens,
      });

      return response;
    } catch (error) {
      // Log failed generation
      const generationTimeMs = Date.now() - startTime;
      this.logGeneration({
        userId: request.userId,
        noteId: request.noteId,
        modelName: request.modelName ?? this.defaultModel,
        status: "error",
        generationTimeMs,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Validate request parameters before sending to API
   * Ensures all inputs meet contract requirements
   *
   * @param request - Request to validate
   * @throws OpenRouterValidationError if validation fails
   */
  private validateRequest<T>(request: OpenRouterRequest<T>): void {
    // Validate required fields
    if (!request.systemMessage || request.systemMessage.trim() === "") {
      throw new OpenRouterValidationError("systemMessage is required and cannot be empty");
    }

    if (!request.userMessage || request.userMessage.trim() === "") {
      throw new OpenRouterValidationError("userMessage is required and cannot be empty");
    }

    // Validate message lengths (prevent excessively large inputs)
    const maxMessageLength = 50000; // ~50k characters
    if (request.systemMessage.length > maxMessageLength) {
      throw new OpenRouterValidationError(`systemMessage exceeds maximum length of ${maxMessageLength} characters`);
    }

    if (request.userMessage.length > maxMessageLength) {
      throw new OpenRouterValidationError(`userMessage exceeds maximum length of ${maxMessageLength} characters`);
    }

    // Validate model name format (provider/model-name)
    if (request.modelName && !/^[a-z0-9-]+\/[a-z0-9-._]+$/i.test(request.modelName)) {
      throw new OpenRouterValidationError("modelName must be in format: provider/model-name (e.g., openai/gpt-5-nano)");
    }

    // Validate response schema if provided
    if (request.responseSchema) {
      if (!request.responseSchema.name || request.responseSchema.name.trim() === "") {
        throw new OpenRouterValidationError("responseSchema.name is required");
      }

      if (request.responseSchema.type !== "object") {
        throw new OpenRouterValidationError('responseSchema.type must be "object"');
      }

      if (!request.responseSchema.properties || Object.keys(request.responseSchema.properties).length === 0) {
        throw new OpenRouterValidationError("responseSchema.properties must be defined and non-empty");
      }
    }

    // Validate parameters if provided
    if (request.parameters) {
      const params = request.parameters;

      if (params.temperature !== undefined && (params.temperature < 0 || params.temperature > 2)) {
        throw new OpenRouterValidationError("temperature must be between 0 and 2");
      }

      if (params.top_p !== undefined && (params.top_p < 0 || params.top_p > 1)) {
        throw new OpenRouterValidationError("top_p must be between 0 and 1");
      }

      if (params.frequency_penalty !== undefined && (params.frequency_penalty < -2 || params.frequency_penalty > 2)) {
        throw new OpenRouterValidationError("frequency_penalty must be between -2 and 2");
      }

      if (params.presence_penalty !== undefined && (params.presence_penalty < -2 || params.presence_penalty > 2)) {
        throw new OpenRouterValidationError("presence_penalty must be between -2 and 2");
      }

      if (params.max_tokens !== undefined && params.max_tokens < 1) {
        throw new OpenRouterValidationError("max_tokens must be at least 1");
      }
    }
  }

  /**
   * Build OpenRouter API payload from request
   * Constructs payload conforming to OpenRouter specification
   *
   * @param request - Generation request
   * @returns Formatted payload for OpenRouter API
   */
  private buildOpenRouterPayload<T>(request: OpenRouterRequest<T>): OpenRouterPayload {
    const payload: OpenRouterPayload = {
      model: request.modelName ?? this.defaultModel,
      messages: [
        {
          role: "system",
          content: request.systemMessage,
        },
        {
          role: "user",
          content: request.userMessage,
        },
      ],
    };

    // Add response format if schema provided
    if (request.responseSchema) {
      payload.response_format = {
        type: "json_schema",
        json_schema: {
          name: request.responseSchema.name,
          strict: true,
          schema: request.responseSchema,
        },
      };
    }

    // Add model parameters if provided
    if (request.parameters) {
      if (request.parameters.temperature !== undefined) {
        payload.temperature = request.parameters.temperature;
      }
      if (request.parameters.max_tokens !== undefined) {
        payload.max_tokens = request.parameters.max_tokens;
      }
      if (request.parameters.top_p !== undefined) {
        payload.top_p = request.parameters.top_p;
      }
      if (request.parameters.frequency_penalty !== undefined) {
        payload.frequency_penalty = request.parameters.frequency_penalty;
      }
      if (request.parameters.presence_penalty !== undefined) {
        payload.presence_penalty = request.parameters.presence_penalty;
      }
    }

    return payload;
  }

  /**
   * Call OpenRouter API with retry logic for transient failures
   * Implements exponential backoff for retryable errors
   *
   * @param payload - OpenRouter API payload
   * @returns API response
   * @throws OpenRouterError if all retry attempts fail or non-retryable error occurs
   */
  private async callWithRetry(payload: OpenRouterPayload): Promise<OpenRouterApiResponse> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        return await this.callOpenRouterApi(payload);
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        const isRetryable =
          error instanceof OpenRouterTimeoutError ||
          error instanceof OpenRouterNetworkError ||
          error instanceof OpenRouterServiceError ||
          error instanceof OpenRouterRateLimitError ||
          (error instanceof OpenRouterApiError && error.retryable);

        // Don't retry if error is not retryable or this was the last attempt
        if (!isRetryable || attempt === this.retryAttempts) {
          throw error;
        }

        // Calculate delay with exponential backoff: baseDelay * 2^attempt
        const delay = this.retryDelayMs * Math.pow(2, attempt);

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError ?? new OpenRouterApiError("All retry attempts failed");
  }

  /**
   * Low-level HTTP call to OpenRouter API
   * Uses AbortController for timeout management
   *
   * @param payload - OpenRouter API payload
   * @returns Raw API response
   * @throws OpenRouterError subclasses based on failure type
   */
  private async callOpenRouterApi(payload: OpenRouterPayload): Promise<OpenRouterApiResponse> {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.openRouterApiKey}`,
      };

      // Add app-identifying headers if provided
      if (this.appUrl) {
        headers["HTTP-Referer"] = this.appUrl;
      }
      if (this.appName) {
        headers["X-Title"] = this.appName;
      }

      // Make HTTP request
      const response = await fetch(this.openRouterApiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      // Handle HTTP errors
      if (!response.ok) {
        await this.handleApiError(response);
      }

      // Parse JSON response
      const data = (await response.json()) as OpenRouterApiResponse;
      return data;
    } catch (error) {
      // Handle abort/timeout
      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenRouterTimeoutError(`Request timed out after ${this.timeoutMs}ms`);
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new OpenRouterNetworkError("Network error occurred while calling OpenRouter API");
      }

      // Re-throw OpenRouter errors
      if (
        error instanceof OpenRouterValidationError ||
        error instanceof OpenRouterAuthError ||
        error instanceof OpenRouterRateLimitError ||
        error instanceof OpenRouterServiceError ||
        error instanceof OpenRouterApiError
      ) {
        throw error;
      }

      // Wrap unknown errors
      throw new OpenRouterApiError(
        `Unexpected error calling OpenRouter API: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Map HTTP status codes to domain errors
   * Provides consistent error handling across the service
   *
   * @param response - HTTP response from OpenRouter API
   * @throws Appropriate OpenRouterError subclass
   */
  private async handleApiError(response: Response): Promise<never> {
    const statusCode = response.status;
    let errorMessage = `OpenRouter API error (${statusCode})`;

    // Try to extract error message from response body
    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // Ignore JSON parse errors, use default message
    }

    // Map status codes to specific error types
    switch (statusCode) {
      case 401:
      case 403:
        throw new OpenRouterAuthError(`Authentication failed: ${errorMessage}`);
      case 429:
        throw new OpenRouterRateLimitError(`Rate limit exceeded: ${errorMessage}`);
      case 400:
        throw new OpenRouterValidationError(`Invalid request: ${errorMessage}`);
      case 503:
      case 504:
        throw new OpenRouterServiceError(`Service unavailable: ${errorMessage}`);
      default:
        if (statusCode >= 500) {
          throw new OpenRouterServiceError(`Server error: ${errorMessage}`);
        }
        throw new OpenRouterApiError(errorMessage, statusCode);
    }
  }

  /**
   * Parse and validate API response
   * Extracts content and validates structure/types
   *
   * @param apiResponse - Raw API response
   * @param schema - Optional JSON schema for validation
   * @returns Parsed and validated data
   * @throws OpenRouterParseError if parsing or validation fails
   */
  private parseResponse<T>(apiResponse: OpenRouterApiResponse, schema?: JSONSchema & { name: string }): T {
    // Validate response structure
    if (!apiResponse.choices || apiResponse.choices.length === 0) {
      throw new OpenRouterParseError("API response missing choices array");
    }

    const choice = apiResponse.choices[0];
    if (!choice.message || typeof choice.message.content !== "string") {
      throw new OpenRouterParseError("API response missing message content");
    }

    const content = choice.message.content;

    // If no schema, return raw text
    if (!schema) {
      return content as T;
    }

    // Parse JSON content
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(content);
    } catch (error) {
      throw new OpenRouterParseError(
        `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Validate against schema
    this.validateAgainstSchema(parsedData, schema);

    return parsedData as T;
  }

  /**
   * Validate data against JSON Schema
   * Performs structural and type validation
   *
   * @param data - Data to validate
   * @param schema - JSON Schema to validate against
   * @throws OpenRouterParseError if validation fails
   */
  private validateAgainstSchema(data: unknown, schema: JSONSchema): void {
    // Check if data is an object
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new OpenRouterParseError("Response data must be an object");
    }

    const dataObj = data as Record<string, unknown>;

    // Validate required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredField of schema.required) {
        if (!(requiredField in dataObj)) {
          throw new OpenRouterParseError(`Missing required field: ${requiredField}`);
        }
      }
    }

    // Validate field types
    if (schema.properties) {
      for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
        if (fieldName in dataObj) {
          const fieldValue = dataObj[fieldName];
          const expectedType = (fieldSchema as { type?: string }).type;

          if (expectedType && !this.matchesType(fieldValue, expectedType)) {
            throw new OpenRouterParseError(
              `Field "${fieldName}" has incorrect type. Expected: ${expectedType}, Got: ${typeof fieldValue}`
            );
          }
        }
      }
    }
  }

  /**
   * Check if value matches expected JSON Schema type
   * Supports primitive types and simple collections
   *
   * @param value - Value to check
   * @param type - Expected JSON Schema type
   * @returns True if value matches type
   */
  private matchesType(value: unknown, type: string): boolean {
    switch (type) {
      case "string":
        return typeof value === "string";
      case "number":
      case "integer":
        return typeof value === "number";
      case "boolean":
        return typeof value === "boolean";
      case "null":
        return value === null;
      case "array":
        return Array.isArray(value);
      case "object":
        return typeof value === "object" && value !== null && !Array.isArray(value);
      default:
        return true; // Unknown types pass validation
    }
  }

  /**
   * Convenience wrapper for generating with JSON Schema
   * Simplifies calls when using structured output
   *
   * NOTE: For Zod schema support, use zod-to-json-schema package
   * to convert Zod schemas to JSON Schema before calling this method.
   *
   * @param schemaName - Name for the response schema
   * @param schema - JSON Schema definition
   * @param systemMessage - System message defining LLM behavior
   * @param userMessage - User message with the prompt
   * @param options - Optional generation options
   * @returns Typed response with validated data
   * @throws OpenRouterError subclasses for various failure scenarios
   */
  async generateWithSchema<T>(
    schemaName: string,
    schema: JSONSchema,
    systemMessage: string,
    userMessage: string,
    options?: {
      modelName?: string;
      parameters?: ModelParameters;
      userId?: string;
      noteId?: string;
    }
  ): Promise<OpenRouterResponse<T>> {
    return this.generate<T>({
      systemMessage,
      userMessage,
      responseSchema: {
        name: schemaName,
        ...schema,
      },
      modelName: options?.modelName,
      parameters: options?.parameters,
      userId: options?.userId,
      noteId: options?.noteId,
    });
  }

  /**
   * Log generation telemetry to Supabase
   * Fire-and-forget operation that never blocks response
   *
   * @param data - Telemetry data to log
   */
  private logGeneration(data: {
    userId?: string;
    noteId?: string;
    modelName: string;
    status: "success" | "error";
    generationTimeMs: number;
    tokensUsed?: number;
    errorMessage?: string;
  }): void {
    // Skip if no Supabase client
    if (!this.supabase) {
      return;
    }

    // Fire-and-forget: don't await, don't block
    // Use async IIFE to handle errors without blocking
    const supabaseClient = this.supabase; // Extract for use in async context
    (async () => {
      try {
        const result = await supabaseClient.from("llm_generations").insert({
          user_id: data.userId ?? null,
          note_id: data.noteId ?? null,
          model_name: data.modelName,
          status: data.status,
          generation_time_ms: data.generationTimeMs,
          tokens_used: data.tokensUsed ?? null,
          error_message: data.errorMessage ?? null,
        });

        // Only log errors to server console (no exceptions)
        if (result.error) {
          // eslint-disable-next-line no-console
          console.error("[OpenRouterService] Failed to log telemetry:", result.error);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[OpenRouterService] Telemetry logging exception:", error);
      }
    })();
  }
}
