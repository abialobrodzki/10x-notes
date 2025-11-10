import { unauthedTest as test, expect } from "./fixtures/index";

test.describe("Reset Password Page", () => {
  test.beforeEach(async ({ resetPasswordPage, page }) => {
    // Clear any previous route handlers to avoid mock interference
    await page.unroute("**/auth/v1/user");
    await resetPasswordPage.goto();
  });

  test("should display the reset password page", async ({ resetPasswordPage }) => {
    // Arrange
    // (Page is already loaded in beforeEach)

    // Act
    // (No action needed - testing initial state)

    // Assert
    await expect(resetPasswordPage.container).toBeVisible();
    await expect(resetPasswordPage.goToLoginButton).toBeVisible();
    await expect(resetPasswordPage.passwordInput).toBeVisible();
  });

  test("should show error messages for weak password", async ({ resetPasswordPage, page }) => {
    // Arrange
    await page.route("**/auth/v1/user", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Hasło musi mieć co najmniej 8 znaków",
        }),
      });
    });

    // Act
    await resetPasswordPage.fillPassword("short");
    await resetPasswordPage.fillConfirmPassword("short");
    await resetPasswordPage.submitForm();

    // Assert
    expect(await resetPasswordPage.hasPasswordError()).toBe(true);
    const errorText = await resetPasswordPage.getPasswordErrorText();
    expect(errorText).toBeTruthy();
  });

  test("should show error messages for mismatched passwords", async ({ resetPasswordPage, page }) => {
    // Arrange
    await page.unroute("**/auth/v1/user");
    await page.route("**/auth/v1/user", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Hasła muszą być identyczne",
        }),
      });
    });

    // Act
    await resetPasswordPage.fillPassword("Password123!");
    await resetPasswordPage.fillConfirmPassword("Password123");
    await resetPasswordPage.submitForm();

    // Assert
    expect(await resetPasswordPage.hasConfirmPasswordError()).toBe(true);
    const errorText = await resetPasswordPage.getConfirmPasswordErrorText();
    expect(errorText).toBeTruthy();
  });

  test("should handle server errors gracefully", async ({ resetPasswordPage, page }) => {
    // Arrange
    await page.unroute("**/auth/v1/user");
    await page.route("**/auth/v1/user", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "New password should be different" }),
      });
    });

    // Act
    await resetPasswordPage.fillPassword("Password123!");
    await resetPasswordPage.fillConfirmPassword("Password123!");
    await resetPasswordPage.submitForm();

    // Assert
    const isDisplayed = await resetPasswordPage.container.isVisible().catch(() => false);
    expect(isDisplayed).toBe(true);
  });
});
