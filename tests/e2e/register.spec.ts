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
    expect(await registerPage.hasEmailError()).toBe(true);
    const emailError = await registerPage.getEmailErrorText();
    expect(emailError).toContain("Podaj poprawny adres email");
  });

  test("should show error messages for weak password", async ({ registerPage }) => {
    await registerPage.fillEmail("test@example.com");
    await registerPage.fillPassword("short");
    await registerPage.fillConfirmPassword("short");

    await expect(registerPage.emailInput).toHaveValue("test@example.com");
    await expect(registerPage.passwordInput).toHaveValue("short");
    await expect(registerPage.confirmPasswordInput).toHaveValue("short");

    await registerPage.submitForm();
    expect(await registerPage.hasPasswordError()).toBe(true);
    const passwordError = await registerPage.getPasswordErrorText();
    expect(passwordError).toContain("Hasło musi mieć co najmniej 8 znaków");
  });

  test("should show error messages for mismatched passwords", async ({ registerPage }) => {
    await registerPage.fillEmail("test@example.com");
    await registerPage.fillPassword("Password123!");
    await registerPage.fillConfirmPassword("Password123");
    await registerPage.submitForm();
    expect(await registerPage.hasConfirmPasswordError()).toBe(true);
    const confirmError = await registerPage.getConfirmPasswordErrorText();
    expect(confirmError).toContain("Hasła muszą być identyczne");
  });

  test("should submit form successfully with valid credentials", async ({ registerPage, page }) => {
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

    // Form submission should complete without errors
    await registerPage.submitForm();
  });

  test("should navigate to login page when clicking 'Zaloguj się' link", async ({ registerPage, page }) => {
    await registerPage.signInLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
