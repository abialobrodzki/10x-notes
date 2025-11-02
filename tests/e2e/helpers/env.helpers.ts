import path from "path";
import dotenv from "dotenv";

// Ensure .env.test values are loaded when the helper is imported (idempotent)
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

const ENV_FILE_HINT = ".env.test";

export function requireEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Add it to ${ENV_FILE_HINT} or export it before running Playwright tests.`
    );
  }
  return value;
}

export function requireEnvVars(names: readonly string[]) {
  names.forEach((name) => requireEnvVar(name));
}

export function requireE2EUserCredentials() {
  return {
    email: requireEnvVar("E2E_USERNAME"),
    password: requireEnvVar("E2E_PASSWORD"),
  };
}

export function requireE2EUsername() {
  return requireEnvVar("E2E_USERNAME");
}

export function requireSupabasePublicConfig() {
  return {
    url: requireEnvVar("PUBLIC_SUPABASE_URL"),
    key: requireEnvVar("PUBLIC_SUPABASE_KEY"),
  };
}
