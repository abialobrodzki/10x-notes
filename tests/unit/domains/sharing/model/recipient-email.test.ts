import { describe, it, expect } from "vitest";
import { RecipientEmail } from "@/domains/sharing/model/recipient-email";

describe("RecipientEmail Value Object", () => {
  describe("Constructor", () => {
    it("should create a valid email", () => {
      const email = new RecipientEmail("user@example.com");
      expect(email.value).toBe("user@example.com");
    });

    it("should convert email to lowercase", () => {
      const email = new RecipientEmail("USER@EXAMPLE.COM");
      expect(email.value).toBe("user@example.com");
    });

    it("should throw error for invalid email format", () => {
      expect(() => new RecipientEmail("invalid-email")).toThrow("INVALID_EMAIL");
      expect(() => new RecipientEmail("@example.com")).toThrow("INVALID_EMAIL");
      expect(() => new RecipientEmail("user@")).toThrow("INVALID_EMAIL");
      expect(() => new RecipientEmail("user@example")).toThrow("INVALID_EMAIL");
    });

    it("should throw error for empty string", () => {
      expect(() => new RecipientEmail("")).toThrow("INVALID_EMAIL");
    });

    it("should throw error for whitespace only", () => {
      expect(() => new RecipientEmail("   ")).toThrow("INVALID_EMAIL");
    });

    it("should throw error for null or undefined", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => new RecipientEmail(null as any)).toThrow("INVALID_EMAIL");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => new RecipientEmail(undefined as any)).toThrow("INVALID_EMAIL");
    });
  });

  describe("equals", () => {
    it("should return true for equal emails", () => {
      const email1 = new RecipientEmail("user@example.com");
      const email2 = new RecipientEmail("user@example.com");
      expect(email1.equals(email2)).toBe(true);
    });

    it("should return true for emails with different cases", () => {
      const email1 = new RecipientEmail("USER@EXAMPLE.COM");
      const email2 = new RecipientEmail("user@example.com");
      expect(email1.equals(email2)).toBe(true);
    });

    it("should return false for different emails", () => {
      const email1 = new RecipientEmail("user1@example.com");
      const email2 = new RecipientEmail("user2@example.com");
      expect(email1.equals(email2)).toBe(false);
    });
  });

  describe("toString", () => {
    it("should return the email value", () => {
      const email = new RecipientEmail("user@example.com");
      expect(email.toString()).toBe("user@example.com");
    });
  });
});
