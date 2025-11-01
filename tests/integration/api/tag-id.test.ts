import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "@/lib/middleware/auth.middleware";
import { PATCH, DELETE } from "@/pages/api/tags/[id]";
import type { TagDTO } from "@/types";
import type { APIContext } from "astro";

// Define mock functions in the module scope
const updateTagMock = vi.fn();
const deleteTagMock = vi.fn();

// Mock the service module with a proper class constructor
vi.mock("@/lib/services/tags.service", () => {
  return {
    TagsService: class MockTagsService {
      updateTag = updateTagMock;
      deleteTag = deleteTagMock;
    },
  };
});

vi.mock("@/lib/middleware/auth.middleware");

const mockRequireAuth = vi.mocked(requireAuth);

describe("PATCH /api/tags/[id] - Update Tag", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/tags/550e8400-e29b-41d4-a716-446655440001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/tags/550e8400-e29b-41d4-a716-446655440001"),
      params: { id: "550e8400-e29b-41d4-a716-446655440001" },
    } as unknown as APIContext;
  });

  describe("Authenticated User", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 200 OK with the updated tag data on successful update", async () => {
      // Arrange
      const mockUpdatePayload = {
        name: "Updated Tag Name",
      };

      const mockUpdatedTag: TagDTO = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Updated Tag Name",
        created_at: "2025-10-20T10:00:00Z",
        updated_at: "2025-10-20T12:00:00Z",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);
      updateTagMock.mockResolvedValue(mockUpdatedTag);

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(data.id).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(data.name).toBe("Updated Tag Name");
      expect(updateTagMock).toHaveBeenCalledWith(
        "user-123",
        "550e8400-e29b-41d4-a716-446655440001",
        expect.objectContaining({
          name: "Updated Tag Name",
        })
      );
    });

    it("should return 400 Bad Request for invalid update data", async () => {
      // Arrange - empty tag name
      const invalidPayload = {
        name: "",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(invalidPayload);

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.message).toBe("Invalid request body");
      expect(updateTagMock).not.toHaveBeenCalled();
    });

    it("should return 404 Not Found if the tag does not exist", async () => {
      // Arrange
      const mockUpdatePayload = {
        name: "New Name",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);
      updateTagMock.mockRejectedValue(new Error("TAG_NOT_FOUND"));

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toBe("Tag not found");
    });

    it("should return 403 Forbidden if user is not the tag owner", async () => {
      // Arrange
      const mockUpdatePayload = {
        name: "New Name",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);
      updateTagMock.mockRejectedValue(new Error("TAG_NOT_OWNED"));

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect(data.message).toBe("Access denied");
      expect(data.details).toContain("not the owner");
    });

    it("should return 409 Conflict if a tag with the same name already exists", async () => {
      // Arrange
      const mockUpdatePayload = {
        name: "Existing Tag Name",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);
      updateTagMock.mockRejectedValue(new Error("TAG_NAME_ALREADY_EXISTS"));

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(data.error).toBe("Conflict");
      expect(data.message).toBe("Tag with this name already exists");
      expect(data.details).toContain("already exists");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      const mockUpdatePayload = {
        name: "New Name",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);
      updateTagMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to update tag");
      expect(data.details).toContain("Database connection failed");
    });

    it("should return 400 for invalid JSON in request body", async () => {
      // Arrange
      mockContext.request.json = vi.fn().mockRejectedValue(new Error("Invalid JSON"));

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON");
      expect(data.message).toBe("Request body must be valid JSON");
    });
  });

  describe("Unauthenticated User", () => {
    it("should return 401 Unauthorized for an unauthenticated user", async () => {
      // Arrange
      const unauthorizedResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      mockRequireAuth.mockRejectedValue(unauthorizedResponse);

      const mockUpdatePayload = {
        name: "New Name",
      };
      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);

      // Act
      const response = await PATCH(mockContext);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseBody.error).toBe("Unauthorized");
      expect(updateTagMock).not.toHaveBeenCalled();
    });
  });

  describe("Invalid UUID Parameter", () => {
    it("should return 400 Bad Request for invalid UUID format", async () => {
      // Arrange
      mockContext.params.id = "invalid-uuid";

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      const mockUpdatePayload = {
        name: "New Name",
      };
      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Invalid tag ID format");
      expect(updateTagMock).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request if tag ID parameter is missing", async () => {
      // Arrange
      mockContext.params = {};

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      const mockUpdatePayload = {
        name: "New Name",
      };
      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Tag ID is required");
    });
  });
});

describe("DELETE /api/tags/[id] - Delete Tag", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/tags/550e8400-e29b-41d4-a716-446655440001", {
        method: "DELETE",
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/tags/550e8400-e29b-41d4-a716-446655440001"),
      params: { id: "550e8400-e29b-41d4-a716-446655440001" },
    } as unknown as APIContext;
  });

  describe("Authenticated User", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 204 No Content on successful deletion", async () => {
      // Arrange
      deleteTagMock.mockResolvedValue(undefined);

      // Act
      const response = await DELETE(mockContext);

      // Assert
      expect(response.status).toBe(204);
      expect(deleteTagMock).toHaveBeenCalledWith("user-123", "550e8400-e29b-41d4-a716-446655440001");
    });

    it("should return 404 Not Found if the tag does not exist or user lacks access", async () => {
      // Arrange
      deleteTagMock.mockRejectedValue(new Error("TAG_NOT_FOUND"));

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toBe("Tag not found");
      expect(data.details).toContain("do not have permission");
    });

    it("should return 409 Conflict if tag has notes assigned to it", async () => {
      // Arrange
      deleteTagMock.mockRejectedValue(new Error("TAG_HAS_NOTES"));

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(data.error).toBe("Conflict");
      expect(data.message).toBe("Cannot delete tag with existing notes");
      expect(data.details).toContain("Please reassign or delete the notes first");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      deleteTagMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to delete tag");
      expect(data.details).toContain("Database connection failed");
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
      expect(deleteTagMock).not.toHaveBeenCalled();
    });
  });

  describe("Invalid UUID Parameter", () => {
    it("should return 400 Bad Request for invalid UUID format", async () => {
      // Arrange
      mockContext.params.id = "invalid-uuid";

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Invalid tag ID format");
      expect(deleteTagMock).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request if tag ID parameter is missing", async () => {
      // Arrange
      mockContext.params = {};

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Tag ID is required");
    });
  });
});
