import { UserPlus } from "lucide-react";
import { useState, useId } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddRecipientFormProps {
  /** Whether add operation is in progress */
  isAdding: boolean;
  /** Callback when new recipient should be added */
  onAdd: (email: string) => Promise<boolean>;
}

/**
 * AddRecipientForm - Form for adding new recipient by email
 *
 * Features:
 * - Email input with validation
 * - Loading state during submission
 * - Success/error toast notifications
 * - Form reset after successful submission
 */
export function AddRecipientForm({ isAdding, onAdd }: AddRecipientFormProps) {
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const emailInputId = useId();

  const validateEmail = (email: string): boolean => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setValidationError("Email jest wymagany");
      return false;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setValidationError("Nieprawidłowy format email");
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      return;
    }

    const trimmedEmail = email.trim();
    const success = await onAdd(trimmedEmail);

    if (success) {
      toast.success("Dodano dostęp", {
        description: `Użytkownik ${trimmedEmail} ma teraz dostęp do tej etykiety`,
      });
      setEmail("");
      setValidationError(null);
    } else {
      toast.error("Nie udało się dodać dostępu", {
        description: "Sprawdź czy użytkownik istnieje i ma potwierdzony email",
      });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear validation error on input change
    if (validationError) {
      setValidationError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={emailInputId} className="text-sm font-medium">
          Dodaj nowego użytkownika
        </Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              id={emailInputId}
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={handleEmailChange}
              disabled={isAdding}
              aria-invalid={!!validationError}
              aria-describedby={validationError ? `${emailInputId}-error` : undefined}
              className={validationError ? "border-destructive" : ""}
            />
            {validationError && (
              <p id={`${emailInputId}-error`} className="mt-1 text-xs text-destructive" role="alert">
                {validationError}
              </p>
            )}
          </div>
          <Button type="submit" disabled={isAdding || !email.trim()} size="default" aria-label="Dodaj użytkownika">
            {isAdding ? (
              <>Dodawanie...</>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Dodaj
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Wprowadź email zarejestrowanego użytkownika, aby nadać mu dostęp tylko do odczytu
        </p>
      </div>
    </form>
  );
}
