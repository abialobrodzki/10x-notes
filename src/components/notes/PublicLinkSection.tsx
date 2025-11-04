import { Copy, Check, RotateCw, Link } from "lucide-react";
import { usePublicLink } from "@/components/hooks/usePublicLink";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/composed";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { NoteDetailDTO, PublicLinkDTO } from "@/types";

interface PublicLinkSectionProps {
  publicLink: NoteDetailDTO["public_link"];
  noteId: string;
  isOwner: boolean;
  onUpdate: (publicLink: PublicLinkDTO | null) => void;
}

/**
 * PublicLinkSection - Manage public link for note
 * Features:
 * - Toggle on/off (POST/PATCH)
 * - Display URL with copy-to-clipboard
 * - Rotate token with confirmation dialog
 * - Only visible for owners
 * Presentational component using usePublicLink hook
 */
export default function PublicLinkSection({ publicLink, noteId, isOwner, onUpdate }: PublicLinkSectionProps) {
  const {
    isEnabled,
    fullUrl,
    toggleLink,
    rotateLink,
    copyLink,
    isSaving,
    isRotating,
    copied,
    showRotateDialog,
    setShowRotateDialog,
  } = usePublicLink(noteId, publicLink, onUpdate);

  if (!isOwner) {
    return null;
  }

  return (
    <div className="space-y-6" data-testid="public-link-section">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="bg-linear-to-r from-gradient-heading-from to-purple-200 bg-clip-text text-xl font-semibold text-transparent">
          Link publiczny
        </h2>

        {/* Toggle switch */}
        <div className="flex items-center gap-3">
          <Label
            htmlFor="public-link-toggle"
            className="text-glass-text-muted"
            data-testid="public-link-section-toggle-label"
          >
            {isEnabled ? "Włączony" : "Wyłączony"}
          </Label>
          <Switch
            id="public-link-toggle"
            checked={isEnabled}
            onCheckedChange={toggleLink}
            disabled={isSaving}
            className="data-[state=checked]:bg-linear-to-r data-[state=checked]:from-gradient-button-from data-[state=checked]:to-gradient-button-to data-[state=unchecked]:bg-glass-bg-from data-[state=unchecked]:border-glass-border"
            data-testid="public-link-section-toggle-switch"
          />
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-glass-text-muted">
        Link publiczny umożliwia dostęp do podsumowania notatki bez logowania. Oryginalna treść pozostaje prywatna.
      </p>

      {/* URL display and actions (only when enabled) */}
      {isEnabled && publicLink && (
        <div className="space-y-4">
          {/* URL display */}
          <GlassCard padding="sm">
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 shrink-0 text-glass-text-muted" />
              <input
                type="text"
                value={fullUrl}
                readOnly
                className="flex-1 bg-transparent text-sm text-glass-text outline-none"
                onClick={(e) => e.currentTarget.select()}
                data-testid="public-link-section-url-input"
              />
            </div>
          </GlassCard>

          {/* Action buttons */}
          <div className="flex gap-3">
            {/* Copy button */}
            <Button
              onClick={copyLink}
              variant="outline"
              className="flex-1 border-input-border bg-glass-bg-from text-glass-text hover-glass"
              data-testid="public-link-section-copy-button"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Skopiowano
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Kopiuj link
                </>
              )}
            </Button>

            {/* Rotate button */}
            <Button
              onClick={() => setShowRotateDialog(true)}
              disabled={isRotating}
              variant="warning"
              data-testid="public-link-section-rotate-button"
            >
              <RotateCw className={`mr-2 h-4 w-4 ${isRotating ? "animate-spin" : ""}`} />
              {isRotating ? "Zmienianie..." : "Zmień token"}
            </Button>
          </div>
        </div>
      )}

      {/* Rotate confirmation dialog */}
      <AlertDialog open={showRotateDialog} onOpenChange={setShowRotateDialog}>
        <AlertDialogContent
          className="border-input-border bg-linear-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-xl"
          data-testid="public-link-section-rotate-dialog"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-glass-text">Czy na pewno chcesz zmienić token?</AlertDialogTitle>
            <AlertDialogDescription className="text-glass-text-muted">
              Ta akcja wygeneruje nowy link publiczny. <strong>Stary link przestanie działać</strong> i wszyscy, którzy
              go posiadają, stracą dostęp. Nie można cofnąć tej operacji.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" data-testid="public-link-section-rotate-dialog-cancel">
                Anuluj
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="warning" onClick={rotateLink} data-testid="public-link-section-rotate-dialog-confirm">
                Tak, zmień token
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
