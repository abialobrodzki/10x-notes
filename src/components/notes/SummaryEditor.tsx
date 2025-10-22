import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { NoteDetailDTO, UpdateNoteCommand } from "@/types";

interface SummaryEditorProps {
  value: NoteDetailDTO["summary_text"];
  isOwner: boolean;
  onSave: (summary: UpdateNoteCommand["summary_text"]) => Promise<void>;
  isSaving: boolean;
}

const MAX_SUMMARY_LENGTH = 2000;

/**
 * SummaryEditor - Inline editor for note summary
 * Features:
 * - Character counter with validation (max 2000 chars)
 * - Save/Cancel actions
 * - Optimistic updates with rollback
 * - Disabled for non-owners
 */
export default function SummaryEditor({ value, isOwner, onSave, isSaving }: SummaryEditorProps) {
  // State management:
  // - editedValue tracks the local draft while editing
  // - When not editing, we display the server value directly (not editedValue)
  // - When entering edit mode, we initialize from current server value
  const [editedValue, setEditedValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const characterCount = editedValue.length;
  const isOverLimit = characterCount > MAX_SUMMARY_LENGTH;
  const hasChanges = editedValue !== (value || "");

  const handleEdit = useCallback(() => {
    // Initialize editedValue with current server value when entering edit mode
    setEditedValue(value || "");
    setIsEditing(true);
  }, [value]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    // editedValue will be reset when entering edit mode again
  }, []);

  const handleSave = useCallback(async () => {
    if (isOverLimit) {
      return;
    }

    try {
      // Send undefined instead of null for empty strings (API expects partial update)
      await onSave(editedValue || undefined);
      setIsEditing(false);
    } catch (error) {
      // Error handled by parent, just stay in editing mode
      // eslint-disable-next-line no-console
      console.error("Failed to save summary:", error);
    }
  }, [editedValue, isOverLimit, onSave]);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="bg-gradient-to-r from-gradient-heading-from to-purple-200 bg-clip-text text-xl font-semibold text-transparent">
          Podsumowanie
        </h2>
        {!isEditing && isOwner && (
          <Button
            onClick={handleEdit}
            variant="outline"
            size="sm"
            className="border-input-border bg-glass-bg-from text-glass-text hover:border-glass-border-hover hover:bg-input-bg"
          >
            Edytuj
          </Button>
        )}
      </div>

      {/* Editor/Display */}
      {isEditing ? (
        <>
          <Textarea
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            disabled={isSaving || !isOwner}
            placeholder="Wprowadź podsumowanie notatki..."
            className="min-h-[200px] border-input-border bg-glass-bg-from text-white placeholder:text-input-placeholder focus:border-input-border-focus focus:ring-input-ring"
            aria-label="Podsumowanie notatki"
            aria-describedby="summary-char-count"
          />

          {/* Character counter */}
          <div
            id="summary-char-count"
            className={`text-sm ${isOverLimit ? "font-semibold text-red-200" : "text-glass-text-muted"}`}
          >
            {characterCount} / {MAX_SUMMARY_LENGTH} znaków
            {isOverLimit && <span className="ml-2">(przekroczono limit o {characterCount - MAX_SUMMARY_LENGTH})</span>}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges || isOverLimit}
              className="bg-gradient-to-r from-gradient-button-from to-gradient-button-to font-semibold text-white transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50"
            >
              {isSaving ? "Zapisywanie..." : "Zapisz"}
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isSaving}
              variant="outline"
              className="border-input-border bg-glass-bg-from text-glass-text hover:border-glass-border-hover hover:bg-input-bg"
            >
              Anuluj
            </Button>
          </div>

          {/* Validation error */}
          {isOverLimit && (
            <div role="alert" className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200">
              Podsumowanie jest za długie. Usuń {characterCount - MAX_SUMMARY_LENGTH} znaków, aby zapisać.
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-glass-border bg-glass-bg-to p-4">
          {value ? (
            <p className="whitespace-pre-wrap text-glass-text-muted">{value}</p>
          ) : (
            <p className="italic text-input-placeholder">Brak podsumowania</p>
          )}
        </div>
      )}
    </div>
  );
}
