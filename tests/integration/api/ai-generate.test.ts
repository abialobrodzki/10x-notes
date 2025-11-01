import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

describe("POST /api/ai/generate", () => {
  let mockSupabaseClient: SupabaseClient<Database>;
  let createSupabaseServerClientMock: ReturnType<typeof vi.fn>;
  let checkRateLimitMock: ReturnType<typeof vi.fn>;
  let createRateLimitResponseMock: ReturnType<typeof vi.fn>;
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Ensure the API key is set for this test suite to avoid state leakage
    vi.stubEnv("OPENROUTER_API_KEY", "sk-test-key-123");

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
    vi.clearAllMocks();
  });

  it("should return 200 OK with summary and tags for a valid anonymous request", async () => {
    // Arrange: Define the request payload
    const requestBody = {
      original_content:
        "This is a meeting note about project status. We discussed the new UI and the backend performance. The team is on track.",
    };

    // Mock the request.json() method
    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    // DIAGNOSTIC WORKAROUND: Directly mock `global.fetch`.
    // The global MSW setup in `tests/setup.ts` is not correctly intercepting
    // requests in the Vitest `node` environment in this project's configuration.
    // This direct mock bypasses the setup issue and allows for testing the
    // API route's logic in isolation. This is a reliable workaround until
    // the root cause of the MSW/Vitest interaction is resolved.
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "gen-mock-id",
          choices: [
            {
              message: {
                role: "assistant",
                content: JSON.stringify({
                  summary_text: "This is a mock AI-generated summary.",
                  suggested_tag: "mock-tag-1",
                  goal_status: "in_progress",
                }),
              },
            },
          ],
        }),
        { status: 200 }
      )
    );

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

    // Act: Call the POST handler directly
    const response = await POST(mockContext);

    // Assert: Check for 429 status and Retry-After header
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(createRateLimitResponseMock).toHaveBeenCalledWith(60);
  });
});
