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

interface LintIssue {
  file: string;
  line: number;
  column: number;
  found: string;
  suggested: string;
  message: string;
}

interface FileLintResult {
  errors: LintIssue[];
  warnings: LintIssue[];
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

interface CanonicalPattern {
  pattern: RegExp;
  suggestion: (match: RegExpMatchArray) => string | null;
  message: string;
}

const canonicalPatterns: CanonicalPattern[] = [
  {
    pattern: /min-w-\[(\d+(?:\.\d+)?)rem\]/g,
    suggestion: (match) => {
      const remValue = parseFloat(match[1]);
      if (!Number.isFinite(remValue)) {
        return null;
      }

      const scaleValue = remValue / 0.25; // Tailwind spacing scale uses 0.25rem steps
      if (!Number.isInteger(scaleValue)) {
        return null;
      }

      return `min-w-${scaleValue}`;
    },
    message: "The class can be replaced with a canonical Tailwind spacing utility (suggestCanonicalClasses)",
  },
  {
    pattern: /\[\[([^\]]+)\]_&\]:([^\s"'`]+)/g,
    suggestion: (match) => {
      const selector = match[1]?.trim() ?? "";
      const utility = match[2] ?? "";
      if (!selector || !utility) {
        return null;
      }

      const attrMatch = selector.match(/^((?:data|aria))-(.+?)=(.+)$/);
      let variant: string;
      if (attrMatch) {
        const [, prefix, attribute, rawValue] = attrMatch;
        const normalizedValue = rawValue.replace(/^['"]|['"]$/g, "");
        variant = `in-${prefix}-[${attribute}=${normalizedValue}]`;
      } else {
        variant = `in-[${selector}]`;
      }

      return `${variant}:${utility}`;
    },
    message:
      "Selector variants should use Tailwind's in-* syntax instead of scoped selectors (suggestCanonicalClasses)",
  },
  {
    pattern: /\[&_([^]+?)\]\]:([^\s"'`]+)/g,
    suggestion: (match) => {
      const selector = match[1]?.trim() ?? "";
      const utility = match[2] ?? "";
      if (!selector || !utility) {
        return null;
      }

      const normalizedSelector = selector.startsWith("[[") ? selector : `[[${selector}]]`;
      return `**:${normalizedSelector}:${utility}`;
    },
    message: "Nested selector variants should use the ** prefix with canonical selectors (suggestCanonicalClasses)",
  },
  {
    pattern: /(?<!in-)data-\[([^\]]+)\]:([^\s"'`]+)/g,
    suggestion: (match) => {
      const attribute = match[1]?.trim();
      const utility = match[2] ?? "";
      if (!attribute || !utility) {
        return null;
      }

      return `data-${attribute}:${utility}`;
    },
    message: "Data attribute variants should use the data-attr shorthand (suggestCanonicalClasses)",
  },
  {
    pattern: /([a-z-]+)-\[var\((--[^)]+)\)\]/g,
    suggestion: (match) => {
      const utility = match[1];
      const variable = match[2];
      if (!utility || !variable) {
        return null;
      }

      return `${utility}-(${variable})`;
    },
    message: "Prefer canonical var() utilities like h-(--token) instead of h-[var(--token)] (suggestCanonicalClasses)",
  },
  {
    pattern: /rounded-\[(\d+(?:\.\d+)?)px\]/g,
    suggestion: (match) => {
      const pxValue = Number(match[1]);
      const borderRadiusMap: Record<number, string> = {
        4: "rounded-lg",
      };

      return borderRadiusMap[pxValue] ?? match[0];
    },
    message: "Replace arbitrary rounded-* utilities with size tokens (suggestCanonicalClasses)",
  },
];

// File extensions to check
const extensions = [".tsx", ".astro", ".css", ".ts", ".jsx", ".js"];

// Directories to scan
const scanDirs = ["src"];

// Directories to ignore
const ignoreDirs = ["node_modules", "dist", ".astro", "build"];

let hasErrors = false;
const errors: LintIssue[] = [];
const warnings: LintIssue[] = [];

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
function checkFile(filePath: string): FileLintResult {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const relativePath = relative(projectRoot, filePath);
    const fileErrors: LintIssue[] = [];
    const fileWarnings: LintIssue[] = [];

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

      canonicalPatterns.forEach(({ pattern, suggestion, message }) => {
        pattern.lastIndex = 0;
        const matches = line.matchAll(pattern);

        for (const match of matches) {
          const suggested = suggestion(match);
          if (!suggested || suggested === match[0]) {
            continue;
          }

          fileWarnings.push({
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

    return { errors: fileErrors, warnings: fileWarnings };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(`Error reading file ${filePath}:`, errorMessage);
    return { errors: [], warnings: [] };
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
    const { errors: fileErrors, warnings: fileWarnings } = checkFile(file);
    if (fileErrors.length > 0) {
      errors.push(...fileErrors);
      hasErrors = true;
    }
    if (fileWarnings.length > 0) {
      warnings.push(...fileWarnings);
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
  }

  if (warnings.length > 0) {
    // eslint-disable-next-line no-console
    console.warn("\n⚠️  Tailwind CSS suggestions:\n");

    warnings.forEach(({ file, line, column, found, suggested, message }) => {
      // eslint-disable-next-line no-console
      console.warn(`  ${file}:${line}:${column}`);
      // eslint-disable-next-line no-console
      console.warn(`    Found: ${found}`);
      // eslint-disable-next-line no-console
      console.warn(`    Suggested: ${suggested}`);
      // eslint-disable-next-line no-console
      console.warn(`    Reason: ${message}\n`);
    });

    // eslint-disable-next-line no-console
    console.warn(`⚠️  Total warnings: ${warnings.length}`);
  }

  if (hasErrors) {
    process.exit(1);
  }

  if (warnings.length > 0) {
    // eslint-disable-next-line no-console
    console.log("\n⚠️  Completed with warnings (no blocking issues).");
  } else {
    // eslint-disable-next-line no-console
    console.log("✅ No deprecated Tailwind CSS classes found!");
  }

  process.exit(0);
}

main();
