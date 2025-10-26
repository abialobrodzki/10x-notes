import { Copy, Check, RotateCw, Link } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
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
 */
export default function PublicLinkSection({ publicLink, noteId, isOwner, onUpdate }: PublicLinkSectionProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [showRotateDialog, setShowRotateDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const isEnabled = publicLink?.is_enabled || false;
  const fullUrl = publicLink?.url ? `${window.location.origin}${publicLink.url}` : "";

  /**
   * Enable public link (POST)
   */
  const handleEnable = useCallback(async () => {
    if (!isOwner || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/notes/${noteId}/public-link`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to enable public link");
      }

      const newLink: PublicLinkDTO = await response.json();
      onUpdate(newLink);
      toast.success("Link publiczny został włączony");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to enable public link:", error);
      toast.error(error instanceof Error ? error.message : "Nie udało się włączyć linku");
    } finally {
      setIsSaving(false);
    }
  }, [isOwner, isSaving, noteId, onUpdate]);

  /**
   * Disable public link (PATCH)
   */
  const handleDisable = useCallback(async () => {
    if (!isOwner || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/notes/${noteId}/public-link`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ is_enabled: false }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to disable public link");
      }

      const updatedLink: PublicLinkDTO = await response.json();
      onUpdate(updatedLink);
      toast.success("Link publiczny został wyłączony");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to disable public link:", error);
      toast.error(error instanceof Error ? error.message : "Nie udało się wyłączyć linku");
    } finally {
      setIsSaving(false);
    }
  }, [isOwner, isSaving, noteId, onUpdate]);

  /**
   * Toggle public link on/off
   */
  const handleToggle = useCallback(
    async (checked: boolean) => {
      if (checked) {
        await handleEnable();
      } else {
        await handleDisable();
      }
    },
    [handleEnable, handleDisable]
  );

  /**
   * Copy URL to clipboard
   */
  const handleCopy = useCallback(async () => {
    if (!fullUrl) return;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Link skopiowany do schowka");

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to copy URL:", error);
      toast.error("Nie udało się skopiować linku");
    }
  }, [fullUrl]);

  /**
   * Rotate token (POST with confirmation)
   */
  const handleRotate = useCallback(async () => {
    if (!isOwner || isRotating) return;

    setIsRotating(true);
    setShowRotateDialog(false);

    try {
      const response = await fetch(`/api/notes/${noteId}/public-link/rotate`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to rotate token");
      }

      const rotatedLink: PublicLinkDTO = await response.json();
      onUpdate(rotatedLink);
      toast.success("Token został zmieniony - stary link przestał działać");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to rotate token:", error);
      toast.error(error instanceof Error ? error.message : "Nie udało się zmienić tokenu");
    } finally {
      setIsRotating(false);
    }
  }, [isOwner, isRotating, noteId, onUpdate]);

  if (!isOwner) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="bg-gradient-to-r from-gradient-heading-from to-purple-200 bg-clip-text text-xl font-semibold text-transparent">
          Link publiczny
        </h2>

        {/* Toggle switch */}
        <div className="flex items-center gap-3">
          <Label htmlFor="public-link-toggle" className="text-glass-text-muted">
            {isEnabled ? "Włączony" : "Wyłączony"}
          </Label>
          <Switch
            id="public-link-toggle"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isSaving}
            className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-gradient-button-from data-[state=checked]:to-gradient-button-to"
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
          <div className="flex items-center gap-2 rounded-lg border border-glass-border bg-glass-bg-to p-3">
            <Link className="h-4 w-4 flex-shrink-0 text-glass-text-muted" />
            <input
              type="text"
              value={fullUrl}
              readOnly
              className="flex-1 bg-transparent text-sm text-glass-text outline-none"
              onClick={(e) => e.currentTarget.select()}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {/* Copy button */}
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex-1 border-input-border bg-glass-bg-from text-glass-text hover-glass"
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
              variant="outline"
              className="border-yellow-400/30 bg-yellow-500/20 text-yellow-100 hover:border-yellow-400/50 hover:bg-yellow-500/30"
            >
              <RotateCw className={`mr-2 h-4 w-4 ${isRotating ? "animate-spin" : ""}`} />
              {isRotating ? "Zmienianie..." : "Zmień token"}
            </Button>
          </div>
        </div>
      )}

      {/* Rotate confirmation dialog */}
      <AlertDialog open={showRotateDialog} onOpenChange={setShowRotateDialog}>
        <AlertDialogContent className="border-input-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-glass-text">Czy na pewno chcesz zmienić token?</AlertDialogTitle>
            <AlertDialogDescription className="text-glass-text-muted">
              Ta akcja wygeneruje nowy link publiczny. <strong>Stary link przestanie działać</strong> i wszyscy, którzy
              go posiadają, stracą dostęp. Nie można cofnąć tej operacji.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-input-border bg-glass-bg-from text-glass-text hover-glass">
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRotate}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600"
            >
              Tak, zmień token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
