import { unauthedTest as test, expect } from "./fixtures/index";

test.describe("Reset Password Page", () => {
  test.beforeEach(async ({ resetPasswordPage, page }) => {
    // Clear any previous route handlers to avoid mock interference
    await page.unroute("**/auth/v1/user");
    await resetPasswordPage.goto();
  });

  test("should display the reset password page", async ({ resetPasswordPage }) => {
    await expect(resetPasswordPage.container).toBeVisible();
    await expect(resetPasswordPage.goToLoginButton).toBeVisible();
  });

  test("should show error messages for weak password", async ({ resetPasswordPage, page }) => {
    // Mock API response to return password validation error instead of token error
    await page.route("**/auth/v1/user", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Hasło musi mieć co najmniej 8 znaków",
        }),
      });
    });

    await resetPasswordPage.fillPassword("short");
    await resetPasswordPage.fillConfirmPassword("short");
    await resetPasswordPage.submitForm();
    expect(await resetPasswordPage.hasPasswordError()).toBe(true);
    const errorText = await resetPasswordPage.getPasswordErrorText();
    expect(errorText).toBeTruthy();
  });

  test("should show error messages for mismatched passwords", async ({ resetPasswordPage, page }) => {
    // Clear previous route and set new one
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

    await resetPasswordPage.fillPassword("Password123!");
    await resetPasswordPage.fillConfirmPassword("Password123");
    await resetPasswordPage.submitForm();
    expect(await resetPasswordPage.hasConfirmPasswordError()).toBe(true);
    const errorText = await resetPasswordPage.getConfirmPasswordErrorText();
    expect(errorText).toBeTruthy();
  });

  test("should handle server errors gracefully", async ({ resetPasswordPage, page }) => {
    // Clear previous route and set new one
    await page.unroute("**/auth/v1/user");
    await page.route("**/auth/v1/user", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "New password should be different" }),
      });
    });

    await resetPasswordPage.fillPassword("Password123!");
    await resetPasswordPage.fillConfirmPassword("Password123!");
    await resetPasswordPage.submitForm();
    // Test that form remains on reset password page and doesn't break
    const isDisplayed = await resetPasswordPage.container.isVisible().catch(() => false);
    expect(isDisplayed).toBe(true);
  });
});
