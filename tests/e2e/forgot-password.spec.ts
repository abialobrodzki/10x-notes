import { test, expect } from "./fixtures/base";

test.use({ storageState: undefined });

test.describe("Forgot Password Page", () => {
  test.beforeEach(async ({ forgotPasswordPage }) => {
    await forgotPasswordPage.goto();
  });

  test("should display the forgot password page", async ({ forgotPasswordPage }) => {
    await expect(forgotPasswordPage.container).toBeVisible();
    await expect(forgotPasswordPage.returnToLoginLink).toBeVisible();
  });

  test("should show an error for invalid email format", async ({ forgotPasswordPage }) => {
    await forgotPasswordPage.fillEmail("invalid-email");
    await forgotPasswordPage.submitForm();
    await expect(forgotPasswordPage.errorMessage).toBeVisible();
    await expect(forgotPasswordPage.getErrorMessageText()).resolves.toContain("Podaj poprawny adres email");
  });

  test("should show a success message after submitting a valid email", async ({ forgotPasswordPage, page }) => {
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ message: "Email sent" }) });
    });

    await forgotPasswordPage.fillEmail("test@example.com");
    await forgotPasswordPage.submitForm();
    await expect(forgotPasswordPage.successMessage).toBeVisible();
    await expect(forgotPasswordPage.returnToLoginSuccessLink).toBeVisible();
  });
});
