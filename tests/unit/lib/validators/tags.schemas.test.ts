import { describe, expect, it } from "vitest";
import {
  createTagSchema,
  grantTagAccessSchema,
  tagIdParamSchema,
  tagsListQuerySchema,
  updateTagSchema,
} from "@/lib/validators/tags.schemas";

describe("tags.schemas", () => {
  // ============================================================================
  // tagIdParamSchema
  // ============================================================================

  describe("tagIdParamSchema", () => {
    describe("valid UUIDs", () => {
      it("should accept valid UUID v4", () => {
        // Arrange
        const input = {
          id: "550e8400-e29b-41d4-a716-446655440000",
        };

        // Act
        const result = tagIdParamSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe("550e8400-e29b-41d4-a716-446655440000");
        }
      });

      it("should accept different valid UUIDs", () => {
        const validUUIDs = [
          "123e4567-e89b-12d3-a456-426614174000",
          "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        ];

        validUUIDs.forEach((uuid) => {
          const result = tagIdParamSchema.safeParse({ id: uuid });
          expect(result.success).toBe(true);
        });
      });

      it("should accept uppercase UUID", () => {
        const input = {
          id: "550E8400-E29B-41D4-A716-446655440000",
        };

        const result = tagIdParamSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe("invalid UUIDs", () => {
      it("should reject non-UUID string", () => {
        // Arrange
        const input = {
          id: "not-a-uuid",
        };

        // Act
        const result = tagIdParamSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Invalid tag ID format");
        }
      });

      it("should reject empty string", () => {
        const input = {
          id: "",
        };

        const result = tagIdParamSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject UUID without hyphens", () => {
        const input = {
          id: "550e8400e29b41d4a716446655440000",
        };

        const result = tagIdParamSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject UUID with wrong format", () => {
        const input = {
          id: "550e8400-e29b-41d4-a716",
        };

        const result = tagIdParamSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject missing id field", () => {
        const input = {};

        const result = tagIdParamSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject numeric id", () => {
        const input = {
          id: 12345,
        };

        const result = tagIdParamSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });
  });

  // ============================================================================
  // tagsListQuerySchema
  // ============================================================================

  describe("tagsListQuerySchema", () => {
    describe("valid inputs", () => {
      it("should accept boolean true", () => {
        // Arrange
        const input = {
          include_shared: true,
        };

        // Act
        const result = tagsListQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_shared).toBe(true);
        }
      });

      it("should accept boolean false", () => {
        const input = {
          include_shared: false,
        };

        const result = tagsListQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_shared).toBe(false);
        }
      });

      it('should coerce string "true" to boolean', () => {
        const input = {
          include_shared: "true",
        };

        const result = tagsListQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_shared).toBe(true);
        }
      });

      it('should coerce string "false" to boolean true (non-empty string)', () => {
        const input = {
          include_shared: "false",
        };

        const result = tagsListQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          // z.coerce.boolean() uses Boolean() constructor
          // Any non-empty string is truthy, including "false"
          expect(result.data.include_shared).toBe(true);
        }
      });

      it("should coerce number 1 to true", () => {
        const input = {
          include_shared: 1,
        };

        const result = tagsListQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_shared).toBe(true);
        }
      });

      it("should coerce number 0 to false", () => {
        const input = {
          include_shared: 0,
        };

        const result = tagsListQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_shared).toBe(false);
        }
      });
    });

    describe("default behavior", () => {
      it("should default to true when field is missing", () => {
        // Arrange
        const input = {};

        // Act
        const result = tagsListQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_shared).toBe(true);
        }
      });

      it("should default to true when field is undefined", () => {
        const input = {
          include_shared: undefined,
        };

        const result = tagsListQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_shared).toBe(true);
        }
      });
    });

    describe("edge cases", () => {
      it('should coerce string "1" to true', () => {
        const input = {
          include_shared: "1",
        };

        const result = tagsListQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_shared).toBe(true);
        }
      });

      it('should coerce string "0" to true (non-empty string)', () => {
        const input = {
          include_shared: "0",
        };

        const result = tagsListQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          // z.coerce.boolean() uses Boolean() constructor
          // Any non-empty string is truthy, including "0"
          expect(result.data.include_shared).toBe(true);
        }
      });
    });
  });

  // ============================================================================
  // createTagSchema
  // ============================================================================

  describe("createTagSchema", () => {
    describe("valid inputs", () => {
      it("should accept valid tag name", () => {
        // Arrange
        const input = {
          name: "Project Alpha",
        };

        // Act
        const result = createTagSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Project Alpha");
        }
      });

      it("should accept name with exactly 1 character", () => {
        const input = {
          name: "A",
        };

        const result = createTagSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept name with exactly 100 characters", () => {
        const input = {
          name: "a".repeat(100),
        };

        const result = createTagSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept name with special characters", () => {
        const input = {
          name: "Project #1 (2024) - [Important]",
        };

        const result = createTagSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept name with unicode characters", () => {
        const input = {
          name: "Projekt Łączność 🚀",
        };

        const result = createTagSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe("trimming behavior", () => {
      it("should trim leading whitespace", () => {
        // Arrange
        const input = {
          name: "   Project",
        };

        // Act
        const result = createTagSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Project");
        }
      });

      it("should trim trailing whitespace", () => {
        const input = {
          name: "Project   ",
        };

        const result = createTagSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Project");
        }
      });

      it("should trim both leading and trailing whitespace", () => {
        const input = {
          name: "   Project   ",
        };

        const result = createTagSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Project");
        }
      });

      it("should preserve internal whitespace", () => {
        const input = {
          name: "  Project  Alpha  ",
        };

        const result = createTagSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Project  Alpha");
        }
      });
    });

    describe("invalid inputs", () => {
      it("should reject empty string", () => {
        // Arrange
        const input = {
          name: "",
        };

        // Act
        const result = createTagSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Tag name is required");
        }
      });

      it("should reject whitespace-only string (trimmed to empty)", () => {
        const input = {
          name: "   ",
        };

        const result = createTagSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Tag name is required");
        }
      });

      it("should reject name exceeding 100 characters", () => {
        const input = {
          name: "a".repeat(101),
        };

        const result = createTagSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Tag name must be at most 100 characters");
        }
      });

      it("should reject missing name field", () => {
        const input = {};

        const result = createTagSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject null name", () => {
        const input = {
          name: null,
        };

        const result = createTagSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject numeric name", () => {
        const input = {
          name: 12345,
        };

        const result = createTagSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });

    describe("length boundaries", () => {
      it("should accept name at lower boundary (1 char)", () => {
        const result = createTagSchema.safeParse({ name: "X" });

        expect(result.success).toBe(true);
      });

      it("should accept name at upper boundary (100 chars)", () => {
        const result = createTagSchema.safeParse({ name: "x".repeat(100) });

        expect(result.success).toBe(true);
      });

      it("should reject name below lower boundary (0 chars after trim)", () => {
        const result = createTagSchema.safeParse({ name: "" });

        expect(result.success).toBe(false);
      });

      it("should reject name above upper boundary (101 chars)", () => {
        const result = createTagSchema.safeParse({ name: "x".repeat(101) });

        expect(result.success).toBe(false);
      });

      it("should reject name far above boundary (200 chars)", () => {
        const result = createTagSchema.safeParse({ name: "x".repeat(200) });

        expect(result.success).toBe(false);
      });
    });
  });

  // ============================================================================
  // updateTagSchema
  // ============================================================================

  describe("updateTagSchema", () => {
    describe("valid inputs", () => {
      it("should accept valid tag name", () => {
        // Arrange
        const input = {
          name: "Updated Project",
        };

        // Act
        const result = updateTagSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Updated Project");
        }
      });

      it("should accept name with 1 character", () => {
        const input = {
          name: "B",
        };

        const result = updateTagSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept name with 100 characters", () => {
        const input = {
          name: "b".repeat(100),
        };

        const result = updateTagSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe("trimming behavior", () => {
      it("should trim leading and trailing whitespace", () => {
        // Arrange
        const input = {
          name: "   Updated   ",
        };

        // Act
        const result = updateTagSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Updated");
        }
      });

      it("should preserve internal whitespace", () => {
        const input = {
          name: "  Updated  Tag  ",
        };

        const result = updateTagSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Updated  Tag");
        }
      });
    });

    describe("invalid inputs", () => {
      it("should reject empty string", () => {
        // Arrange
        const input = {
          name: "",
        };

        // Act
        const result = updateTagSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Tag name is required");
        }
      });

      it("should reject name exceeding 100 characters", () => {
        const input = {
          name: "b".repeat(101),
        };

        const result = updateTagSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Tag name must be at most 100 characters");
        }
      });

      it("should reject whitespace-only string", () => {
        const input = {
          name: "   ",
        };

        const result = updateTagSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject missing name field", () => {
        const input = {};

        const result = updateTagSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });
  });

  // ============================================================================
  // grantTagAccessSchema
  // ============================================================================

  describe("grantTagAccessSchema", () => {
    describe("valid emails", () => {
      it("should accept valid email", () => {
        // Arrange
        const input = {
          recipient_email: "user@example.com",
        };

        // Act
        const result = grantTagAccessSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.recipient_email).toBe("user@example.com");
        }
      });

      it("should accept email with dots in local part", () => {
        const input = {
          recipient_email: "first.last@example.com",
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept email with plus sign", () => {
        const input = {
          recipient_email: "user+tag@example.com",
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept email with subdomain", () => {
        const input = {
          recipient_email: "user@mail.example.com",
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept email with numbers", () => {
        const input = {
          recipient_email: "user123@domain456.com",
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept email with hyphen in domain", () => {
        const input = {
          recipient_email: "user@my-domain.com",
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe("invalid emails", () => {
      it("should reject email without @", () => {
        // Arrange
        const input = {
          recipient_email: "userexample.com",
        };

        // Act
        const result = grantTagAccessSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Invalid email format");
        }
      });

      it("should reject email without domain", () => {
        const input = {
          recipient_email: "user@",
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject email without local part", () => {
        const input = {
          recipient_email: "@example.com",
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject email without TLD", () => {
        const input = {
          recipient_email: "user@example",
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject plain text", () => {
        const input = {
          recipient_email: "plaintext",
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject empty string", () => {
        const input = {
          recipient_email: "",
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject missing recipient_email field", () => {
        const input = {};

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject email with spaces", () => {
        const input = {
          recipient_email: "user @example.com",
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject multiple @ signs", () => {
        const input = {
          recipient_email: "user@@example.com",
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("should reject null recipient_email", () => {
        const input = {
          recipient_email: null,
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject numeric recipient_email", () => {
        const input = {
          recipient_email: 12345,
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject undefined recipient_email", () => {
        const input = {
          recipient_email: undefined,
        };

        const result = grantTagAccessSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });
  });
});
