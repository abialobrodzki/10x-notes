import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GenerateButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

/**
 * GenerateButton - Button to trigger AI summary generation
 * Features:
 * - Disabled when no content or exceeds limit
 * - Shows loading state during generation
 * - Accessible with ARIA attributes
 */
export function GenerateButton({ onClick, disabled = false, isLoading = false }: GenerateButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      size="lg"
      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover-blue-gradient disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50"
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
          Generowanie...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-5 w-5" aria-hidden="true" />
          Generuj podsumowanie
        </>
      )}
    </Button>
  );
}
