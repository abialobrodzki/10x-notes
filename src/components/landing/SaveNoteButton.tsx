import { Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AiSummaryDTO } from "@/types";

interface SaveNoteButtonProps {
  originalContent: string;
  aiResult: AiSummaryDTO;
}

/**
 * SaveNoteButton - Direct save for authenticated users
 * Features:
 * - Calls POST /api/notes to save generated note
 * - Redirects to note details on success
 * - Shows loading state and handles errors
 */
export function SaveNoteButton({ originalContent, aiResult }: SaveNoteButtonProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          original_content: originalContent,
          summary_text: aiResult.summary_text,
          goal_status: aiResult.goal_status,
          tag_name: aiResult.suggested_tag || "Bez etykiety",
          is_ai_generated: true,
        }),
      });

      if (!response.ok) {
        // Handle specific errors
        if (response.status === 401 || response.status === 403) {
          toast.error("Musisz być zalogowany", {
            description: "Zaloguj się ponownie",
          });
          setTimeout(() => {
            window.location.href = "/login";
          }, 1500);
          return;
        }

        if (response.status === 400) {
          const errorData = await response.json();
          toast.error("Błąd walidacji", {
            description: errorData.message || "Sprawdź wprowadzone dane",
          });
          setIsSaving(false);
          return;
        }

        if (response.status === 429) {
          toast.error("Przekroczono limit tworzenia notatek", {
            description: "Spróbuj ponownie później",
          });
          setIsSaving(false);
          return;
        }

        throw new Error("Failed to save note");
      }

      const savedNote = await response.json();

      // Success toast
      toast.success("Notatka zapisana!", {
        description: "Przekierowywanie do szczegółów...",
      });

      // Redirect to note details
      setTimeout(() => {
        window.location.href = `/notes/${savedNote.id}`;
      }, 500);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to save note:", error);

      toast.error("Błąd podczas zapisywania", {
        description: "Spróbuj ponownie",
      });

      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-green-500/30 bg-green-500/10 p-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Save className="h-5 w-5 text-green-300" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-green-200">Gotowe! Zapisz notatkę</h3>
      </div>

      {/* Message */}
      <p className="text-sm text-green-100">
        Twoje podsumowanie zostało wygenerowane. Kliknij poniżej, aby zapisać notatkę do swojej kolekcji.
      </p>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        size="lg"
        className="w-full bg-gradient-to-r from-gradient-button-from to-gradient-button-to font-semibold text-white transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50"
      >
        <Save className="mr-2 h-4 w-4" aria-hidden="true" />
        {isSaving ? "Zapisywanie..." : "Zapisz notatkę"}
      </Button>
    </div>
  );
}
