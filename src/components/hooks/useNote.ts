import { useEffect } from "react";
import useSWR from "swr";
import type { NoteDetailDTO } from "@/types";

/**
 * Fetcher function for SWR
 * Handles authentication and error responses
 */
const fetcher = async (url: string): Promise<NoteDetailDTO> => {
  const response = await fetch(url, {
    credentials: "include",
  });

  // Handle authentication errors
  if (response.status === 401 || response.status === 403) {
    // Redirect to login
    window.location.href = "/login";
    throw new Error("Authentication required");
  }

  // Handle not found
  if (response.status === 404) {
    throw new Error("Note not found");
  }

  // Handle other errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch note");
  }

  return response.json();
};

interface UseNoteReturn {
  note: NoteDetailDTO | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: (
    data?: NoteDetailDTO | Promise<NoteDetailDTO>,
    shouldRevalidate?: boolean
  ) => Promise<NoteDetailDTO | undefined>;
}

/**
 * Hook to fetch and manage note data
 * Handles SWR logic, error handling, and redirects
 */
export function useNote(noteId: string): UseNoteReturn {
  const {
    data: note,
    error,
    isLoading,
    mutate,
  } = useSWR<NoteDetailDTO>(noteId ? `/api/notes/${noteId}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  // Redirect on authentication error
  useEffect(() => {
    if (error?.message === "Authentication required") {
      window.location.href = "/login";
    }
  }, [error]);

  return {
    note,
    error,
    isLoading,
    mutate,
  };
}
