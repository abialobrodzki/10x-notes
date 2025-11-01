import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "@/lib/middleware/auth.middleware";
import { GET, PATCH, DELETE } from "@/pages/api/notes/[id]";
import type { NoteDetailDTO, NoteDTO } from "@/types";
import type { APIContext } from "astro";

// Define mock functions in the module scope
const getNoteByIdMock = vi.fn();
const updateNoteMock = vi.fn();
const deleteNoteMock = vi.fn();

// Mock the service module with a proper class constructor
vi.mock("@/lib/services/notes.service", () => {
  return {
    NotesService: class MockNotesService {
      getNoteById = getNoteByIdMock;
      updateNote = updateNoteMock;
      deleteNote = deleteNoteMock;
    },
  };
});

vi.mock("@/lib/middleware/auth.middleware");

const mockRequireAuth = vi.mocked(requireAuth);

describe("GET /api/notes/[id] - Fetch Single Note", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/notes/550e8400-e29b-41d4-a716-446655440001"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/notes/550e8400-e29b-41d4-a716-446655440001"),
      params: { id: "550e8400-e29b-41d4-a716-446655440001" },
    } as unknown as APIContext;
  });

  describe("Authenticated User", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 200 OK with the note data for an authenticated user", async () => {
      // Arrange
      const mockNote: NoteDetailDTO = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        original_content: "Full meeting notes with details",
        summary_text: "Summary of the meeting",
        goal_status: "achieved",
        suggested_tag: null,
        meeting_date: "2025-10-20",
        is_ai_generated: false,
        created_at: "2025-10-20T10:00:00Z",
        updated_at: "2025-10-20T10:00:00Z",
        is_owner: true,
        public_link: {
          token: "public-token-123",
          is_enabled: true,
          url: "/share/public-token-123",
        },
        tag: {
          id: "550e8400-e29b-41d4-a716-446655440002",
          name: "Meeting",
          shared_recipients: 2,
        },
      };

      getNoteByIdMock.mockResolvedValue(mockNote);

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(data.id).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(data.original_content).toBe("Full meeting notes with details");
      expect(data.summary_text).toBe("Summary of the meeting");
      expect(data.is_owner).toBe(true);
      expect(data.tag.name).toBe("Meeting");
      expect(getNoteByIdMock).toHaveBeenCalledWith("user-123", "550e8400-e29b-41d4-a716-446655440001");
    });

    it("should return 404 Not Found if the note does not exist or user lacks access", async () => {
      // Arrange
      getNoteByIdMock.mockResolvedValue(null);

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toBe("Note not found");
      expect(data.details).toContain("do not have permission");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      getNoteByIdMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to fetch note");
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
    });
  });

  describe("Invalid UUID Parameter", () => {
    it("should return 400 Bad Request for invalid UUID format", async () => {
      // Arrange
      mockContext.params.id = "not-a-valid-uuid";

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Invalid note ID format");
      expect(data.details).toContain("valid UUID");
      expect(getNoteByIdMock).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request if note ID parameter is missing", async () => {
      // Arrange
      mockContext.params = {};

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Note ID is required");
    });
  });
});

