import { describe, it, expect } from "vitest";
import { deleteAccountSchema, deleteAccountFormSchema } from "./user.schemas";

describe("deleteAccountSchema", () => {
  it("should pass valid deletion email confirmation", () => {
    const validData = { confirmation_email: "user@example.com" };
    const result = deleteAccountSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it("should reject invalid email format", () => {
    const invalidData = { confirmation_email: "not-an-email" };
    const result = deleteAccountSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("confirmation_email");
      expect(result.error.errors[0].message).toBe("Invalid email format");
    }
  });

  it("should reject empty email", () => {
    const invalidData = { confirmation_email: "" };
    const result = deleteAccountSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("confirmation_email");
    }
  });

  it("should reject missing confirmation_email field", () => {
    const invalidData = {};
    const result = deleteAccountSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("confirmation_email");
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
      const result = deleteAccountSchema.safeParse({ confirmation_email: email });
      expect(result.success).toBe(true);
    });
  });
});

describe("deleteAccountFormSchema", () => {
  it("should pass valid deletion form data", () => {
    const validData = {
      confirmation_email: "user@example.com",
      isConfirmed: true,
    };
    const result = deleteAccountFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it("should reject invalid email format", () => {
    const invalidData = {
      confirmation_email: "not-an-email",
      isConfirmed: true,
    };
    const result = deleteAccountFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("confirmation_email");
      expect(result.error.errors[0].message).toBe("Podaj poprawny adres email");
    }
  });

  it("should reject empty email", () => {
    const invalidData = {
      confirmation_email: "",
      isConfirmed: true,
    };
    const result = deleteAccountFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("confirmation_email");
    }
  });

  it("should reject false confirmation checkbox", () => {
    const invalidData = {
      confirmation_email: "user@example.com",
      isConfirmed: false,
    };
    const result = deleteAccountFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Could be on either path depending on which refine fails first
      const paths = result.error.errors.map((e) => e.path[0]);
      expect(paths).toContain("isConfirmed");
    }
  });

  it("should reject missing confirmation_email field", () => {
    const invalidData = {
      isConfirmed: true,
    };
    const result = deleteAccountFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("confirmation_email");
    }
  });

  it("should reject missing isConfirmed field", () => {
    const invalidData = {
      confirmation_email: "user@example.com",
    };
    const result = deleteAccountFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("isConfirmed");
    }
  });

  it("should accept true as confirmation value", () => {
    const validData = {
      confirmation_email: "user@example.com",
      isConfirmed: true,
    };
    const result = deleteAccountFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should provide helpful error message for unchecked confirmation", () => {
    const invalidData = {
      confirmation_email: "user@example.com",
      isConfirmed: false,
    };
    const result = deleteAccountFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorMessages = result.error.errors.map((e) => e.message);
      expect(errorMessages.some((msg) => msg.includes("potwierdzić") || msg.includes("konsekwencje"))).toBe(true);
    }
  });

  it("should accept various valid email formats with confirmation", () => {
    const validEmails = [
      "test@example.com",
      "user.name@example.co.uk",
      "user+tag@example.com",
      "first.last@subdomain.example.com",
    ];

    validEmails.forEach((email) => {
      const result = deleteAccountFormSchema.safeParse({
        confirmation_email: email,
        isConfirmed: true,
      });
      expect(result.success).toBe(true);
    });
  });
});
