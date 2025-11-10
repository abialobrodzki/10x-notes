import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { deleteTestUser } from "./helpers/test-user.helpers";
import type { TestUser } from "./types/test-user.types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authDir = path.resolve(__dirname, ".auth");
const usersFile = path.resolve(authDir, "test-users.json");

async function globalTeardown() {
  console.log("--- Running Global Teardown: Cleaning up test users ---");
  try {
    const users: TestUser[] = JSON.parse(await fs.readFile(usersFile, "utf-8"));

    if (users.length > 0) {
      await Promise.all(users.map((user) => deleteTestUser(user)));
      console.log(`Successfully deleted ${users.length} test user(s).`);
    }

    // Clean up the user file
    await fs.rm(usersFile);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.log("No test users file found. Nothing to clean up.");
    } else {
      console.error("Error during global teardown:", error);
      process.exit(1);
    }
  }

  // Clean up storage state files to prevent using stale sessions
  try {
    const files = await fs.readdir(authDir);
    const storageFiles = files.filter((file) => file.startsWith("storage-worker-") && file.endsWith(".json"));

    if (storageFiles.length > 0) {
      await Promise.all(storageFiles.map((file) => fs.rm(path.join(authDir, file))));
      console.log(`Cleaned up ${storageFiles.length} storage state file(s).`);
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.log("No auth directory found. Nothing to clean up.");
    } else {
      console.warn("Warning: Could not clean up storage state files:", error);
    }
  }

  console.log("--- Global Teardown Complete ---");
}

export default globalTeardown;
