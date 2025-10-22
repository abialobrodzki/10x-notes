import { LogIn, UserPlus, Save, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AiSummaryDTO, GoalStatus } from "@/types";

/**
 * PendingGeneratedNoteVM - Data structure for localStorage persistence
 * TTL: 24h from created_at timestamp
 */
interface PendingGeneratedNoteVM {
  original_content: string;
  summary_text: string;
  goal_status: GoalStatus;
  suggested_tag: string | null;
  created_at: number; // epoch ms
}

interface SavePromptBannerProps {
  originalContent: string;
  aiResult: AiSummaryDTO;
}

const STORAGE_KEY = "pendingGeneratedNote";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * SavePromptBanner - CTA to save generated note after login
 * Features:
 * - Saves to localStorage with 24h TTL
 * - Redirect buttons to /login and /register
 * - Visual feedback after saving
 * - Auto-cleanup of expired data
 */
export function SavePromptBanner({ originalContent, aiResult }: SavePromptBannerProps) {
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveAndRedirect = (redirectPath: "/login" | "/register") => {
    // Prepare data for localStorage
    const pendingNote: PendingGeneratedNoteVM = {
      original_content: originalContent,
      summary_text: aiResult.summary_text,
      goal_status: aiResult.goal_status,
      suggested_tag: aiResult.suggested_tag,
      created_at: Date.now(),
    };

    try {
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingNote));
      setIsSaved(true);

      // Redirect after brief delay to show feedback
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 500);
    } catch {
      // Handle localStorage quota exceeded or other errors
      // Proceed with redirect anyway (data will not be saved, but user can still login)
      window.location.href = redirectPath;
    }
  };

  // Check if data is already saved (memoized to avoid impure function during render)
  const [hasExistingData] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;

      const data: PendingGeneratedNoteVM = JSON.parse(stored);
      const now = Date.now();
      const age = now - data.created_at;

      // Auto-cleanup expired data
      if (age > TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  });

  if (isSaved) {
    return (
      <div
        className="flex items-center space-x-2 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-200"
        role="status"
        aria-live="polite"
      >
        <CheckCircle className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm font-medium">Zapisano! Przekierowywanie...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-blue-400/30 bg-blue-500/10 p-6">
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
        >
          <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
          Zaloguj się
        </Button>

        <Button
          onClick={() => handleSaveAndRedirect("/register")}
          variant="outline"
          className="flex-1 border-blue-400/50 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20"
          size="lg"
        >
          <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          Utwórz konto
        </Button>
      </div>

      {/* TTL Notice */}
      <p className="text-xs text-blue-300/60">Dane będą przechowywane lokalnie przez 24 godziny</p>
    </div>
  );
}
