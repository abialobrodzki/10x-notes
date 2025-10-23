import { useMemo } from "react";

export interface PasswordStrength {
  /** Strength score from 0 (weak) to 2 (strong) */
  score: 0 | 1 | 2;
  /** Human-readable label */
  label: string;
  /** CSS class name for color styling */
  colorClass: string;
  /** Percentage for progress bar (0-100) */
  percentage: number;
}

/**
 * Calculates password strength based on multiple criteria
 *
 * Scoring criteria:
 * - Length (max 40 points): 8-11 chars = 10pts, 12-15 = 20pts, 16-19 = 30pts, 20+ = 40pts
 * - Lowercase letters (10 points)
 * - Uppercase letters (20 points)
 * - Numbers (20 points)
 * - Special characters (10 points)
 *
 * Total: 100 points
 *
 * Score mapping:
 * - 0-19: Very weak (0)
 * - 20-39: Weak (1)
 * - 40-59: Medium (2)
 * - 60-79: Strong (3)
 * - 80-100: Very strong (4)
 */
export function usePasswordStrength(password: string): PasswordStrength {
  return useMemo(() => {
    if (!password) {
      return {
        score: 0,
        label: "",
        colorClass: "bg-gray-300",
        percentage: 0,
      };
    }

    let points = 0;

    // Length scoring (max 40 points)
    const length = password.length;
    if (length >= 8 && length <= 11) {
      points += 10;
    } else if (length >= 12 && length <= 15) {
      points += 20;
    } else if (length >= 16 && length <= 19) {
      points += 30;
    } else if (length >= 20) {
      points += 40;
    }

    // Lowercase letters (10 points)
    if (/[a-z]/.test(password)) {
      points += 10;
    }

    // Uppercase letters (20 points)
    if (/[A-Z]/.test(password)) {
      points += 20;
    }

    // Numbers (20 points)
    if (/[0-9]/.test(password)) {
      points += 20;
    }

    // Special characters (10 points)
    if (/[^a-zA-Z0-9]/.test(password)) {
      points += 10;
    }

    // Calculate score (0-2) - simplified to 3 levels with discrete widths
    let score: 0 | 1 | 2;
    let label: string;
    let colorClass: string;
    let percentage: number;

    if (points < 40) {
      score = 0;
      label = "Słabe";
      colorClass = "password-strength-weak";
      percentage = 33; // First third
    } else if (points < 70) {
      score = 1;
      label = "Średnie";
      colorClass = "password-strength-medium";
      percentage = 66; // Two thirds
    } else {
      score = 2;
      label = "Silne";
      colorClass = "password-strength-strong";
      percentage = 100; // Full width
    }

    return {
      score,
      label,
      colorClass,
      percentage,
    };
  }, [password]);
}
