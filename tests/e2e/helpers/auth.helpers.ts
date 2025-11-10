import { type Page } from "playwright/test";

/**
 * Authentication helper functions for E2E tests
 */

/**
 * Clear all authentication state
 * Removes cookies, localStorage, and sessionStorage
 *
 * @param page - Playwright page instance
 */
export async function clearAuthState(page: Page) {
  // Clear cookies
  await page.context().clearCookies();

  // Clear localStorage and sessionStorage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Check if user is authenticated
 * Verifies Supabase session in localStorage
 *
 * @param page - Playwright page instance
 * @returns True if user has valid session
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const session = await page.evaluate(() => {
    // Check for Supabase session in localStorage
    const keys = Object.keys(localStorage);
    const supabaseKey = keys.find((key) => key.startsWith("sb-") && key.endsWith("-auth-token"));

    if (!supabaseKey) return null;

    const data = localStorage.getItem(supabaseKey);
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      return parsed.access_token ? true : false;
    } catch {
      return false;
    }
  });

  return session === true;
}

/**
 * Wait for authentication to complete
 * Polls localStorage for Supabase session
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum wait time in ms (default: 5000)
 */
export async function waitForAuth(page: Page, timeout = 5000) {
  await page.waitForFunction(
    () => {
      const keys = Object.keys(localStorage);
      const supabaseKey = keys.find((key) => key.startsWith("sb-") && key.endsWith("-auth-token"));
      if (!supabaseKey) return false;
      const data = localStorage.getItem(supabaseKey);
      if (!data) return false;
      try {
        const parsed = JSON.parse(data);
        return !!parsed.access_token;
      } catch {
        return false;
      }
    },
    null,
    { timeout }
  );
}

/**
 * Get current user email from session
 *
 * @param page - Playwright page instance
 * @returns User email or null if not authenticated
 */
export async function getCurrentUserEmail(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const supabaseKey = keys.find((key) => key.startsWith("sb-") && key.endsWith("-auth-token"));

    if (!supabaseKey) return null;

    const data = localStorage.getItem(supabaseKey);
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      return parsed.user?.email || null;
    } catch {
      return null;
    }
  });
}
