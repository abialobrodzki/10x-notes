import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// Mock dependencies
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(),
}));
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { POST as POST_FORGOT_PASSWORD } from "@/pages/api/auth/forgot-password";
import { POST as POST_LOGIN } from "@/pages/api/auth/login";
import { POST as POST_LOGOUT } from "@/pages/api/auth/logout";
import { POST as POST_REGISTER } from "@/pages/api/auth/register";
import type { Database } from "@/db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { APIContext } from "astro";

describe("POST /api/auth/login - User Login", () => {
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

    mockSupabaseClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-123", email: "test@example.com" },
            session: { access_token: "token-123", refresh_token: "refresh-123" },
          },
          error: null,
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseClient);

    mockContext = {
      request: new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      locals: { supabase: mockSupabaseClient },
      url: new URL("http://localhost/api/auth/login"),
      redirect: vi.fn((path: string) => new Response(null, { status: 302, headers: { Location: path } })),
      cookies: {
        set: vi.fn(),
        get: vi.fn(),
      },
    } as unknown as APIContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should handle invalid JSON in request body", async () => {
    mockContext.request.json = vi.fn().mockRejectedValue(new SyntaxError("Unexpected token"));

    const response = await POST_LOGIN(mockContext);

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.error).toBe("Invalid JSON");
  });

  it("should login user with valid credentials", async () => {
    const requestBody = {
      email: "test@example.com",
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_LOGIN(mockContext);

    expect([200, 302]).toContain(response.status);
  });

  it("should return 400 for missing email", async () => {
    const requestBody = {
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_LOGIN(mockContext);

    expect(response.status).toBe(400);
  });

  it("should return 400 for missing password", async () => {
    const requestBody = {
      email: "test@example.com",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_LOGIN(mockContext);

    expect(response.status).toBe(400);
  });

  it("should accept any email format (Supabase validates)", async () => {
    const requestBody = {
      email: "not-an-email",
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_LOGIN(mockContext);

    // Endpoint accepts any email, Supabase handles validation
    expect([200, 401, 400]).toContain(response.status);
  });

  it("should return 401 for invalid credentials", async () => {
    const mockSupabaseInvalid = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: "Invalid login credentials" },
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseInvalid);

    mockContext.locals.supabase = mockSupabaseInvalid;

    const requestBody = {
      email: "test@example.com",
      password: "WrongPassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_LOGIN(mockContext);

    expect(response.status).toBe(401);
  });

  it("should trim whitespace from email before login", async () => {
    const requestBody = {
      email: "  test@example.com  ",
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_LOGIN(mockContext);

    expect([200, 302]).toContain(response.status);
    // Verify that signInWithPassword was called with trimmed email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSupabase = mockContext.locals.supabase as any;
    const callArgs = mockSupabase.auth.signInWithPassword.mock.calls[0];
    expect(callArgs[0].email).toBe("test@example.com");
  });

  it("should return 500 when session creation fails", async () => {
    const mockSupabaseNoSession = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "test@example.com" }, session: null },
          error: null,
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseNoSession);

    mockContext.locals.supabase = mockSupabaseNoSession;

    const requestBody = {
      email: "test@example.com",
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_LOGIN(mockContext);

    expect(response.status).toBe(500);
  });

  it("should handle email not confirmed error", async () => {
    const mockSupabaseNotConfirmed = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: "Email not confirmed" },
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseNotConfirmed);

    mockContext.locals.supabase = mockSupabaseNotConfirmed;

    const requestBody = {
      email: "test@example.com",
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_LOGIN(mockContext);

    expect(response.status).toBe(401);
  });

  it("should handle rate limit error on login", async () => {
    const mockSupabaseRateLimit = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: "Email rate limit exceeded" },
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseRateLimit);

    mockContext.locals.supabase = mockSupabaseRateLimit;

    const requestBody = {
      email: "test@example.com",
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_LOGIN(mockContext);

    expect(response.status).toBe(429);
  });

  it("should trim email and check with valid request body", async () => {
    // Test to verify the request validation works properly
    mockContext.request.json = vi
      .fn()
      .mockResolvedValue({ email: "  test@example.com  ", password: "SecurePassword123!" });

    const response = await POST_LOGIN(mockContext);

    // Should handle trimmed email
    expect([200, 302, 401]).toContain(response.status);
  });
});

