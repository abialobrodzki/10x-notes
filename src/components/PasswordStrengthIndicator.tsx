import { usePasswordStrength } from "@/components/hooks/usePasswordStrength";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  /** Password to evaluate */
  password: string;
  /** Optional className for container */
  className?: string;
}

/**
 * PasswordStrengthIndicator component
 * Displays a visual indicator of password strength with:
 * - Color-coded progress bar
 * - Descriptive label
 * - Smooth transitions
 * Styles defined in global.css
 */
export default function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const strength = usePasswordStrength(password);

  // Don't show indicator if password is empty
  if (!password) {
    return null;
  }

  return (
    <div className={cn("w-full space-y-2", className)} role="status" aria-live="polite">
      {/* Progress bar */}
      <div className="password-strength-bar">
        <div
          className={cn("password-strength-fill", strength.colorClass)}
          style={{ width: `${strength.percentage}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Label */}
      <p className="text-xs text-glass-text-muted">
        Siła hasła: <span className="font-medium text-glass-text">{strength.label}</span>
      </p>
    </div>
  );
}
