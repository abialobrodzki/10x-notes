import { describe, expect, it } from "vitest";
import { createNoteSchema, notesListQuerySchema, updateNoteSchema } from "@/lib/validators/notes.schemas";

describe("notes.schemas", () => {
  // ============================================================================
  // notesListQuerySchema
  // ============================================================================

  describe("notesListQuerySchema", () => {
    describe("valid inputs", () => {
      it("should accept all fields with valid values", () => {
        // Arrange
        const input = {
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          goal_status: "achieved",
          date_from: "2024-01-01",
          date_to: "2024-12-31",
          include_shared: true,
          sort_by: "meeting_date",
          order: "desc",
          page: 1,
          limit: 20,
        };

        // Act
        const result = notesListQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.tag_id).toBe("550e8400-e29b-41d4-a716-446655440000");
          expect(result.data.goal_status).toBe("achieved");
          expect(result.data.date_from).toBe("2024-01-01");
          expect(result.data.date_to).toBe("2024-12-31");
          expect(result.data.include_shared).toBe(true);
          expect(result.data.sort_by).toBe("meeting_date");
          expect(result.data.order).toBe("desc");
          expect(result.data.page).toBe(1);
          expect(result.data.limit).toBe(20);
        }
      });

      it("should accept minimal input with defaults", () => {
        const input = {};

        const result = notesListQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          // Check defaults
          expect(result.data.include_shared).toBe(true);
          expect(result.data.sort_by).toBe("meeting_date");
          expect(result.data.order).toBe("desc");
          expect(result.data.page).toBe(1);
          expect(result.data.limit).toBe(20);
        }
      });

      it("should accept equal date_from and date_to", () => {
        const input = {
          date_from: "2024-06-15",
          date_to: "2024-06-15",
        };

        const result = notesListQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept all goal_status enum values", () => {
        const validStatuses = ["achieved", "not_achieved", "undefined"];

        validStatuses.forEach((status) => {
          const result = notesListQuerySchema.safeParse({ goal_status: status });
          expect(result.success).toBe(true);
        });
      });

      it("should accept all sort_by enum values", () => {
        const validSortFields = ["meeting_date", "created_at", "updated_at"];

        validSortFields.forEach((field) => {
          const result = notesListQuerySchema.safeParse({ sort_by: field });
          expect(result.success).toBe(true);
        });
      });

      it("should accept both order enum values", () => {
        const result1 = notesListQuerySchema.safeParse({ order: "asc" });
        const result2 = notesListQuerySchema.safeParse({ order: "desc" });

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
      });

      it("should coerce string page and limit to numbers", () => {
        const input = {
          page: "5",
          limit: "50",
        };

        const result = notesListQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(5);
          expect(result.data.limit).toBe(50);
        }
      });
    });

    describe("date range validation", () => {
      it("should reject when date_from is after date_to", () => {
        // Arrange
        const input = {
          date_from: "2024-12-31",
          date_to: "2024-01-01",
        };

        // Act
        const result = notesListQuerySchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("date_from must be before or equal to date_to");
        }
      });

      it("should accept only date_from without date_to", () => {
        const input = {
          date_from: "2024-01-01",
        };

        const result = notesListQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept only date_to without date_from", () => {
        const input = {
          date_to: "2024-12-31",
        };

        const result = notesListQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe("invalid inputs", () => {
      it("should reject invalid UUID format for tag_id", () => {
        const input = {
          tag_id: "not-a-uuid",
        };

        const result = notesListQuerySchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject invalid goal_status value", () => {
        const input = {
          goal_status: "invalid_status",
        };

        const result = notesListQuerySchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject invalid date format for date_from", () => {
        const input = {
          date_from: "2024/01/01",
        };

        const result = notesListQuerySchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject invalid date format for date_to", () => {
        const input = {
          date_to: "01-01-2024",
        };

        const result = notesListQuerySchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject invalid sort_by value", () => {
        const input = {
          sort_by: "invalid_field",
        };

        const result = notesListQuerySchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject page less than 1", () => {
        const input = {
          page: 0,
        };

        const result = notesListQuerySchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject limit greater than 100", () => {
        const input = {
          limit: 101,
        };

        const result = notesListQuerySchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject limit less than 1", () => {
        const input = {
          limit: 0,
        };

        const result = notesListQuerySchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("should handle boundary dates (year 1900-2100)", () => {
        const result1 = notesListQuerySchema.safeParse({ date_from: "1900-01-01" });
        const result2 = notesListQuerySchema.safeParse({ date_from: "2100-12-31" });

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
      });

      it("should coerce include_shared from string to boolean", () => {
        const input = {
          include_shared: "false",
        };

        const result = notesListQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          // Note: "false" string coerces to true (non-empty string)
          expect(result.data.include_shared).toBe(true);
        }
      });
    });
  });

  // ============================================================================
  // createNoteSchema
  // ============================================================================

  describe("createNoteSchema", () => {
    describe("valid inputs - tag_id XOR", () => {
      it("should accept valid note with tag_id only", () => {
        // Arrange
        const input = {
          original_content: "Meeting notes content",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
        };

        // Act
        const result = createNoteSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.original_content).toBe("Meeting notes content");
          expect(result.data.tag_id).toBe("550e8400-e29b-41d4-a716-446655440000");
        }
      });

      it("should accept valid note with tag_name only", () => {
        const input = {
          original_content: "Meeting notes content",
          tag_name: "Project Alpha",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.original_content).toBe("Meeting notes content");
          expect(result.data.tag_name).toBe("Project Alpha");
        }
      });

      it("should accept note with all optional fields", () => {
        const input = {
          original_content: "Meeting notes",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          summary_text: "Summary of meeting",
          goal_status: "achieved",
          suggested_tag: "Suggestion",
          meeting_date: "2024-10-15",
          is_ai_generated: true,
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe("XOR validation - tag_id OR tag_name", () => {
      it("should reject when both tag_id and tag_name are provided", () => {
        // Arrange
        const input = {
          original_content: "Meeting notes",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          tag_name: "Project Alpha",
        };

        // Act
        const result = createNoteSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          const messages = result.error.issues.map((issue) => issue.message);
          expect(messages).toContain("Provide either tag_id or tag_name, not both");
        }
      });

      it("should reject when neither tag_id nor tag_name is provided", () => {
        const input = {
          original_content: "Meeting notes",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          const messages = result.error.issues.map((issue) => issue.message);
          expect(messages).toContain("Either tag_id or tag_name is required");
        }
      });

      it("should add issues to both tag_id and tag_name paths when XOR fails", () => {
        const input = {
          original_content: "Meeting notes",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          const paths = result.error.issues.map((issue) => issue.path[0]);
          expect(paths).toContain("tag_id");
          expect(paths).toContain("tag_name");
        }
      });
    });

    describe("content validation", () => {
      it("should accept content with 1 character", () => {
        const input = {
          original_content: "a",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept content with 5000 characters", () => {
        const input = {
          original_content: "a".repeat(5000),
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should reject empty content", () => {
        // Arrange
        const input = {
          original_content: "",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
        };

        // Act
        const result = createNoteSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Content is required");
        }
      });

      it("should reject content exceeding 5000 characters", () => {
        const input = {
          original_content: "a".repeat(5001),
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Content exceeds 5000 character limit");
        }
      });

      it("should reject missing original_content", () => {
        const input = {
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });

    describe("summary validation", () => {
      it("should accept summary with 2000 characters", () => {
        const input = {
          original_content: "Meeting notes",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          summary_text: "a".repeat(2000),
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should reject summary exceeding 2000 characters", () => {
        const input = {
          original_content: "Meeting notes",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          summary_text: "a".repeat(2001),
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Summary exceeds 2000 character limit");
        }
      });

      it("should accept null summary_text", () => {
        const input = {
          original_content: "Meeting notes",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          summary_text: null,
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept empty string summary", () => {
        const input = {
          original_content: "Meeting notes",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          summary_text: "",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe("goal_status validation", () => {
      it("should accept all enum values", () => {
        const validStatuses = ["achieved", "not_achieved", "undefined"];

        validStatuses.forEach((status) => {
          const result = createNoteSchema.safeParse({
            original_content: "notes",
            tag_id: "550e8400-e29b-41d4-a716-446655440000",
            goal_status: status,
          });
          expect(result.success).toBe(true);
        });
      });

      it("should accept null goal_status", () => {
        const input = {
          original_content: "Meeting notes",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          goal_status: null,
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should reject invalid goal_status value", () => {
        const input = {
          original_content: "Meeting notes",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          goal_status: "invalid_status",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });

    describe("strict mode validation", () => {
      it("should reject extra fields not in schema", () => {
        // Arrange
        const input = {
          original_content: "Meeting notes",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          extra_field: "not allowed",
        };

        // Act
        const result = createNoteSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it("should reject multiple extra fields", () => {
        const input = {
          original_content: "Meeting notes",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          field1: "value1",
          field2: "value2",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });

    describe("nullable fields", () => {
      it("should accept null for suggested_tag", () => {
        const input = {
          original_content: "notes",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          suggested_tag: null,
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe("date and boolean fields", () => {
      it("should accept valid meeting_date", () => {
        const input = {
          original_content: "notes",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          meeting_date: "2024-10-15",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should reject invalid meeting_date format", () => {
        const input = {
          original_content: "notes",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          meeting_date: "10/15/2024",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should coerce is_ai_generated to boolean", () => {
        const input = {
          original_content: "notes",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
          is_ai_generated: "true",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.is_ai_generated).toBe(true);
        }
      });
    });

    describe("tag_name validation", () => {
      it("should reject empty tag_name", () => {
        const input = {
          original_content: "notes",
          tag_name: "",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          const tagNameIssue = result.error.issues.find((issue) => issue.path.includes("tag_name"));
          expect(tagNameIssue?.message).toBe("Tag name cannot be empty");
        }
      });

      it("should accept tag_name with 1 character", () => {
        const input = {
          original_content: "notes",
          tag_name: "A",
        };

        const result = createNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });
  });

  // ============================================================================
  // updateNoteSchema
  // ============================================================================

  describe("updateNoteSchema", () => {
    describe("valid inputs", () => {
      it("should accept single field update - summary_text", () => {
        // Arrange
        const input = {
          summary_text: "Updated summary",
        };

        // Act
        const result = updateNoteSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.summary_text).toBe("Updated summary");
        }
      });

      it("should accept single field update - goal_status", () => {
        const input = {
          goal_status: "achieved",
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept single field update - meeting_date", () => {
        const input = {
          meeting_date: "2024-10-20",
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept single field update - tag_id", () => {
        const input = {
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept multiple field updates", () => {
        const input = {
          summary_text: "Updated summary",
          goal_status: "not_achieved",
          meeting_date: "2024-10-20",
          tag_id: "550e8400-e29b-41d4-a716-446655440000",
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept empty object (no fields to update)", () => {
        const input = {};

        const result = updateNoteSchema.safeParse(input);

        // Unlike patchPublicLinkSchema, updateNoteSchema doesn't require at least one field
        expect(result.success).toBe(true);
      });
    });

    describe("summary_text validation", () => {
      it("should accept summary with 2000 characters", () => {
        const input = {
          summary_text: "a".repeat(2000),
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should reject summary exceeding 2000 characters", () => {
        // Arrange
        const input = {
          summary_text: "a".repeat(2001),
        };

        // Act
        const result = updateNoteSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Summary exceeds 2000 character limit");
        }
      });

      it("should accept null summary_text", () => {
        const input = {
          summary_text: null,
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should accept empty string summary", () => {
        const input = {
          summary_text: "",
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe("goal_status validation", () => {
      it("should accept all enum values", () => {
        const validStatuses = ["achieved", "not_achieved", "undefined"];

        validStatuses.forEach((status) => {
          const result = updateNoteSchema.safeParse({ goal_status: status });
          expect(result.success).toBe(true);
        });
      });

      it("should reject invalid goal_status value", () => {
        const input = {
          goal_status: "invalid_status",
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject null goal_status", () => {
        // goal_status in updateNoteSchema is optional but not nullable
        const input = {
          goal_status: null,
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });

    describe("meeting_date validation", () => {
      it("should accept valid ISO date", () => {
        const input = {
          meeting_date: "2024-10-15",
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should reject invalid date format", () => {
        const input = {
          meeting_date: "10/15/2024",
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should accept null meeting_date", () => {
        const input = {
          meeting_date: null,
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe("tag_id validation", () => {
      it("should accept valid UUID", () => {
        const input = {
          tag_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it("should reject invalid UUID format", () => {
        const input = {
          tag_id: "not-a-uuid",
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it("should reject null tag_id", () => {
        // tag_id in updateNoteSchema is optional but not nullable
        const input = {
          tag_id: null,
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });

    describe("strict mode validation", () => {
      it("should reject extra fields", () => {
        // Arrange
        const input = {
          summary_text: "Summary",
          extra_field: "not allowed",
        };

        // Act
        const result = updateNoteSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it("should reject fields not in schema", () => {
        const input = {
          original_content: "Cannot update original content",
        };

        const result = updateNoteSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("should handle undefined values", () => {
        const input = {
          summary_text: undefined,
          goal_status: undefined,
        };

        const result = updateNoteSchema.safeParse(input);

        // Undefined should be treated as field not provided
        expect(result.success).toBe(true);
      });
    });
  });
});
