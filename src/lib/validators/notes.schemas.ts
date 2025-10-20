import { z } from "zod";
import { uuidSchema, dateISOSchema, sortOrderSchema, paginationQuerySchema } from "./shared.schemas";

/**
 * Validation schema for GET /api/notes query parameters
 * Handles filtering, sorting, and pagination for notes list
 */
export const notesListQuerySchema = z
  .object({
    /**
     * Filter by specific tag ID
     * Optional - if not provided, returns notes from all user's tags
     */
    tag_id: uuidSchema.optional(),

    /**
     * Filter by goal achievement status
     * Optional - if not provided, returns notes with any status
     */
    goal_status: z.enum(["achieved", "not_achieved", "undefined"]).optional(),

    /**
     * Filter notes from this date onwards (inclusive)
     * Format: YYYY-MM-DD
     */
    date_from: dateISOSchema.optional(),

    /**
     * Filter notes up to this date (inclusive)
     * Format: YYYY-MM-DD
     */
    date_to: dateISOSchema.optional(),

    /**
     * Include notes from tags shared by other users
     * Default: false (only own notes)
     */
    include_shared: z.coerce.boolean().default(false),

    /**
     * Sort field
     * Default: 'meeting_date' (most recent meetings first)
     */
    sort_by: z.enum(["meeting_date", "created_at", "updated_at"]).default("meeting_date"),

    /**
     * Sort order
     * Default: 'desc' (newest first)
     */
    order: sortOrderSchema,
  })
  .merge(paginationQuerySchema)
  .refine(
    (data) => {
      // Validate that date_from is before date_to (if both provided)
      if (data.date_from && data.date_to) {
        return new Date(data.date_from) <= new Date(data.date_to);
      }
      return true;
    },
    {
      message: "date_from must be before or equal to date_to",
      path: ["date_from"],
    }
  );

/**
 * TypeScript type inferred from Zod schema
 * Use this type for validated query parameters
 */
export type NotesListQueryInput = z.infer<typeof notesListQuerySchema>;
