import type { Page, Route } from "playwright/test";

const AI_GENERATE_ROUTE = "**/api/ai/generate";

export interface AiGenerateMockOptions {
  status: number;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  delayMs?: number;
}

type RouteHandler = (route: Route) => Promise<void>;

export async function mockAiGenerate(page: Page, options: AiGenerateMockOptions): Promise<() => Promise<void>> {
  const handler: RouteHandler = async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    if (options.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }

    await route.fulfill({
      status: options.status,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      body: JSON.stringify(options.body ?? {}),
    });
  };

  await page.route(AI_GENERATE_ROUTE, handler);

  return async () => {
    await page.unroute(AI_GENERATE_ROUTE, handler);
  };
}

export async function mockAiGenerateSequence(
  page: Page,
  responses: AiGenerateMockOptions[]
): Promise<() => Promise<void>> {
  let callIndex = 0;

  const handler: RouteHandler = async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    const config = responses[Math.min(callIndex, responses.length - 1)];
    callIndex += 1;

    if (config.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, config.delayMs));
    }

    await route.fulfill({
      status: config.status,
      headers: {
        "Content-Type": "application/json",
        ...(config.headers ?? {}),
      },
      body: JSON.stringify(config.body ?? {}),
    });
  };

  await page.route(AI_GENERATE_ROUTE, handler);

  return async () => {
    await page.unroute(AI_GENERATE_ROUTE, handler);
  };
}
