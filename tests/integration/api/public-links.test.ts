import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "@/lib/middleware/auth.middleware";
import { POST, PATCH, DELETE } from "@/pages/api/notes/[id]/public-link/index";
import { POST as POST_ROTATE } from "@/pages/api/notes/[id]/public-link/rotate";
import type { PublicLinkDTO } from "@/types";
import type { APIContext } from "astro";

// Define mock functions in the module scope
const createPublicLinkMock = vi.fn();
const updatePublicLinkMock = vi.fn();
const deletePublicLinkMock = vi.fn();
const rotateTokenMock = vi.fn();

// Mock the service module with a proper class constructor
vi.mock("@/lib/services/public-links.service", () => {
  return {
    PublicLinksService: class MockPublicLinksService {
      createPublicLink = createPublicLinkMock;
      updatePublicLink = updatePublicLinkMock;
      deletePublicLink = deletePublicLinkMock;
      rotateToken = rotateTokenMock;
    },
  };
});

vi.mock("@/lib/middleware/auth.middleware");

const mockRequireAuth = vi.mocked(requireAuth);

describe("POST /api/notes/[id]/public-link - Create Public Link", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/notes/550e8400-e29b-41d4-a716-446655440100/public-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/notes/550e8400-e29b-41d4-a716-446655440100/public-link"),
      params: { id: "550e8400-e29b-41d4-a716-446655440100" },
    } as unknown as APIContext;
  });

  describe("Authenticated User (Note Owner)", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 201 Created when creating a public link", async () => {
      // Arrange
      const mockPublicLink: PublicLinkDTO = {
        token: "abc123def456ghi789",
        url: "/public/abc123def456ghi789",
        is_enabled: true,
        created_at: "2025-10-20T10:00:00Z",
        is_new: true,
      };

      mockContext.request.json = vi.fn().mockResolvedValue({});
      createPublicLinkMock.mockResolvedValue(mockPublicLink);

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(201);
      expect(createPublicLinkMock).toHaveBeenCalledWith("user-123", "550e8400-e29b-41d4-a716-446655440100");
    });

    it("should return 403 Forbidden if the user is not the owner of the note", async () => {
      // Arrange
      mockContext.request.json = vi.fn().mockResolvedValue({});
      createPublicLinkMock.mockRejectedValue(new Error("NOTE_NOT_OWNED"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect(data.message).toContain("owner");
    });

    it("should return 404 Not Found if the note does not exist", async () => {
      // Arrange
      mockContext.request.json = vi.fn().mockResolvedValue({});
      createPublicLinkMock.mockRejectedValue(new Error("NOTE_NOT_FOUND"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toBe("Note not found");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      mockContext.request.json = vi.fn().mockResolvedValue({});
      createPublicLinkMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to create public link");
      expect(data.details).toContain("Database connection failed");
    });
  });

  describe("Unauthenticated User", () => {
    it("should return 401 Unauthorized for an unauthenticated user", async () => {
      // Arrange
      const unauthorizedResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      mockRequireAuth.mockRejectedValue(unauthorizedResponse);

      mockContext.request.json = vi.fn().mockResolvedValue({});

      // Act
      const response = await POST(mockContext);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseBody.error).toBe("Unauthorized");
      expect(createPublicLinkMock).not.toHaveBeenCalled();
    });
  });

  describe("Invalid UUID Parameter", () => {
    it("should return 400 Bad Request for invalid note ID format", async () => {
      // Arrange
      mockContext.params.id = "invalid-uuid";

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Invalid note ID format");
      expect(createPublicLinkMock).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request if note ID parameter is missing", async () => {
      // Arrange
      mockContext.params = {};

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Note ID is required");
    });
  });

  describe("Error handling", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should handle edge case when note becomes unavailable during link creation", async () => {
      // Arrange
      mockContext.request.json = vi.fn().mockResolvedValue({});
      createPublicLinkMock.mockRejectedValue(new Error("NOTE_DELETED"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to create public link");
    });
  });
});