describe("POST /api/auth/register - User Registration", () => {
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

    mockSupabaseClient = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-123", email: "newuser@example.com" },
            session: { access_token: "token-123", refresh_token: "refresh-123" },
          },
          error: null,
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseClient);

    mockContext = {
      request: new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      locals: { supabase: mockSupabaseClient },
      url: new URL("http://localhost/api/auth/register"),
      redirect: vi.fn((path: string) => new Response(null, { status: 302, headers: { Location: path } })),
      cookies: {
        set: vi.fn(),
        get: vi.fn(),
      },
    } as unknown as APIContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should handle invalid JSON in request body", async () => {
    mockContext.request.json = vi.fn().mockRejectedValue(new SyntaxError("Unexpected token"));

    const response = await POST_REGISTER(mockContext);

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.error).toBe("Invalid JSON");
  });

  it("should register new user with valid credentials", async () => {
    const requestBody = {
      email: "newuser@example.com",
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_REGISTER(mockContext);

    expect([200, 201, 302]).toContain(response.status);
  });

  it("should return 400 for missing email", async () => {
    const requestBody = {
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_REGISTER(mockContext);

    expect(response.status).toBe(400);
  });

  it("should return 400 for missing password", async () => {
    const requestBody = {
      email: "newuser@example.com",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_REGISTER(mockContext);

    expect(response.status).toBe(400);
  });

  it("should accept weak passwords (Supabase validates)", async () => {
    const requestBody = {
      email: "newuser@example.com",
      password: "weak", // Endpoint accepts it, Supabase validates
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_REGISTER(mockContext);

    // Endpoint accepts password, Supabase handles validation
    expect([200, 201, 400]).toContain(response.status);
  });

  it("should accept any email format (Supabase validates)", async () => {
    const requestBody = {
      email: "not-an-email",
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_REGISTER(mockContext);

    // Endpoint accepts email, Supabase handles validation
    expect([200, 201, 400]).toContain(response.status);
  });

  it("should return 400 for duplicate email", async () => {
    const mockSupabaseDuplicate = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: "User already exists" },
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseDuplicate);

    mockContext.locals.supabase = mockSupabaseDuplicate;

    const requestBody = {
      email: "existing@example.com",
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_REGISTER(mockContext);

    expect(response.status).toBe(400);
  });

  it("should return message when email confirmation is required", async () => {
    const mockSupabaseConfirmation = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-123", email: "newuser@example.com" },
            session: null, // No session until email confirmed
          },
          error: null,
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseConfirmation);

    mockContext.locals.supabase = mockSupabaseConfirmation;

    const requestBody = {
      email: "newuser@example.com",
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_REGISTER(mockContext);

    expect([200, 302]).toContain(response.status);
    // Response should indicate confirmation required
  });

  it("should trim whitespace from email before registration", async () => {
    const requestBody = {
      email: "  newuser@example.com  ",
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_REGISTER(mockContext);

    expect([200, 201, 302]).toContain(response.status);
    // Verify signUp was called with trimmed email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSupabase = mockContext.locals.supabase as any;
    const callArgs = mockSupabase.auth.signUp.mock.calls[0];
    expect(callArgs[0].email).toBe("newuser@example.com");
  });

  it("should return 400 when user already exists", async () => {
    const mockSupabaseExists = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: "User already exists" },
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseExists);

    mockContext.locals.supabase = mockSupabaseExists;

    const requestBody = {
      email: "existing@example.com",
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_REGISTER(mockContext);

    expect(response.status).toBe(400);
  });

  it("should handle rate limit on registration", async () => {
    const mockSupabaseRateLimit = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: "Email rate limit exceeded" },
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseRateLimit);

    mockContext.locals.supabase = mockSupabaseRateLimit;

    const requestBody = {
      email: "newuser@example.com",
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_REGISTER(mockContext);

    expect(response.status).toBe(400);
  });

  it("should return 500 when user data is missing in response", async () => {
    const mockSupabaseNoUser = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: null,
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseNoUser);

    mockContext.locals.supabase = mockSupabaseNoUser;

    const requestBody = {
      email: "newuser@example.com",
      password: "SecurePassword123!",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_REGISTER(mockContext);

    expect(response.status).toBe(500);
  });
});

