import { test, expect } from "./fixtures/base";

test.describe("Register Page", () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  test("should display the register page title", async ({ registerPage }) => {
    await expect(registerPage.container).toBeVisible();
    await expect(registerPage.signInLink).toBeVisible();
  });

  test("should show error messages for invalid email format", async ({ registerPage }) => {
    await registerPage.fillEmail("invalid-email");
    await registerPage.fillPassword("Password123!");
    await registerPage.fillConfirmPassword("Password123!");

    // Verify all fields have values before submitting
    const emailValue = await registerPage.emailInput.inputValue();
    const passwordValue = await registerPage.passwordInput.inputValue();
    const confirmValue = await registerPage.confirmPasswordInput.inputValue();
    expect(emailValue).toBe("invalid-email");
    expect(passwordValue).toBe("Password123!");
    expect(confirmValue).toBe("Password123!");

    await registerPage.submitForm();
    await expect(registerPage.errorMessage).toBeVisible();
    await expect(registerPage.getErrorMessageText()).resolves.toContain("Podaj poprawny adres email");
  });

  test("should show error messages for weak password", async ({ registerPage }) => {
    await registerPage.fillEmail("test@example.com");
    await registerPage.fillPassword("short");
    await registerPage.fillConfirmPassword("short");

    // Verify all fields have values before submitting
    const emailValue = await registerPage.emailInput.inputValue();
    const passwordValue = await registerPage.passwordInput.inputValue();
    const confirmValue = await registerPage.confirmPasswordInput.inputValue();
    expect(emailValue).toBe("test@example.com");
    expect(passwordValue).toBe("short");
    expect(confirmValue).toBe("short");

    await registerPage.submitForm();
    await expect(registerPage.errorMessage).toBeVisible();
    await expect(registerPage.getErrorMessageText()).resolves.toContain("Hasło musi mieć co najmniej 8 znaków");
  });

  test("should show error messages for mismatched passwords", async ({ registerPage }) => {
    await registerPage.fillEmail("test@example.com");
    await registerPage.fillPassword("Password123!");
    await registerPage.fillConfirmPassword("Password123");
    await registerPage.submitForm();
    await expect(registerPage.errorMessage).toBeVisible();
    await expect(registerPage.getErrorMessageText()).resolves.toContain("Hasła muszą być identyczne");
  });

  test("should show confirmation message after successful registration", async ({ registerPage, page }) => {
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

    await registerPage.fillEmail(`user-${Date.now()}@example.com`);
    await registerPage.fillPassword("Password123!");
    await registerPage.fillConfirmPassword("Password123!");
    await registerPage.submitForm();
    await expect(registerPage.errorMessage).toBeVisible();
    await expect(registerPage.getErrorMessageText()).resolves.toContain("Rejestracja udana");
  });

  test("should navigate to login page when clicking 'Zaloguj się' link", async ({ registerPage, page }) => {
    await registerPage.signInLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
