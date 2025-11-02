import { LogIn, UserPlus, Save, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  savePendingNote,
  getPendingNote,
  PENDING_NOTE_EXPIRATION_MS,
  type PendingNote,
} from "@/lib/utils/pending-note.utils";
import type { AiSummaryDTO } from "@/types";

interface SavePromptBannerProps {
  originalContent: string;
  aiResult: AiSummaryDTO;
}

/**
 * SavePromptBanner - CTA to save generated note after login
 * Features:
 * - Saves to sessionStorage with 30min TTL
 * - Redirect buttons to /login and /register
 * - Visual feedback after saving
 * - Auto-cleanup of expired data
 */
export function SavePromptBanner({ originalContent, aiResult }: SavePromptBannerProps) {
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveAndRedirect = (redirectPath: "/login" | "/register") => {
    // Prepare data for sessionStorage
    const pendingNote: PendingNote = {
      original_content: originalContent,
      summary_text: aiResult.summary_text,
      goal_status: aiResult.goal_status,
      suggested_tag: aiResult.suggested_tag,
      meeting_date: null, // Will be set to today's date on save
      generated_at: Date.now(),
    };

    try {
      // Save to sessionStorage using utility
      savePendingNote(pendingNote);
      setIsSaved(true);

      // Redirect after brief delay to show feedback
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 500);
    } catch {
      // Handle storage errors
      // Proceed with redirect anyway (data will not be saved, but user can still login)
      window.location.href = redirectPath;
    }
  };

  // Check if data is already saved (memoized to avoid impure function during render)
  const [hasExistingData] = useState(() => {
    const existing = getPendingNote();
    return existing !== null;
  });

  if (isSaved) {
    return (
      <div
        className="flex items-center space-x-2 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-200"
        role="status"
        aria-live="polite"
        data-testid="save-prompt-banner-success-message"
      >
        <CheckCircle className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm font-medium">Zapisano! Przekierowywanie...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-blue-400/30 bg-blue-500/10 p-6" data-testid="save-prompt-banner">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Save className="h-5 w-5 text-blue-300" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-blue-200">Chcesz zapisać tę notatkę?</h3>
      </div>

      {/* Message */}
      <p className="text-sm text-blue-100">
        Zaloguj się lub utwórz konto, aby zapisać wygenerowane podsumowanie i uzyskać dostęp do wszystkich funkcji
        10xNotes.
      </p>

      {/* Warning about TTL */}
      {hasExistingData && (
        <p className="text-xs text-yellow-300">Uwaga: Masz już zapisane dane. Nowe dane zastąpią poprzednie.</p>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-3 sm:space-y-0">
        <Button
          onClick={() => handleSaveAndRedirect("/login")}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          size="lg"
          data-testid="save-prompt-banner-login-button"
        >
          <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
          Zaloguj się
        </Button>

        <Button
          onClick={() => handleSaveAndRedirect("/register")}
          variant="outline"
          className="flex-1 border-blue-400/50 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20"
          size="lg"
          data-testid="save-prompt-banner-register-button"
        >
          <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          Utwórz konto
        </Button>
      </div>

      {/* TTL Notice */}
      <p className="text-xs text-blue-300/60">
        Dane będą przechowywane w sesji przez {PENDING_NOTE_EXPIRATION_MS / (60 * 1000)} minut
      </p>
    </div>
  );
}