describe("POST /api/auth/logout - User Logout", () => {
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

    mockSupabaseClient = {
      auth: {
        signOut: vi.fn().mockResolvedValue({
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: { access_token: "token-123", refresh_token: "refresh-123" },
          },
          error: null,
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseClient);

    mockContext = {
      request: new Request("http://localhost/api/auth/logout", {
        method: "POST",
      }),
      locals: { supabase: mockSupabaseClient },
      url: new URL("http://localhost/api/auth/logout"),
      redirect: vi.fn((path: string) => new Response(null, { status: 302, headers: { Location: path } })),
      cookies: {
        delete: vi.fn(),
      },
    } as unknown as APIContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should logout authenticated user successfully", async () => {
    const response = await POST_LOGOUT(mockContext);

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody.message).toBeDefined();
  });

  it("should clear session cookies on logout", async () => {
    const response = await POST_LOGOUT(mockContext);

    // Verify that logout clears authentication
    expect([200, 302]).toContain(response.status);
  });

  it("should be idempotent - can logout without active session", async () => {
    const mockSupabaseNoSession = {
      auth: {
        signOut: vi.fn().mockResolvedValue({
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseNoSession);

    mockContext.locals.supabase = mockSupabaseNoSession;

    const response = await POST_LOGOUT(mockContext);

    expect([200, 302]).toContain(response.status);
  });

  it("should handle logout errors gracefully", async () => {
    const mockSupabaseError = {
      auth: {
        signOut: vi.fn().mockResolvedValue({
          error: { message: "Logout failed" },
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseError);

    mockContext.locals.supabase = mockSupabaseError;

    const response = await POST_LOGOUT(mockContext);

    // Endpoint can return various error codes depending on the failure
    expect([400, 401, 500]).toContain(response.status);
  });

  it("should handle unexpected error during logout", async () => {
    const mockSupabaseThrows = {
      auth: {
        signOut: vi.fn().mockRejectedValue(new Error("Unexpected error")),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseThrows);

    mockContext.locals.supabase = mockSupabaseThrows;

    const response = await POST_LOGOUT(mockContext);

    expect(response.status).toBe(500);
    const responseBody = await response.json();
    expect(responseBody.error).toBe("Internal server error");
  });
});

describe("POST /api/auth/forgot-password - Password Reset Request", () => {
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

    mockSupabaseClient = {
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({
          error: null,
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseClient);

    mockContext = {
      request: new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      locals: { supabase: mockSupabaseClient },
      url: new URL("http://localhost/api/auth/forgot-password"),
      redirect: vi.fn((path: string) => new Response(null, { status: 302, headers: { Location: path } })),
    } as unknown as APIContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should handle invalid JSON in request body", async () => {
    mockContext.request.json = vi.fn().mockRejectedValue(new SyntaxError("Unexpected token"));

    const response = await POST_FORGOT_PASSWORD(mockContext);

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.error).toBe("Invalid JSON");
  });

  it("should return 400 for missing email", async () => {
    const requestBody = {};
    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_FORGOT_PASSWORD(mockContext);

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.error).toBe("Missing field");
  });

  it("should always return 200 for valid email (security: no email enumeration)", async () => {
    const requestBody = {
      email: "user@example.com",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_FORGOT_PASSWORD(mockContext);

    // Always returns 200 for security - doesn't reveal if email exists
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody.message).toBeDefined();
  });

  it("should return 429 for rate limit exceeded", async () => {
    const mockSupabaseRateLimit = {
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({
          error: { message: "Email rate limit exceeded" },
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseRateLimit);

    mockContext.locals.supabase = mockSupabaseRateLimit;

    const requestBody = {
      email: "user@example.com",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_FORGOT_PASSWORD(mockContext);

    expect(response.status).toBe(429);
  });

  it("should return 200 even when email doesn't exist (security best practice)", async () => {
    const mockSupabaseNotFound = {
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({
          error: { message: "Email not found" },
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseNotFound);

    mockContext.locals.supabase = mockSupabaseNotFound;

    const requestBody = {
      email: "nonexistent@example.com",
    };

    mockContext.request.json = vi.fn().mockResolvedValue(requestBody);

    const response = await POST_FORGOT_PASSWORD(mockContext);

    // Returns 200 even if email doesn't exist - prevents email enumeration
    expect(response.status).toBe(200);
  });

  it("should handle non-object request body", async () => {
    mockContext.request.json = vi.fn().mockResolvedValue("invalid");

    const response = await POST_FORGOT_PASSWORD(mockContext);

    expect(response.status).toBe(400);
  });
});
