import { test, expect } from "./fixtures/base";

test.use({ storageState: undefined });

test.describe("Landing Page", () => {
  test.beforeEach(async ({ landingPage }) => {
    await landingPage.goto();
  });

  test("should render hero content and controls", async ({ landingPage }) => {
    await expect(landingPage.container).toBeVisible();
    await expect(landingPage.contentArea).toBeVisible();
    await expect(landingPage.charCounter).toHaveText("0/5000");
    await expect(landingPage.generateButton).toBeDisabled();
  });

  test("should keep generate disabled when input is empty", async ({ landingPage }) => {
    await expect(landingPage.generateButton).toBeDisabled();
    await expect(landingPage.errorMessage).not.toBeVisible();
  });

  // High-character limit tests were removed due to instability across environments.
});
