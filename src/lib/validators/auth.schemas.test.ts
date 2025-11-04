import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema, resetPasswordSchema, forgotPasswordSchema } from "./auth.schemas";

describe("loginSchema", () => {
  it("should pass valid login data", () => {
    const validData = { email: "test@example.com", password: "password123" };
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it("should reject invalid email format", () => {
    const invalidData = { email: "not-an-email", password: "password123" };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("email");
      expect(result.error.errors[0].message).toBe("Podaj poprawny adres email");
    }
  });

  it("should reject empty email", () => {
    const invalidData = { email: "", password: "password123" };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("email");
    }
  });

  it("should reject missing email field", () => {
    const invalidData = { password: "password123" };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("email");
    }
  });

  it("should reject empty password", () => {
    const invalidData = { email: "test@example.com", password: "" };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("password");
      expect(result.error.errors[0].message).toBe("Hasło jest wymagane");
    }
  });

  it("should reject missing password field", () => {
    const invalidData = { email: "test@example.com" };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("password");
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
      const result = loginSchema.safeParse({ email, password: "password123" });
      expect(result.success).toBe(true);
    });
  });
});

describe("registerSchema", () => {
  it("should pass valid registration data", () => {
    const validData = {
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
    };
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it("should reject password shorter than 8 characters", () => {
    const invalidData = {
      email: "test@example.com",
      password: "pass123",
      confirmPassword: "pass123",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("password");
      expect(result.error.errors[0].message).toBe("Hasło musi mieć co najmniej 8 znaków");
    }
  });

  it("should reject mismatched passwords", () => {
    const invalidData = {
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password456",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("confirmPassword");
      expect(result.error.errors[0].message).toBe("Hasła muszą być identyczne");
    }
  });

  it("should reject invalid email format", () => {
    const invalidData = {
      email: "not-an-email",
      password: "password123",
      confirmPassword: "password123",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("email");
      expect(result.error.errors[0].message).toBe("Podaj poprawny adres email");
    }
  });

  it("should reject empty password", () => {
    const invalidData = {
      email: "test@example.com",
      password: "",
      confirmPassword: "",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("password");
    }
  });

  it("should reject empty confirmation password", () => {
    const invalidData = {
      email: "test@example.com",
      password: "password123",
      confirmPassword: "",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("confirmPassword");
      expect(result.error.errors[0].message).toBe("Potwierdzenie hasła jest wymagane");
    }
  });

  it("should accept 8-character password", () => {
    const validData = {
      email: "test@example.com",
      password: "pass1234",
      confirmPassword: "pass1234",
    };
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should accept long password", () => {
    const validData = {
      email: "test@example.com",
      password: "veryLongPassword123456789",
      confirmPassword: "veryLongPassword123456789",
    };
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe("resetPasswordSchema", () => {
  it("should pass valid reset password data", () => {
    const validData = {
      password: "newPassword123",
      confirmPassword: "newPassword123",
    };
    const result = resetPasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it("should reject password shorter than 8 characters", () => {
    const invalidData = {
      password: "short12",
      confirmPassword: "short12",
    };
    const result = resetPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("password");
      expect(result.error.errors[0].message).toBe("Hasło musi mieć co najmniej 8 znaków");
    }
  });

  it("should reject mismatched passwords", () => {
    const invalidData = {
      password: "newPassword123",
      confirmPassword: "newPassword456",
    };
    const result = resetPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("confirmPassword");
      expect(result.error.errors[0].message).toBe("Hasła muszą być identyczne");
    }
  });

  it("should reject empty password", () => {
    const invalidData = {
      password: "",
      confirmPassword: "",
    };
    const result = resetPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("password");
    }
  });

  it("should reject empty confirmation password", () => {
    const invalidData = {
      password: "newPassword123",
      confirmPassword: "",
    };
    const result = resetPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("confirmPassword");
      expect(result.error.errors[0].message).toBe("Potwierdzenie hasła jest wymagane");
    }
  });

  it("should accept 8-character password", () => {
    const validData = {
      password: "pass1234",
      confirmPassword: "pass1234",
    };
    const result = resetPasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe("forgotPasswordSchema", () => {
  it("should pass valid email", () => {
    const validData = { email: "test@example.com" };
    const result = forgotPasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it("should reject invalid email format", () => {
    const invalidData = { email: "not-an-email" };
    const result = forgotPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("email");
      expect(result.error.errors[0].message).toBe("Podaj poprawny adres email");
    }
  });

  it("should reject empty email", () => {
    const invalidData = { email: "" };
    const result = forgotPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path[0]).toBe("email");
    }
  });

  it("should reject missing email field", () => {
    const invalidData = {};
    const result = forgotPasswordSchema.safeParse(invalidData);
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
      const result = forgotPasswordSchema.safeParse({ email });
      expect(result.success).toBe(true);
    });
  });
});
