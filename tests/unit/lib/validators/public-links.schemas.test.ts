import { describe, expect, it } from "vitest";
import { createPublicLinkSchema, patchPublicLinkSchema } from "@/lib/validators/public-links.schemas";

describe("public-links.schemas", () => {
  // ============================================================================
  // createPublicLinkSchema
  // ============================================================================

  describe("createPublicLinkSchema", () => {
    describe("valid inputs", () => {
      it("should accept empty object", () => {
        // Arrange
        const input = {};

        // Act
        const result = createPublicLinkSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });

      it("should return empty object when parsed", () => {
        const input = {};

        const result = createPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({});
        }
      });
    });

    describe("edge cases", () => {
      it("should ignore extra fields", () => {
        // Schema allows any fields since it's z.object({})
        const input = {
          extra_field: "value",
          another_field: 123,
        };

        const result = createPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should handle null input", () => {
        const input = null;

        const result = createPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should handle undefined input", () => {
        const input = undefined;

        const result = createPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should handle array input", () => {
        const input: unknown = [];

        const result = createPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should handle string input", () => {
        const input = "string";

        const result = createPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });
  });

  // ============================================================================
  // patchPublicLinkSchema
  // ============================================================================

  describe("patchPublicLinkSchema", () => {
    describe("valid inputs", () => {
      it("should accept is_enabled as true", () => {
        // Arrange
        const input = {
          is_enabled: true,
        };

        // Act
        const result = patchPublicLinkSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.is_enabled).toBe(true);
        }
      });

      it("should accept is_enabled as false", () => {
        const input = {
          is_enabled: false,
        };

        const result = patchPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.is_enabled).toBe(false);
        }
      });
    });

    describe("invalid inputs", () => {
      it("should reject empty object (no fields to update)", () => {
        // Arrange
        const input = {};

        // Act
        const result = patchPublicLinkSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("No fields to update");
        }
      });

      it("should accept object with undefined is_enabled (counts as having a field)", () => {
        const input = {
          is_enabled: undefined,
        };

        const result = patchPublicLinkSchema.safeParse(input);

        // undefined is optional, but the key exists, so Object.keys returns ["is_enabled"]
        // Therefore refine passes (length > 0)
        expect(result.success).toBe(true);
      });

      it("should reject non-boolean is_enabled", () => {
        const input = {
          is_enabled: "true", // string instead of boolean
        };

        const result = patchPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject numeric is_enabled", () => {
        const input = {
          is_enabled: 1,
        };

        const result = patchPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject null is_enabled", () => {
        const input = {
          is_enabled: null,
        };

        const result = patchPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("should handle null input", () => {
        const input = null;

        const result = patchPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should handle undefined input", () => {
        const input = undefined;

        const result = patchPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should handle array input", () => {
        const input: unknown = [];

        const result = patchPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should handle string input", () => {
        const input = "string";

        const result = patchPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should accept is_enabled with extra fields", () => {
        // Extra fields should be allowed
        const input = {
          is_enabled: true,
          extra_field: "ignored",
        };

        const result = patchPublicLinkSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe("refine validation", () => {
      it("should validate that at least one field exists", () => {
        // This is the core business rule of the schema
        const emptyInput = {};

        const result = patchPublicLinkSchema.safeParse(emptyInput);

        expect(result.success).toBe(false);
        if (!result.success) {
          const refinementIssue = result.error.issues.find((issue) => issue.code === "custom");
          expect(refinementIssue).toBeDefined();
          expect(refinementIssue?.message).toBe("No fields to update");
        }
      });

      it("should pass validation when is_enabled is provided", () => {
        const validInput = { is_enabled: false };

        const result = patchPublicLinkSchema.safeParse(validInput);

        expect(result.success).toBe(true);
      });
    });
  });
});
