#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * GitHub Actions Workflow Validator
 *
 * Validates GitHub Actions workflow files using actionlint:
 * - Checks YAML syntax
 * - Validates workflow structure
 * - Verifies action versions and availability
 * - Checks expressions and job dependencies
 * - Detects common mistakes and best practices
 *
 * Exit codes:
 * - 0: No issues found
 * - 1: Validation errors found or actionlint not available
 */

import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

// Configuration
const WORKFLOW_DIR = ".github/workflows";
const ACTIONLINT_VERSION = "1.7.4";

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  bold: "\x1b[1m",
};

/**
 * Check if actionlint is installed
 */
function isActionlintInstalled(): boolean {
  try {
    execSync("which actionlint", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get actionlint version
 */
function getActionlintVersion(): string | null {
  try {
    const output = execSync("actionlint --version", { encoding: "utf-8" });
    const match = output.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Print installation instructions for actionlint
 */
function printInstallInstructions(): void {
  console.log(`${colors.yellow}${colors.bold}⚠️  actionlint is not installed${colors.reset}\n`);
  console.log("actionlint is required to validate GitHub Actions workflows.\n");
  console.log(`${colors.bold}Installation options:${colors.reset}\n`);

  // macOS
  console.log(`${colors.blue}macOS (Homebrew):${colors.reset}`);
  console.log("  brew install actionlint\n");

  // Linux
  console.log(`${colors.blue}Linux:${colors.reset}`);
  console.log(
    `  bash <(curl https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash) ${ACTIONLINT_VERSION}\n`
  );

  // Windows
  console.log(`${colors.blue}Windows (Chocolatey):${colors.reset}`);
  console.log("  choco install actionlint\n");

  // Manual
  console.log(`${colors.blue}Or download manually:${colors.reset}`);
  console.log("  https://github.com/rhysd/actionlint/releases\n");

  console.log(`${colors.yellow}After installation, run this script again.${colors.reset}\n`);
}

/**
 * Find all workflow files
 */
function findWorkflowFiles(): string[] {
  if (!existsSync(WORKFLOW_DIR)) {
    return [];
  }

  try {
    const files = readdirSync(WORKFLOW_DIR);
    return files
      .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
      .map((file) => join(WORKFLOW_DIR, file));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${colors.red}Error reading workflow directory:${colors.reset}`, errorMessage);
    return [];
  }
}

/**
 * Validate workflow files using actionlint
 */
function validateWorkflows(files: string[]): boolean {
  if (files.length === 0) {
    console.log(`${colors.yellow}No workflow files found in ${WORKFLOW_DIR}${colors.reset}`);
    return true;
  }

  console.log(`${colors.bold}Validating ${files.length} workflow file(s)...${colors.reset}\n`);

  try {
    // Run actionlint with color output and verbose mode
    const command = `actionlint -color ${files.join(" ")}`;
    execSync(command, {
      stdio: "inherit",
      encoding: "utf-8",
    });

    console.log(`\n${colors.green}${colors.bold}✅ All workflow files are valid!${colors.reset}\n`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`\n${colors.red}${colors.bold}❌ Workflow validation failed${colors.reset}\n`);
    console.error(`${colors.red}Error:${colors.reset} ${errorMessage}\n`);
    console.log(`${colors.yellow}Fix the issues above and run this script again.${colors.reset}\n`);
    return false;
  }
}

/**
 * Main execution
 */
function main(): void {
  console.log(`${colors.bold}🔍 GitHub Actions Workflow Validator${colors.reset}\n`);

  // Check if actionlint is installed
  if (!isActionlintInstalled()) {
    printInstallInstructions();
    process.exit(1);
  }

  // Show actionlint version
  const version = getActionlintVersion();
  if (version) {
    console.log(`${colors.blue}Using actionlint v${version}${colors.reset}\n`);
  }

  // Find workflow files
  const workflowFiles = findWorkflowFiles();

  if (workflowFiles.length === 0) {
    console.log(`${colors.yellow}No workflow files found in ${WORKFLOW_DIR}${colors.reset}`);
    process.exit(0);
  }

  // Validate workflows
  const isValid = validateWorkflows(workflowFiles);

  process.exit(isValid ? 0 : 1);
}

main();
