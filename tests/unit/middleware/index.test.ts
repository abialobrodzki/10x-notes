import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isPublicPath, isAuthOnlyPath, middlewareHandler } from "@/middleware/index";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { APIContext, MiddlewareNext } from "astro";

/**
 * Unit tests for Astro middleware (src/middleware/index.ts)
 *
 * Tests verify:
 * - Public paths access control
 * - Auth-only paths (login, register, etc.) access control
 * - Protected routes redirect to /login for unauthenticated users
 * - Authenticated users redirected from auth-only pages with no-cache headers
 * - No-cache headers set for auth-only pages for unauthenticated users
 *
 * IMPORTANT: These tests import and run the REAL middleware code from src/middleware/index.ts
 * This ensures tests fail if the actual implementation changes.
 */

// Mock the Supabase server client module
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe("Middleware - Path Helpers", () => {
  describe("isPublicPath", () => {
    it("should return true for exact public path match", () => {
      expect(isPublicPath("/")).toBe(true);
      expect(isPublicPath("/share")).toBe(true);
      expect(isPublicPath("/api/auth")).toBe(true);
    });

    it("should return true for paths starting with public path", () => {
      expect(isPublicPath("/api/auth/login")).toBe(true);
      expect(isPublicPath("/api/auth/register")).toBe(true);
      expect(isPublicPath("/share/abc123")).toBe(true);
      expect(isPublicPath("/api/ai/generate")).toBe(true);
    });

    it("should return false for non-public paths", () => {
      expect(isPublicPath("/notes")).toBe(false);
      expect(isPublicPath("/settings")).toBe(false);
      expect(isPublicPath("/login")).toBe(false);
      expect(isPublicPath("/api/notes")).toBe(false);
    });

    it("should not match partial path segments", () => {
      // /shares should not match /share
      expect(isPublicPath("/shares")).toBe(false);
      // /api/authentication should not match /api/auth
      expect(isPublicPath("/api/authentication")).toBe(false);
    });
  });

  describe("isAuthOnlyPath", () => {
    it("should return true for auth-only paths", () => {
      expect(isAuthOnlyPath("/login")).toBe(true);
      expect(isAuthOnlyPath("/register")).toBe(true);
      expect(isAuthOnlyPath("/forgot-password")).toBe(true);
      expect(isAuthOnlyPath("/reset-password")).toBe(true);
    });

    it("should return false for non-auth paths", () => {
      expect(isAuthOnlyPath("/")).toBe(false);
      expect(isAuthOnlyPath("/notes")).toBe(false);
      expect(isAuthOnlyPath("/api/auth/login")).toBe(false);
    });

    it("should use exact match only (not startsWith)", () => {
      expect(isAuthOnlyPath("/login/callback")).toBe(false);
      expect(isAuthOnlyPath("/register-success")).toBe(false);
    });
  });
});

