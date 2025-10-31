import { describe, expect, it } from "vitest";
import { generateAiSummarySchema } from "@/lib/validators/ai.schemas";

describe("ai.schemas", () => {
  // ============================================================================
  // generateAiSummarySchema
  // ============================================================================

  describe("generateAiSummarySchema", () => {
    describe("valid inputs", () => {
      it("should accept valid content with default model", () => {
        // Arrange
        const input = {
          original_content: "Meeting notes here...",
        };

        // Act
        const result = generateAiSummarySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.original_content).toBe("Meeting notes here...");
          expect(result.data.model_name).toBe("x-ai/grok-4-fast"); // Default
        }
      });

      it("should accept valid content with custom model", () => {
        const input = {
          original_content: "Meeting notes",
          model_name: "anthropic/claude-3-5-sonnet",
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.model_name).toBe("anthropic/claude-3-5-sonnet");
        }
      });

      it("should accept content with exactly 5000 characters", () => {
        const input = {
          original_content: "a".repeat(5000),
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept content with 1 character", () => {
        const input = {
          original_content: "a",
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept various model name formats", () => {
        const validModels = [
          "openai/gpt-4",
          "anthropic/claude-3-opus",
          "google/gemini-pro",
          "x-ai/grok-4-fast",
          "provider-name/model-name-123",
        ];

        validModels.forEach((model) => {
          const result = generateAiSummarySchema.safeParse({
            original_content: "test",
            model_name: model,
          });

          expect(result.success).toBe(true);
        });
      });
    });

    describe("invalid original_content", () => {
      it("should reject empty string", () => {
        // Arrange
        const input = {
          original_content: "",
        };

        // Act
        const result = generateAiSummarySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Content is required");
        }
      });

      it("should reject content exceeding 5000 characters", () => {
        const input = {
          original_content: "a".repeat(5001),
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Content exceeds 5000 character limit");
        }
      });

      it("should reject missing original_content", () => {
        const input = {};

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject null original_content", () => {
        const input = {
          original_content: null,
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject undefined original_content", () => {
        const input = {
          original_content: undefined,
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject non-string original_content", () => {
        const input = {
          original_content: 12345,
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });

    describe("invalid model_name", () => {
      it("should reject model name without provider", () => {
        const input = {
          original_content: "test",
          model_name: "gpt-4",
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Model name must follow format: 'provider/model-name'");
        }
      });

      it("should reject model name with multiple slashes", () => {
        const input = {
          original_content: "test",
          model_name: "provider/model/extra",
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject empty model name", () => {
        const input = {
          original_content: "test",
          model_name: "",
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject model name with only slash", () => {
        const input = {
          original_content: "test",
          model_name: "/",
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject model name with special characters", () => {
        const invalidModels = ["provider@model", "provider model", "provider#model", "provider!model"];

        invalidModels.forEach((model) => {
          const result = generateAiSummarySchema.safeParse({
            original_content: "test",
            model_name: model,
          });

          expect(result.success).toBe(false);
        });
      });
    });

    describe("edge cases", () => {
      it("should handle whitespace in content", () => {
        const input = {
          original_content: "   ",
        };

        const result = generateAiSummarySchema.safeParse(input);

        // Whitespace is valid (not trimmed), so this should pass
        expect(result.success).toBe(true);
      });

      it("should handle special characters in content", () => {
        const input = {
          original_content: "Meeting notes with special chars: @#$%^&*()",
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should handle unicode characters in content", () => {
        const input = {
          original_content: "Spotkanie z klientem: łąka, ścieżka, źródło 🚀",
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should handle newlines in content", () => {
        const input = {
          original_content: "Line 1\nLine 2\nLine 3",
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should apply default model when model_name is undefined", () => {
        const input = {
          original_content: "test",
          model_name: undefined,
        };

        const result = generateAiSummarySchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.model_name).toBe("x-ai/grok-4-fast");
        }
      });
    });

    describe("content length boundaries", () => {
      it("should accept content at lower boundary (1 char)", () => {
        const result = generateAiSummarySchema.safeParse({
          original_content: "a",
        });

        expect(result.success).toBe(true);
      });

      it("should accept content at upper boundary (5000 chars)", () => {
        const result = generateAiSummarySchema.safeParse({
          original_content: "x".repeat(5000),
        });

        expect(result.success).toBe(true);
      });

      it("should reject content below lower boundary (0 chars)", () => {
        const result = generateAiSummarySchema.safeParse({
          original_content: "",
        });

        expect(result.success).toBe(false);
      });

      it("should reject content above upper boundary (5001 chars)", () => {
        const result = generateAiSummarySchema.safeParse({
          original_content: "x".repeat(5001),
        });

        expect(result.success).toBe(false);
      });

      it("should reject content far above boundary (10000 chars)", () => {
        const result = generateAiSummarySchema.safeParse({
          original_content: "x".repeat(10000),
        });

        expect(result.success).toBe(false);
      });
    });
  });
});
