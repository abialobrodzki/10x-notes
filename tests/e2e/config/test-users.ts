/**
 * Test user configuration
 * Credentials for E2E testing
 *
 * IMPORTANT: These credentials are loaded from .env.test file
 * - E2E_USERNAME: test user email (default: e2e@user.com)
 * - E2E_PASSWORD: test user password (default: 12345678)
 * - E2E_USERNAME_ID: test user ID in Supabase
 */

import { requireE2EUserCredentials } from "../helpers/env.helpers";

export const TEST_USERS = {
  get validUser() {
    return requireE2EUserCredentials();
  },
  invalidUser: {
    email: "nonexistent@example.com",
    password: "WrongPassword123!",
  },
};

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
