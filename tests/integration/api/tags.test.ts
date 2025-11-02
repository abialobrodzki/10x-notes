import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/middleware/auth.middleware";
import { tagsListQuerySchema } from "@/lib/validators/tags.schemas";
import { GET, POST } from "@/pages/api/tags/index";
import type { TagsListDTO, TagDTO } from "@/types";
import type { APIContext } from "astro";

// Define mock functions in the module scope
const getTagsMock = vi.fn();
const createTagMock = vi.fn();

// Mock the service module with a proper class constructor
vi.mock("@/lib/services/tags.service", () => {
  return {
    TagsService: class MockTagsService {
      getTags = getTagsMock;
      createTag = createTagMock;
    },
  };
});

vi.mock("@/lib/middleware/auth.middleware");

const mockRequireAuth = vi.mocked(requireAuth);

describe("GET /api/tags - Fetch User Tags", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/tags"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/tags"),
    } as unknown as APIContext;
  });

  describe("Authenticated User", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 200 OK with an array of tags for an authenticated user", async () => {
      // Arrange
      const mockTagsResponse: TagsListDTO = {
        tags: [
          {
            id: "550e8400-e29b-41d4-a716-446655440001",
            name: "Work",
            created_at: "2025-10-15T10:00:00Z",
            updated_at: "2025-10-20T10:00:00Z",
            note_count: 5,
            is_owner: true,
            shared_recipients: 2,
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440002",
            name: "Personal",
            created_at: "2025-10-14T10:00:00Z",
            updated_at: "2025-10-19T10:00:00Z",
            note_count: 3,
            is_owner: true,
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440003",
            name: "Shared Tag",
            created_at: "2025-10-13T10:00:00Z",
            updated_at: "2025-10-18T10:00:00Z",
            note_count: 1,
            is_owner: false,
          },
        ],
      };

      getTagsMock.mockResolvedValue(mockTagsResponse);

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("X-Total-Count")).toBe("3");
      expect(data.tags).toHaveLength(3);
      expect(data.tags[0].name).toBe("Work");
      expect(data.tags[0].note_count).toBe(5);
      expect(data.tags[0].is_owner).toBe(true);
      expect(data.tags[1].name).toBe("Personal");
      expect(data.tags[2].name).toBe("Shared Tag");
      expect(data.tags[2].is_owner).toBe(false);
      expect(getTagsMock).toHaveBeenCalledWith("user-123", expect.any(Object));
    });

    it("should return 200 OK with empty tags array when user has no tags", async () => {
      // Arrange
      const mockTagsResponse: TagsListDTO = {
        tags: [],
      };

      getTagsMock.mockResolvedValue(mockTagsResponse);

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("X-Total-Count")).toBe("0");
      expect(data.tags).toHaveLength(0);
    });

    it("should return 200 OK and include shared tags when include_shared parameter is true", async () => {
      // Arrange
      const mockTagsResponse: TagsListDTO = {
        tags: [
          {
            id: "550e8400-e29b-41d4-a716-446655440001",
            name: "Owned Tag",
            created_at: "2025-10-15T10:00:00Z",
            updated_at: "2025-10-20T10:00:00Z",
            note_count: 5,
            is_owner: true,
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440004",
            name: "Shared With Me",
            created_at: "2025-10-12T10:00:00Z",
            updated_at: "2025-10-17T10:00:00Z",
            note_count: 2,
            is_owner: false,
          },
        ],
      };

      getTagsMock.mockResolvedValue(mockTagsResponse);

      mockContext.url = new URL("http://localhost/api/tags?include_shared=true");

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.tags).toHaveLength(2);
      expect(data.tags[1].is_owner).toBe(false);
      expect(getTagsMock).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          include_shared: true,
        })
      );
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      getTagsMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to fetch tags");
      expect(data.details).toContain("Database connection failed");
    });

    it("should return 400 when query validation fails", async () => {
      const validationError = new ZodError([
        {
          code: "invalid_type",
          path: ["include_shared"],
          message: "Expected boolean",
          expected: "boolean",
          received: "string",
        },
      ]);

      const safeParseSpy = vi
        .spyOn(tagsListQuerySchema, "safeParse")
        .mockReturnValue({ success: false, error: validationError } as ReturnType<
          (typeof tagsListQuerySchema)["safeParse"]
        >);

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.message).toBe("Invalid query parameters");
      expect(getTagsMock).not.toHaveBeenCalled();

      safeParseSpy.mockRestore();
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
    });

    it("should return 500 for unexpected errors from requireAuth", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unexpected auth failure"));

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("An unexpected error occurred");
    });
  });

  describe("Error handling fallbacks", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should fallback to generic message when service throws non-error value", async () => {
      getTagsMock.mockRejectedValue("service-timeout");

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe("Unknown error");
    });

    it("should return 500 when authentication helper throws non-error value", async () => {
      mockRequireAuth.mockRejectedValue("auth-offline");

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe("Unknown error occurred");
      expect(data.error).toBe("Internal server error");
      expect(getTagsMock).not.toHaveBeenCalled();
    });
  });
});

