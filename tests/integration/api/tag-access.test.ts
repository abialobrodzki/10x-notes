import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "@/lib/middleware/auth.middleware";
import { DELETE } from "@/pages/api/tags/[id]/access/[recipient_id]";
import { GET, POST } from "@/pages/api/tags/[id]/access/index";
import type { TagAccessListDTO, TagAccessGrantedDTO } from "@/types";
import type { APIContext } from "astro";

// Define mock functions in the module scope
const getTagAccessMock = vi.fn();
const grantTagAccessMock = vi.fn();
const revokeTagAccessMock = vi.fn();

// Mock the service module with a proper class constructor
vi.mock("@/lib/services/tag-access.service", () => {
  return {
    TagAccessService: class MockTagAccessService {
      getTagAccess = getTagAccessMock;
      grantTagAccess = grantTagAccessMock;
      revokeTagAccess = revokeTagAccessMock;
    },
  };
});

vi.mock("@/lib/middleware/auth.middleware");

const mockRequireAuth = vi.mocked(requireAuth);

describe("GET /api/tags/[id]/access - Fetch Tag Access List", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/tags/550e8400-e29b-41d4-a716-446655440001/access"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/tags/550e8400-e29b-41d4-a716-446655440001/access"),
      params: { id: "550e8400-e29b-41d4-a716-446655440001" },
    } as unknown as APIContext;
  });

  describe("Authenticated User (Tag Owner)", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 200 OK with a list of recipients for a tag owner", async () => {
      // Arrange
      const mockAccessList: TagAccessListDTO = {
        recipients: [
          {
            recipient_id: "user-456",
            email: "colleague1@example.com",
            granted_at: "2025-10-20T10:00:00Z",
          },
          {
            recipient_id: "user-789",
            email: "colleague2@example.com",
            granted_at: "2025-10-21T14:30:00Z",
          },
        ],
      };

      getTagAccessMock.mockResolvedValue(mockAccessList);

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(data.recipients).toHaveLength(2);
      expect(data.recipients[0].email).toBe("colleague1@example.com");
      expect(data.recipients[0].recipient_id).toBe("user-456");
      expect(data.recipients[1].email).toBe("colleague2@example.com");
      expect(getTagAccessMock).toHaveBeenCalledWith("user-123", "550e8400-e29b-41d4-a716-446655440001");
    });

    it("should return 200 OK with empty recipients array when no one has access", async () => {
      // Arrange
      const mockAccessList: TagAccessListDTO = {
        recipients: [],
      };

      getTagAccessMock.mockResolvedValue(mockAccessList);

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.recipients).toHaveLength(0);
    });

    it("should return 404 Not Found if the tag does not exist", async () => {
      // Arrange
      getTagAccessMock.mockRejectedValue(new Error("TAG_NOT_FOUND"));

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toBe("Tag not found");
    });

    it("should return 403 Forbidden if the user is not the owner of the tag", async () => {
      // Arrange
      getTagAccessMock.mockRejectedValue(new Error("TAG_NOT_OWNED"));

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect(data.message).toContain("Only tag owner");
      expect(data.details).toContain("not the owner");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      getTagAccessMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to fetch tag access list");
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
      mockContext.params.id = "invalid-uuid";

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Invalid tag ID format");
      expect(getTagAccessMock).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request if tag ID parameter is missing", async () => {
      // Arrange
      mockContext.params = {};

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await GET(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Tag ID is required");
    });
  });
});

