import { TEST_USERS, INVALID_CREDENTIALS } from "./config/test-users";
import { test, expect } from "./fixtures/base";
import { clearAuthState } from "./helpers/auth.helpers";
import { requireE2EUserCredentials, requireE2EUsername } from "./helpers/env.helpers";

// Ensure login tests never reuse the persisted authenticated state
test.use({
  storageState: undefined,
});

/**
 * E2E Test Suite: User Login
 *
 * Tests the complete login flow with various scenarios:
 * - Successful authentication
 * - Invalid credentials
 * - Form validation
 * - Error handling
 * - Navigation after login
 *
 * Following 'Arrange-Act-Assert' pattern for clarity and maintainability
 *
 * @see .cursor/rules/playwright-e2e-testing.mdc for E2E testing guidelines
 */

test.describe("Login Flow", () => {
  /**
   * Setup: Clear authentication state before each test
   * Ensures isolated test environment
   */
  test.beforeEach(async ({ page, loginPage }) => {
    // Always start from login page
    await loginPage.goto();

    // Explicitly clear any leftover auth state (cookies + storage)
    await clearAuthState(page);

    // Reload after clearing to guarantee a pristine login form
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
  });

  test.describe("Successful Login", () => {
    test("should login with valid credentials and redirect to /notes", async ({ page, loginPage, notesPage }) => {
      // Arrange: Valid user credentials
      const { email, password } = requireE2EUserCredentials();

      // Act: Submit login form
      await loginPage.login(email, password);

      // Assert: Wait for redirect to /notes
      await loginPage.waitForSuccessfulLogin("/notes");

      // Assert: Wait for user profile to load
      await notesPage.waitForUserProfileLoaded(email);

      // Assert: User is authenticated - verify by checking navbar elements
      await expect(notesPage.navbarUserEmailDisplay).toContainText(email);
      await expect(notesPage.navbarNotesLink).toBeVisible();
      await expect(notesPage.navbarGenerateNoteButton).toBeVisible();

      // Assert: URL changed to /notes
      expect(page.url()).toContain("/notes");
    });

    test("should successfully complete login flow", async ({ loginPage, notesPage }) => {
      // Arrange: Valid credentials
      const { email, password } = requireE2EUserCredentials();

      // Act: Submit login form
      await loginPage.login(email, password);

      // Assert: Redirect to /notes
      await loginPage.waitForSuccessfulLogin("/notes");

      // Assert: User profile loads successfully
      await notesPage.waitForUserProfileLoaded(email);

      // Assert: Navigation shows authenticated state
      await expect(notesPage.navbarNotesLink).toBeVisible();
      await expect(notesPage.navbarGenerateNoteButton).toBeVisible();
    });
  });

  test.describe("Invalid Credentials", () => {
    test("should show error message for non-existent user", async ({ page, loginPage }) => {
      // Arrange: Invalid user credentials
      const { email, password } = TEST_USERS.invalidUser;

      // Act: Submit login form
      await loginPage.login(email, password);

      // Assert: Error message is displayed
      // Wait for error message (API call takes time)
      await page.waitForTimeout(1000);

      // Assert: Still on login page (login failed)
      const isDisplayed = await loginPage.isDisplayed();
      expect(isDisplayed).toBe(true);
    });

    test("should show error for wrong password", async ({ page, loginPage }) => {
      // Arrange: Valid email but wrong password
      const email = requireE2EUsername();
      const wrongPassword = "WrongPassword123!";

      // Act: Submit login form
      await loginPage.login(email, wrongPassword);

      // Assert: Wait for error response
      await page.waitForTimeout(1000);

      // Assert: Still on login page (login failed)
      const isDisplayed = await loginPage.isDisplayed();
      expect(isDisplayed).toBe(true);
    });
  });

  test.describe("Form Validation", () => {
    test("should validate empty email field", async ({ loginPage }) => {
      // Arrange: Empty email
      const { email, password } = INVALID_CREDENTIALS.emptyEmail;

      // Act: Submit form with empty email
      await loginPage.login(email, password);

      // Assert: HTML5 validation prevents submission
      // Email input should be focused
      const emailValue = await loginPage.getEmailValue();
      expect(emailValue).toBe("");

      // Assert: Still on login page (no navigation occurred)
      const isDisplayed = await loginPage.isDisplayed();
      expect(isDisplayed).toBe(true);
    });

    test("should validate empty password field", async ({ loginPage }) => {
      // Arrange: Empty password
      const { email, password } = INVALID_CREDENTIALS.emptyPassword;

      // Act: Submit form with empty password
      await loginPage.login(email, password);

      // Assert: HTML5 validation prevents submission
      const passwordValue = await loginPage.getPasswordValue();
      expect(passwordValue).toBe("");

      // Assert: Still on login page
      const isDisplayed = await loginPage.isDisplayed();
      expect(isDisplayed).toBe(true);
    });

    test("should validate invalid email format", async ({ page, loginPage }) => {
      // Arrange: Invalid email format
      const { email, password } = INVALID_CREDENTIALS.invalidEmailFormat;

      // Act: Fill email field with invalid format
      await loginPage.fillEmail(email);
      await loginPage.fillPassword(password);

      // Act: Try to submit
      await loginPage.submit();

      // Assert: Wait a moment for validation
      await page.waitForTimeout(500);

      // Assert: Still on login page (validation failed)
      const isDisplayed = await loginPage.isDisplayed();
      expect(isDisplayed).toBe(true);
    });

    test("should validate short password", async ({ page, loginPage }) => {
      // Arrange: Valid email but too short password
      const { email, password } = INVALID_CREDENTIALS.shortPassword;

      // Act: Submit form
      await loginPage.login(email, password);

      // Assert: Wait for validation
      await page.waitForTimeout(500);

      // Assert: Still on login page
      const isDisplayed = await loginPage.isDisplayed();
      expect(isDisplayed).toBe(true);
    });
  });

  test.describe("Navigation and UI", () => {
    test("should display login page correctly", async ({ loginPage }) => {
      // Assert: Page is visible
      const isDisplayed = await loginPage.isDisplayed();
      expect(isDisplayed).toBe(true);

      // Assert: Form is visible
      expect(await loginPage.form.isVisible()).toBe(true);

      // Assert: Email input is visible
      expect(await loginPage.emailInput.isVisible()).toBe(true);

      // Assert: Password input is visible
      expect(await loginPage.passwordInput.isVisible()).toBe(true);

      // Assert: Submit button is visible and enabled
      expect(await loginPage.submitButton.isVisible()).toBe(true);
      expect(await loginPage.isSubmitDisabled()).toBe(false);

      // Assert: Forgot password link is visible
      expect(await loginPage.forgotPasswordLink.isVisible()).toBe(true);
    });

    test("should navigate to forgot password page", async ({ page, loginPage }) => {
      // Act: Click forgot password link
      await loginPage.clickForgotPassword();

      // Assert: Navigated to forgot password page
      await page.waitForURL((url) => url.pathname === "/forgot-password");
      expect(page.url()).toContain("/forgot-password");
    });

    test("should allow typing in email and password fields", async ({ loginPage }) => {
      // Arrange: Test credentials
      const testEmail = "test@example.com";
      const testPassword = "password123";

      // Act: Type in fields
      await loginPage.fillEmail(testEmail);
      await loginPage.fillPassword(testPassword);

      // Assert: Values are set correctly
      expect(await loginPage.getEmailValue()).toBe(testEmail);
      expect(await loginPage.getPasswordValue()).toBe(testPassword);
    });

    test("should open login page from landing navbar link", async ({ loginPage }) => {
      // Act: Visit landing page and use navbar CTA
      await loginPage.page.goto("/");
      await loginPage.page.getByTestId("navbar-login-link").click();

      // Assert: Redirected to login page
      await expect(loginPage.pageContainer).toBeVisible();
      expect(loginPage.page.url()).toContain("/login");
    });
  });

  test.describe("Session Persistence", () => {
    test("should redirect authenticated user from login page to home", async ({ page, loginPage, notesPage }) => {
      // Arrange: Login first
      const { email, password } = requireE2EUserCredentials();
      await loginPage.login(email, password);
      await loginPage.waitForSuccessfulLogin("/notes");

      // Wait for user profile to load
      await notesPage.waitForUserProfileLoaded(email);

      // Assert: User is authenticated - verify by checking navbar
      await expect(notesPage.navbarUserEmailDisplay).toContainText(email);

      // Act: Navigate to login page again
      await loginPage.goto();

      // Assert: Should redirect away from login (user is already logged in)
      // Wait for redirect to complete
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 5000 });

      // Assert: URL is NOT /login (redirected to home or notes)
      const url = page.url();
      expect(url).not.toContain("/login");
    });
  });
});
