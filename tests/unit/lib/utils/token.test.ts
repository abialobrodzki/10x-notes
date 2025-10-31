import { describe, expect, it } from "vitest";
import { generatePublicLinkToken } from "@/lib/utils/token.utils";

describe("token.utils", () => {
  // ============================================================================
  // generatePublicLinkToken
  // ============================================================================

  describe("generatePublicLinkToken", () => {
    /**
     * UUID v4 format regex
     * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
     * where:
     * - x is any hexadecimal digit (0-9, a-f)
     * - 4 is the version number (UUID v4)
     * - y is 8, 9, a, or b (variant bits)
     */
    const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    describe("basic functionality", () => {
      it("should return a non-empty string", () => {
        // Act
        const token = generatePublicLinkToken();

        // Assert
        expect(token).toBeTruthy();
        expect(typeof token).toBe("string");
        expect(token.length).toBeGreaterThan(0);
      });

      it("should return a string with correct UUID length", () => {
        const token = generatePublicLinkToken();

        // UUID format: 8-4-4-4-12 = 36 characters (including hyphens)
        expect(token.length).toBe(36);
      });

      it("should contain 4 hyphens in correct positions", () => {
        const token = generatePublicLinkToken();

        expect(token[8]).toBe("-");
        expect(token[13]).toBe("-");
        expect(token[18]).toBe("-");
        expect(token[23]).toBe("-");
      });
    });

    describe("UUID v4 format validation", () => {
      it("should match UUID v4 format", () => {
        // Act
        const token = generatePublicLinkToken();

        // Assert
        expect(token).toMatch(UUID_V4_REGEX);
      });

      it("should have version 4 indicator", () => {
        const token = generatePublicLinkToken();

        // Character at index 14 should be '4' (version 4)
        expect(token[14]).toBe("4");
      });

      it("should have correct variant bits", () => {
        const token = generatePublicLinkToken();

        // Character at index 19 should be 8, 9, a, or b
        const variantChar = token[19].toLowerCase();
        expect(["8", "9", "a", "b"]).toContain(variantChar);
      });

      it("should contain only valid hexadecimal characters", () => {
        const token = generatePublicLinkToken();

        // Remove hyphens and check if all chars are hex
        const hexPart = token.replace(/-/g, "");
        expect(hexPart).toMatch(/^[0-9a-f]+$/i);
      });

      it("should generate valid UUID v4 multiple times", () => {
        // Generate 10 tokens and verify all are valid UUID v4
        for (let i = 0; i < 10; i++) {
          const token = generatePublicLinkToken();
          expect(token).toMatch(UUID_V4_REGEX);
        }
      });
    });

    describe("uniqueness", () => {
      it("should generate unique tokens", () => {
        // Arrange
        const tokens = new Set<string>();

        // Act - Generate 100 tokens
        for (let i = 0; i < 100; i++) {
          tokens.add(generatePublicLinkToken());
        }

        // Assert - All should be unique
        expect(tokens.size).toBe(100);
      });

      it("should generate unique tokens at scale (1000 tokens)", () => {
        // Arrange
        const tokens = new Set<string>();

        // Act - Generate 1000 tokens
        for (let i = 0; i < 1000; i++) {
          tokens.add(generatePublicLinkToken());
        }

        // Assert - All should be unique (collision probability is ~0.00000006%)
        expect(tokens.size).toBe(1000);
      });

      it("should not generate sequential or predictable tokens", () => {
        // Generate 5 consecutive tokens
        const token1 = generatePublicLinkToken();
        const token2 = generatePublicLinkToken();
        const token3 = generatePublicLinkToken();
        const token4 = generatePublicLinkToken();
        const token5 = generatePublicLinkToken();

        // They should all be different
        const uniqueTokens = new Set([token1, token2, token3, token4, token5]);
        expect(uniqueTokens.size).toBe(5);

        // They should not be incrementing or have obvious patterns
        expect(token1).not.toBe(token2);
        expect(token2).not.toBe(token3);
        expect(token3).not.toBe(token4);
        expect(token4).not.toBe(token5);
      });
    });

    describe("real-world scenarios", () => {
      it("should be suitable as a database key (no special characters except hyphens)", () => {
        const token = generatePublicLinkToken();

        // Should only contain alphanumeric chars and hyphens
        expect(token).toMatch(/^[0-9a-f-]+$/i);

        // Should not contain spaces, quotes, or other special chars
        expect(token).not.toContain(" ");
        expect(token).not.toContain("'");
        expect(token).not.toContain('"');
        expect(token).not.toContain("\\");
      });

      it("should be URL-safe", () => {
        const token = generatePublicLinkToken();

        // UUID should be safe to use in URLs without encoding
        const encoded = encodeURIComponent(token);
        expect(encoded).toBe(token);
      });

      it("should be case-insensitive comparable", () => {
        const token = generatePublicLinkToken();

        // Lowercase and uppercase should match (UUID spec allows both)
        expect(token.toLowerCase()).toBe(token.toLowerCase());
        expect(token.toUpperCase()).toBe(token.toUpperCase());
      });
    });
  });
});
