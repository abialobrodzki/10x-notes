import { unauthedTest as test, expect } from "./fixtures/index";
import { mockAiGenerate, mockAiGenerateSequence, type AiGenerateMockOptions } from "./helpers/api.mock";
import type { Page } from "playwright/test";

const SAMPLE_CONTENT = "Spotkanie zespołu o planie sprintu oraz zadaniach zaległych.";
const SUCCESS_RESPONSE = {
  summary_text: "Zespół omówił plan sprintu i ustalił kroki dla zaległych zadań.",
  goal_status: "achieved",
  suggested_tag: "Plan sprintu",
  generation_time_ms: 980,
  tokens_used: 640,
} as const;

async function withAiMock(page: Page, config: AiGenerateMockOptions, run: () => Promise<void>) {
  const dispose = await mockAiGenerate(page, config);
  try {
    await run();
  } finally {
    await dispose();
  }
}

async function withAiSequence(page: Page, configs: AiGenerateMockOptions[], run: () => Promise<void>) {
  const dispose = await mockAiGenerateSequence(page, configs);
  try {
    await run();
  } finally {
    await dispose();
  }
}

test.use({ storageState: undefined });

test.describe("Landing Page", () => {
  test.beforeEach(async ({ landingPage }) => {
    await landingPage.goto();
  });

  test("should render hero content and controls", async ({ landingPage }) => {
    // Arrange
    // (Page already loaded in beforeEach)

    // Act
    // (No user action needed - testing initial state)

    // Assert
    await expect(landingPage.container).toBeVisible();
    await expect(landingPage.contentArea).toBeVisible();
    await expect(landingPage.charCounter).toHaveText("0/5000");
    await expect(landingPage.generateButton).toBeDisabled();
    await expect(landingPage.page).toHaveScreenshot("landing-page-layout.png");
  });

  test("should keep generate disabled when input is empty", async ({ landingPage }) => {
    // Arrange
    // (Page already loaded in beforeEach with empty input)

    // Act
    // (No user action needed - testing initial state)

    // Assert
    await expect(landingPage.generateButton).toBeDisabled();
    await expect(landingPage.errorMessage).not.toBeVisible();
  });

  test.describe("AI Summary Generation", () => {
    test("should enable generate button when text is entered", async ({ landingPage }) => {
      // Arrange
      // (Page already loaded in beforeEach)

      // Act
      await landingPage.fillInput("Sample text for testing");

      // Assert
      await expect(landingPage.generateButton).toBeEnabled();
    });

    test("should display character count correctly", async ({ landingPage }) => {
      // Arrange
      const testText = "Hello World";

      // Act
      await landingPage.fillInput(testText);

      // Assert
      await expect(landingPage.charCounter).toHaveText(`${testText.length}/5000`);
    });

    test("should enforce character limit", async ({ landingPage }) => {
      // Arrange
      const longText = "a".repeat(5001);

      // Act
      await landingPage.textarea.fill(longText);

      // Assert
      const actualText = await landingPage.textarea.inputValue();
      expect(actualText.length).toBe(5000);

      const counterText = await landingPage.charCounter.textContent();
      expect(counterText).toMatch(/\d+\/5000/);
    });

    test("should show deterministic summary content on successful generation", async ({ landingPage, page }) => {
      await withAiMock(
        page,
        {
          status: 200,
          body: SUCCESS_RESPONSE,
        },
        async () => {
          // Arrange
          // (AI mock configured above)

          // Act
          await landingPage.fillInput(SAMPLE_CONTENT);
          await landingPage.generateButton.click();

          // Assert
          await expect(page.getByTestId("summary-card")).toBeVisible();
          await expect(page.getByTestId("summary-card-summary-text")).toHaveText(SUCCESS_RESPONSE.summary_text);
          const generationTime = await page.getByTestId("summary-card-generation-time").textContent();
          expect(generationTime).toContain("980");
          await expect(page.getByTestId("summary-card-tokens-used")).toContainText("640");
        }
      );
    });

    const errorScenarios = [
      {
        title: "should display UI for 429 rate limit error",
        config: { status: 429, headers: { "Retry-After": "60" }, body: { message: "Rate limit exceeded" } },
        expected: /limit|spróbuj/i,
      },
      {
        title: "should display UI for validation error (400)",
        config: { status: 400, body: { message: "Invalid content format" } },
        expected: /invalid|nieprawidłowa/i,
      },
      {
        title: "should display UI for general AI service error (500)",
        config: { status: 500, body: { message: "Internal server error" } },
        expected: /błąd|error/i,
      },
      {
        title: "should display UI for 503 service unavailable error",
        config: { status: 503, body: { message: "Service temporarily unavailable" } },
        expected: /niedostępny|unavailable/i,
      },
    ] as const;

    for (const scenario of errorScenarios) {
      test(scenario.title, async ({ landingPage, page }) => {
        await withAiMock(page, scenario.config, async () => {
          // Arrange
          // (AI mock configured with error response above)

          // Act
          await landingPage.fillInput(SAMPLE_CONTENT);
          await expect(landingPage.generateButton).toBeEnabled();
          await landingPage.generateButton.click();

          // Assert
          await expect(landingPage.errorMessage).toBeVisible();
          await expect(landingPage.errorMessage).toContainText(scenario.expected);
        });
      });
    }

    test("should show loading state during generation", async ({ landingPage, page }) => {
      await withAiMock(
        page,
        {
          status: 200,
          delayMs: 1000,
          body: SUCCESS_RESPONSE,
        },
        async () => {
          // Arrange
          // (AI mock configured with delay above)

          // Act
          await landingPage.fillInput(SAMPLE_CONTENT);
          await landingPage.generateButton.click();

          // Assert
          await expect(landingPage.generateButton).toHaveText(/Generowanie/i);
        }
      );
    });

    test("should clear error when retrying after failure", async ({ landingPage, page }) => {
      await withAiSequence(
        page,
        [
          { status: 500, body: { message: "Server error" } },
          { status: 200, body: SUCCESS_RESPONSE },
        ],
        async () => {
          // Arrange
          // (AI mock sequence configured: first error, then success)

          // Act
          await landingPage.fillInput(SAMPLE_CONTENT);
          await landingPage.generateButton.click();
          await expect(landingPage.errorMessage).toBeVisible();

          await landingPage.generateButton.click();

          // Assert
          await expect(landingPage.errorMessage).not.toBeVisible();
          await expect(page.getByTestId("summary-card")).toBeVisible();
        }
      );
    });

    test("should persist pending note and redirect to login from save prompt", async ({ landingPage, page }) => {
      // Arrange
      const pendingResponse = { ...SUCCESS_RESPONSE, summary_text: "Podsumowanie zapisane do sesji" };

      await withAiMock(page, { status: 200, body: pendingResponse }, async () => {
        // Act
        await landingPage.fillInput(SAMPLE_CONTENT);
        await landingPage.generateButton.click();
        await expect(page.getByTestId("save-prompt-banner")).toBeVisible();

        await page.getByTestId("save-prompt-banner-login-button").click();
        await page.waitForURL(/\/login$/, { timeout: 10000 });

        // Assert
        const pendingNote = await page.evaluate(() => sessionStorage.getItem("pendingNote"));
        expect(pendingNote).toBeTruthy();
      });
    });

    test("should generate summary using real AI service", async ({ landingPage, page }) => {
      // Arrange
      test.slow();
      const testContent =
        "Przygotuj krótkie podsumowanie spotkania zespołu produktowego. Omawiano postępy sprintu, zaległe zadania oraz ryzyka.";

      // Act
      await landingPage.fillInput(testContent);
      await landingPage.generateButton.click();

      // Assert
      await expect(page.getByTestId("summary-card")).toBeVisible({ timeout: 60000 });
      const summaryText = await page.getByTestId("summary-card-summary-text").textContent();
      expect(summaryText?.trim().length ?? 0).toBeGreaterThan(0);
    });
  });

  // High-character limit tests were removed due to instability across environments.
});
