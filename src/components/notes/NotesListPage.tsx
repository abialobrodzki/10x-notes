import { useState, useEffect } from "react";
import { AppShell } from "./AppShell";
import type { NotesListDTO, TagsListDTO, NotesListQuery } from "@/types";

interface NotesListPageProps {
  initialNotes: NotesListDTO;
  initialTags: TagsListDTO;
  initialQuery: NotesListQuery;
  initialError: string | null;
}

/**
 * NotesListPage - Main container for notes list view
 *
 * Features:
 * - SSR initial data with SWR for updates
 * - URL-synced filters and search
 * - Responsive layout (desktop sidebar, mobile drawer)
 */
export function NotesListPage({ initialNotes, initialTags, initialQuery, initialError }: NotesListPageProps) {
  const [notes] = useState(initialNotes);
  const [tags] = useState(initialTags);
  const [query] = useState(initialQuery);
  const [error] = useState(initialError);

  useEffect(() => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Initial data error:", error);
    }
  }, [error]);

  return <AppShell notes={notes} tags={tags} query={query} error={error} />;
}
