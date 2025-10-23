import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountWizard } from "./DeleteAccountWizard";

interface DangerZoneProps {
  userEmail: string;
}

/**
 * DangerZone component
 * Displays dangerous account operations (e.g., account deletion)
 * Styled with destructive theme to indicate severity
 */
export function DangerZone({ userEmail }: DangerZoneProps) {
  return (
    <Card className="border-destructive/50 bg-gradient-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-xl shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive outline-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <AlertTriangle className="h-5 w-5" />
          Strefa zagrożeń
        </CardTitle>
        <CardDescription className="text-glass-text-muted">
          Nieodwracalne operacje na koncie. Zachowaj ostrożność!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account deletion section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-glass-text">Usuń konto</h3>
            <p className="text-sm text-glass-text-muted">
              Trwale usuń swoje konto i wszystkie powiązane dane. Ta operacja jest nieodwracalna i zgodna z RODO.
            </p>
          </div>

          <div className="rounded-lg border border-destructive/30 bg-gradient-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-lg p-4 space-y-3">
            <p className="text-sm font-medium text-glass-text">Co zostanie usunięte:</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-glass-text-muted">
              <li>Wszystkie notatki i ich zawartość</li>
              <li>Wszystkie etykiety</li>
              <li>Udostępnienia i linki publiczne</li>
              <li>Historia generacji AI</li>
              <li>Dane profilu użytkownika</li>
            </ul>
            <p className="text-xs text-glass-text-muted pt-2">
              <strong>Uwaga:</strong> Dane zostaną usunięte natychmiast i nie będzie możliwości ich odzyskania.
            </p>
          </div>

          <DeleteAccountWizard userEmail={userEmail} />
        </div>
      </CardContent>
    </Card>
  );
}
