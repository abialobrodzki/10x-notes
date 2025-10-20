import { z } from "zod";

/**
 * Shared validation schemas used across multiple endpoints
 * These schemas ensure consistent validation for common data types
 */

/**
 * UUID v4 validation schema
 * Validates standard UUID format (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export const uuidSchema = z.string().uuid("Invalid UUID format");

/**
 * ISO 8601 date validation schema
 * Format: YYYY-MM-DD (e.g., "2025-10-19")
 */
export const dateISOSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(
    (date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    },
    { message: "Invalid date" }
  );

/**
 * Sort order validation schema
 * Allows ascending or descending sort order
 */
export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

/**
 * Pagination query parameters schema
 * Validates page number and limit with sensible defaults and constraints
 */
export const paginationQuerySchema = z.object({
  /**
   * Page number (1-indexed)
   * - Default: 1
   * - Min: 1
   */
  page: z.coerce.number().int("Page must be an integer").min(1, "Page must be at least 1").default(1),

  /**
   * Items per page
   * - Default: 20
   * - Min: 1
   * - Max: 100 (prevents excessive data transfer)
   */
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(20),
});

/**
 * TypeScript type for pagination query
 */
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
