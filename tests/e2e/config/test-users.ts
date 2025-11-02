/**
 * Test user configuration
 * Credentials for E2E testing
 *
 * IMPORTANT: These credentials are loaded from .env.test file
 * - E2E_USERNAME: test user email (default: e2e@user.com)
 * - E2E_PASSWORD: test user password (default: 12345678)
 * - E2E_USERNAME_ID: test user ID in Supabase
 */

export const TEST_USERS = {
  validUser: {
    email: process.env.E2E_USERNAME || "e2e@user.com",
    password: process.env.E2E_PASSWORD || "12345678",
  },
  invalidUser: {
    email: "nonexistent@example.com",
    password: "WrongPassword123!",
  },
} as const;

export const INVALID_CREDENTIALS = {
  emptyEmail: {
    email: "",
    password: "SomePassword123!",
  },
  emptyPassword: {
    email: "test@example.com",
    password: "",
  },
  invalidEmailFormat: {
    email: "not-an-email",
    password: "SomePassword123!",
  },
  shortPassword: {
    email: "test@example.com",
    password: "short",
  },
} as const;
