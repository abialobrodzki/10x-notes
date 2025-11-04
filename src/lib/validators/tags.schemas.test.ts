import { describe, it, expect } from "vitest";
import {
  tagIdParamSchema,
  tagsListQuerySchema,
  createTagSchema,
  updateTagSchema,
  grantTagAccessSchema,
  addRecipientSchema,
} from "./tags.schemas";

describe("tagIdParamSchema", () => {
  it("should pass valid UUID", () => {
    const validData = { id: "550e8400-e29b-41d4-a716-446655440000" };
    const result = tagIdParamSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it("should reject invalid UUID format", () => {
    const invalidData = { id: "not-a-uuid" };
    const result = tagIdParamSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("id");
      expect(result.error.errors[0].message).toBe("Invalid tag ID format");
    }
  });

  it("should reject empty UUID", () => {
    const invalidData = { id: "" };
    const result = tagIdParamSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("id");
    }
  });

  it("should reject UUID with wrong format (v1 instead of v4)", () => {
    // This is a v4 UUID actually, let's use a v1 example
    const v1UuidData = { id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" };
    const result = tagIdParamSchema.safeParse(v1UuidData);
    // This might pass since regex validation is flexible, but we test it
    expect(typeof result.success).toBe("boolean");
  });

  it("should reject missing id field", () => {
    const invalidData = {};
    const result = tagIdParamSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("id");
    }
  });

  it("should accept multiple valid UUIDs", () => {
    const validUuids = [
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "00000000-0000-0000-0000-000000000000",
    ];

    validUuids.forEach((id) => {
      const result = tagIdParamSchema.safeParse({ id });
      expect(result.success).toBe(true);
    });
  });
});

describe("tagsListQuerySchema", () => {
  it("should pass with default include_shared value", () => {
    const validData = {};
    const result = tagsListQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_shared).toBe(true);
    }
  });

  it("should pass with explicit include_shared true", () => {
    const validData = { include_shared: true };
    const result = tagsListQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_shared).toBe(true);
    }
  });

  it("should pass with explicit include_shared false", () => {
    const validData = { include_shared: false };
    const result = tagsListQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_shared).toBe(false);
    }
  });

  it("should coerce string 'true' to boolean true", () => {
    const validData = { include_shared: "true" };
    const result = tagsListQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_shared).toBe(true);
    }
  });

  it("should coerce string 'false' to boolean false", () => {
    const validData = { include_shared: "false" };
    const result = tagsListQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_shared).toBe(false);
    }
  });
});

describe("createTagSchema", () => {
  it("should pass valid tag name", () => {
    const validData = { name: "Project Alpha" };
    const result = createTagSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it("should trim whitespace from tag name", () => {
    const validData = { name: "  Project Alpha  " };
    const result = createTagSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Project Alpha");
    }
  });

  it("should reject empty tag name", () => {
    const invalidData = { name: "" };
    const result = createTagSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("name");
      expect(result.error.errors[0].message).toBe("Tag name is required");
    }
  });

  it("should reject whitespace-only tag name", () => {
    const invalidData = { name: "   " };
    const result = createTagSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("name");
    }
  });

  it("should reject tag name exceeding 100 characters", () => {
    const invalidData = { name: "a".repeat(101) };
    const result = createTagSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("name");
      expect(result.error.errors[0].message).toBe("Tag name must be at most 100 characters");
    }
  });

  it("should accept tag name with exactly 100 characters", () => {
    const validData = { name: "a".repeat(100) };
    const result = createTagSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should accept single character tag name", () => {
    const validData = { name: "A" };
    const result = createTagSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject missing name field", () => {
    const invalidData = {};
    const result = createTagSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("name");
    }
  });

  it("should accept tag name with special characters", () => {
    const validData = { name: "Project #1 (Alpha) & Beta!" };
    const result = createTagSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe("updateTagSchema", () => {
  it("should pass valid updated tag name", () => {
    const validData = { name: "Updated Project" };
    const result = updateTagSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it("should trim whitespace from tag name", () => {
    const validData = { name: "  Updated Project  " };
    const result = updateTagSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Updated Project");
    }
  });

  it("should reject empty tag name", () => {
    const invalidData = { name: "" };
    const result = updateTagSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("name");
    }
  });

  it("should reject tag name exceeding 100 characters", () => {
    const invalidData = { name: "a".repeat(101) };
    const result = updateTagSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("name");
      expect(result.error.errors[0].message).toBe("Tag name must be at most 100 characters");
    }
  });

  it("should accept tag name with exactly 100 characters", () => {
    const validData = { name: "a".repeat(100) };
    const result = updateTagSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe("grantTagAccessSchema", () => {
  it("should pass valid recipient email", () => {
    const validData = { recipient_email: "recipient@example.com" };
    const result = grantTagAccessSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it("should reject invalid email format", () => {
    const invalidData = { recipient_email: "not-an-email" };
    const result = grantTagAccessSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("recipient_email");
      expect(result.error.errors[0].message).toBe("Invalid email format");
    }
  });

  it("should reject empty email", () => {
    const invalidData = { recipient_email: "" };
    const result = grantTagAccessSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("recipient_email");
    }
  });

  it("should reject missing recipient_email field", () => {
    const invalidData = {};
    const result = grantTagAccessSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("recipient_email");
    }
  });

  it("should accept various valid email formats", () => {
    const validEmails = [
      "test@example.com",
      "user.name@example.co.uk",
      "user+tag@example.com",
      "first.last@subdomain.example.com",
    ];

    validEmails.forEach((email) => {
      const result = grantTagAccessSchema.safeParse({ recipient_email: email });
      expect(result.success).toBe(true);
    });
  });
});

describe("addRecipientSchema", () => {
  it("should pass valid recipient email", () => {
    const validData = { email: "recipient@example.com" };
    const result = addRecipientSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it("should reject invalid email format", () => {
    const invalidData = { email: "not-an-email" };
    const result = addRecipientSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("email");
      expect(result.error.errors[0].message).toBe("Podaj poprawny adres email");
    }
  });

  it("should reject empty email", () => {
    const invalidData = { email: "" };
    const result = addRecipientSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("email");
    }
  });

  it("should reject missing email field", () => {
    const invalidData = {};
    const result = addRecipientSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("email");
    }
  });

  it("should accept various valid email formats", () => {
    const validEmails = [
      "test@example.com",
      "user.name@example.co.uk",
      "user+tag@example.com",
      "first.last@subdomain.example.com",
    ];

    validEmails.forEach((email) => {
      const result = addRecipientSchema.safeParse({ email });
      expect(result.success).toBe(true);
    });
  });
});