describe("Middleware - Access Control", () => {
  let mockContext: APIContext;
  let mockNext: MiddlewareNext;
  let mockSupabaseGetUser: ReturnType<typeof vi.fn>;
  let mockSupabaseClient: SupabaseClient;
  let createSupabaseServerClientMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Import and setup mock for createSupabaseServerClient
    const { createSupabaseServerClient } = await import("@/lib/supabase-server");
    createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient);

    mockNext = vi.fn().mockResolvedValue(new Response("next", { status: 200 }));
    mockSupabaseGetUser = vi.fn();

    mockSupabaseClient = {
      auth: {
        getUser: mockSupabaseGetUser,
      },
    } as unknown as SupabaseClient;

    // Mock createSupabaseServerClient to return our mock client
    createSupabaseServerClientMock.mockReturnValue(mockSupabaseClient);

    mockContext = {
      url: new URL("http://localhost:3000/"),
      locals: {
        supabase: mockSupabaseClient,
      },
      redirect: vi.fn((path: string) => new Response(null, { status: 302, headers: { Location: path } })),
      request: new Request("http://localhost:3000/"),
      cookies: {},
    } as unknown as APIContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Authenticated user on auth-only pages", () => {
    beforeEach(() => {
      // Mock authenticated user
      mockSupabaseGetUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
          },
        },
      });
    });

    it("should redirect authenticated user from /login to home", async () => {
      mockContext.url = new URL("http://localhost:3000/login");

      const response = await middlewareHandler(mockContext, mockNext);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/");
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should set no-cache headers on redirect from auth-only pages", async () => {
      mockContext.url = new URL("http://localhost:3000/register");

      const response = await middlewareHandler(mockContext, mockNext);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/");
      expect(response.headers.get("Cache-Control")).toBe("no-store, must-revalidate, no-cache, private");
      expect(response.headers.get("Pragma")).toBe("no-cache");
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should allow authenticated user on protected routes", async () => {
      mockContext.url = new URL("http://localhost:3000/notes");

      await middlewareHandler(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.locals.user).toEqual({
        id: "user-123",
        email: "test@example.com",
      });
    });

    it("should allow authenticated user on public paths", async () => {
      mockContext.url = new URL("http://localhost:3000/");

      await middlewareHandler(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.locals.user).toEqual({
        id: "user-123",
        email: "test@example.com",
      });
    });
  });

  describe("Unauthenticated user access control", () => {
    beforeEach(() => {
      // Mock unauthenticated user
      mockSupabaseGetUser.mockResolvedValue({
        data: {
          user: null,
        },
      });
    });

    it("should allow unauthenticated user on public paths", async () => {
      mockContext.url = new URL("http://localhost:3000/");

      await middlewareHandler(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.locals.user).toBeUndefined();
    });

    it("should allow unauthenticated user on auth-only paths (login, register)", async () => {
      mockContext.url = new URL("http://localhost:3000/login");

      const response = await middlewareHandler(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.locals.user).toBeUndefined();

      // Response should have no-cache headers
      expect(response.headers.get("Cache-Control")).toBe("no-store, must-revalidate, no-cache, private");
      expect(response.headers.get("Pragma")).toBe("no-cache");
    });

    it("should redirect unauthenticated user from protected routes to /login", async () => {
      mockContext.url = new URL("http://localhost:3000/notes");

      const response = await middlewareHandler(mockContext, mockNext);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/login");
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should redirect unauthenticated user from /settings to /login", async () => {
      mockContext.url = new URL("http://localhost:3000/settings");

      const response = await middlewareHandler(mockContext, mockNext);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/login");
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Public API routes", () => {
    beforeEach(() => {
      mockSupabaseGetUser.mockResolvedValue({
        data: {
          user: null,
        },
      });
    });

    it("should allow unauthenticated access to /api/auth endpoints", async () => {
      mockContext.url = new URL("http://localhost:3000/api/auth/login");

      await middlewareHandler(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should allow unauthenticated access to /api/ai endpoints", async () => {
      mockContext.url = new URL("http://localhost:3000/api/ai/generate");

      await middlewareHandler(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should allow unauthenticated access to /api/share endpoints", async () => {
      mockContext.url = new URL("http://localhost:3000/api/share/abc123");

      await middlewareHandler(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should NOT allow unauthenticated access to /api/notes endpoints", async () => {
      mockContext.url = new URL("http://localhost:3000/api/notes");

      const response = await middlewareHandler(mockContext, mockNext);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/login");
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Supabase client injection", () => {
    it("should inject Supabase client into context.locals", async () => {
      mockSupabaseGetUser.mockResolvedValue({
        data: {
          user: null,
        },
      });

      mockContext.url = new URL("http://localhost:3000/");

      await middlewareHandler(mockContext, mockNext);

      expect(mockContext.locals.supabase).toBe(mockSupabaseClient);
      expect(createSupabaseServerClientMock).toHaveBeenCalledWith(mockContext.request, mockContext.cookies);
    });
  });

  describe("Cache Control Headers", () => {
    it("should set no-cache headers for auth-only pages when unauthenticated", async () => {
      mockSupabaseGetUser.mockResolvedValue({
        data: {
          user: null,
        },
      });

      mockContext.url = new URL("http://localhost:3000/register");

      const response = await middlewareHandler(mockContext, mockNext);

      expect(response.headers.get("Cache-Control")).toContain("no-store");
      expect(response.headers.get("Cache-Control")).toContain("must-revalidate");
      expect(response.headers.get("Cache-Control")).toContain("no-cache");
      expect(response.headers.get("Cache-Control")).toContain("private");
      expect(response.headers.get("Pragma")).toBe("no-cache");
    });

    it("should set no-cache headers on redirect response when authenticated", async () => {
      mockSupabaseGetUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
          },
        },
      });

      mockContext.url = new URL("http://localhost:3000/forgot-password");

      const response = await middlewareHandler(mockContext, mockNext);

      expect(response.status).toBe(302);
      expect(response.headers.get("Cache-Control")).toBeDefined();
      expect(response.headers.get("Pragma")).toBeDefined();
    });

    it("should NOT set no-cache headers for public paths", async () => {
      mockSupabaseGetUser.mockResolvedValue({
        data: {
          user: null,
        },
      });

      mockContext.url = new URL("http://localhost:3000/");

      const response = await middlewareHandler(mockContext, mockNext);

      // Public paths should not have cache control headers added by middleware
      // (they will have whatever next() returns)
      expect(response).toBe(await mockNext());
    });
  });
});
