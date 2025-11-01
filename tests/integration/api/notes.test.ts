import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "@/lib/middleware/auth.middleware";
import { GET } from "@/pages/api/notes/index";
import type { NotesListDTO } from "@/types";
import type { APIContext } from "astro";

// Define a mock function in the module scope
const getNotesMock = vi.fn();

// Mock the service module with a proper class constructor
vi.mock("@/lib/services/notes.service", () => {
  return {
    NotesService: class MockNotesService {
      getNotes = getNotesMock;
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
});
