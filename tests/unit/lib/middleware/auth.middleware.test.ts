import { describe, expect, it, vi } from "vitest";
import { optionalAuth, requireAuth, type AuthResult } from "@/lib/middleware/auth.middleware";
import type { Database } from "@/db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Helper to create mock Supabase client
function createMockSupabaseClient(
  mockGetUser: () => Promise<{ data: { user: unknown }; error: unknown }>
): SupabaseClient<Database> {
  return {
    auth: {
      getUser: vi.fn(mockGetUser),
    },
  } as unknown as SupabaseClient<Database>;
}

describe("auth.middleware", () => {
  // ============================================================================
  // requireAuth - Success Cases
  // ============================================================================

  describe("requireAuth - success", () => {
    it("should return userId and email for valid authenticated user", async () => {
      // Arrange
      const mockUser = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@example.com",
      };

      const supabase = createMockSupabaseClient(async () => ({
        data: { user: mockUser },
        error: null,
      }));

      // Act
      const result = await requireAuth(supabase);

      // Assert
      expect(result).toEqual({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@example.com",
      } satisfies AuthResult);
    });

    it("should call supabase.auth.getUser()", async () => {
      const mockUser = {
        id: "test-user-id",
        email: "test@example.com",
      };

      const getUserSpy = vi.fn(async () => ({
        data: { user: mockUser },
        error: null,
      }));

      const supabase = {
        auth: {
          getUser: getUserSpy,
        },
      } as unknown as SupabaseClient<Database>;

      await requireAuth(supabase);

      expect(getUserSpy).toHaveBeenCalledOnce();
    });

    it("should handle user with additional fields", async () => {
      const mockUser = {
        id: "user-123",
        email: "user@test.com",
        // Additional fields that should be ignored
        created_at: "2024-01-01",
        role: "admin",
      };

      const supabase = createMockSupabaseClient(async () => ({
        data: { user: mockUser },
        error: null,
      }));

      const result = await requireAuth(supabase);

      expect(result.userId).toBe("user-123");
      expect(result.email).toBe("user@test.com");
    });
  });

  // ============================================================================
  // requireAuth - Authentication Errors
  // ============================================================================

  describe("requireAuth - authentication errors", () => {
    it("should throw 401 Response when user is null", async () => {
      // Arrange
      const supabase = createMockSupabaseClient(async () => ({
        data: { user: null },
        error: null,
      }));

      // Act & Assert
      try {
        await requireAuth(supabase);
        expect.fail("Should have thrown Response");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        if (error instanceof Response) {
          expect(error.status).toBe(401);

          const body = await error.json();
          expect(body.error).toBe("Authentication required");
          expect(body.message).toBe("Missing or invalid authentication token");
        }
      }
    });

    it("should throw 401 Response when supabase returns error", async () => {
      // Arrange
      const mockError = {
        message: "JWT expired",
      };

      const supabase = createMockSupabaseClient(async () => ({
        data: { user: null },
        error: mockError,
      }));

      // Act & Assert
      try {
        await requireAuth(supabase);
        expect.fail("Should have thrown Response");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        if (error instanceof Response) {
          expect(error.status).toBe(401);

          const body = await error.json();
          expect(body.error).toBe("Authentication failed");
          expect(body.message).toBe("JWT expired");
        }
      }
    });

    it("should throw 401 Response when user has no email", async () => {
      // Arrange
      const mockUser = {
        id: "user-without-email",
        email: null,
      };

      const supabase = createMockSupabaseClient(async () => ({
        data: { user: mockUser },
        error: null,
      }));

      // Act & Assert
      try {
        await requireAuth(supabase);
        expect.fail("Should have thrown Response");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        if (error instanceof Response) {
          expect(error.status).toBe(401);

          const body = await error.json();
          expect(body.error).toBe("Invalid user data");
          expect(body.message).toBe("User email not found");
        }
      }
    });

    it("should throw 401 Response when user email is undefined", async () => {
      const mockUser = {
        id: "user-123",
        // email is missing (undefined)
      };

      const supabase = createMockSupabaseClient(async () => ({
        data: { user: mockUser },
        error: null,
      }));

      try {
        await requireAuth(supabase);
        expect.fail("Should have thrown Response");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        if (error instanceof Response) {
          expect(error.status).toBe(401);
          const body = await error.json();
          expect(body.error).toBe("Invalid user data");
        }
      }
    });

    it("should throw 401 Response when user email is empty string", async () => {
      const mockUser = {
        id: "user-123",
        email: "",
      };

      const supabase = createMockSupabaseClient(async () => ({
        data: { user: mockUser },
        error: null,
      }));

      try {
        await requireAuth(supabase);
        expect.fail("Should have thrown Response");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        if (error instanceof Response) {
          expect(error.status).toBe(401);
          const body = await error.json();
          expect(body.error).toBe("Invalid user data");
        }
      }
    });
  });

  // ============================================================================
  // requireAuth - Unexpected Errors
  // ============================================================================

  describe("requireAuth - unexpected errors", () => {
    it("should throw 401 Response for unexpected errors", async () => {
      // Arrange - Supabase throws unexpected error
      const supabase = {
        auth: {
          getUser: vi.fn(async () => {
            throw new Error("Database connection failed");
          }),
        },
      } as unknown as SupabaseClient<Database>;

      // Act & Assert
      try {
        await requireAuth(supabase);
        expect.fail("Should have thrown Response");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        if (error instanceof Response) {
          expect(error.status).toBe(401);

          const body = await error.json();
          expect(body.error).toBe("Authentication failed");
          expect(body.message).toBe("An unexpected error occurred during authentication");
        }
      }
    });

    it("should rethrow Response errors directly", async () => {
      // Arrange - Create a custom Response error
      const customResponse = new Response(
        JSON.stringify({
          error: "Custom error",
          message: "This is a custom authentication error",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );

      const supabase = {
        auth: {
          getUser: vi.fn(async () => {
            throw customResponse;
          }),
        },
      } as unknown as SupabaseClient<Database>;

      // Act & Assert
      try {
        await requireAuth(supabase);
        expect.fail("Should have thrown Response");
      } catch (error) {
        expect(error).toBe(customResponse);
        if (error instanceof Response) {
          const body = await error.json();
          expect(body.error).toBe("Custom error");
          expect(body.message).toBe("This is a custom authentication error");
        }
      }
    });
  });

  // ============================================================================
  // requireAuth - Response Format
  // ============================================================================

  describe("requireAuth - response format", () => {
    it("should return Response with Content-Type application/json header", async () => {
      const supabase = createMockSupabaseClient(async () => ({
        data: { user: null },
        error: null,
      }));

      try {
        await requireAuth(supabase);
        expect.fail("Should have thrown Response");
      } catch (error) {
        if (error instanceof Response) {
          expect(error.headers.get("Content-Type")).toBe("application/json");
        }
      }
    });

    it("should return valid JSON body structure", async () => {
      const supabase = createMockSupabaseClient(async () => ({
        data: { user: null },
        error: null,
      }));

      try {
        await requireAuth(supabase);
        expect.fail("Should have thrown Response");
      } catch (error) {
        if (error instanceof Response) {
          const body = await error.json();

          expect(body).toHaveProperty("error");
          expect(body).toHaveProperty("message");
          expect(typeof body.error).toBe("string");
          expect(typeof body.message).toBe("string");
        }
      }
    });
  });

  // ============================================================================
  // optionalAuth - Success Cases
  // ============================================================================

  describe("optionalAuth - success", () => {
    it("should return userId when user is authenticated", async () => {
      // Arrange
      const mockUser = {
        id: "authenticated-user-123",
        email: "user@example.com",
      };

      const supabase = createMockSupabaseClient(async () => ({
        data: { user: mockUser },
        error: null,
      }));

      // Act
      const result = await optionalAuth(supabase);

      // Assert
      expect(result).toBe("authenticated-user-123");
    });

    it("should return null when user is not authenticated", async () => {
      // Arrange
      const supabase = createMockSupabaseClient(async () => ({
        data: { user: null },
        error: null,
      }));

      // Act
      const result = await optionalAuth(supabase);

      // Assert
      expect(result).toBeNull();
    });

    it("should call supabase.auth.getUser()", async () => {
      const getUserSpy = vi.fn(async () => ({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      }));

      const supabase = {
        auth: {
          getUser: getUserSpy,
        },
      } as unknown as SupabaseClient<Database>;

      await optionalAuth(supabase);

      expect(getUserSpy).toHaveBeenCalledOnce();
    });

    it("should return null when user object exists but has no id", async () => {
      const mockUser = {
        // id is missing
        email: "user@example.com",
      };

      const supabase = createMockSupabaseClient(async () => ({
        data: { user: mockUser },
        error: null,
      }));

      const result = await optionalAuth(supabase);

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // optionalAuth - Error Handling
  // ============================================================================

  describe("optionalAuth - error handling", () => {
    it("should return null when supabase returns error", async () => {
      // Arrange
      const mockError = {
        message: "JWT expired",
      };

      const supabase = createMockSupabaseClient(async () => ({
        data: { user: null },
        error: mockError,
      }));

      // Act
      const result = await optionalAuth(supabase);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null for unexpected errors", async () => {
      // Arrange - Supabase throws unexpected error
      const supabase = {
        auth: {
          getUser: vi.fn(async () => {
            throw new Error("Network error");
          }),
        },
      } as unknown as SupabaseClient<Database>;

      // Act
      const result = await optionalAuth(supabase);

      // Assert
      expect(result).toBeNull();
    });

    it("should silently handle all error types without throwing", async () => {
      // Arrange - Various error scenarios
      const errorScenarios = [
        async () => {
          throw new Error("Generic error");
        },
        async () => {
          throw new TypeError("Type error");
        },
        async () => {
          throw "String error";
        },
        async () => ({
          data: { user: null },
          error: { message: "Auth error" },
        }),
      ];

      // Act & Assert - None should throw
      for (const scenario of errorScenarios) {
        const supabase = {
          auth: {
            getUser: vi.fn(scenario),
          },
        } as unknown as SupabaseClient<Database>;

        const result = await optionalAuth(supabase);
        expect(result).toBeNull();
      }
    });
  });

  // ============================================================================
  // optionalAuth vs requireAuth Comparison
  // ============================================================================

  describe("optionalAuth vs requireAuth behavior", () => {
    it("should demonstrate different error handling", async () => {
      const supabase = createMockSupabaseClient(async () => ({
        data: { user: null },
        error: null,
      }));

      // optionalAuth returns null
      const optionalResult = await optionalAuth(supabase);
      expect(optionalResult).toBeNull();

      // requireAuth throws
      try {
        await requireAuth(supabase);
        expect.fail("requireAuth should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
      }
    });

    it("should both extract userId for authenticated user", async () => {
      const mockUser = {
        id: "shared-user-id",
        email: "shared@example.com",
      };

      const supabase = createMockSupabaseClient(async () => ({
        data: { user: mockUser },
        error: null,
      }));

      const optionalResult = await optionalAuth(supabase);
      const requireResult = await requireAuth(supabase);

      expect(optionalResult).toBe("shared-user-id");
      expect(requireResult.userId).toBe("shared-user-id");
    });
  });
});