describe("POST /api/tags - Create New Tag", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/tags"),
    } as unknown as APIContext;
  });

  describe("Authenticated User", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 201 Created with the new tag data on successful creation", async () => {
      // Arrange
      const mockTagInput = {
        name: "New Project",
      };

      const mockCreatedTag: TagDTO = {
        id: "550e8400-e29b-41d4-a716-446655440005",
        name: "New Project",
        created_at: "2025-10-20T10:00:00Z",
        updated_at: "2025-10-20T10:00:00Z",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockTagInput);
      createTagMock.mockResolvedValue(mockCreatedTag);

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(data.id).toBe("550e8400-e29b-41d4-a716-446655440005");
      expect(data.name).toBe("New Project");
      expect(createTagMock).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          name: "New Project",
        })
      );
    });

    it("should return 400 Bad Request for invalid input data", async () => {
      // Arrange - empty tag name
      const invalidInput = {
        name: "",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(invalidInput);

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.message).toBe("Invalid request body");
      expect(createTagMock).not.toHaveBeenCalled();
    });

    it("should return 409 Conflict if a tag with the same name already exists", async () => {
      // Arrange
      const mockTagInput = {
        name: "Existing Tag",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockTagInput);
      createTagMock.mockRejectedValue(new Error("TAG_NAME_ALREADY_EXISTS"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(data.error).toBe("Conflict");
      expect(data.message).toBe("Tag with this name already exists");
      expect(data.details).toContain("already exists");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      const mockTagInput = {
        name: "New Tag",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockTagInput);
      createTagMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to create tag");
      expect(data.details).toContain("Database connection failed");
    });

    it("should return 400 for invalid JSON in request body", async () => {
      // Arrange
      mockContext.request.json = vi.fn().mockRejectedValue(new Error("Invalid JSON"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON");
      expect(data.message).toBe("Request body must be valid JSON");
    });

    it("should return 400 Bad Request when name is missing", async () => {
      // Arrange
      const invalidInput = {};

      mockContext.request.json = vi.fn().mockResolvedValue(invalidInput);

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.message).toBe("Invalid request body");
      expect(createTagMock).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request when name is too long", async () => {
      // Arrange
      const invalidInput = {
        name: "a".repeat(256), // Assuming max length is 255
      };

      mockContext.request.json = vi.fn().mockResolvedValue(invalidInput);

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.message).toBe("Invalid request body");
    });
  });

  describe("Unauthenticated User", () => {
    it("should return 401 Unauthorized for an unauthenticated user", async () => {
      // Arrange
      const unauthorizedResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      mockRequireAuth.mockRejectedValue(unauthorizedResponse);

      const mockTagInput = {
        name: "New Tag",
      };
      mockContext.request.json = vi.fn().mockResolvedValue(mockTagInput);

      // Act
      const response = await POST(mockContext);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseBody.error).toBe("Unauthorized");
      expect(createTagMock).not.toHaveBeenCalled();
    });
  });

  describe("Authentication error handling", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 500 when authentication helper throws unexpected error", async () => {
      const mockTagInput = {
        name: "Team",
      };

      mockRequireAuth.mockRejectedValue(new Error("Auth context failure"));
      mockContext.request.json = vi.fn().mockResolvedValue(mockTagInput);

      const response = await POST(mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("An unexpected error occurred");
      expect(createTagMock).not.toHaveBeenCalled();
    });

    it("should fallback to generic message when service throws non-error value", async () => {
      const mockTagInput = {
        name: "Team",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockTagInput);
      createTagMock.mockRejectedValue("backend-offline");

      const response = await POST(mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe("Unknown error");
    });

    it("should return 500 when authentication helper throws non-error value", async () => {
      const mockTagInput = {
        name: "Team",
      };

      mockRequireAuth.mockRejectedValue("auth-offline");
      mockContext.request.json = vi.fn().mockResolvedValue(mockTagInput);

      const response = await POST(mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe("Unknown error occurred");
      expect(createTagMock).not.toHaveBeenCalled();
    });
  });
});
