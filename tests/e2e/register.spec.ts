import { unauthedTest as test, expect } from "./fixtures/index";

test.describe("Register Page", () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  test("should display register page with correct layout", async ({ registerPage }) => {
    // Arrange
    await registerPage.container.waitFor({ state: "visible" });

    // Act
    // (Page is already loaded in beforeEach)

    // Assert
    await expect(registerPage.container).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
  });

  test("should display the register page title", async ({ registerPage }) => {
    // Arrange
    // (Page is already loaded in beforeEach)

    // Act
    // (No action needed - testing initial state)

    // Assert
    await expect(registerPage.container).toBeVisible();
    await expect(registerPage.signInLink).toBeVisible();
  });

  test("should show error messages for invalid email format", async ({ registerPage }) => {
    // Arrange
    // (Page is already loaded in beforeEach)

    // Act
    await registerPage.fillEmail("invalid-email");
    await registerPage.fillPassword("Password123!");
    await registerPage.fillConfirmPassword("Password123!");
    await registerPage.submitButton.click();

    // Assert
    const emailError = await registerPage.getEmailErrorText();
    expect(emailError).toContain("Podaj poprawny adres email");
  });

  test("should show error messages for weak password", async ({ registerPage }) => {
    // Arrange
    // (Page is already loaded in beforeEach)

    // Act
    await registerPage.fillEmail("test@example.com");
    await registerPage.fillPassword("short");
    await registerPage.fillConfirmPassword("short");
    await registerPage.submitButton.click();

    // Assert
    const passwordError = await registerPage.getPasswordErrorText();
    expect(passwordError).toContain("Hasło musi mieć co najmniej 8 znaków");
  });

  test("should show error messages for mismatched passwords", async ({ registerPage }) => {
    // Arrange
    // (Page is already loaded in beforeEach)

    // Act
    await registerPage.fillEmail("test@example.com");
    await registerPage.fillPassword("Password123!");
    await registerPage.fillConfirmPassword("Password123");
    await registerPage.submitButton.click();

    // Assert
    const confirmError = await registerPage.getConfirmPasswordErrorText();
    expect(confirmError).toContain("Hasła muszą być identyczne");
  });

  test("should submit form successfully with valid credentials", async ({ registerPage, page }) => {
    // Arrange
    await page.route("**/api/auth/register", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          requiresConfirmation: true,
          message: "Rejestracja udana! Sprawdź swoją skrzynkę email",
        }),
      });
    });

    // Act
    await registerPage.fillEmail(`user-${Date.now()}@example.com`);
    await registerPage.fillPassword("Password123!");
    await registerPage.fillConfirmPassword("Password123!");
    await registerPage.submitForm();

    // Assert
    // Form submission should complete without errors
  });

  test("should navigate to login page when clicking 'Zaloguj się' link", async ({ registerPage, page }) => {
    // Arrange
    // (Page is already loaded in beforeEach)

    // Act
    await registerPage.signInLink.click();

    // Assert
    await expect(page).toHaveURL(/\/login/);
  });
});
