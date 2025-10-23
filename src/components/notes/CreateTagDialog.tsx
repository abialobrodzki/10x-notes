import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateTagDialogProps {
  onSuccess: () => void;
}

/**
 * CreateTagDialog - Dialog for creating a new tag
 *
 * Features:
 * - Input validation (non-empty name)
 * - API call to POST /api/tags
 * - Error handling (409 conflict, etc.)
 * - Success toast notification
 */
export function CreateTagDialog({ onSuccess }: CreateTagDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Nazwa etykiety nie może być pusta");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 409) {
          setError("Etykieta o tej nazwie już istnieje");
          return;
        }

        throw new Error(errorData.message || "Failed to create tag");
      }

      // Success
      toast.success("Etykieta została utworzona");
      setOpen(false);
      setName("");
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nieznany błąd";
      setError(message);
      toast.error(`Błąd: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Plus className="h-4 w-4" />
          <span className="sr-only">Utwórz nową etykietę</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Utwórz nową etykietę</DialogTitle>
            <DialogDescription>Podaj nazwę nowej etykiety dla swoich notatek.</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="tag-name">Nazwa etykiety</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="np. Projekty, Spotkania, Pomysły"
              className="mt-2"
              disabled={isLoading}
            />
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Tworzenie..." : "Utwórz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