describe("PATCH /api/notes/[id]/public-link - Update Public Link Status", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/notes/550e8400-e29b-41d4-a716-446655440100/public-link", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/notes/550e8400-e29b-41d4-a716-446655440100/public-link"),
      params: { id: "550e8400-e29b-41d4-a716-446655440100" },
    } as unknown as APIContext;
  });

  describe("Authenticated User (Note Owner)", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 200 OK with the updated link data when disabling a link", async () => {
      // Arrange
      const updatePayload = {
        is_enabled: false,
      };

      const mockUpdatedLink: PublicLinkDTO = {
        token: "abc123def456ghi789",
        url: "/public/abc123def456ghi789",
        is_enabled: false,
        created_at: "2025-10-20T10:00:00Z",
        updated_at: "2025-10-20T11:00:00Z",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(updatePayload);
      updatePublicLinkMock.mockResolvedValue(mockUpdatedLink);

      // Act
      const response = await PATCH(mockContext);

      // Assert
      expect(response.status).toBe(200);
      expect(updatePublicLinkMock).toHaveBeenCalledWith(
        "user-123",
        "550e8400-e29b-41d4-a716-446655440100",
        updatePayload
      );
    });

    it("should return 400 Bad Request for invalid request body", async () => {
      // Arrange
      const invalidPayload = {
        is_enabled: "not-a-boolean",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(invalidPayload);

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.message).toBe("Invalid request body");
      expect(updatePublicLinkMock).not.toHaveBeenCalled();
    });

    it("should return 403 Forbidden if the user is not the owner of the note", async () => {
      // Arrange
      const updatePayload = {
        is_enabled: false,
      };

      mockContext.request.json = vi.fn().mockResolvedValue(updatePayload);
      updatePublicLinkMock.mockRejectedValue(new Error("NOTE_NOT_OWNED"));

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 404 Not Found if the note does not exist", async () => {
      // Arrange
      const updatePayload = {
        is_enabled: false,
      };

      mockContext.request.json = vi.fn().mockResolvedValue(updatePayload);
      updatePublicLinkMock.mockRejectedValue(new Error("NOTE_NOT_FOUND"));

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toContain("not found");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      const updatePayload = {
        is_enabled: false,
      };

      mockContext.request.json = vi.fn().mockResolvedValue(updatePayload);
      updatePublicLinkMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toContain("Failed to update");
      expect(data.details).toContain("Database connection failed");
    });
  });

  describe("Unauthenticated User", () => {
    it("should return 401 Unauthorized for an unauthenticated user", async () => {
      // Arrange
      const unauthorizedResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      mockRequireAuth.mockRejectedValue(unauthorizedResponse);

      const updatePayload = {
        is_enabled: false,
      };
      mockContext.request.json = vi.fn().mockResolvedValue(updatePayload);

      // Act
      const response = await PATCH(mockContext);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseBody.error).toBe("Unauthorized");
      expect(updatePublicLinkMock).not.toHaveBeenCalled();
    });
  });

  describe("Invalid UUID Parameter", () => {
    it("should return 400 Bad Request for invalid note ID format", async () => {
      // Arrange
      mockContext.params.id = "invalid-uuid";

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      const updatePayload = {
        is_enabled: false,
      };
      mockContext.request.json = vi.fn().mockResolvedValue(updatePayload);

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Invalid note ID format");
      expect(updatePublicLinkMock).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request if note ID parameter is missing", async () => {
      // Arrange
      mockContext.params = {};

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      const updatePayload = {
        is_enabled: false,
      };
      mockContext.request.json = vi.fn().mockResolvedValue(updatePayload);

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Note ID is required");
    });
  });
});

