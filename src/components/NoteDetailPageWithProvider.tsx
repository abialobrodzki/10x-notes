import NoteDetailPage from "@/components/notes/NoteDetailPage";
import { QueryProvider } from "@/components/QueryProvider";

interface NoteDetailPageWithProviderProps {
  noteId: string;
}

/**
 * NoteDetailPageWithProvider - wraps NoteDetailPage with QueryProvider
 * Required because NoteDetailPage uses TanStack Query hooks (useNote, useUpdateNote, useCreateTag)
 * and contains TagAccessModal which uses useAddRecipientMutation
 */
export default function NoteDetailPageWithProvider({ noteId }: NoteDetailPageWithProviderProps) {
  return (
    <QueryProvider>
      <NoteDetailPage noteId={noteId} />
    </QueryProvider>
  );
}
