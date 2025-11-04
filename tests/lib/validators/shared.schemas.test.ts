import { describe, it, expect } from "vitest";
import { uuidSchema, dateISOSchema, sortOrderSchema, paginationQuerySchema } from "@/lib/validators/shared.schemas";

describe("uuidSchema", () => {
  it("should pass valid UUID v4", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    const result = uuidSchema.safeParse(validUuid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(validUuid);
    }
  });

  it("should pass zero UUID", () => {
    const validUuid = "00000000-0000-0000-0000-000000000000";
    const result = uuidSchema.safeParse(validUuid);
    expect(result.success).toBe(true);
  });

  it("should reject UUID without hyphens", () => {
    const invalidUuid = "550e8400e29b41d4a716446655440000";
    const result = uuidSchema.safeParse(invalidUuid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Invalid UUID format");
    }
  });

  it("should reject invalid UUID format", () => {
    const invalidUuid = "not-a-uuid-at-all";
    const result = uuidSchema.safeParse(invalidUuid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Invalid UUID format");
    }
  });

  it("should reject empty string", () => {
    const result = uuidSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("should reject UUID with extra characters", () => {
    const invalidUuid = "550e8400-e29b-41d4-a716-446655440000x";
    const result = uuidSchema.safeParse(invalidUuid);
    expect(result.success).toBe(false);
  });

  it("should reject null input", () => {
    const result = uuidSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("should accept multiple valid UUIDs", () => {
    const validUuids = [
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    ];

    validUuids.forEach((uuid) => {
      const result = uuidSchema.safeParse(uuid);
      expect(result.success).toBe(true);
    });
  });
});

describe("dateISOSchema", () => {
  it("should pass valid ISO date format YYYY-MM-DD", () => {
    const validDate = "2025-06-15";
    const result = dateISOSchema.safeParse(validDate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(validDate);
    }
  });

  it("should pass valid date with single digit month and day", () => {
    const validDate = "2025-01-05";
    const result = dateISOSchema.safeParse(validDate);
    expect(result.success).toBe(true);
  });

  it("should reject date with wrong format MM-DD-YYYY", () => {
    const invalidDate = "06-15-2025";
    const result = dateISOSchema.safeParse(invalidDate);
    expect(result.success).toBe(false);
  });

  it("should reject date with slashes YYYY/MM/DD", () => {
    const invalidDate = "2025/06/15";
    const result = dateISOSchema.safeParse(invalidDate);
    expect(result.success).toBe(false);
  });

  it("should reject invalid month (>12)", () => {
    const invalidDate = "2025-13-15";
    const result = dateISOSchema.safeParse(invalidDate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Invalid date");
    }
  });

  it("should reject invalid month (0)", () => {
    const invalidDate = "2025-00-15";
    const result = dateISOSchema.safeParse(invalidDate);
    expect(result.success).toBe(false);
  });

  it("should reject invalid day (>31)", () => {
    const invalidDate = "2025-06-32";
    const result = dateISOSchema.safeParse(invalidDate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Invalid date");
    }
  });

  it("should reject invalid day (0)", () => {
    const invalidDate = "2025-06-00";
    const result = dateISOSchema.safeParse(invalidDate);
    expect(result.success).toBe(false);
  });

  it("should reject year before 1900", () => {
    const invalidDate = "1899-12-31";
    const result = dateISOSchema.safeParse(invalidDate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Invalid date");
    }
  });

  it("should reject year after 2100", () => {
    const invalidDate = "2101-01-01";
    const result = dateISOSchema.safeParse(invalidDate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Invalid date");
    }
  });

  it("should pass boundary year 1900", () => {
    const validDate = "1900-01-01";
    const result = dateISOSchema.safeParse(validDate);
    expect(result.success).toBe(true);
  });

  it("should pass boundary year 2100", () => {
    const validDate = "2100-12-31";
    const result = dateISOSchema.safeParse(validDate);
    expect(result.success).toBe(true);
  });

  it("should reject empty string", () => {
    const result = dateISOSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("should reject date with extra characters", () => {
    const invalidDate = "2025-06-15T00:00:00";
    const result = dateISOSchema.safeParse(invalidDate);
    expect(result.success).toBe(false);
  });

  it("should pass valid February 29 on leap year", () => {
    const validDate = "2024-02-29";
    const result = dateISOSchema.safeParse(validDate);
    expect(result.success).toBe(true);
  });

  it("should pass February 29 (technically allows any day)", () => {
    // Note: The schema validates day 1-31 without checking for actual day validity per month
    const validDate = "2025-02-29"; // Not technically valid but schema allows it
    const result = dateISOSchema.safeParse(validDate);
    expect(result.success).toBe(true); // Schema allows this due to simple validation
  });
});

describe("sortOrderSchema", () => {
  it("should pass 'asc'", () => {
    const result = sortOrderSchema.safeParse("asc");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("asc");
    }
  });

  it("should pass 'desc'", () => {
    const result = sortOrderSchema.safeParse("desc");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("desc");
    }
  });

  it("should default to 'desc' when no value provided", () => {
    const result = sortOrderSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("desc");
    }
  });

  it("should reject 'ascending'", () => {
    const result = sortOrderSchema.safeParse("ascending");
    expect(result.success).toBe(false);
  });

  it("should reject 'descending'", () => {
    const result = sortOrderSchema.safeParse("descending");
    expect(result.success).toBe(false);
  });

  it("should reject uppercase 'ASC'", () => {
    const result = sortOrderSchema.safeParse("ASC");
    expect(result.success).toBe(false);
  });

  it("should reject uppercase 'DESC'", () => {
    const result = sortOrderSchema.safeParse("DESC");
    expect(result.success).toBe(false);
  });

  it("should reject empty string", () => {
    const result = sortOrderSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("should reject null input", () => {
    const result = sortOrderSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});

describe("paginationQuerySchema", () => {
  it("should pass valid pagination parameters", () => {
    const validData = { page: 1, limit: 20 };
    const result = paginationQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("should default to page 1 and limit 20", () => {
    const validData = {};
    const result = paginationQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("should coerce string page number to integer", () => {
    const validData = { page: "2", limit: "50" };
    const result = paginationQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
      expect(typeof result.data.page).toBe("number");
      expect(typeof result.data.limit).toBe("number");
    }
  });

  it("should reject page less than 1", () => {
    const invalidData = { page: 0 };
    const result = paginationQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("page");
      expect(result.error.errors[0].message).toBe("Page must be at least 1");
    }
  });

  it("should reject negative page", () => {
    const invalidData = { page: -1 };
    const result = paginationQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject limit less than 1", () => {
    const invalidData = { limit: 0 };
    const result = paginationQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("limit");
      expect(result.error.errors[0].message).toBe("Limit must be at least 1");
    }
  });

  it("should reject limit exceeding 100", () => {
    const invalidData = { limit: 101 };
    const result = paginationQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("limit");
      expect(result.error.errors[0].message).toBe("Limit cannot exceed 100");
    }
  });

  it("should accept limit equal to 100", () => {
    const validData = { limit: 100 };
    const result = paginationQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
    }
  });

  it("should accept limit equal to 1", () => {
    const validData = { limit: 1 };
    const result = paginationQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(1);
    }
  });

  it("should reject negative limit", () => {
    const invalidData = { limit: -10 };
    const result = paginationQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject non-integer page (float)", () => {
    const invalidData = { page: 1.5 };
    const result = paginationQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Page must be an integer");
    }
  });

  it("should reject non-integer limit (float)", () => {
    const invalidData = { limit: 20.5 };
    const result = paginationQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Limit must be an integer");
    }
  });

  it("should reject non-numeric page", () => {
    const invalidData = { page: "abc" };
    const result = paginationQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject non-numeric limit", () => {
    const invalidData = { limit: "abc" };
    const result = paginationQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should accept high page numbers", () => {
    const validData = { page: 1000 };
    const result = paginationQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