describe("DELETE /api/notes/[id]/public-link - Delete Public Link", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/notes/550e8400-e29b-41d4-a716-446655440100/public-link", {
        method: "DELETE",
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/notes/550e8400-e29b-41d4-a716-446655440100/public-link"),
      params: { id: "550e8400-e29b-41d4-a716-446655440100" },
    } as unknown as APIContext;
  });

  describe("Authenticated User (Note Owner)", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 204 No Content on successful deletion", async () => {
      // Arrange
      deletePublicLinkMock.mockResolvedValue(undefined);

      // Act
      const response = await DELETE(mockContext);

      // Assert
      expect(response.status).toBe(204);
      expect(deletePublicLinkMock).toHaveBeenCalledWith("user-123", "550e8400-e29b-41d4-a716-446655440100");
    });

    it("should return 403 Forbidden if the user is not the owner of the note", async () => {
      // Arrange
      deletePublicLinkMock.mockRejectedValue(new Error("NOTE_NOT_OWNED"));

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 404 Not Found if the note does not exist", async () => {
      // Arrange
      deletePublicLinkMock.mockRejectedValue(new Error("NOTE_NOT_FOUND"));

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      deletePublicLinkMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toContain("Failed to delete");
      expect(data.details).toContain("Database connection failed");
    });

    it("should handle edge case when public link record is corrupted", async () => {
      // Arrange
      deletePublicLinkMock.mockRejectedValue(new Error("Invalid public link data"));

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.details).toContain("Invalid public link data");
    });
  });

  describe("Unauthenticated User", () => {
    it("should return 401 Unauthorized for an unauthenticated user", async () => {
      // Arrange
      const unauthorizedResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      mockRequireAuth.mockRejectedValue(unauthorizedResponse);

      // Act
      const response = await DELETE(mockContext);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseBody.error).toBe("Unauthorized");
      expect(deletePublicLinkMock).not.toHaveBeenCalled();
    });
  });

  describe("Invalid UUID Parameter", () => {
    it("should return 400 Bad Request for invalid note ID format", async () => {
      // Arrange
      mockContext.params.id = "invalid-uuid";

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Invalid note ID format");
      expect(deletePublicLinkMock).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request if note ID parameter is missing", async () => {
      // Arrange
      mockContext.params = {};

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Note ID is required");
    });
  });
});

describe("POST /api/notes/[id]/public-link/rotate - Rotate Public Link Token", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/notes/550e8400-e29b-41d4-a716-446655440100/public-link/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/notes/550e8400-e29b-41d4-a716-446655440100/public-link/rotate"),
      params: { id: "550e8400-e29b-41d4-a716-446655440100" },
    } as unknown as APIContext;
  });

  describe("Authenticated User (Note Owner)", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 200 OK with the new public link data on successful rotation", async () => {
      // Arrange
      const mockRotatedLink: PublicLinkDTO = {
        token: "xyz789abc123def456",
        url: "/public/xyz789abc123def456",
        is_enabled: true,
        created_at: "2025-10-20T10:00:00Z",
        updated_at: "2025-10-20T12:00:00Z",
      };

      rotateTokenMock.mockResolvedValue(mockRotatedLink);

      // Act
      const response = await POST_ROTATE(mockContext);

      // Assert
      expect(response.status).toBe(200);
      expect(rotateTokenMock).toHaveBeenCalledWith("user-123", "550e8400-e29b-41d4-a716-446655440100");
    });

    it("should return 403 Forbidden if the user is not the owner of the note", async () => {
      // Arrange
      rotateTokenMock.mockRejectedValue(new Error("NOTE_NOT_OWNED"));

      // Act
      const response = await POST_ROTATE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 404 Not Found if the public link does not exist", async () => {
      // Arrange
      rotateTokenMock.mockRejectedValue(new Error("LINK_NOT_FOUND"));

      // Act
      const response = await POST_ROTATE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      rotateTokenMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await POST_ROTATE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.details).toContain("Database connection failed");
    });
  });

  describe("Unauthenticated User", () => {
    it("should return 401 Unauthorized for an unauthenticated user", async () => {
      // Arrange
      const unauthorizedResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      mockRequireAuth.mockRejectedValue(unauthorizedResponse);

      // Act
      const response = await POST_ROTATE(mockContext);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseBody.error).toBe("Unauthorized");
      expect(rotateTokenMock).not.toHaveBeenCalled();
    });
  });

  describe("Invalid UUID Parameter", () => {
    it("should return 400 Bad Request for invalid note ID format", async () => {
      // Arrange
      mockContext.params.id = "invalid-uuid";

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await POST_ROTATE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Invalid note ID format");
      expect(rotateTokenMock).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request if note ID parameter is missing", async () => {
      // Arrange
      mockContext.params = {};

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await POST_ROTATE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Note ID is required");
    });
  });
});
