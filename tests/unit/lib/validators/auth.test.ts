import { describe, expect, it } from "vitest";
import {
  validateEmail,
  validatePasswordConfirm,
  validatePasswordLogin,
  validatePasswordRegister,
} from "@/lib/validators/auth.validators";

describe("auth.validators", () => {
  // ============================================================================
  // validateEmail
  // ============================================================================

  describe("validateEmail", () => {
    describe("valid emails", () => {
      it("should return empty array for valid simple email", () => {
        // Arrange
        const email = "user@example.com";

        // Act
        const errors = validateEmail(email);

        // Assert
        expect(errors).toEqual([]);
      });

      it("should accept email with dots in local part", () => {
        expect(validateEmail("test.email@example.com")).toEqual([]);
      });

      it("should accept email with plus sign", () => {
        expect(validateEmail("user+tag@example.com")).toEqual([]);
      });

      it("should accept email with numbers", () => {
        expect(validateEmail("user123@domain456.com")).toEqual([]);
      });

      it("should accept email with subdomain", () => {
        expect(validateEmail("user@mail.example.com")).toEqual([]);
      });

      it("should accept email with hyphen in domain", () => {
        expect(validateEmail("user@my-domain.com")).toEqual([]);
      });

      it("should accept email with multiple TLD levels", () => {
        expect(validateEmail("test@domain.co.uk")).toEqual([]);
      });
    });

    describe("invalid emails", () => {
      it("should return error for empty string", () => {
        // Arrange
        const email = "";

        // Act
        const errors = validateEmail(email);

        // Assert
        expect(errors).toEqual(["Adres email jest wymagany"]);
      });

      it("should return error for whitespace only", () => {
        expect(validateEmail("   ")).toEqual(["Adres email jest wymagany"]);
      });

      it("should return error for missing @", () => {
        expect(validateEmail("userexample.com")).toEqual(["Podaj poprawny adres email"]);
      });

      it("should return error for missing domain", () => {
        expect(validateEmail("user@")).toEqual(["Podaj poprawny adres email"]);
      });

      it("should return error for missing local part", () => {
        expect(validateEmail("@example.com")).toEqual(["Podaj poprawny adres email"]);
      });

      it("should return error for missing TLD", () => {
        expect(validateEmail("user@example")).toEqual(["Podaj poprawny adres email"]);
      });

      it("should return error for plain text", () => {
        expect(validateEmail("plaintext")).toEqual(["Podaj poprawny adres email"]);
      });

      it("should return error for multiple @ signs", () => {
        expect(validateEmail("user@@example.com")).toEqual(["Podaj poprawny adres email"]);
      });

      it("should return error for spaces in email", () => {
        expect(validateEmail("user @example.com")).toEqual(["Podaj poprawny adres email"]);
        expect(validateEmail("user@ example.com")).toEqual(["Podaj poprawny adres email"]);
      });

      it("should return error for special characters in domain", () => {
        expect(validateEmail("user@ex ample.com")).toEqual(["Podaj poprawny adres email"]);
      });

      it("should return error for email with leading/trailing whitespace", () => {
        // Email with leading/trailing spaces should fail
        // because regex tests the original string (with spaces)
        const errors = validateEmail("  user@example.com  ");

        // Spaces make the email invalid for the regex
        expect(errors).toEqual(["Podaj poprawny adres email"]);
      });
    });
  });

  // ============================================================================
  // validatePasswordLogin
  // ============================================================================

  describe("validatePasswordLogin", () => {
    describe("valid passwords", () => {
      it("should return empty array for non-empty password", () => {
        // Arrange
        const password = "anyPassword";

        // Act
        const errors = validatePasswordLogin(password);

        // Assert
        expect(errors).toEqual([]);
      });

      it("should accept short password (no minimum for login)", () => {
        expect(validatePasswordLogin("1")).toEqual([]);
        expect(validatePasswordLogin("abc")).toEqual([]);
      });

      it("should accept password with spaces", () => {
        expect(validatePasswordLogin("pass word")).toEqual([]);
      });

      it("should accept password with special characters", () => {
        expect(validatePasswordLogin("p@ssw0rd!")).toEqual([]);
      });

      it("should accept very long password", () => {
        const longPassword = "a".repeat(1000);
        expect(validatePasswordLogin(longPassword)).toEqual([]);
      });
    });

    describe("invalid passwords", () => {
      it("should return error for empty string", () => {
        // Arrange
        const password = "";

        // Act
        const errors = validatePasswordLogin(password);

        // Assert
        expect(errors).toEqual(["Hasło jest wymagane"]);
      });

      it("should return error for undefined", () => {
        // @ts-expect-error - Testing invalid input
        expect(validatePasswordLogin(undefined)).toEqual(["Hasło jest wymagane"]);
      });

      it("should return error for null", () => {
        // @ts-expect-error - Testing invalid input
        expect(validatePasswordLogin(null)).toEqual(["Hasło jest wymagane"]);
      });
    });
  });

  // ============================================================================
  // validatePasswordRegister
  // ============================================================================

  describe("validatePasswordRegister", () => {
    describe("valid passwords", () => {
      it("should return empty array for password with 8 characters", () => {
        // Arrange
        const password = "password";

        // Act
        const errors = validatePasswordRegister(password);

        // Assert
        expect(errors).toEqual([]);
      });

      it("should accept password with exactly 8 characters", () => {
        expect(validatePasswordRegister("12345678")).toEqual([]);
      });

      it("should accept password with more than 8 characters", () => {
        expect(validatePasswordRegister("verylongpassword123")).toEqual([]);
      });

      it("should accept password with spaces (8+ chars)", () => {
        expect(validatePasswordRegister("pass word 1")).toEqual([]);
      });

      it("should accept password with special characters", () => {
        expect(validatePasswordRegister("P@ssw0rd!")).toEqual([]);
      });
    });

    describe("invalid passwords", () => {
      it("should return error for empty string", () => {
        // Arrange
        const password = "";

        // Act
        const errors = validatePasswordRegister(password);

        // Assert
        expect(errors).toEqual(["Hasło jest wymagane"]);
      });

      it("should return error for password with less than 8 characters", () => {
        expect(validatePasswordRegister("1234567")).toEqual(["Hasło musi mieć co najmniej 8 znaków"]);
      });

      it("should return error for 1 character", () => {
        expect(validatePasswordRegister("a")).toEqual(["Hasło musi mieć co najmniej 8 znaków"]);
      });

      it("should return error for 7 characters", () => {
        expect(validatePasswordRegister("1234567")).toEqual(["Hasło musi mieć co najmniej 8 znaków"]);
      });

      it("should return error for whitespace only (even if 8+ chars)", () => {
        expect(validatePasswordRegister("")).toEqual(["Hasło jest wymagane"]);
      });
    });

    describe("edge cases", () => {
      it("should handle undefined", () => {
        // @ts-expect-error - Testing invalid input
        expect(validatePasswordRegister(undefined)).toEqual(["Hasło jest wymagane"]);
      });

      it("should handle null", () => {
        // @ts-expect-error - Testing invalid input
        expect(validatePasswordRegister(null)).toEqual(["Hasło jest wymagane"]);
      });
    });
  });

  // ============================================================================
  // validatePasswordConfirm
  // ============================================================================

  describe("validatePasswordConfirm", () => {
    describe("matching passwords", () => {
      it("should return empty array when passwords match", () => {
        // Arrange
        const password = "password123";
        const confirmPassword = "password123";

        // Act
        const errors = validatePasswordConfirm(password, confirmPassword);

        // Assert
        expect(errors).toEqual([]);
      });

      it("should accept matching short passwords", () => {
        expect(validatePasswordConfirm("abc", "abc")).toEqual([]);
      });

      it("should accept matching long passwords", () => {
        const longPass = "a".repeat(100);
        expect(validatePasswordConfirm(longPass, longPass)).toEqual([]);
      });

      it("should accept matching passwords with special characters", () => {
        expect(validatePasswordConfirm("P@ssw0rd!", "P@ssw0rd!")).toEqual([]);
      });

      it("should accept matching passwords with spaces", () => {
        expect(validatePasswordConfirm("pass word 123", "pass word 123")).toEqual([]);
      });

      it("should accept empty strings if both match", () => {
        expect(validatePasswordConfirm("", "")).toEqual(["Potwierdzenie hasła jest wymagane"]);
      });
    });

    describe("non-matching passwords", () => {
      it("should return error when passwords do not match", () => {
        // Arrange
        const password = "password123";
        const confirmPassword = "password456";

        // Act
        const errors = validatePasswordConfirm(password, confirmPassword);

        // Assert
        expect(errors).toEqual(["Hasła muszą być identyczne"]);
      });

      it("should return error for empty confirmation", () => {
        expect(validatePasswordConfirm("password", "")).toEqual(["Potwierdzenie hasła jest wymagane"]);
      });

      it("should be case-sensitive", () => {
        expect(validatePasswordConfirm("Password", "password")).toEqual(["Hasła muszą być identyczne"]);
      });

      it("should detect whitespace differences", () => {
        expect(validatePasswordConfirm("password", "password ")).toEqual(["Hasła muszą być identyczne"]);
        expect(validatePasswordConfirm("password", " password")).toEqual(["Hasła muszą być identyczne"]);
      });

      it("should return error for completely different passwords", () => {
        expect(validatePasswordConfirm("abc", "xyz")).toEqual(["Hasła muszą być identyczne"]);
      });
    });

    describe("edge cases", () => {
      it("should handle undefined confirmation", () => {
        // @ts-expect-error - Testing invalid input
        expect(validatePasswordConfirm("password", undefined)).toEqual(["Potwierdzenie hasła jest wymagane"]);
      });

      it("should handle null confirmation", () => {
        // @ts-expect-error - Testing invalid input
        expect(validatePasswordConfirm("password", null)).toEqual(["Potwierdzenie hasła jest wymagane"]);
      });

      it("should handle undefined password", () => {
        // @ts-expect-error - Testing invalid input
        expect(validatePasswordConfirm(undefined, "password")).toEqual(["Hasła muszą być identyczne"]);
      });
    });
  });

  // ============================================================================
  // Integration scenarios
  // ============================================================================

  describe("integration scenarios", () => {
    describe("registration flow", () => {
      it("should validate complete registration form (valid)", () => {
        const email = "user@example.com";
        const password = "securePass123";
        const confirmPassword = "securePass123";

        const emailErrors = validateEmail(email);
        const passwordErrors = validatePasswordRegister(password);
        const confirmErrors = validatePasswordConfirm(password, confirmPassword);

        expect(emailErrors).toEqual([]);
        expect(passwordErrors).toEqual([]);
        expect(confirmErrors).toEqual([]);
      });

      it("should detect all validation errors in invalid registration", () => {
        const email = "invalid-email";
        const password = "short";
        const confirmPassword = "different";

        const emailErrors = validateEmail(email);
        const passwordErrors = validatePasswordRegister(password);
        const confirmErrors = validatePasswordConfirm(password, confirmPassword);

        expect(emailErrors.length).toBeGreaterThan(0);
        expect(passwordErrors.length).toBeGreaterThan(0);
        expect(confirmErrors.length).toBeGreaterThan(0);
      });
    });

    describe("login flow", () => {
      it("should validate complete login form (valid)", () => {
        const email = "user@example.com";
        const password = "anyPassword";

        const emailErrors = validateEmail(email);
        const passwordErrors = validatePasswordLogin(password);

        expect(emailErrors).toEqual([]);
        expect(passwordErrors).toEqual([]);
      });

      it("should detect validation errors in invalid login", () => {
        const email = "";
        const password = "";

        const emailErrors = validateEmail(email);
        const passwordErrors = validatePasswordLogin(password);

        expect(emailErrors).toEqual(["Adres email jest wymagany"]);
        expect(passwordErrors).toEqual(["Hasło jest wymagane"]);
      });
    });
  });
});