describe("POST /api/tags/[id]/access - Grant Tag Access", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request("http://localhost/api/tags/550e8400-e29b-41d4-a716-446655440001/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL("http://localhost/api/tags/550e8400-e29b-41d4-a716-446655440001/access"),
      params: { id: "550e8400-e29b-41d4-a716-446655440001" },
    } as unknown as APIContext;
  });

  describe("Authenticated User (Tag Owner)", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 201 Created on successful access grant", async () => {
      // Arrange
      const grantAccessPayload = {
        recipient_email: "colleague@example.com",
      };

      const mockGrantedAccess: TagAccessGrantedDTO = {
        recipient_id: "user-456",
        email: "colleague@example.com",
        granted_at: "2025-10-20T10:00:00Z",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(grantAccessPayload);
      grantTagAccessMock.mockResolvedValue(mockGrantedAccess);

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(data.recipient_id).toBe("user-456");
      expect(data.email).toBe("colleague@example.com");
      expect(grantTagAccessMock).toHaveBeenCalledWith(
        "user-123",
        "550e8400-e29b-41d4-a716-446655440001",
        "colleague@example.com"
      );
    });

    it("should return 400 Bad Request for invalid email format", async () => {
      // Arrange
      const invalidPayload = {
        recipient_email: "not-an-email",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(invalidPayload);

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.message).toBe("Invalid request body");
      expect(grantTagAccessMock).not.toHaveBeenCalled();
    });

    it("should return 409 Conflict if the recipient already has access", async () => {
      // Arrange
      const grantAccessPayload = {
        recipient_email: "colleague@example.com",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(grantAccessPayload);
      grantTagAccessMock.mockRejectedValue(new Error("DUPLICATE_ACCESS"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(data.error).toBe("Conflict");
      expect(data.message).toBe("Recipient already has access to this tag");
    });

    it("should return 403 Forbidden when trying to grant access to oneself", async () => {
      // Arrange
      const grantAccessPayload = {
        recipient_email: "test@example.com",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(grantAccessPayload);
      grantTagAccessMock.mockRejectedValue(new Error("CANNOT_SHARE_WITH_SELF"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect(data.message).toBe("Cannot share tag with yourself");
    });

    it("should return 403 Forbidden if user is not the owner of the tag", async () => {
      // Arrange
      const grantAccessPayload = {
        recipient_email: "colleague@example.com",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(grantAccessPayload);
      grantTagAccessMock.mockRejectedValue(new Error("TAG_NOT_OWNED"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect(data.message).toContain("Only tag owner");
    });

    it("should return 404 Not Found if the tag does not exist", async () => {
      // Arrange
      const grantAccessPayload = {
        recipient_email: "colleague@example.com",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(grantAccessPayload);
      grantTagAccessMock.mockRejectedValue(new Error("TAG_NOT_FOUND"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toBe("Tag not found");
    });

    it("should return 404 Not Found if recipient user not found", async () => {
      // Arrange
      const grantAccessPayload = {
        recipient_email: "nonexistent@example.com",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(grantAccessPayload);
      grantTagAccessMock.mockRejectedValue(new Error("USER_NOT_FOUND"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toBe("User with this email not found");
    });

    it("should return 400 Bad Request if recipient email not confirmed", async () => {
      // Arrange
      const grantAccessPayload = {
        recipient_email: "unconfirmed@example.com",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(grantAccessPayload);
      grantTagAccessMock.mockRejectedValue(new Error("USER_EMAIL_NOT_CONFIRMED"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Recipient email not confirmed");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      const grantAccessPayload = {
        recipient_email: "colleague@example.com",
      };

      mockContext.request.json = vi.fn().mockResolvedValue(grantAccessPayload);
      grantTagAccessMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to grant tag access");
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
  });

  describe("Unauthenticated User", () => {
    it("should return 401 Unauthorized for an unauthenticated user", async () => {
      // Arrange
      const unauthorizedResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      mockRequireAuth.mockRejectedValue(unauthorizedResponse);

      const grantAccessPayload = {
        recipient_email: "colleague@example.com",
      };
      mockContext.request.json = vi.fn().mockResolvedValue(grantAccessPayload);

      // Act
      const response = await POST(mockContext);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseBody.error).toBe("Unauthorized");
      expect(grantTagAccessMock).not.toHaveBeenCalled();
    });
  });

  describe("Invalid UUID Parameter", () => {
    it("should return 400 Bad Request for invalid UUID format", async () => {
      // Arrange
      mockContext.params.id = "invalid-uuid";

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      const grantAccessPayload = {
        recipient_email: "colleague@example.com",
      };
      mockContext.request.json = vi.fn().mockResolvedValue(grantAccessPayload);

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Invalid tag ID format");
      expect(grantTagAccessMock).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request if tag ID parameter is missing", async () => {
      // Arrange
      mockContext.params = {};

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      const grantAccessPayload = {
        recipient_email: "colleague@example.com",
      };
      mockContext.request.json = vi.fn().mockResolvedValue(grantAccessPayload);

      // Act
      const response = await POST(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Tag ID is required");
    });
  });
});

describe("DELETE /api/tags/[id]/access/[recipient_id] - Revoke Tag Access", () => {
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockContext = {
      request: new Request(
        "http://localhost/api/tags/550e8400-e29b-41d4-a716-446655440001/access/550e8400-e29b-41d4-a716-446655440002",
        {
          method: "DELETE",
        }
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locals: { supabase: {} as any },
      url: new URL(
        "http://localhost/api/tags/550e8400-e29b-41d4-a716-446655440001/access/550e8400-e29b-41d4-a716-446655440002"
      ),
      params: {
        id: "550e8400-e29b-41d4-a716-446655440001",
        recipient_id: "550e8400-e29b-41d4-a716-446655440002",
      },
    } as unknown as APIContext;
  });

  describe("Authenticated User (Tag Owner)", () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });
    });

    it("should return 204 No Content on successful access revocation", async () => {
      // Arrange
      revokeTagAccessMock.mockResolvedValue(undefined);

      // Act
      const response = await DELETE(mockContext);

      // Assert
      expect(response.status).toBe(204);
      expect(revokeTagAccessMock).toHaveBeenCalledWith(
        "user-123",
        "550e8400-e29b-41d4-a716-446655440001",
        "550e8400-e29b-41d4-a716-446655440002"
      );
    });

    it("should return 403 Forbidden if the user is not the owner of the tag", async () => {
      // Arrange
      revokeTagAccessMock.mockRejectedValue(new Error("TAG_NOT_OWNED"));

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect(data.message).toContain("Only tag owner");
    });

    it("should return 400 Bad Request for missing recipient ID parameter", async () => {
      // Arrange
      mockContext.params.recipient_id = "";

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
    });

    it("should return 404 Not Found if the tag does not exist", async () => {
      // Arrange
      revokeTagAccessMock.mockRejectedValue(new Error("TAG_NOT_FOUND"));

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toBe("Tag not found");
    });

    it("should return 404 Not Found if recipient does not have access", async () => {
      // Arrange
      revokeTagAccessMock.mockRejectedValue(new Error("ACCESS_NOT_FOUND"));

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe("Not found");
      expect(data.message).toBe("Access grant not found");
    });

    it("should return 500 if the service throws an unexpected error", async () => {
      // Arrange
      revokeTagAccessMock.mockRejectedValue(new Error("Database connection failed"));

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Failed to revoke tag access");
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
      expect(revokeTagAccessMock).not.toHaveBeenCalled();
    });
  });

  describe("Invalid UUID Parameters", () => {
    it("should return 400 Bad Request for invalid tag ID format", async () => {
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
      expect(revokeTagAccessMock).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request for invalid recipient ID format", async () => {
      // Arrange
      mockContext.params.recipient_id = "invalid-uuid";

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Invalid recipient ID format");
      expect(revokeTagAccessMock).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request if tag ID parameter is missing", async () => {
      // Arrange
      mockContext.params = { recipient_id: "user-456" };

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Tag ID is required");
    });

    it("should return 400 Bad Request if recipient ID parameter is missing", async () => {
      // Arrange
      mockContext.params = { id: "550e8400-e29b-41d4-a716-446655440001" };

      mockRequireAuth.mockResolvedValue({ userId: "user-123", email: "test@example.com" });

      // Act
      const response = await DELETE(mockContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe("Bad request");
      expect(data.message).toBe("Recipient ID is required");
    });
  });
});
