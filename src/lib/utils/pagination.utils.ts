import type { PaginationDTO } from "../../types";

/**
 * Pagination utilities for consistent pagination across all list endpoints
 */

/**
 * Calculate SQL offset for pagination
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @returns Offset value for SQL query
 *
 * @example
 * calculateOffset(1, 20) // 0 (first page)
 * calculateOffset(2, 20) // 20 (second page)
 * calculateOffset(3, 20) // 40 (third page)
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Calculate total number of pages
 *
 * @param total - Total number of items
 * @param limit - Items per page
 * @returns Total number of pages (at least 1, even for 0 items)
 *
 * @example
 * calculateTotalPages(42, 20) // 3 pages
 * calculateTotalPages(20, 20) // 1 page
 * calculateTotalPages(0, 20) // 1 page (empty list still has "page 1")
 */
export function calculateTotalPages(total: number, limit: number): number {
  if (total === 0) {
    return 1; // Always at least 1 page, even for empty results
  }
  return Math.ceil(total / limit);
}

/**
 * Create pagination metadata DTO
 *
 * Builds standardized pagination object for list responses
 *
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items (across all pages)
 * @returns PaginationDTO object
 *
 * @example
 * createPaginationDTO(2, 20, 42)
 * // Returns: { page: 2, limit: 20, total: 42, total_pages: 3 }
 */
export function createPaginationDTO(page: number, limit: number, total: number): PaginationDTO {
  return {
    page,
    limit,
    total,
    total_pages: calculateTotalPages(total, limit),
  };
}
