import { describe, expect, it } from "vitest";
import { calculateOffset, calculateTotalPages, createPaginationDTO } from "@/lib/utils/pagination.utils";

describe("pagination.utils", () => {
  // ============================================================================
  // calculateOffset
  // ============================================================================

  describe("calculateOffset", () => {
    describe("normal cases", () => {
      it("should return 0 for page 1", () => {
        // Arrange
        const page = 1;
        const limit = 20;

        // Act
        const result = calculateOffset(page, limit);

        // Assert
        expect(result).toBe(0);
      });

      it("should return correct offset for page 2", () => {
        expect(calculateOffset(2, 20)).toBe(20);
      });

      it("should return correct offset for page 3", () => {
        expect(calculateOffset(3, 20)).toBe(40);
      });

      it("should handle different limit values", () => {
        expect(calculateOffset(1, 10)).toBe(0);
        expect(calculateOffset(2, 10)).toBe(10);
        expect(calculateOffset(3, 50)).toBe(100);
      });
    });

    describe("edge cases", () => {
      it("should handle page 0 (returns negative offset)", () => {
        // Note: The function doesn't validate input, so page 0 returns -20
        expect(calculateOffset(0, 20)).toBe(-20);
      });

      it("should handle negative page numbers", () => {
        expect(calculateOffset(-1, 20)).toBe(-40);
      });

      it("should handle large page numbers", () => {
        expect(calculateOffset(1000, 20)).toBe(19980);
        expect(calculateOffset(10000, 50)).toBe(499950);
      });

      it("should handle limit of 1", () => {
        expect(calculateOffset(1, 1)).toBe(0);
        expect(calculateOffset(5, 1)).toBe(4);
      });

      it("should handle large limits", () => {
        expect(calculateOffset(2, 1000)).toBe(1000);
      });
    });
  });

  // ============================================================================
  // calculateTotalPages
  // ============================================================================

  describe("calculateTotalPages", () => {
    describe("normal cases", () => {
      it("should return correct pages for exact division", () => {
        // Arrange
        const total = 40;
        const limit = 20;

        // Act
        const result = calculateTotalPages(total, limit);

        // Assert
        expect(result).toBe(2);
      });

      it("should round up for partial pages", () => {
        // 42 items with 20 per page = 3 pages (20, 20, 2)
        expect(calculateTotalPages(42, 20)).toBe(3);
        expect(calculateTotalPages(21, 20)).toBe(2);
        expect(calculateTotalPages(41, 20)).toBe(3);
      });

      it("should return 1 page when total equals limit", () => {
        expect(calculateTotalPages(20, 20)).toBe(1);
      });

      it("should return 1 page when total is less than limit", () => {
        expect(calculateTotalPages(5, 20)).toBe(1);
        expect(calculateTotalPages(1, 20)).toBe(1);
      });
    });

    describe("edge cases", () => {
      it("should return 1 for empty list (total = 0)", () => {
        // Arrange
        const total = 0;
        const limit = 20;

        // Act
        const result = calculateTotalPages(total, limit);

        // Assert
        expect(result).toBe(1);
      });

      it("should handle single item", () => {
        expect(calculateTotalPages(1, 1)).toBe(1);
        expect(calculateTotalPages(1, 10)).toBe(1);
      });

      it("should handle large totals", () => {
        expect(calculateTotalPages(10000, 20)).toBe(500);
        expect(calculateTotalPages(9999, 20)).toBe(500);
        expect(calculateTotalPages(10001, 20)).toBe(501);
      });

      it("should handle limit of 1", () => {
        expect(calculateTotalPages(5, 1)).toBe(5);
        expect(calculateTotalPages(100, 1)).toBe(100);
      });
    });
  });

  // ============================================================================
  // createPaginationDTO
  // ============================================================================

  describe("createPaginationDTO", () => {
    describe("structure validation", () => {
      it("should return correct DTO structure", () => {
        // Arrange
        const page = 2;
        const limit = 20;
        const total = 42;

        // Act
        const result = createPaginationDTO(page, limit, total);

        // Assert
        expect(result).toEqual({
          page: 2,
          limit: 20,
          total: 42,
          total_pages: 3,
        });
      });

      it("should have all required fields", () => {
        const result = createPaginationDTO(1, 20, 100);

        expect(result).toHaveProperty("page");
        expect(result).toHaveProperty("limit");
        expect(result).toHaveProperty("total");
        expect(result).toHaveProperty("total_pages");
      });
    });

    describe("integration with calculateTotalPages", () => {
      it("should correctly calculate total_pages for empty list", () => {
        const result = createPaginationDTO(1, 20, 0);

        expect(result.total_pages).toBe(1);
      });

      it("should correctly calculate total_pages for exact division", () => {
        const result = createPaginationDTO(1, 20, 40);

        expect(result.total_pages).toBe(2);
      });

      it("should correctly calculate total_pages for partial page", () => {
        const result = createPaginationDTO(1, 20, 42);

        expect(result.total_pages).toBe(3);
      });
    });

    describe("various scenarios", () => {
      it("should handle first page", () => {
        const result = createPaginationDTO(1, 20, 100);

        expect(result).toEqual({
          page: 1,
          limit: 20,
          total: 100,
          total_pages: 5,
        });
      });

      it("should handle last page", () => {
        const result = createPaginationDTO(5, 20, 100);

        expect(result).toEqual({
          page: 5,
          limit: 20,
          total: 100,
          total_pages: 5,
        });
      });

      it("should handle single page scenario", () => {
        const result = createPaginationDTO(1, 20, 10);

        expect(result).toEqual({
          page: 1,
          limit: 20,
          total: 10,
          total_pages: 1,
        });
      });

      it("should handle large datasets", () => {
        const result = createPaginationDTO(50, 20, 1000);

        expect(result).toEqual({
          page: 50,
          limit: 20,
          total: 1000,
          total_pages: 50,
        });
      });
    });
  });
});
