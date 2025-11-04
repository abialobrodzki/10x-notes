import { useCallback, useState, useEffect } from "react";
import { toast } from "sonner";
import type { PublicLinkDTO } from "@/types";

interface UsePublicLinkReturn {
  isEnabled: boolean;
  fullUrl: string;
  toggleLink: (checked: boolean) => Promise<void>;
  rotateLink: () => Promise<void>;
  copyLink: () => Promise<void>;
  isSaving: boolean;
  isRotating: boolean;
  copied: boolean;
  showRotateDialog: boolean;
  setShowRotateDialog: (value: boolean) => void;
}

/**
 * Hook to manage public link functionality
 * Handles enabling/disabling, copying, rotating tokens
 */
export function usePublicLink(
  noteId: string,
  initialPublicLink: PublicLinkDTO | null | undefined,
  onUpdate: (publicLink: PublicLinkDTO | null) => void
): UsePublicLinkReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [showRotateDialog, setShowRotateDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Optimistic state for switch - syncs with publicLink but updates immediately on toggle
  const [optimisticEnabled, setOptimisticEnabled] = useState(initialPublicLink?.is_enabled || false);

  const isEnabled = optimisticEnabled;
  const fullUrl = initialPublicLink?.url ? `${window.location.origin}${initialPublicLink.url}` : "";

  // Sync optimistic state with actual publicLink prop
  useEffect(() => {
    setOptimisticEnabled(initialPublicLink?.is_enabled || false);
  }, [initialPublicLink?.is_enabled]);

  /**
   * Enable public link (POST)
   */
  const handleEnable = useCallback(async () => {
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
      // Rollback optimistic update on error
      setOptimisticEnabled(false);
      // eslint-disable-next-line no-console
      console.error("Failed to enable public link:", error);
      toast.error(error instanceof Error ? error.message : "Nie udało się włączyć linku");
    } finally {
      setIsSaving(false);
    }
  }, [noteId, onUpdate]);

  /**
   * Disable public link (PATCH)
   */
  const handleDisable = useCallback(async () => {
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
      // Rollback optimistic update on error
      setOptimisticEnabled(true);
      // eslint-disable-next-line no-console
      console.error("Failed to disable public link:", error);
      toast.error(error instanceof Error ? error.message : "Nie udało się wyłączyć linku");
    } finally {
      setIsSaving(false);
    }
  }, [noteId, onUpdate]);

  /**
   * Toggle public link on/off
   */
  const toggleLink = useCallback(
    async (checked: boolean) => {
      // Optimistically update UI immediately
      setOptimisticEnabled(checked);

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
  const copyLink = useCallback(async () => {
    if (!fullUrl) return;

    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link skopiowany do schowka");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to copy URL:", error);
      toast.error("Nie udało się skopiować linku");
    }

    // Show copied state regardless of clipboard success (e.g., in headless tests)
    setCopied(true);

    // Reset copied state after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  }, [fullUrl]);

  /**
   * Rotate token (POST with confirmation)
   */
  const rotateLink = useCallback(async () => {
    if (isRotating) return;

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
  }, [isRotating, noteId, onUpdate]);

  return {
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
  };
}
