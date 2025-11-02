import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "@/lib/middleware/auth.middleware";
import { DELETE as DELETE_ACCOUNT } from "@/pages/api/user/account";
import { GET } from "@/pages/api/user/profile";
import { GET as GET_STATS } from "@/pages/api/user/stats";
import type { UserProfileDTO, UserStatsDTO } from "@/types";
import type { APIContext } from "astro";

// Define mock functions in the module scope
const getUserProfileMock = vi.fn();
const getUserStatsMock = vi.fn();
const deleteAccountMock = vi.fn();

// Mock the service module with a proper class constructor
vi.mock("@/lib/services/user.service", () => {
  return {
    UserService: class MockUserService {
      getUserProfile = getUserProfileMock;
      getUserStats = getUserStatsMock;
      deleteAccount = deleteAccountMock;
    },
  };
});

vi.mock("@/lib/middleware/auth.middleware");

const mockRequireAuth = vi.mocked(requireAuth);

describe("GET /api/user/profile - Fetch User Profile", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/user/profile"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/user/profile"),
    } as unknown as APIContext;
  });

  describe("Authenticated User", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 200 OK with the user profile data", async () => {
      // Arrange
      const mockUserProfile: UserProfileDTO = {
        id: "user-123",
        email: "test@example.com",
        created_at: "2025-10-15T10:00:00Z",
      };

      getUserProfileMock.mockResolvedValue(mockUserProfile);

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(data.id).toBe("user-123");
      expect(data.email).toBe("test@example.com");
      expect(data.created_at).toBe("2025-10-15T10:00:00Z");
      expect(getUserProfileMock).toHaveBeenCalledWith("user-123");
    });

    it("should return 404 Not Found if user profile does not exist", async () => {
      // Arrange
      getUserProfileMock.mockResolvedValue(null);

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toBe("User not found");
      expect(data.details).toContain("does not exist");
    });

    it("should return 403 Forbidden if user ID mismatch is detected", async () => {
      // Arrange
      getUserProfileMock.mockRejectedValue(new Error("USER_ID_MISMATCH"));

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect(data.message).toBe("Access denied");
      expect(data.details).toContain("mismatch");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      getUserProfileMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to fetch user profile");
      expect(data.details).toContain("Database connection failed");
    });
  });

  describe("Unauthenticated User", () => {
    it("should return 401 Unauthorized for an unauthenticated user", async () => {
      // Arrange
      const unauthorizedResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      mockRequireAuth.mockRejectedValue(unauthorizedResponse);

      // Act
      const response = await GET(mockContext);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseBody.error).toBe("Unauthorized");
      expect(getUserProfileMock).not.toHaveBeenCalled();
    });
  });
});

describe("GET /api/user/stats - Fetch User Statistics", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/user/stats"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/user/stats"),
    } as unknown as APIContext;
  });

  describe("Authenticated User", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 200 OK with the user statistics", async () => {
      // Arrange
      const mockUserStats: UserStatsDTO = {
        total_generations: 15,
        successful_generations: 12,
        failed_generations: 3,
        total_tokens: 25000,
        avg_time_ms: 1250,
        total_notes: 10,
        total_tags: 5,
      };

      getUserStatsMock.mockResolvedValue(mockUserStats);

      // Act
      const response = await GET_STATS(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(data.total_generations).toBe(15);
      expect(data.successful_generations).toBe(12);
      expect(data.failed_generations).toBe(3);
      expect(data.total_tokens).toBe(25000);
      expect(data.avg_time_ms).toBe(1250);
      expect(data.total_notes).toBe(10);
      expect(data.total_tags).toBe(5);
      expect(getUserStatsMock).toHaveBeenCalledWith("user-123");
    });

    it("should return 200 OK with zero statistics when user is new", async () => {
      // Arrange
      const mockUserStats: UserStatsDTO = {
        total_generations: 0,
        successful_generations: 0,
        failed_generations: 0,
        total_tokens: 0,
        avg_time_ms: 0,
        total_notes: 0,
        total_tags: 0,
      };

      getUserStatsMock.mockResolvedValue(mockUserStats);

      // Act
      const response = await GET_STATS(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.total_generations).toBe(0);
      expect(data.total_notes).toBe(0);
      expect(data.total_tags).toBe(0);
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      getUserStatsMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await GET_STATS(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to fetch user statistics");
      expect(data.details).toContain("Database connection failed");
    });
  });

  describe("Unauthenticated User", () => {
    it("should return 401 Unauthorized for an unauthenticated user", async () => {
      // Arrange
      const unauthorizedResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      mockRequireAuth.mockRejectedValue(unauthorizedResponse);

      // Act
      const response = await GET_STATS(mockContext);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseBody.error).toBe("Unauthorized");
      expect(getUserStatsMock).not.toHaveBeenCalled();
    });
  });
});

describe("DELETE /api/user/account - Delete User Account", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "log").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/user/account"),
    } as unknown as APIContext;
  });

  describe("Authenticated User", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 204 No Content on successful account deletion", async () => {
      // Arrange
      const deletePayload = {
        confirmation_email: "test@example.com",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(deletePayload);
      deleteAccountMock.mockResolvedValue(undefined);

      // Act
      const response = await DELETE_ACCOUNT(mockContext);

      // Assert
      expect(response.status).toBe(204);
      expect(deleteAccountMock).toHaveBeenCalledWith("user-123", "test@example.com");
    });

    it("should return 400 Bad Request for email confirmation mismatch", async () => {
      // Arrange
      const deletePayload = {
        confirmation_email: "wrong@example.com",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(deletePayload);
      deleteAccountMock.mockRejectedValue(new Error("EMAIL_CONFIRMATION_MISMATCH"));

      // Act
      const response = await DELETE_ACCOUNT(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toContain("Email confirmation");
    });

    it("should return 404 Not Found if user account does not exist", async () => {
      // Arrange
      const deletePayload = {
        confirmation_email: "test@example.com",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(deletePayload);
      deleteAccountMock.mockRejectedValue(new Error("USER_NOT_FOUND"));

      // Act
      const response = await DELETE_ACCOUNT(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toContain("not found");
    });

    it("should return 400 Bad Request for invalid JSON in request body", async () => {
      // Arrange
      mockContext.request.json = vi.fn().mockRejectedValue(new Error("Invalid JSON"));

      // Act
      const response = await DELETE_ACCOUNT(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON");
      expect(data.message).toContain("must be valid JSON");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      const deletePayload = {
        confirmation_email: "test@example.com",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(deletePayload);
      deleteAccountMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await DELETE_ACCOUNT(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to delete account");
      expect(data.details).toContain("Database connection failed");
    });
  });

  describe("Unauthenticated User", () => {
    it("should return 401 Unauthorized for an unauthenticated user", async () => {
      // Arrange
      const unauthorizedResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      mockRequireAuth.mockRejectedValue(unauthorizedResponse);

      const deletePayload = {
        confirmation_email: "test@example.com",
      };
      mockContext.request.json = vi.fn().mockResolvedValue(deletePayload);

      // Act
      const response = await DELETE_ACCOUNT(mockContext);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseBody.error).toBe("Unauthorized");
      expect(deleteAccountMock).not.toHaveBeenCalled();
    });
  });
});
