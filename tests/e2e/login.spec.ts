import { TEST_USERS, INVALID_CREDENTIALS } from "./config/test-users";
import { unauthedTest as test, expect } from "./fixtures/index";
import { clearAuthState } from "./helpers/auth.helpers";
import { requireE2EUserCredentials, requireE2EUsername } from "./helpers/env.helpers";

// Ensure login tests never reuse the persisted authenticated state
test.use({
  storageState: undefined,
});

/**
 * E2E Test Suite: User Login
 */
test.describe("Login Flow", () => {
  test.beforeEach(async ({ page, loginPage }) => {
    await loginPage.goto();
    await clearAuthState(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
  });

  test("should display login page with correct layout", async ({ loginPage }) => {
    // ARRANGE
    await loginPage.goto();
    await loginPage.pageContainer.waitFor({ state: "visible" });

    // ASSERT
    await expect(loginPage.page).toHaveScreenshot("login-page-layout.png");
  });

  test.describe("Successful Login", () => {
    test("should login with valid credentials and redirect to /notes", async ({ page, loginPage, notesPage }) => {
      // Arrange
      const { email, password } = requireE2EUserCredentials();

      // Act
      await loginPage.login(email, password);
      await loginPage.waitForSuccessfulLogin("/notes");
      await notesPage.waitForUserProfileLoaded(email);

      // Assert
      await expect(notesPage.navbarUserEmailDisplay).toContainText(email);
      await expect(notesPage.navbarNotesLink).toBeVisible();
      await expect(notesPage.navbarGenerateNoteButton).toBeVisible();
      expect(page.url()).toContain("/notes");
    });

    test("should successfully complete login flow", async ({ loginPage, notesPage }) => {
      // Arrange
      const { email, password } = requireE2EUserCredentials();

      // Act
      await loginPage.login(email, password);
      await loginPage.waitForSuccessfulLogin("/notes");
      await notesPage.waitForUserProfileLoaded(email);

      // Assert
      await expect(notesPage.navbarNotesLink).toBeVisible();
      await expect(notesPage.navbarGenerateNoteButton).toBeVisible();
    });
  });

  test.describe("Invalid Credentials", () => {
    test("should show error message for non-existent user", async ({ loginPage }) => {
      // ARRANGE
      const { email, password } = TEST_USERS.invalidUser;

      // ACT
      await loginPage.login(email, password);

      // ASSERT
      const emailError = await loginPage.getEmailErrorText();
      expect(emailError).toContain("Nieprawidłowy email lub hasło.");
    });

    test("should show error for wrong password", async ({ loginPage }) => {
      // ARRANGE
      const email = requireE2EUsername();
      const wrongPassword = "WrongPassword123!";

      // ACT
      await loginPage.login(email, wrongPassword);

      // ASSERT
      const emailError = await loginPage.getEmailErrorText();
      expect(emailError).toContain("Nieprawidłowy email lub hasło.");
    });
  });

  test.describe("Form Validation", () => {
    test("should validate empty email field", async ({ loginPage }) => {
      // Arrange
      const { email, password } = INVALID_CREDENTIALS.emptyEmail;

      // Act
      await loginPage.login(email, password);

      // Assert
      const emailValue = await loginPage.getEmailValue();
      expect(emailValue).toBe("");
      await expect(loginPage.pageContainer).toBeVisible();
    });

    test("should validate empty password field", async ({ loginPage }) => {
      // Arrange
      const { email, password } = INVALID_CREDENTIALS.emptyPassword;

      // Act
      await loginPage.login(email, password);

      // Assert
      const passwordValue = await loginPage.getPasswordValue();
      expect(passwordValue).toBe("");
      await expect(loginPage.pageContainer).toBeVisible();
    });

    test("should validate invalid email format", async ({ loginPage }) => {
      // Arrange
      const { email, password } = INVALID_CREDENTIALS.invalidEmailFormat;

      // Act
      await loginPage.fillEmail(email);
      await loginPage.fillPassword(password);
      await loginPage.submit();

      // Assert
      await expect(loginPage.pageContainer).toBeVisible();
    });

    test("should validate short password", async ({ loginPage }) => {
      // Arrange
      const { email, password } = INVALID_CREDENTIALS.shortPassword;

      // Act
      await loginPage.login(email, password);

      // Assert
      await expect(loginPage.pageContainer).toBeVisible();
    });
  });

  test.describe("Navigation and UI", () => {
    test("should display login page correctly", async ({ loginPage }) => {
      // Assert
      await expect(loginPage.pageContainer).toBeVisible();
      await expect(loginPage.form).toBeVisible();
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
      await expect(loginPage.submitButton).toBeEnabled();
      await expect(loginPage.forgotPasswordLink).toBeVisible();
    });

    test("should navigate to forgot password page", async ({ page, loginPage }) => {
      // Act
      await loginPage.clickForgotPassword();
      await page.waitForURL((url) => url.pathname === "/forgot-password");

      // Assert
      expect(page.url()).toContain("/forgot-password");
    });

    test("should open login page from landing navbar link", async ({ loginPage }) => {
      // Arrange
      await loginPage.page.goto("/");

      // Act
      await loginPage.page.getByTestId("navbar-login-link").click();

      // Assert
      await expect(loginPage.pageContainer).toBeVisible();
      expect(loginPage.page.url()).toContain("/login");
    });
  });

  test.describe("Session Persistence", () => {
    test("should redirect authenticated user from login page to home", async ({ page, loginPage, notesPage }) => {
      // Arrange
      const { email, password } = requireE2EUserCredentials();
      await loginPage.login(email, password);
      await loginPage.waitForSuccessfulLogin("/notes");
      await notesPage.waitForUserProfileLoaded(email);
      await expect(notesPage.navbarUserEmailDisplay).toContainText(email);

      // Act
      await loginPage.goto();
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 5000 });

      // Assert
      const url = page.url();
      expect(url).not.toContain("/login");
    });
  });
});
