import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { TagAccessListDTO, UUID } from "@/types";

interface UseTagAccessProps {
  /** Tag ID for access management */
  tagId: UUID;
  /** Whether modal is open */
  isOpen: boolean;
  /** Whether current user is the tag owner */
  isOwner: boolean;
}

/**
 * Hook for managing tag access recipients
 *
 * Features:
 * - Fetches recipients list when modal opens
 * - Manages recipients, loading, and error states
 * - Add recipient with API communication
 * - Remove recipient with optimistic update and rollback on error
 * - Toast notifications for user feedback
 * - Proper error handling and state management
 *
 * @param tagId - The tag ID to manage access for
 * @param isOpen - Whether the modal is currently open
 * @param isOwner - Whether the current user owns the tag
 * @returns Recipients data, loading states, and handler functions
 */
export function useTagAccess({ tagId, isOpen, isOwner }: UseTagAccessProps) {
  const [recipients, setRecipients] = useState<TagAccessListDTO["recipients"]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch recipients list when modal opens
   */
  useEffect(() => {
    if (!isOpen || !isOwner) {
      return;
    }

    // Reset state when modal opens
    setLoading(true);
    setError(null);

    const fetchRecipients = async () => {
      try {
        const response = await fetch(`/api/tags/${tagId}/access`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error("Brak uprawnień do zarządzania dostępem");
          }
          if (response.status === 404) {
            throw new Error("Etykieta nie istnieje");
          }
          throw new Error("Nie udało się pobrać listy odbiorców");
        }

        const data: TagAccessListDTO = await response.json();
        setRecipients(data.recipients);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Wystąpił nieznany błąd";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipients();
  }, [isOpen, tagId, isOwner]);

  /**
   * Handle adding new recipient
   */
  const handleAddRecipient = useCallback(
    async (email: string) => {
      setAdding(true);
      setError(null);

      try {
        const response = await fetch(`/api/tags/${tagId}/access`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recipient_email: email }),
        });

        if (!response.ok) {
          if (response.status === 400) {
            throw new Error("Użytkownik nie istnieje lub email nie został potwierdzony");
          }
          if (response.status === 409) {
            throw new Error("Użytkownik ma już dostęp do tej etykiety");
          }
          if (response.status === 401 || response.status === 403) {
            throw new Error("Brak uprawnień do zarządzania dostępem");
          }
          throw new Error("Nie udało się dodać dostępu");
        }

        const newRecipient = await response.json();

        // Add new recipient to list
        setRecipients((prev) => [
          ...prev,
          {
            recipient_id: newRecipient.recipient_id,
            email: newRecipient.email,
            granted_at: newRecipient.granted_at,
          },
        ]);

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Wystąpił nieznany błąd";
        setError(errorMessage);
        return false;
      } finally {
        setAdding(false);
      }
    },
    [tagId]
  );

  /**
   * Handle removing recipient (optimistic update)
   */
  const handleRemoveRecipient = useCallback(
    async (recipientId: string) => {
      setRemoving((prev) => ({ ...prev, [recipientId]: true }));
      setError(null);

      // Find recipient email for toast message
      const recipient = recipients.find((r) => r.recipient_id === recipientId);
      const recipientEmail = recipient?.email || "użytkownika";

      // Optimistic update - remove from UI immediately
      const previousRecipients = [...recipients];
      setRecipients((prev) => prev.filter((r) => r.recipient_id !== recipientId));

      try {
        const response = await fetch(`/api/tags/${tagId}/access/${recipientId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          // Rollback on error
          setRecipients(previousRecipients);

          let errorMessage = "Nie udało się usunąć dostępu";
          if (response.status === 401 || response.status === 403) {
            errorMessage = "Brak uprawnień do zarządzania dostępem";
          } else if (response.status === 404) {
            errorMessage = "Dostęp nie istnieje";
          }

          setError(errorMessage);
          toast.error("Nie udało się usunąć dostępu", {
            description: errorMessage,
          });
          return;
        }

        // Success toast
        toast.success("Usunięto dostęp", {
          description: `Użytkownik ${recipientEmail} nie ma już dostępu do tej etykiety`,
        });
      } catch (err) {
        // Rollback on network error
        setRecipients(previousRecipients);

        const errorMessage = err instanceof Error ? err.message : "Wystąpił nieznany błąd";
        setError(errorMessage);
        toast.error("Nie udało się usunąć dostępu", {
          description: errorMessage,
        });
      } finally {
        setRemoving((prev) => {
          // Remove recipient from removing state using destructuring
          const { [recipientId]: _removed, ...updated } = prev;
          return updated;
        });
      }
    },
    [tagId, recipients]
  );

  return {
    // State
    recipients,
    loading,
    adding,
    removing,
    error,
    // Handlers
    handleAddRecipient,
    handleRemoveRecipient,
  };
}
