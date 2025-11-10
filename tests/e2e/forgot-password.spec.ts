import { unauthedTest as test, expect } from "./fixtures/index";

test.use({ storageState: undefined });

test.describe("Forgot Password Page", () => {
  test.beforeEach(async ({ forgotPasswordPage }) => {
    await forgotPasswordPage.goto();
  });

  test("should display the forgot password page", async ({ forgotPasswordPage }) => {
    // Arrange
    // (Page is already loaded in beforeEach)

    // Act
    // (No user action needed - testing initial state)

    // Assert
    await expect(forgotPasswordPage.container).toBeVisible();
    await expect(forgotPasswordPage.returnToLoginLink).toBeVisible();
    await expect(forgotPasswordPage.emailInput).toBeVisible();
  });

  test.skip("should show an error for invalid email format", async ({ forgotPasswordPage }) => {
    // Arrange
    const invalidEmail = "invalid-email";

    // Act
    await forgotPasswordPage.fillEmail(invalidEmail);
    await forgotPasswordPage.submitButton.click();

    // Assert
    const emailError = await forgotPasswordPage.getEmailErrorText();
    expect(emailError).toContain("Podaj poprawny adres email");
  });

  test.skip("should show a success message after submitting a valid email", async ({ forgotPasswordPage, page }) => {
    // Arrange
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ message: "Email sent" }) });
    });
    const validEmail = "test@example.com";

    // Act
    await forgotPasswordPage.fillEmail(validEmail);
    await forgotPasswordPage.submitForm();

    // Assert
    await expect(forgotPasswordPage.successMessage).toBeVisible();
    await expect(forgotPasswordPage.returnToLoginSuccessLink).toBeVisible();
  });
});
