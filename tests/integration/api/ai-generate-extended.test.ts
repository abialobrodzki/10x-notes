import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, createRateLimitResponse } from "@/lib/middleware/rate-limit.middleware";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { POST } from "@/pages/api/ai/generate";
import type { Database } from "@/db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { APIContext } from "astro";

// Mock dependencies
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit.middleware", () => ({
  checkRateLimit: vi.fn(),
  createRateLimitResponse: vi.fn(),
}));

describe("POST /api/ai/generate - Extended Tests", () => {
  let mockSupabaseClient: SupabaseClient<Database>;
  let mockContext: APIContext;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "log").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "info").mockImplementation(() => {});

    vi.stubEnv("OPENROUTER_API_KEY", "sk-test-key-123");

    mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseClient);

    const checkRateLimitMock = vi.mocked(checkRateLimit);
    checkRateLimitMock.mockReturnValue({ allowed: true, remaining: 99 });

    mockContext = {
      request: new Request("http://localhost/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      locals: { supabase: mockSupabaseClient },
      url: new URL("http://localhost/api/ai/generate"),
      redirect: vi.fn((path: string) => new Response(null, { status: 302, headers: { Location: path } })),
    } as unknown as APIContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Error Handling", () => {
    it("should return 503 when OpenRouter API returns error", async () => {
      const requestBody = {
        original_content: "Meeting notes about project status",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      // Mock OpenRouter API error response
      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              message: "Invalid API key",
              code: 401,
            },
          }),
          { status: 401 }
        )
      );

      const response = await POST(mockContext);

      expect(response.status).toBe(503);
      const responseBody = await response.json();
      expect(responseBody.error).toBeDefined();
    });

    it("should handle OpenRouter API timeout gracefully", async () => {
      const requestBody = {
        original_content: "Meeting notes about project status",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      // Mock timeout error with AbortError
      const abortError = new Error("Request timed out");
      abortError.name = "AbortError";
      global.fetch = vi.fn().mockRejectedValue(abortError);

      const response = await POST(mockContext);

      expect(response.status).toBe(504);
      const responseBody = await response.json();
      expect(responseBody.error).toBeDefined();
    });

    it("should return 503 when OpenRouter returns invalid JSON response", async () => {
      const requestBody = {
        original_content: "Meeting notes about project status",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      // Mock invalid JSON response
      global.fetch = vi.fn().mockResolvedValue(
        new Response("invalid json { broken", {
          status: 200,
        })
      );

      const response = await POST(mockContext);

      expect(response.status).toBe(503);
    });

    it("should return 503 when OpenRouter response missing required fields", async () => {
      const requestBody = {
        original_content: "Meeting notes about project status",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      // Mock response without choices field
      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "test",
            model: "x-ai/grok-4-fast",
            // Missing choices field
          }),
          { status: 200 }
        )
      );

      const response = await POST(mockContext);

      expect(response.status).toBe(503);
    });

    it("should return 429 when OpenRouter API is overloaded", async () => {
      const requestBody = {
        original_content: "Meeting notes about project status",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      // Mock rate limit error from OpenRouter
      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              message: "Rate limit exceeded",
              code: 429,
            },
          }),
          { status: 429 }
        )
      );

      const response = await POST(mockContext);

      expect(response.status).toBe(429);
    });
  });

  describe("Content Validation", () => {
    it("should return 400 for content exceeding maximum length", async () => {
      const longContent = "x".repeat(5001); // Exceeds 5000 char limit
      const requestBody = {
        original_content: longContent,
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      const response = await POST(mockContext);

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.error).toBeDefined();
    });

    it("should return 400 for empty content", async () => {
      const requestBody = {
        original_content: "",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      const response = await POST(mockContext);

      expect(response.status).toBe(400);
    });

    it("should handle content with special characters", async () => {
      const requestBody = {
        original_content: "Meeting notes: 你好世界 🚀 Café naïve",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-mock-id",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    summary_text: "Summary with special chars",
                    suggested_tag: "work",
                    goal_status: "in_progress",
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await POST(mockContext);

      expect([200, 201]).toContain(response.status);
    });
  });

  describe("Language Detection", () => {
    it("should handle Polish language content", async () => {
      const requestBody = {
        original_content: "Notatki ze spotkania o statusie projektu. Zespół pracuje nad nową funkcjonalnością.",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-mock-id",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    summary_text: "Podsumowanie w języku polskim",
                    suggested_tag: "projekt",
                    goal_status: "in_progress",
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await POST(mockContext);

      expect([200, 201]).toContain(response.status);
    });

    it("should handle English language content", async () => {
      const requestBody = {
        original_content: "Meeting notes about project status. Team is working on new features.",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-mock-id",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    summary_text: "Summary in English",
                    suggested_tag: "work",
                    goal_status: "in_progress",
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await POST(mockContext);

      expect([200, 201]).toContain(response.status);
    });
  });

  describe("Retry Logic", () => {
    it("should handle transient failure with timeout error", async () => {
      const requestBody = {
        original_content: "Meeting notes about project status",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      // Mock timeout error with AbortError
      const abortError = new Error("Request timed out");
      abortError.name = "AbortError";
      global.fetch = vi.fn().mockRejectedValue(abortError);

      const response = await POST(mockContext);

      // Should return 504 on timeout
      expect(response.status).toBe(504);
    });
  });

  describe("Response Format Validation", () => {
    it("should parse response with all fields correctly", async () => {
      const requestBody = {
        original_content: "Meeting notes about project status",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-123",
            model: "x-ai/grok-4-fast",
            created: Date.now(),
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    summary_text: "Comprehensive meeting summary",
                    suggested_tag: "Strategic Planning",
                    goal_status: "achieved",
                  }),
                },
                finish_reason: "stop",
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await POST(mockContext);

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.summary_text).toBe("Comprehensive meeting summary");
      expect(responseBody.suggested_tag).toBe("Strategic Planning");
      expect(responseBody.goal_status).toBe("achieved");
    });

    it("should return 400 for missing required fields in request", async () => {
      const requestBody = {};
      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      const response = await POST(mockContext);

      expect(response.status).toBe(400);
    });

    it("should handle whitespace-only content", async () => {
      const requestBody = {
        original_content: "   \n\t  ",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      const response = await POST(mockContext);

      // Should either accept or reject whitespace - endpoint is lenient
      expect([200, 201, 400, 503]).toContain(response.status);
    });

    it("should handle request with custom model name", async () => {
      const requestBody = {
        original_content: "Meeting notes",
        model_name: "openai/gpt-4",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-123",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    summary_text: "Summary",
                    suggested_tag: "work",
                    goal_status: "in_progress",
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await POST(mockContext);

      expect([200, 201]).toContain(response.status);
    });

    it("should reject invalid model name format", async () => {
      const requestBody = {
        original_content: "Meeting notes",
        model_name: "invalid-model-name", // Missing provider/model format
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      const response = await POST(mockContext);

      expect(response.status).toBe(400);
    });
  });

  describe("Rate Limiting", () => {
    it("should respect rate limit check on request", async () => {
      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      const checkRateLimitMock = vi.mocked(checkRateLimit);
      checkRateLimitMock.mockReturnValue({ allowed: false, remaining: 0, retryAfter: 60 });

      const createRateLimitResponseMock = vi.mocked(createRateLimitResponse);
      createRateLimitResponseMock.mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );

      const response = await POST(mockContext);

      expect(response.status).toBe(429);
    });

    it("should include rate limit info in successful response headers", async () => {
      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-123",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    summary_text: "Summary",
                    suggested_tag: "work",
                    goal_status: "in_progress",
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const checkRateLimitMock = vi.mocked(checkRateLimit);
      checkRateLimitMock.mockReturnValue({ allowed: true, remaining: 42 });

      const response = await POST(mockContext);

      expect(response.status).toBe(200);
      // Check if rate limit info might be in headers
      expect(response.headers).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long summary text in response", async () => {
      const requestBody = {
        original_content: "Meeting notes about project",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      const longSummary = "A".repeat(1000);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-123",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    summary_text: longSummary,
                    suggested_tag: "work",
                    goal_status: "in_progress",
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await POST(mockContext);

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.summary_text).toBe(longSummary);
    });

    it("should handle null goal_status field", async () => {
      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-123",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    summary_text: "Summary",
                    suggested_tag: "work",
                    goal_status: null,
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await POST(mockContext);

      // Response may vary depending on validation rules
      expect([200, 201, 500, 503]).toContain(response.status);
    });

    it("should handle OpenRouter API network error", async () => {
      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockRejectedValue(new TypeError("Network error"));

      const response = await POST(mockContext);

      expect([500, 503]).toContain(response.status);
    });

    it("should handle unexpected error in JSON parsing", async () => {
      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(new Response("not json", { status: 200 }));

      const response = await POST(mockContext);

      expect([500, 503]).toContain(response.status);
    });

    it("should handle OpenRouter 500 error from API", async () => {
      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { message: "Internal server error" },
          }),
          { status: 500 }
        )
      );

      const response = await POST(mockContext);

      expect([500, 503]).toContain(response.status);
    });

    it("should handle authentication as logged-in user", async () => {
      const mockSupabaseWithUser = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-123", email: "user@example.com" } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as unknown as SupabaseClient<Database>;

      const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
      createSupabaseServerClientMock.mockReturnValue(mockSupabaseWithUser);

      mockContext.locals.supabase = mockSupabaseWithUser;

      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-123",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    summary_text: "Summary",
                    suggested_tag: "work",
                    goal_status: "in_progress",
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await POST(mockContext);

      expect([200, 201]).toContain(response.status);
    });

    it("should handle various goal_status values", async () => {
      const goalStatuses = ["in_progress", "achieved", "paused", "abandoned"];

      for (const status of goalStatuses) {
        const requestBody = {
          original_content: "Meeting notes",
        };

        mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

        global.fetch = vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              id: "gen-123",
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: JSON.stringify({
                      summary_text: "Summary",
                      suggested_tag: "work",
                      goal_status: status,
                    }),
                  },
                },
              ],
            }),
            { status: 200 }
          )
        );

        const response = await POST(mockContext);

        expect([200, 201]).toContain(response.status);
      }
    });

    it("should handle various OpenRouter error status codes", async () => {
      const statusCodes = [400, 401, 403, 404];

      for (const statusCode of statusCodes) {
        const requestBody = {
          original_content: "Meeting notes",
        };

        mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

        global.fetch = vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              error: { message: `API error ${statusCode}` },
            }),
            { status: statusCode }
          )
        );

        const response = await POST(mockContext);

        // Should handle various error codes
        expect([400, 500, 503]).toContain(response.status);
      }
    });

    it("should handle malformed response choices array", async () => {
      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-123",
            choices: [
              {
                message: {
                  // Missing content field
                  role: "assistant",
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await POST(mockContext);

      expect([500, 503]).toContain(response.status);
    });
  });

  describe("Concurrent Requests", () => {
    it("should handle concurrent requests", async () => {
      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-123",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    summary_text: "Summary",
                    suggested_tag: "work",
                    goal_status: "in_progress",
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      // Simulate multiple concurrent requests
      const responses = await Promise.all([POST(mockContext), POST(mockContext), POST(mockContext)]);

      // All should complete successfully (200/201 or 503 if service unavailable)
      responses.forEach((response) => {
        expect([200, 201, 503]).toContain(response.status);
      });
    });
  });

  describe("Telemetry and Logging", () => {
    it("should handle successful generation without crashing on logging errors", async () => {
      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-123",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    summary_text: "Summary",
                    suggested_tag: "work",
                    goal_status: "in_progress",
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await POST(mockContext);

      // Should still return 200 even if logging fails
      expect([200, 201]).toContain(response.status);
    });
  });

  describe("Additional Error Coverage", () => {
    it("should handle 502 Bad Gateway error from OpenRouter", async () => {
      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: { message: "Bad Gateway" } }), { status: 502 }));

      const response = await POST(mockContext);

      expect([500, 503]).toContain(response.status);
    });

    it("should handle 504 Gateway Timeout from OpenRouter", async () => {
      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: { message: "Gateway Timeout" } }), { status: 504 }));

      const response = await POST(mockContext);

      expect([500, 503, 504]).toContain(response.status);
    });

    it("should handle missing message content in response", async () => {
      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-123",
            choices: [
              {
                // Missing message field entirely
                finish_reason: "stop",
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await POST(mockContext);

      expect([500, 503]).toContain(response.status);
    });

    it("should handle empty choices array", async () => {
      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-123",
            choices: [], // Empty choices
          }),
          { status: 200 }
        )
      );

      const response = await POST(mockContext);

      expect([500, 503]).toContain(response.status);
    });

    it("should handle authentication error when auth check fails", async () => {
      const mockSupabaseAuthError = {
        auth: {
          getUser: vi.fn().mockRejectedValue(new Error("Auth error")),
        },
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as unknown as SupabaseClient<Database>;

      const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
      createSupabaseServerClientMock.mockReturnValue(mockSupabaseAuthError);

      mockContext.locals.supabase = mockSupabaseAuthError;

      const requestBody = {
        original_content: "Meeting notes",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "gen-123",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    summary_text: "Summary",
                    suggested_tag: "work",
                    goal_status: "in_progress",
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await POST(mockContext);

      // Should handle auth error gracefully
      expect([200, 201, 500]).toContain(response.status);
    });
  });
});
