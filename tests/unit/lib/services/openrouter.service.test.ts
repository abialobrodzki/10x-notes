import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  OpenRouterValidationError,
  OpenRouterAuthError,
  OpenRouterTimeoutError,
  OpenRouterNetworkError,
  OpenRouterServiceError,
  OpenRouterParseError,
  OpenRouterApiError,
  OpenRouterRateLimitError,
} from "@/lib/errors/openrouter.errors";
import { OpenRouterService } from "@/lib/services/openrouter.service";
import type { Database } from "@/db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Unit tests for OpenRouterService
 * Focus: Validation, error mapping, retry logic, JSON parsing
 * Coverage target: 75%
 */

describe("OpenRouterService", () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    // Set default API key for tests using Vitest's env stubbing
    vi.stubEnv("OPENROUTER_API_KEY", "sk-test-key-123");
  });

  afterEach(() => {
    // Restore original env
    vi.unstubAllEnvs();
  });

  describe("Constructor", () => {
    it("should throw OpenRouterAuthError when API key is missing", () => {
      vi.unstubAllEnvs();

      expect(() => new OpenRouterService()).toThrow(OpenRouterAuthError);
      expect(() => new OpenRouterService()).toThrow("OPENROUTER_API_KEY environment variable is required");
    });

    it("should throw OpenRouterAuthError when API key is empty string", () => {
      vi.stubEnv("OPENROUTER_API_KEY", "   ");

      expect(() => new OpenRouterService()).toThrow(OpenRouterAuthError);
    });

    it("should initialize with default options", () => {
      const service = new OpenRouterService();

      // No public getters, so we test by using the service
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("should accept custom options", () => {
      const mockSupabase = {} as SupabaseClient<Database>;
      const service = new OpenRouterService(mockSupabase, {
        timeoutMs: 30000,
        retryAttempts: 3,
        retryDelayMs: 2000,
        defaultModel: "anthropic/claude-3-sonnet",
        appUrl: "https://example.com",
        appName: "TestApp",
      });

      expect(service).toBeInstanceOf(OpenRouterService);
    });
  });

  describe("App Identification Headers", () => {
    it("should include HTTP-Referer and X-Title headers when appUrl and appName are provided", async () => {
      const service = new OpenRouterService(undefined, {
        appUrl: "https://10xnotes.app",
        appName: "10xNotes",
        retryAttempts: 0,
      });

      // Mock fetch to capture headers
      let capturedHeaders: Record<string, string> | undefined;
      global.fetch = vi.fn().mockImplementation((url, options) => {
        capturedHeaders = options?.headers as Record<string, string>;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "test",
            model: "x-ai/grok-4-fast",
            created: Date.now(),
            choices: [{ index: 0, message: { role: "assistant", content: "Success" }, finish_reason: "stop" }],
          }),
        });
      });

      await service.generate({
        systemMessage: "Test",
        userMessage: "Test",
      });

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders?.["HTTP-Referer"]).toBe("https://10xnotes.app");
      expect(capturedHeaders?.["X-Title"]).toBe("10xNotes");
    });

    it("should not include HTTP-Referer and X-Title headers when not provided", async () => {
      const service = new OpenRouterService(undefined, {
        retryAttempts: 0,
      });

      // Mock fetch to capture headers
      let capturedHeaders: Record<string, string> | undefined;
      global.fetch = vi.fn().mockImplementation((url, options) => {
        capturedHeaders = options?.headers as Record<string, string>;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "test",
            model: "x-ai/grok-4-fast",
            created: Date.now(),
            choices: [{ index: 0, message: { role: "assistant", content: "Success" }, finish_reason: "stop" }],
          }),
        });
      });

      await service.generate({
        systemMessage: "Test",
        userMessage: "Test",
      });

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders?.["HTTP-Referer"]).toBeUndefined();
      expect(capturedHeaders?.["X-Title"]).toBeUndefined();
    });
  });

  describe("Request Validation", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      service = new OpenRouterService();
    });

    it("should throw ValidationError when systemMessage is empty", async () => {
      await expect(
        service.generate({
          systemMessage: "",
          userMessage: "Test message",
        })
      ).rejects.toThrow(OpenRouterValidationError);

      await expect(
        service.generate({
          systemMessage: "",
          userMessage: "Test message",
        })
      ).rejects.toThrow("systemMessage is required and cannot be empty");
    });

    it("should throw ValidationError when systemMessage is whitespace only", async () => {
      await expect(
        service.generate({
          systemMessage: "   ",
          userMessage: "Test message",
        })
      ).rejects.toThrow(OpenRouterValidationError);
    });

    it("should throw ValidationError when userMessage is empty", async () => {
      await expect(
        service.generate({
          systemMessage: "You are a helpful assistant",
          userMessage: "",
        })
      ).rejects.toThrow(OpenRouterValidationError);

      await expect(
        service.generate({
          systemMessage: "You are a helpful assistant",
          userMessage: "",
        })
      ).rejects.toThrow("userMessage is required and cannot be empty");
    });

    it("should throw ValidationError when systemMessage exceeds max length", async () => {
      const longMessage = "a".repeat(50001);

      await expect(
        service.generate({
          systemMessage: longMessage,
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterValidationError);

      await expect(
        service.generate({
          systemMessage: longMessage,
          userMessage: "Test",
        })
      ).rejects.toThrow("systemMessage exceeds maximum length of 50000 characters");
    });

    it("should throw ValidationError when userMessage exceeds max length", async () => {
      const longMessage = "a".repeat(50001);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: longMessage,
        })
      ).rejects.toThrow(OpenRouterValidationError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: longMessage,
        })
      ).rejects.toThrow("userMessage exceeds maximum length of 50000 characters");
    });

    it("should throw ValidationError for invalid model name format", async () => {
      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          modelName: "invalid_model_name", // Missing provider/
        })
      ).rejects.toThrow(OpenRouterValidationError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          modelName: "invalid_model_name",
        })
      ).rejects.toThrow("modelName must be in format: provider/model-name");
    });

    it("should accept valid model name format", async () => {
      // Mock fetch to avoid actual API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "Response",
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      // This should NOT throw
      await service.generate({
        systemMessage: "Test",
        userMessage: "Test",
        modelName: "x-ai/grok-4-fast",
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    it("should throw ValidationError when responseSchema is missing name", async () => {
      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "",
            type: "object",
            properties: { test: { type: "string" } },
          },
        })
      ).rejects.toThrow(OpenRouterValidationError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "",
            type: "object",
            properties: { test: { type: "string" } },
          },
        })
      ).rejects.toThrow("responseSchema.name is required");
    });

    it('should throw ValidationError when responseSchema type is not "object"', async () => {
      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "TestSchema",
            // @ts-expect-error - Testing invalid type
            type: "string",
            properties: { test: { type: "string" } },
          },
        })
      ).rejects.toThrow(OpenRouterValidationError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "TestSchema",
            // @ts-expect-error - Testing invalid type
            type: "string",
            properties: { test: { type: "string" } },
          },
        })
      ).rejects.toThrow('responseSchema.type must be "object"');
    });

    it("should throw ValidationError when responseSchema has empty properties", async () => {
      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "TestSchema",
            type: "object",
            properties: {},
          },
        })
      ).rejects.toThrow(OpenRouterValidationError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "TestSchema",
            type: "object",
            properties: {},
          },
        })
      ).rejects.toThrow("responseSchema.properties must be defined and non-empty");
    });

    it("should throw ValidationError for invalid temperature", async () => {
      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          parameters: { temperature: -0.1 },
        })
      ).rejects.toThrow(OpenRouterValidationError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          parameters: { temperature: 2.1 },
        })
      ).rejects.toThrow(OpenRouterValidationError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          parameters: { temperature: 2.1 },
        })
      ).rejects.toThrow("temperature must be between 0 and 2");
    });

    it("should throw ValidationError for invalid top_p", async () => {
      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          parameters: { top_p: -0.1 },
        })
      ).rejects.toThrow(OpenRouterValidationError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          parameters: { top_p: 1.1 },
        })
      ).rejects.toThrow("top_p must be between 0 and 1");
    });

    it("should throw ValidationError for invalid frequency_penalty", async () => {
      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          parameters: { frequency_penalty: -2.1 },
        })
      ).rejects.toThrow("frequency_penalty must be between -2 and 2");

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          parameters: { frequency_penalty: 2.1 },
        })
      ).rejects.toThrow("frequency_penalty must be between -2 and 2");
    });

    it("should throw ValidationError for invalid presence_penalty", async () => {
      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          parameters: { presence_penalty: -2.1 },
        })
      ).rejects.toThrow("presence_penalty must be between -2 and 2");

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          parameters: { presence_penalty: 2.1 },
        })
      ).rejects.toThrow("presence_penalty must be between -2 and 2");
    });

    it("should throw ValidationError for invalid max_tokens", async () => {
      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          parameters: { max_tokens: 0 },
        })
      ).rejects.toThrow("max_tokens must be at least 1");

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          parameters: { max_tokens: -1 },
        })
      ).rejects.toThrow("max_tokens must be at least 1");
    });

    it("should successfully use valid model parameters in request", async () => {
      // Mock fetch to capture the payload
      let capturedPayload: unknown;
      global.fetch = vi.fn().mockImplementation((url, options) => {
        const body = options?.body;
        if (typeof body === "string") {
          capturedPayload = JSON.parse(body);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "test",
            model: "x-ai/grok-4-fast",
            created: Date.now(),
            choices: [{ index: 0, message: { role: "assistant", content: "Success" }, finish_reason: "stop" }],
          }),
        });
      });

      await service.generate({
        systemMessage: "Test",
        userMessage: "Test",
        parameters: {
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 0.9,
          frequency_penalty: 0.5,
          presence_penalty: 0.3,
        },
      });

      expect(capturedPayload).toBeDefined();
      const payload = capturedPayload as {
        temperature: number;
        max_tokens: number;
        top_p: number;
        frequency_penalty: number;
        presence_penalty: number;
      };
      expect(payload.temperature).toBe(0.7);
      expect(payload.max_tokens).toBe(1000);
      expect(payload.top_p).toBe(0.9);
      expect(payload.frequency_penalty).toBe(0.5);
      expect(payload.presence_penalty).toBe(0.3);
    });

    it("should handle parameters with only some fields defined (temperature undefined)", async () => {
      let capturedPayload: unknown;
      global.fetch = vi.fn().mockImplementation((url, options) => {
        const body = options?.body;
        if (typeof body === "string") {
          capturedPayload = JSON.parse(body);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "test",
            model: "x-ai/grok-4-fast",
            created: Date.now(),
            choices: [{ index: 0, message: { role: "assistant", content: "Success" }, finish_reason: "stop" }],
          }),
        });
      });

      await service.generate({
        systemMessage: "Test",
        userMessage: "Test",
        parameters: {
          max_tokens: 500,
          top_p: 0.95,
          // temperature, frequency_penalty, presence_penalty are undefined
        },
      });

      const payload = capturedPayload as {
        temperature?: number;
        max_tokens?: number;
        top_p?: number;
        frequency_penalty?: number;
        presence_penalty?: number;
      };

      expect(payload.temperature).toBeUndefined();
      expect(payload.max_tokens).toBe(500);
      expect(payload.top_p).toBe(0.95);
      expect(payload.frequency_penalty).toBeUndefined();
      expect(payload.presence_penalty).toBeUndefined();
    });
  });

  describe("Error Mapping (HTTP Status Codes)", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      // Disable retries to avoid test timeouts
      service = new OpenRouterService(undefined, { retryAttempts: 0 });
    });

    it("should map 401 to OpenRouterAuthError", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Invalid API key" } }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterAuthError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow("Authentication failed");
    });

    it("should map 403 to OpenRouterAuthError", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: "Forbidden" } }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterAuthError);
    });

    it("should map 429 to OpenRouterRateLimitError", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: "Rate limit exceeded" } }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterRateLimitError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow("Rate limit exceeded");
    });

    it("should map 400 to OpenRouterValidationError", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: "Invalid request" } }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterValidationError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow("Invalid request");
    });

    it("should map 503 to OpenRouterServiceError", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: { message: "Service unavailable" } }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterServiceError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow("Service unavailable");
    });

    it("should map 504 to OpenRouterServiceError", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 504,
        json: async () => ({ error: { message: "Gateway timeout" } }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterServiceError);
    });

    it("should map other 5xx to OpenRouterServiceError", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: "Internal server error" } }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterServiceError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow("Server error");
    });

    it("should map other status codes to OpenRouterApiError", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 418, // I'm a teapot
        json: async () => ({ error: { message: "Unexpected error" } }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterApiError);
    });

    it("should handle error response without JSON body", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("Not JSON");
        },
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterServiceError);
    });

    it("should handle error response with JSON but no error.message field", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          // Response has JSON but no error.message field
          status: "error",
          code: "INTERNAL_ERROR",
        }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterServiceError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow("OpenRouter API error (500)"); // Uses default message
    });
  });

  describe("Response Parsing", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      service = new OpenRouterService();
    });

    it("should throw ParseError when choices array is missing", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [], // Empty array
        }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterParseError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow("API response missing choices array");
    });

    it("should throw ParseError when message content is missing", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                // Missing content
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterParseError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow("API response missing message content");
    });

    it("should truncate long content in error message when JSON parsing fails", async () => {
      const longInvalidJson = "invalid json " + "x".repeat(600); // > 500 chars

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: longInvalidJson,
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "TestSchema",
            type: "object",
            properties: { test: { type: "string" } },
          },
        })
      ).rejects.toThrow(OpenRouterParseError);

      // Verify content is truncated in error message
      try {
        await service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "TestSchema",
            type: "object",
            properties: { test: { type: "string" } },
          },
        });
      } catch (error) {
        if (error instanceof OpenRouterParseError) {
          // Error message should contain truncated content (500 chars + ...)
          expect(error.message).toContain("...");
          expect(error.message.length).toBeLessThan(longInvalidJson.length);
        }
      }
    });

    it("should throw ParseError when finish_reason is 'length' (truncated)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "Partial response...",
              },
              finish_reason: "length", // Truncated by max_tokens
            },
          ],
        }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterParseError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow("Response truncated by max_tokens limit");
    });

    it("should throw ParseError for invalid JSON when schema is provided", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "Not valid JSON", // Invalid JSON
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "TestSchema",
            type: "object",
            properties: { test: { type: "string" } },
          },
        })
      ).rejects.toThrow(OpenRouterParseError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "TestSchema",
            type: "object",
            properties: { test: { type: "string" } },
          },
        })
      ).rejects.toThrow("Failed to parse JSON response");
    });

    it("should return raw text when no schema is provided", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "Plain text response",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        }),
      });

      const result = await service.generate({
        systemMessage: "Test",
        userMessage: "Test",
      });

      expect(result.data).toBe("Plain text response");
      expect(result.metadata.modelUsed).toBe("x-ai/grok-4-fast");
      expect(result.metadata.tokensUsed).toBe(15);
    });
  });

  describe("JSON Schema Validation", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      service = new OpenRouterService();
    });

    it("should throw ParseError when required field is missing", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({ name: "John" }), // Missing "age"
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "Person",
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
            },
            required: ["name", "age"],
          },
        })
      ).rejects.toThrow(OpenRouterParseError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "Person",
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
            },
            required: ["name", "age"],
          },
        })
      ).rejects.toThrow("Missing required field: age");
    });

    it("should throw ParseError for incorrect field type", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({ name: "John", age: "25" }), // age should be number
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "Person",
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
            },
          },
        })
      ).rejects.toThrow(OpenRouterParseError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "Person",
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
            },
          },
        })
      ).rejects.toThrow('Field "age" has incorrect type');
    });

    it("should validate and return typed data with schema", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({ name: "John", age: 25 }),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      const result = await service.generate<{ name: string; age: number }>({
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: {
          name: "Person",
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
          },
        },
      });

      expect(result.data).toEqual({ name: "John", age: 25 });
    });

    it("should validate array type", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({ tags: ["a", "b", "c"] }),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      const result = await service.generate({
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: {
          name: "Tags",
          type: "object",
          properties: {
            tags: { type: "array" },
          },
        },
      });

      expect(result.data).toEqual({ tags: ["a", "b", "c"] });
    });

    it("should validate null type", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({ optional_field: null }),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      const result = await service.generate({
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: {
          name: "WithNull",
          type: "object",
          properties: {
            optional_field: { type: "null" },
          },
        },
      });

      expect(result.data).toEqual({ optional_field: null });
    });

    it("should validate boolean type", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({ is_active: true }),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      const result = await service.generate({
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: {
          name: "WithBoolean",
          type: "object",
          properties: {
            is_active: { type: "boolean" },
          },
        },
      });

      expect(result.data).toEqual({ is_active: true });
    });

    it("should validate object type (nested objects)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({ metadata: { key: "value", count: 42 } }),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      const result = await service.generate({
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: {
          name: "WithNestedObject",
          type: "object",
          properties: {
            metadata: { type: "object" },
          },
        },
      });

      expect(result.data).toEqual({ metadata: { key: "value", count: 42 } });
    });

    it("should pass validation for unknown field types", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({ custom_field: "any value" }),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      // Schema with unknown type should pass validation (default case)
      const result = await service.generate({
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: {
          name: "WithUnknownType",
          type: "object",
          properties: {
            custom_field: { type: "unknown_type" as "string" }, // Cast to satisfy TypeScript
          },
        },
      });

      expect(result.data).toEqual({ custom_field: "any value" });
    });

    it("should validate optional fields that are not present in response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({ name: "John" }), // Missing optional "age" field
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      const result = await service.generate({
        systemMessage: "Test",
        userMessage: "Test",
        responseSchema: {
          name: "Person",
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" }, // Optional field not in response
          },
          required: ["name"], // Only name is required
        },
      });

      // Should pass validation since age is optional
      expect(result.data).toEqual({ name: "John" });
    });

    it("should throw ParseError when response is not an object", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify(["not", "an", "object"]), // Array instead of object
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "TestSchema",
            type: "object",
            properties: { test: { type: "string" } },
          },
        })
      ).rejects.toThrow(OpenRouterParseError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          responseSchema: {
            name: "TestSchema",
            type: "object",
            properties: { test: { type: "string" } },
          },
        })
      ).rejects.toThrow("Response data must be an object");
    });
  });

  describe("Timeout Handling", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      service = new OpenRouterService(undefined, { timeoutMs: 100, retryAttempts: 0 });
    });

    it("should throw TimeoutError when request exceeds timeout", async () => {
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => {
              const error = new Error("Aborted");
              error.name = "AbortError";
              reject(error);
            }, 50);
          })
      );

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterTimeoutError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow("Request timed out after 100ms");
    });
  });

  describe("Network Error Handling", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      // Disable retries to avoid test timeouts
      service = new OpenRouterService(undefined, { retryAttempts: 0 });
    });

    it("should throw NetworkError on fetch failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterNetworkError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow("Network error occurred while calling OpenRouter API");
    });

    it("should wrap unknown errors as OpenRouterApiError", async () => {
      // Simulate an unknown error type (not TypeError, not AbortError, not a known OpenRouter error)
      global.fetch = vi.fn().mockRejectedValue(new RangeError("Unexpected error from a library"));

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterApiError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow("Unexpected error calling OpenRouter API: Unexpected error from a library");
    });

    it("should wrap non-Error unknown exceptions as OpenRouterApiError", async () => {
      // Simulate a non-Error type thrown (e.g., string, number, or object)
      global.fetch = vi.fn().mockRejectedValue("Something went wrong with the library");

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterApiError);

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow("Unexpected error calling OpenRouter API: Something went wrong with the library");
    });
  });

  describe("Retry Logic", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      // Enable retries for these tests
      service = new OpenRouterService(undefined, { retryAttempts: 2, retryDelayMs: 10 });
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should retry on timeout error", async () => {
      let callCount = 0;

      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: timeout
          const error = new Error("Aborted");
          error.name = "AbortError";
          return Promise.reject(error);
        }
        // Second call: success
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "test",
            model: "x-ai/grok-4-fast",
            created: Date.now(),
            choices: [
              { index: 0, message: { role: "assistant", content: "Success after retry" }, finish_reason: "stop" },
            ],
          }),
        });
      });

      const promise = service.generate({
        systemMessage: "Test",
        userMessage: "Test",
      });

      // Fast-forward timers for retry delay
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.data).toBe("Success after retry");
      expect(callCount).toBe(2); // Should have retried once
    });

    it("should retry on 503 service error", async () => {
      let callCount = 0;

      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: async () => ({ error: { message: "Service unavailable" } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "test",
            model: "x-ai/grok-4-fast",
            created: Date.now(),
            choices: [{ index: 0, message: { role: "assistant", content: "Success" }, finish_reason: "stop" }],
          }),
        });
      });

      const promise = service.generate({
        systemMessage: "Test",
        userMessage: "Test",
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.data).toBe("Success");
      expect(callCount).toBe(2);
    });

    it("should not retry on non-retryable errors (401)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Unauthorized" } }),
      });

      await expect(
        service.generate({
          systemMessage: "Test",
          userMessage: "Test",
        })
      ).rejects.toThrow(OpenRouterAuthError);

      expect(global.fetch).toHaveBeenCalledTimes(1); // No retry
    });

    it("should use exponential backoff for retries", async () => {
      let callCount = 0;

      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          const error = new Error("Aborted");
          error.name = "AbortError";
          return Promise.reject(error);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "test",
            model: "x-ai/grok-4-fast",
            created: Date.now(),
            choices: [{ index: 0, message: { role: "assistant", content: "Success" }, finish_reason: "stop" }],
          }),
        });
      });

      const promise = service.generate({
        systemMessage: "Test",
        userMessage: "Test",
      });

      await vi.runAllTimersAsync();
      await promise;

      // Should have retried 2 times with exponential backoff: 10ms, 20ms
      expect(callCount).toBe(3);
    });
  });

  describe("Telemetry Logging", () => {
    let service: OpenRouterService;
    let mockSupabase: SupabaseClient<Database>;

    beforeEach(() => {
      mockSupabase = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as unknown as SupabaseClient<Database>;

      service = new OpenRouterService(mockSupabase);
    });

    it("should log successful generation to telemetry", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [{ index: 0, message: { role: "assistant", content: "Response" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      });

      await service.generate({
        systemMessage: "Test",
        userMessage: "Test",
        userId: "user-123",
        noteId: "note-456",
      });

      // Wait for async telemetry
      await new Promise((resolve) => setTimeout(resolve, 10));

      const fromMock = mockSupabase.from as ReturnType<typeof vi.fn>;
      expect(fromMock).toHaveBeenCalledWith("llm_generations");

      const insertMock = fromMock.mock.results[0].value.insert;
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          note_id: "note-456",
          model_name: "x-ai/grok-4-fast",
          status: "success",
          tokens_used: 15,
        })
      );
    });

    it("should log failed generation to telemetry", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: "Bad request" } }),
      });

      try {
        await service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          userId: "user-123",
        });
      } catch {
        // Expected error
      }

      // Wait for async telemetry
      await new Promise((resolve) => setTimeout(resolve, 10));

      const fromMock = mockSupabase.from as ReturnType<typeof vi.fn>;
      const insertMock = fromMock.mock.results[0].value.insert;

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          status: "failure",
          error_message: expect.stringContaining("Invalid request"),
        })
      );
    });

    it("should not throw when telemetry logging fails", async () => {
      const mockSupabaseError = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Telemetry DB error" },
          }),
        }),
      } as unknown as SupabaseClient<Database>;

      const serviceWithError = new OpenRouterService(mockSupabaseError);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [{ index: 0, message: { role: "assistant", content: "Response" }, finish_reason: "stop" }],
        }),
      });

      // Should not throw even if telemetry fails
      const result = await serviceWithError.generate({
        systemMessage: "Test",
        userMessage: "Test",
      });

      expect(result.data).toBe("Response");
    });

    it("should handle telemetry logging exception gracefully", async () => {
      const mockSupabaseThrow = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockRejectedValue(new Error("Telemetry exception")),
        }),
      } as unknown as SupabaseClient<Database>;

      const serviceWithThrow = new OpenRouterService(mockSupabaseThrow);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [{ index: 0, message: { role: "assistant", content: "Response" }, finish_reason: "stop" }],
        }),
      });

      // Should not throw
      const result = await serviceWithThrow.generate({
        systemMessage: "Test",
        userMessage: "Test",
      });

      expect(result.data).toBe("Response");
    });

    it("should log non-Error failures to telemetry with String(error)", async () => {
      global.fetch = vi.fn().mockRejectedValue("Network failure string"); // Non-Error type

      try {
        await service.generate({
          systemMessage: "Test",
          userMessage: "Test",
          userId: "user-789",
        });
      } catch {
        // Expected error
      }

      // Wait for async telemetry
      await new Promise((resolve) => setTimeout(resolve, 10));

      const fromMock = mockSupabase.from as ReturnType<typeof vi.fn>;
      const insertMock = fromMock.mock.results[0].value.insert;

      // Non-Error gets wrapped as OpenRouterApiError in callApi
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-789",
          status: "failure",
          error_message: "Unexpected error calling OpenRouter API: Network failure string",
        })
      );
    });

    it("should not log telemetry when supabase client is not provided", async () => {
      // Service without Supabase client - should skip telemetry
      const serviceWithoutSupabase = new OpenRouterService(undefined);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [{ index: 0, message: { role: "assistant", content: "Response" }, finish_reason: "stop" }],
        }),
      });

      // Should not throw even without Supabase
      await serviceWithoutSupabase.generate({
        systemMessage: "Test",
        userMessage: "Test",
        userId: "user-123",
      });

      // Wait for any potential async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      // No telemetry should be logged (no Supabase client to log to)
      // Test passes if no errors thrown
    });
  });

  describe("generateWithSchema helper", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      service = new OpenRouterService();
    });

    it("should call generate with schema parameters", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test",
          model: "x-ai/grok-4-fast",
          created: Date.now(),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({ result: "success" }),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      const result = await service.generateWithSchema<{ result: string }>(
        "TestSchema",
        {
          type: "object",
          properties: {
            result: { type: "string" },
          },
        },
        "System message",
        "User message",
        {
          modelName: "anthropic/claude-3-sonnet",
          parameters: { temperature: 0.5 },
        }
      );

      expect(result.data).toEqual({ result: "success" });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"model":"anthropic/claude-3-sonnet"'),
        })
      );
    });
  });
});
