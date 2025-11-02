import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "@/lib/middleware/auth.middleware";
import { GET, POST } from "@/pages/api/notes/index";
import type { NotesListDTO } from "@/types";
import type { APIContext } from "astro";

// Define mock functions in the module scope
const getNotesMock = vi.fn();
const createNoteMock = vi.fn();

// Mock the service module with a proper class constructor
vi.mock("@/lib/services/notes.service", () => {
  return {
    NotesService: class MockNotesService {
      getNotes = getNotesMock;
      createNote = createNoteMock;
    },
  };
});

vi.mock("@/lib/middleware/auth.middleware");

const mockRequireAuth = vi.mocked(requireAuth);

describe("GET /api/notes - Fetch User Notes", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/notes"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/notes"),
    } as unknown as APIContext;
  });

  describe("Authenticated User", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 200 OK with a paginated list of notes", async () => {
      // Arrange
      const mockNotesResponse: NotesListDTO = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        notes: [{ id: "note-1", title: "Test Note 1" } as any],
        pagination: { page: 1, limit: 10, total: 1, total_pages: 1 },
      };
      getNotesMock.mockResolvedValue(mockNotesResponse);

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("X-Total-Count")).toBe("1");
      expect(data.notes[0].title).toBe("Test Note 1");
      expect(getNotesMock).toHaveBeenCalledWith("user-123", expect.any(Object));
    });

    it("should pass through pagination parameters to service", async () => {
      // Arrange
      const mockNotesResponse: NotesListDTO = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        notes: [{ id: "note-2", title: "Test Note 2" } as any],
        pagination: { page: 2, limit: 5, total: 10, total_pages: 2 },
      };
      getNotesMock.mockResolvedValue(mockNotesResponse);

      mockContext.url = new URL("http://localhost/api/notes?page=2&limit=5");

      // Act
      const response = await GET(mockContext);

      // Assert
      expect(response.status).toBe(200);
      expect(getNotesMock).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          page: 2,
          limit: 5,
        })
      );
    });

    it("should handle tag_id filter parameter", async () => {
      // Arrange
      const mockNotesResponse: NotesListDTO = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        notes: [{ id: "note-3", title: "Tagged Note" } as any],
        pagination: { page: 1, limit: 10, total: 1, total_pages: 1 },
      };
      getNotesMock.mockResolvedValue(mockNotesResponse);

      mockContext.url = new URL("http://localhost/api/notes?tag_id=550e8400-e29b-41d4-a716-446655440001");

      // Act
      const response = await GET(mockContext);

      // Assert
      expect(response.status).toBe(200);
      expect(getNotesMock).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          tag_id: "550e8400-e29b-41d4-a716-446655440001",
        })
      );
    });

    it("should return 500 if the notes service throws an unexpected error", async () => {
      // Arrange
      getNotesMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.details).toContain("Database connection failed");
    });

    it("should return 400 when query parameters fail validation", async () => {
      mockContext.url = new URL("http://localhost/api/notes?limit=not-a-number");

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(getNotesMock).not.toHaveBeenCalled();
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
      mockRequireAuth.mockRejectedValue(new Error("Unexpected authentication failure"));

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("An unexpected error occurred");
    });
  });

  describe("Authentication error handling", () => {
    it("should return 500 when authentication helper throws unexpected error", async () => {
      const mockNoteInput = {
        original_content: "Meeting notes from today",
        tag_id: "550e8400-e29b-41d4-a716-446655440001",
      };

      mockRequireAuth.mockRejectedValue(new Error("Auth subsystem unavailable"));
      mockContext.request = new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockNoteInput),
      });
      // Assigning json handler ensures we do not call createNoteMock when auth fails
      mockContext.request.json = vi.fn().mockResolvedValue(mockNoteInput);

      const response = await POST(mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("An unexpected error occurred");
      expect(createNoteMock).not.toHaveBeenCalled();
    });
  });
});

