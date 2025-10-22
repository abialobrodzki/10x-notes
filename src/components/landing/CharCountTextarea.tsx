import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface CharCountTextareaProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

const MAX_LENGTH = 5000;
const WARNING_THRESHOLD = 4500;

/**
 * CharCountTextarea - Textarea with character counter and validation
 * Features:
 * - Live counter (X/5000)
 * - Visual warning >4500 chars
 * - Hard limit at 5000 chars
 * - ARIA attributes for accessibility
 */
export function CharCountTextarea({ value, onChange, disabled = false, error }: CharCountTextareaProps) {
  const textareaId = useId();
  const counterId = useId();
  const errorId = useId();

  const charCount = value.length;
  const isNearLimit = charCount > WARNING_THRESHOLD;
  const isAtLimit = charCount >= MAX_LENGTH;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // Enforce hard limit
    if (newValue.length <= MAX_LENGTH) {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={textareaId} className="text-blue-100">
          Treść notatki ze spotkania
        </Label>
        <span
          id={counterId}
          className={cn(
            "text-sm font-medium transition-colors",
            isAtLimit && "text-red-400",
            isNearLimit && !isAtLimit && "text-yellow-400",
            !isNearLimit && "text-blue-300"
          )}
          aria-live="polite"
        >
          {charCount}/{MAX_LENGTH}
        </span>
      </div>

      <Textarea
        id={textareaId}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        maxLength={MAX_LENGTH}
        placeholder="Wklej tutaj notatki ze spotkania (do 5000 znaków)..."
        className={cn(
          "min-h-[200px] resize-y bg-white/10 text-white placeholder:text-blue-200/50",
          "border-white/20 focus-visible:border-blue-400 focus-visible:ring-blue-400/50",
          isNearLimit && "border-yellow-400/50 focus-visible:border-yellow-400",
          isAtLimit && "border-red-400/50 focus-visible:border-red-400",
          error && "border-red-500/50 focus-visible:border-red-500"
        )}
        aria-describedby={cn(counterId, error && errorId)}
        aria-invalid={!!error || isAtLimit}
      />

      {/* Warning for near limit */}
      {isNearLimit && !isAtLimit && !error && (
        <p className="text-sm text-yellow-400" role="status" aria-live="polite">
          Zbliżasz się do limitu znaków
        </p>
      )}

      {/* Error message */}
      {error && (
        <p id={errorId} className="text-sm font-medium text-red-400" role="alert" aria-live="assertive">
          {error}
        </p>
      )}

      {/* Limit reached message */}
      {isAtLimit && !error && (
        <p className="text-sm text-red-400" role="alert" aria-live="assertive">
          Osiągnięto maksymalną długość tekstu
        </p>
      )}
    </div>
  );
}
