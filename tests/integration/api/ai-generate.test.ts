import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  OpenRouterAuthError,
  OpenRouterTimeoutError,
  OpenRouterRateLimitError,
  OpenRouterServiceError,
  OpenRouterNetworkError,
  OpenRouterValidationError,
  OpenRouterError,
} from "@/lib/errors/openrouter.errors";
// Mock the rate limiting middleware
vi.mock("@/lib/middleware/rate-limit.middleware", () => ({
  checkRateLimit: vi.fn(),
  createRateLimitResponse: vi.fn(),
}));
// Mock the Supabase server client module
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(),
}));
// Import the mocked functions and API handler
import { checkRateLimit, createRateLimitResponse } from "@/lib/middleware/rate-limit.middleware";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { POST } from "@/pages/api/ai/generate";
import type { Database } from "@/db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { APIContext } from "astro";

const generateSummaryMock = vi.fn();

vi.mock("@/lib/services/ai-generation.service", () => ({
  AiGenerationService: vi.fn(function MockAiGenerationService(this: { generateSummary: typeof generateSummaryMock }) {
    this.generateSummary = generateSummaryMock;
  }),
}));

describe("POST /api/ai/generate", () => {
  let mockSupabaseClient: SupabaseClient<Database>;
  let createSupabaseServerClientMock: ReturnType<typeof vi.fn>;
  let checkRateLimitMock: ReturnType<typeof vi.fn>;
  let createRateLimitResponseMock: ReturnType<typeof vi.fn>;
  let mockContext: APIContext;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    generateSummaryMock.mockReset();

    // Ensure the API key is set for this test suite to avoid state leakage
    vi.stubEnv("OPENROUTER_API_KEY", "sk-test-key-123");

    // Silence expected error logs from route under test
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "log").mockImplementation(() => {});

    // Setup mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as unknown as SupabaseClient<Database>;

    // Mock createSupabaseServerClient to return our mock client
    createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseClient);

    // Mock rate limiting functions
    checkRateLimitMock = vi.mocked(checkRateLimit);
    checkRateLimitMock.mockReturnValue({ allowed: true, remaining: 99 });

    createRateLimitResponseMock = vi.mocked(createRateLimitResponse);
    createRateLimitResponseMock.mockImplementation(
      (retryAfter: number) =>
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { "Retry-After": retryAfter.toString() },
        })
    );

    // Create a mock APIContext object
    mockContext = {
      request: new Request("http://localhost/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      locals: {
        supabase: mockSupabaseClient,
        // Add other locals properties if needed by the API route
      },
      url: new URL("http://localhost/api/ai/generate"),
      redirect: vi.fn((path: string) => new Response(null, { status: 302, headers: { Location: path } })),
      // Add other APIContext properties if needed by the API route
    } as unknown as APIContext; // Cast to APIContext to satisfy TypeScript
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("should return 200 OK with summary and tags for a valid anonymous request", async () => {
    // Arrange: Define the request payload
    const requestBody = {
      original_content:
        "This is a meeting note about project status. We discussed the new UI and the backend performance. The team is on track.",
    };

    // Mock the request.json() method
    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    generateSummaryMock.mockResolvedValue({
      summary_text: "This is a mock AI-generated summary.",
      suggested_tag: "mock-tag-1",
      goal_status: "in_progress",
    });

    // Act: Call the POST handler directly
    const response = await POST(mockContext);

    // Assert: Check the response status and body
    expect(response.status).toBe(200);

    const responseBody = await response.json();

    // The response should match the mock data from our direct fetch mock
    expect(responseBody.summary_text).toBe("This is a mock AI-generated summary.");
    expect(responseBody.suggested_tag).toBe("mock-tag-1");
    expect(responseBody.goal_status).toBe("in_progress");
  });

  it("should return 400 Bad Request if content is missing", async () => {
    // Arrange: Mock the request.json() method to return an empty object
    mockContext.request.json = vi.fn().mockResolvedValue({});

    generateSummaryMock.mockReset();

    // Act: Call the POST handler directly
    const response = await POST(mockContext);

    // Assert: Check for a 400 status
    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody.error).toContain("Validation failed");
  });

  it("should return 429 Too Many Requests if rate limit is exceeded", async () => {
    // Arrange: Configure rate limit mock to deny the request
    checkRateLimitMock.mockReturnValue({ allowed: false, retryAfter: 60 });

    // Mock the request.json() method
    mockContext.request.json = vi.fn().mockResolvedValue({
      content: "Some content to trigger rate limit.",
    });

    generateSummaryMock.mockReset();

    // Act: Call the POST handler directly
    const response = await POST(mockContext);

    // Assert: Check for 429 status and Retry-After header
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(createRateLimitResponseMock).toHaveBeenCalledWith(60);
  });

  it("should return 400 when request body is not valid JSON", async () => {
    mockContext.request.json = vi.fn().mockRejectedValue(new SyntaxError("Unexpected token"));
    generateSummaryMock.mockReset();

    const response = await POST(mockContext);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid JSON");
    expect(body.message).toBe("Request body must be valid JSON");
  });

  it("should return 400 when validation of payload fails", async () => {
    mockContext.request.json = vi.fn().mockResolvedValue({ summary_text: "missing original_content" });
    generateSummaryMock.mockReset();

    const response = await POST(mockContext);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(body.message).toBe("Invalid input data");
  });

  it("should map OpenRouter timeout errors to 504", async () => {
    mockContext.request.json = vi.fn().mockResolvedValue({
      original_content: "Agenda item 1",
    });
    generateSummaryMock.mockRejectedValue(new OpenRouterTimeoutError("Request timed out"));

    const response = await POST(mockContext);
    const body = await response.json();

    expect(response.status).toBe(504);
    expect(body.error).toBe("Gateway timeout");
    expect(body.message).toContain("exceeded time limit");
  });

  it("should map OpenRouter auth errors to 503", async () => {
    mockContext.request.json = vi.fn().mockResolvedValue({
      original_content: "Agenda item 1",
    });
    generateSummaryMock.mockRejectedValue(new OpenRouterAuthError("Missing API key"));

    const response = await POST(mockContext);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("Service unavailable");
    expect(body.message).toBe("AI service is not configured");
  });

  it("should map OpenRouter rate limit errors to 429", async () => {
    mockContext.request.json = vi.fn().mockResolvedValue({
      original_content: "Agenda item 1",
    });
    generateSummaryMock.mockRejectedValue(new OpenRouterRateLimitError("Too many requests"));

    const response = await POST(mockContext);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("Too many requests");
    expect(body.message).toContain("OpenRouter API rate limit exceeded");
  });

  it("should map OpenRouter service/network errors to 503", async () => {
    mockContext.request.json = vi.fn().mockResolvedValue({
      original_content: "Agenda item 1",
    });

    generateSummaryMock.mockRejectedValueOnce(new OpenRouterServiceError("Service down"));
    let response = await POST(mockContext);
    expect(response.status).toBe(503);

    generateSummaryMock.mockRejectedValueOnce(new OpenRouterNetworkError("Network issue"));
    response = await POST(mockContext);
    expect(response.status).toBe(503);
  });

  it("should map OpenRouter validation errors to 400", async () => {
    mockContext.request.json = vi.fn().mockResolvedValue({
      original_content: "Agenda item 1",
    });
    generateSummaryMock.mockRejectedValue(new OpenRouterValidationError("Invalid request"));

    const response = await POST(mockContext);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Bad request");
    expect(body.details).toContain("Invalid request");
  });

  it("should map generic OpenRouter errors to 503", async () => {
    mockContext.request.json = vi.fn().mockResolvedValue({
      original_content: "Agenda item 1",
    });
    generateSummaryMock.mockRejectedValue(new OpenRouterError("Generic failure", "GENERIC_ERROR", false));

    const response = await POST(mockContext);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("Service unavailable");
    expect(body.message).toBe("AI service encountered an error");
  });

  it("should return 500 for non-OpenRouter unexpected errors", async () => {
    mockContext.request.json = vi.fn().mockResolvedValue({
      original_content: "Agenda item 1",
    });
    generateSummaryMock.mockRejectedValue(new Error("Unknown failure"));

    const response = await POST(mockContext);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal server error");
    expect(body.message).toBe("Failed to generate AI summary");
  });

  it("should return 500 when rate limit check throws unexpected error", async () => {
    checkRateLimitMock.mockImplementationOnce(() => {
      throw new Error("Rate limiter unavailable");
    });

    const response = await POST(mockContext);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal server error");
    expect(body.message).toBe("An unexpected error occurred");
  });
});
