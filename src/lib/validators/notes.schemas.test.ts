import { describe, it, expect } from "vitest";
import { notesListQuerySchema, createNoteSchema, updateNoteSchema } from "./notes.schemas";

describe("notesListQuerySchema", () => {
  it("should pass with no query parameters", () => {
    const validData = {};
    const result = notesListQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_shared).toBe(true);
      expect(result.data.sort_by).toBe("meeting_date");
      expect(result.data.order).toBe("desc");
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("should pass with valid tag_id UUID", () => {
    const validData = { tag_id: "550e8400-e29b-41d4-a716-446655440000" };
    const result = notesListQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject invalid tag_id format", () => {
    const invalidData = { tag_id: "not-a-uuid" };
    const result = notesListQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should pass with valid goal_status", () => {
    const validStatuses = ["achieved", "not_achieved", "undefined"];

    validStatuses.forEach((status) => {
      const result = notesListQuerySchema.safeParse({ goal_status: status });
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid goal_status", () => {
    const invalidData = { goal_status: "invalid_status" };
    const result = notesListQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should pass with valid ISO date format", () => {
    const validData = { date_from: "2025-01-15", date_to: "2025-12-31" };
    const result = notesListQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject invalid date format", () => {
    const invalidData = { date_from: "2025/01/15" };
    const result = notesListQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject date_from after date_to", () => {
    const invalidData = { date_from: "2025-12-31", date_to: "2025-01-01" };
    const result = notesListQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("date_from");
    }
  });

  it("should pass when date_from equals date_to", () => {
    const validData = { date_from: "2025-06-15", date_to: "2025-06-15" };
    const result = notesListQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should pass with valid sort_by values", () => {
    const validSortBy = ["meeting_date", "created_at", "updated_at"];

    validSortBy.forEach((sortBy) => {
      const result = notesListQuerySchema.safeParse({ sort_by: sortBy });
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid sort_by value", () => {
    const invalidData = { sort_by: "invalid_field" };
    const result = notesListQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should pass with valid order values", () => {
    const validOrders = ["asc", "desc"];

    validOrders.forEach((order) => {
      const result = notesListQuerySchema.safeParse({ order });
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid order value", () => {
    const invalidData = { order: "ascending" };
    const result = notesListQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should pass with valid pagination", () => {
    const validData = { page: 2, limit: 50 };
    const result = notesListQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it("should reject page less than 1", () => {
    const invalidData = { page: 0 };
    const result = notesListQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject limit less than 1", () => {
    const invalidData = { limit: 0 };
    const result = notesListQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject limit exceeding 100", () => {
    const invalidData = { limit: 101 };
    const result = notesListQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should coerce string numbers to actual numbers", () => {
    const validData = { page: "2", limit: "50" };
    const result = notesListQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it("should coerce include_shared string to boolean", () => {
    const validData = { include_shared: "false" };
    const result = notesListQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_shared).toBe(false);
    }
  });
});

describe("createNoteSchema", () => {
  it("should pass with valid data using tag_id", () => {
    const validData = {
      original_content: "This is a meeting note",
      tag_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    const result = createNoteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should pass with valid data using tag_name", () => {
    const validData = {
      original_content: "This is a meeting note",
      tag_name: "Project Alpha",
    };
    const result = createNoteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject when both tag_id and tag_name are provided", () => {
    const invalidData = {
      original_content: "This is a meeting note",
      tag_id: "550e8400-e29b-41d4-a716-446655440000",
      tag_name: "Project Alpha",
    };
    const result = createNoteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0]);
      expect(paths).toContain("tag_id");
      expect(paths).toContain("tag_name");
    }
  });

  it("should reject when neither tag_id nor tag_name are provided", () => {
    const invalidData = {
      original_content: "This is a meeting note",
    };
    const result = createNoteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0]);
      expect(paths).toContain("tag_id");
      expect(paths).toContain("tag_name");
    }
  });

  it("should reject empty original_content", () => {
    const invalidData = {
      original_content: "",
      tag_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    const result = createNoteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("original_content");
    }
  });

  it("should reject original_content exceeding 5000 characters", () => {
    const invalidData = {
      original_content: "a".repeat(5001),
      tag_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    const result = createNoteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("original_content");
      expect(result.error.errors[0].message).toBe("Content exceeds 5000 character limit");
    }
  });

  it("should accept original_content with exactly 5000 characters", () => {
    const validData = {
      original_content: "a".repeat(5000),
      tag_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    const result = createNoteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject summary_text exceeding 2000 characters", () => {
    const invalidData = {
      original_content: "This is a meeting note",
      summary_text: "a".repeat(2001),
      tag_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    const result = createNoteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("summary_text");
    }
  });

  it("should accept null summary_text", () => {
    const validData = {
      original_content: "This is a meeting note",
      summary_text: null,
      tag_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    const result = createNoteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should pass with valid goal_status", () => {
    const validStatuses = ["achieved", "not_achieved", "undefined"];

    validStatuses.forEach((status) => {
      const result = createNoteSchema.safeParse({
        original_content: "This is a meeting note",
        goal_status: status,
        tag_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });
  });

  it("should accept null goal_status", () => {
    const validData = {
      original_content: "This is a meeting note",
      goal_status: null,
      tag_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    const result = createNoteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should pass with valid ISO date format", () => {
    const validData = {
      original_content: "This is a meeting note",
      meeting_date: "2025-06-15",
      tag_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    const result = createNoteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject invalid date format", () => {
    const invalidData = {
      original_content: "This is a meeting note",
      meeting_date: "2025/06/15",
      tag_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    const result = createNoteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should pass with is_ai_generated boolean", () => {
    const validData = {
      original_content: "This is a meeting note",
      is_ai_generated: true,
      tag_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    const result = createNoteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject empty tag_name", () => {
    const invalidData = {
      original_content: "This is a meeting note",
      tag_name: "",
    };
    const result = createNoteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject with extra unknown fields due to strict mode", () => {
    const invalidData = {
      original_content: "This is a meeting note",
      tag_id: "550e8400-e29b-41d4-a716-446655440000",
      extra_field: "not allowed",
    };
    const result = createNoteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe("updateNoteSchema", () => {
  it("should pass with summary_text update", () => {
    const validData = { summary_text: "Updated summary" };
    const result = updateNoteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should pass with goal_status update", () => {
    const validData = { goal_status: "achieved" };
    const result = updateNoteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should pass with meeting_date update", () => {
    const validData = { meeting_date: "2025-06-15" };
    const result = updateNoteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should pass with tag_id update", () => {
    const validData = { tag_id: "550e8400-e29b-41d4-a716-446655440000" };
    const result = updateNoteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should pass with multiple field updates", () => {
    const validData = {
      summary_text: "Updated summary",
      goal_status: "achieved",
      meeting_date: "2025-06-15",
      tag_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    const result = updateNoteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject summary_text exceeding 2000 characters", () => {
    const invalidData = { summary_text: "a".repeat(2001) };
    const result = updateNoteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("summary_text");
    }
  });

  it("should accept null summary_text", () => {
    const validData = { summary_text: null };
    const result = updateNoteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should accept null meeting_date", () => {
    const validData = { meeting_date: null };
    const result = updateNoteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject invalid date format", () => {
    const invalidData = { meeting_date: "2025/06/15" };
    const result = updateNoteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject invalid goal_status", () => {
    const invalidData = { goal_status: "invalid_status" };
    const result = updateNoteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject invalid tag_id UUID", () => {
    const invalidData = { tag_id: "not-a-uuid" };
    const result = updateNoteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject with extra unknown fields due to strict mode", () => {
    const invalidData = { summary_text: "Updated", extra_field: "not allowed" };
    const result = updateNoteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