describe("PATCH /api/notes/[id] - Update Note", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/notes/550e8400-e29b-41d4-a716-446655440001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/notes/550e8400-e29b-41d4-a716-446655440001"),
      params: { id: "550e8400-e29b-41d4-a716-446655440001" },
    } as unknown as APIContext;
  });

  describe("Authenticated User", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 200 OK with the updated note data on successful update", async () => {
      // Arrange
      const mockUpdatePayload = {
        summary_text: "Updated summary",
        goal_status: "achieved" as const,
      };

      const mockUpdatedNote: NoteDTO = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        original_content: "Original content unchanged",
        summary_text: "Updated summary",
        goal_status: "achieved",
        suggested_tag: null,
        meeting_date: "2025-10-20",
        is_ai_generated: false,
        created_at: "2025-10-20T10:00:00Z",
        updated_at: "2025-10-20T12:00:00Z",
        tag: {
          id: "550e8400-e29b-41d4-a716-446655440002",
          name: "Work",
        },
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);
      updateNoteMock.mockResolvedValue(mockUpdatedNote);

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(data.id).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(data.summary_text).toBe("Updated summary");
      expect(data.goal_status).toBe("achieved");
      expect(data.updated_at).toBe("2025-10-20T12:00:00Z");
      expect(updateNoteMock).toHaveBeenCalledWith(
        "user-123",
        "550e8400-e29b-41d4-a716-446655440001",
        expect.objectContaining({
          summary_text: "Updated summary",
          goal_status: "achieved",
        })
      );
    });

    it("should return 400 Bad Request for invalid update data", async () => {
      // Arrange - invalid goal_status value
      const invalidPayload = {
        goal_status: "invalid_status",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(invalidPayload);

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.message).toBe("Invalid request body");
      expect(updateNoteMock).not.toHaveBeenCalled();
    });

    it("should return 404 Not Found if the note to update does not exist", async () => {
      // Arrange
      const mockUpdatePayload = {
        summary_text: "Updated summary",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);
      updateNoteMock.mockRejectedValue(new Error("NOTE_NOT_FOUND"));

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toBe("Note not found");
    });

    it("should return 403 Forbidden if user is not the note owner", async () => {
      // Arrange
      const mockUpdatePayload = {
        summary_text: "Updated summary",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);
      updateNoteMock.mockRejectedValue(new Error("NOTE_NOT_OWNED"));

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect(data.message).toBe("Access denied");
      expect(data.details).toContain("do not have permission");
    });

    it("should return 403 Forbidden if the tag is not owned by the user", async () => {
      // Arrange
      const mockUpdatePayload = {
        tag_id: "550e8400-e29b-41d4-a716-446655440099",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);
      updateNoteMock.mockRejectedValue(new Error("TAG_NOT_OWNED"));

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect(data.message).toBe("Tag access denied");
      expect(data.details).toContain("do not have permission");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      const mockUpdatePayload = {
        summary_text: "Updated summary",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);
      updateNoteMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to update note");
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
        summary_text: "Updated summary",
      };
      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);

      // Act
      const response = await PATCH(mockContext);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseBody.error).toBe("Unauthorized");
      expect(updateNoteMock).not.toHaveBeenCalled();
    });
  });

  describe("Invalid UUID Parameter", () => {
    it("should return 400 Bad Request for invalid UUID format", async () => {
      // Arrange
      mockContext.params.id = "invalid-uuid";

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      const mockUpdatePayload = {
        summary_text: "Updated summary",
      };
      mockContext.request.json = vi.fn().mockResolvedValue(mockUpdatePayload);

      // Act
      const response = await PATCH(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Invalid note ID format");
      expect(updateNoteMock).not.toHaveBeenCalled();
    });
  });
});

describe("DELETE /api/notes/[id] - Delete Note", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/notes/550e8400-e29b-41d4-a716-446655440001", {
        method: "DELETE",
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/notes/550e8400-e29b-41d4-a716-446655440001"),
      params: { id: "550e8400-e29b-41d4-a716-446655440001" },
    } as unknown as APIContext;
  });

  describe("Authenticated User", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 204 No Content on successful deletion", async () => {
      // Arrange
      deleteNoteMock.mockResolvedValue(undefined);

      // Act
      const response = await DELETE(mockContext);

      // Assert
      expect(response.status).toBe(204);
      expect(deleteNoteMock).toHaveBeenCalledWith("user-123", "550e8400-e29b-41d4-a716-446655440001");
    });

    it("should return 404 Not Found if the note to delete does not exist", async () => {
      // Arrange
      deleteNoteMock.mockRejectedValue(new Error("NOTE_NOT_FOUND"));

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toBe("Note not found");
      expect(data.details).toContain("do not have permission");
    });

    it("should return 404 Not Found if the user is not the note owner", async () => {
      // Arrange
      deleteNoteMock.mockRejectedValue(new Error("NOTE_NOT_OWNED"));

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toBe("Note not found");
      expect(data.details).toContain("do not have permission");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      deleteNoteMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to delete note");
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
      expect(deleteNoteMock).not.toHaveBeenCalled();
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
      expect(data.message).toBe("Invalid note ID format");
      expect(deleteNoteMock).not.toHaveBeenCalled();
    });
  });
});
