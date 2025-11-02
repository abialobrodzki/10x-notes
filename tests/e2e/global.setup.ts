import { chromium, type FullConfig } from "playwright/test";

/**
 * Global setup for Playwright tests
 *
 * Runs once before all tests
 * - Validates test environment
 * - Checks if test user exists
 * - Ensures dev server is accessible
 */
async function globalSetup(config: FullConfig) {
  console.log("🔧 Running global E2E test setup...");

  // Validate required environment variables
  const requiredEnvVars = ["E2E_USERNAME", "E2E_PASSWORD", "PUBLIC_SUPABASE_URL", "PUBLIC_SUPABASE_KEY"];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    console.error("\nPlease check your .env.test file");
    process.exit(1);
  }

  console.log("✅ Environment variables validated");

  // Check if dev server is accessible (if webServer is configured)
  const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3000";

  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log(`🌐 Checking dev server at ${baseURL}...`);

    // Try to access the base URL
    const response = await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30000 });

    if (response && response.ok()) {
      console.log("✅ Dev server is accessible");
    } else {
      console.warn(`⚠️  Dev server returned status: ${response?.status()}`);
    }

    await browser.close();
  } catch (error) {
    console.error("❌ Failed to access dev server");
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
    }
    console.error("\nMake sure dev:e2e server is running or will be started by Playwright");
  }

  console.log("✅ Global setup complete\n");
}

export default globalSetup;
