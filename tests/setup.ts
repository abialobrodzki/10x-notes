/**
 * Global test setup for Vitest
 *
 * This file runs before all tests and sets up:
 * - MSW for API mocking (integration tests)
 * - Global mocks (sessionStorage, crypto)
 * - Custom matchers (if needed)
 * - Test utilities
 */

import { beforeAll, afterEach, afterAll, beforeEach, vi } from "vitest";
import { server } from "./mocks/server";

// ============================================================================
// MSW API Mocking Setup (for integration tests)
// ============================================================================

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());

// ============================================================================
// sessionStorage Mock
// ============================================================================

/**
 * Mock implementation of sessionStorage for testing
 * Uses in-memory Map to simulate browser sessionStorage
 */
class SessionStorageMock {
  private store: Map<string, string>;

  constructor() {
    this.store = new Map();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

// Install sessionStorage mock globally
global.sessionStorage = new SessionStorageMock() as Storage;

// ============================================================================
// crypto Mock
// ============================================================================

/**
 * Mock implementation of crypto.randomUUID()
 * Provides deterministic UUIDs for testing unless overridden
 */
if (!global.crypto) {
  global.crypto = {} as Crypto;
}

// Default implementation - can be overridden in individual tests
// @ts-expect-error - Mock returns string which is compatible with UUID format
global.crypto.randomUUID = vi.fn(() => {
  // Generate a valid UUID v4 format
  const hex = "0123456789abcdef";
  const random = () => hex[Math.floor(Math.random() * 16)];

  return [
    Array.from({ length: 8 }, random).join(""),
    Array.from({ length: 4 }, random).join(""),
    `4${Array.from({ length: 3 }, random).join("")}`, // Version 4
    `${hex[8 + Math.floor(Math.random() * 4)]}${Array.from({ length: 3 }, random).join("")}`, // Variant
    Array.from({ length: 12 }, random).join(""),
  ].join("-");
});

// ============================================================================
// Global Test Utilities
// ============================================================================

/**
 * Helper to reset all mocks between tests
 * Call this in afterEach() to ensure test isolation
 */
export function resetAllMocks(): void {
  vi.clearAllMocks();
  sessionStorage.clear();
}

// Auto-reset sessionStorage between tests (optional - can be disabled)
beforeEach(() => {
  sessionStorage.clear();
});