describe("POST /api/notes - Create New Note", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/notes"),
    } as unknown as APIContext;
  });

  describe("Authenticated User", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 201 Created with the new note data on successful creation", async () => {
      // Arrange
      const mockNoteInput = {
        original_content: "Meeting notes from today",
        summary_text: "Discussed project timeline",
        goal_status: "achieved" as const,
        tag_id: "550e8400-e29b-41d4-a716-446655440001",
        meeting_date: "2025-10-20",
      };

      const mockCreatedNote = {
        id: "550e8400-e29b-41d4-a716-446655440100",
        original_content: "Meeting notes from today",
        summary_text: "Discussed project timeline",
        goal_status: "achieved" as const,
        suggested_tag: null,
        meeting_date: "2025-10-20",
        is_ai_generated: false,
        created_at: "2025-10-20T10:00:00Z",
        updated_at: "2025-10-20T10:00:00Z",
        tag: {
          id: "550e8400-e29b-41d4-a716-446655440001",
          name: "Work",
        },
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockNoteInput);
      createNoteMock.mockResolvedValue(mockCreatedNote);

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(data.id).toBe("550e8400-e29b-41d4-a716-446655440100");
      expect(data.original_content).toBe("Meeting notes from today");
      expect(data.tag.name).toBe("Work");
      expect(createNoteMock).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          original_content: "Meeting notes from today",
          tag_id: "550e8400-e29b-41d4-a716-446655440001",
        })
      );
    });

    it("should return 400 Bad Request for invalid input data", async () => {
      // Arrange - missing required field 'original_content'
      const invalidInput = {
        summary_text: "Some summary",
        tag_id: "550e8400-e29b-41d4-a716-446655440001",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(invalidInput);

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.message).toBe("Invalid request body");
      expect(createNoteMock).not.toHaveBeenCalled();
    });

    it("should return 403 Forbidden if the service throws a tag access error", async () => {
      // Arrange
      const mockNoteInput = {
        original_content: "Meeting notes",
        tag_id: "550e8400-e29b-41d4-a716-446655440002",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockNoteInput);
      createNoteMock.mockRejectedValue(new Error("TAG_NOT_FOUND_OR_ACCESS_DENIED"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect(data.message).toBe("Tag not found or access denied");
      expect(data.details).toContain("do not have permission");
    });

    it("should return 409 Conflict for tag creation race condition", async () => {
      // Arrange
      const mockNoteInput = {
        original_content: "Meeting notes",
        tag_name: "NewTag",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockNoteInput);
      createNoteMock.mockRejectedValue(new Error("Tag creation race condition detected"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(data.error).toBe("Conflict");
      expect(data.message).toBe("Tag creation conflict, please retry");
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

    it("should return 400 Bad Request when original_content is missing", async () => {
      // Arrange
      const invalidInput = {
        summary_text: "Some summary",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(invalidInput);

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.message).toBe("Invalid request body");
      expect(createNoteMock).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request for empty original_content", async () => {
      // Arrange
      const invalidInput = {
        original_content: "",
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

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      const mockNoteInput = {
        original_content: "Meeting notes",
        tag_id: "550e8400-e29b-41d4-a716-446655440001",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(mockNoteInput);
      createNoteMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to create note");
      expect(data.details).toContain("Database connection failed");
    });
  });

  describe("Unauthenticated User", () => {
    it("should return 401 Unauthorized for an unauthenticated user", async () => {
      // Arrange
      const unauthorizedResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      mockRequireAuth.mockRejectedValue(unauthorizedResponse);

      const mockNoteInput = {
        original_content: "Meeting notes",
        tag_id: "550e8400-e29b-41d4-a716-446655440001",
      };
      mockContext.request.json = vi.fn().mockResolvedValue(mockNoteInput);

      // Act
      const response = await POST(mockContext);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseBody.error).toBe("Unauthorized");
      expect(createNoteMock).not.toHaveBeenCalled();
    });
  });
});
