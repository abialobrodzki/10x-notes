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
    <div className="space-y-2" data-testid="char-count-textarea">
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
          data-testid="char-count-textarea-counter"
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
          "min-h-[200px] resize-y bg-input-bg text-input-text placeholder:text-input-placeholder",
          "border-input-border",
          isNearLimit && "border-yellow-400/50 focus-visible:border-yellow-400 focus-visible:ring-yellow-400/30",
          isAtLimit && "border-red-400/50 focus-visible:border-red-400 focus-visible:ring-red-400/30",
          error && "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/30"
        )}
        aria-describedby={cn(counterId, error && errorId)}
        aria-invalid={!!error || isAtLimit}
        data-testid="char-count-textarea-input"
      />

      {/* Warning for near limit */}
      {isNearLimit && !isAtLimit && !error && (
        <p
          className="text-sm text-yellow-400"
          role="status"
          aria-live="polite"
          data-testid="char-count-textarea-warning-message"
        >
          Zbliżasz się do limitu znaków
        </p>
      )}

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          className="text-sm font-medium text-red-400"
          role="alert"
          aria-live="assertive"
          data-testid="char-count-textarea-error-message"
        >
          {error}
        </p>
      )}

      {/* Limit reached message */}
      {isAtLimit && !error && (
        <p
          className="text-sm text-red-400"
          role="alert"
          aria-live="assertive"
          data-testid="char-count-textarea-limit-reached-message"
        >
          Osiągnięto maksymalną długość tekstu
        </p>
      )}
    </div>
  );
}
