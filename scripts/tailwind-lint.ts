#!/usr/bin/env tsx

/**
 * Tailwind CSS Linter
 *
 * Validates Tailwind CSS usage across the codebase:
 * - Checks for deprecated class names (bg-gradient-to-* → bg-linear-to-*)
 * - Can be extended with additional rules
 *
 * Exit codes:
 * - 0: No issues found
 * - 1: Deprecated classes found
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Type definitions
interface DeprecatedPattern {
  pattern: RegExp;
  replacement: (match: string) => string;
  message: string;
}

interface LintError {
  file: string;
  line: number;
  column: number;
  found: string;
  suggested: string;
  message: string;
}

// Define deprecated class patterns and their replacements
const deprecatedPatterns: DeprecatedPattern[] = [
  {
    pattern: /\bbg-gradient-to-(r|l|t|b|tr|tl|br|bl)\b/g,
    replacement: (match: string) => match.replace("bg-gradient-to-", "bg-linear-to-"),
    message: "Use bg-linear-to-* instead of bg-gradient-to-* (Tailwind CSS v4)",
  },
  {
    pattern: /([\w-]+:)!([a-z][\w\-/[\].#]*)/g,
    replacement: (match: string) => {
      const parts = match.match(/([\w-]+:)!(.+)/);
      return parts ? `${parts[1]}${parts[2]}!` : match;
    },
    message: "Important modifier (!) should be placed at the end (Tailwind CSS v4)",
  },
];

// File extensions to check
const extensions = [".tsx", ".astro", ".css", ".ts", ".jsx", ".js"];

// Directories to scan
const scanDirs = ["src"];

// Directories to ignore
const ignoreDirs = ["node_modules", "dist", ".astro", "build"];

let hasErrors = false;
const errors: LintError[] = [];

/**
 * Recursively scan directory for files
 */
function scanDirectory(dir: string): string[] {
  const files: string[] = [];

  try {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip ignored directories
        if (!ignoreDirs.includes(item)) {
          files.push(...scanDirectory(fullPath));
        }
      } else if (stat.isFile()) {
        // Check if file has valid extension
        if (extensions.some((ext) => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(`Error scanning directory ${dir}:`, errorMessage);
  }

  return files;
}

/**
 * Check file for deprecated patterns
 */
function checkFile(filePath: string): LintError[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const relativePath = relative(projectRoot, filePath);
    const fileErrors: LintError[] = [];

    lines.forEach((line, lineIndex) => {
      deprecatedPatterns.forEach(({ pattern, replacement, message }) => {
        // Reset regex lastIndex for global regex
        pattern.lastIndex = 0;
        const matches = line.matchAll(pattern);

        for (const match of matches) {
          const suggested = replacement(match[0]);
          fileErrors.push({
            file: relativePath,
            line: lineIndex + 1,
            column: (match.index ?? 0) + 1,
            found: match[0],
            suggested,
            message,
          });
        }
      });
    });

    return fileErrors;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(`Error reading file ${filePath}:`, errorMessage);
    return [];
  }
}

/**
 * Main execution
 */
function main(): void {
  // eslint-disable-next-line no-console
  console.log("🔍 Tailwind CSS Linter\n");

  // Collect all files to check
  const filesToCheck: string[] = [];
  for (const dir of scanDirs) {
    const fullPath = join(projectRoot, dir);
    filesToCheck.push(...scanDirectory(fullPath));
  }

  // eslint-disable-next-line no-console
  console.log(`Checking ${filesToCheck.length} files...\n`);

  // Check each file
  for (const file of filesToCheck) {
    const fileErrors = checkFile(file);
    if (fileErrors.length > 0) {
      errors.push(...fileErrors);
      hasErrors = true;
    }
  }

  // Report results
  if (hasErrors) {
    // eslint-disable-next-line no-console
    console.error("❌ Found deprecated Tailwind CSS classes:\n");

    errors.forEach(({ file, line, column, found, suggested, message }) => {
      // eslint-disable-next-line no-console
      console.error(`  ${file}:${line}:${column}`);
      // eslint-disable-next-line no-console
      console.error(`    Found: ${found}`);
      // eslint-disable-next-line no-console
      console.error(`    Suggested: ${suggested}`);
      // eslint-disable-next-line no-console
      console.error(`    Reason: ${message}\n`);
    });

    // eslint-disable-next-line no-console
    console.error(`\n❌ Total issues: ${errors.length}`);
    process.exit(1);
  } else {
    // eslint-disable-next-line no-console
    console.log("✅ No deprecated Tailwind CSS classes found!");
    process.exit(0);
  }
}

main();
