import { type Page } from "playwright/test";

/**
 * Helper functions for managing test notes via API
 */

interface CreateNoteParams {
  original_content: string;
  summary_text: string;
  meeting_date?: string | null;
  goal_status: "achieved" | "not_achieved";
  tag_name: string;
  is_ai_generated?: boolean;
}

interface NoteResponse {
  id: string;
  original_content: string;
  summary_text: string;
  meeting_date: string;
  goal_status: "achieved" | "not_achieved";
  tag: {
    id: string;
    name: string;
  };
  is_ai_generated: boolean;
  has_public_link: boolean;
}

/**
 * Create a note via API
 * @param page - Playwright page instance (for cookies)
 * @param noteData - Note data
 * @returns Created note
 */
export async function createNoteViaAPI(page: Page, noteData: CreateNoteParams): Promise<NoteResponse> {
  const context = page.context();
  const cookies = await context.cookies();

  const response = await page.request.post("http://localhost:3000/api/notes", {
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
    },
    data: noteData,
  });

  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Failed to create note: ${response.status()} ${errorText}`);
  }

  return await response.json();
}

/**
 * Delete a note via API
 * @param page - Playwright page instance (for cookies)
 * @param noteId - Note ID to delete
 */
export async function deleteNoteViaAPI(page: Page, noteId: string): Promise<void> {
  const context = page.context();
  const cookies = await context.cookies();

  const response = await page.request.delete(`http://localhost:3000/api/notes/${noteId}`, {
    headers: {
      Cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
    },
  });

  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Failed to delete note: ${response.status()} ${errorText}`);
  }
}

/**
 * Get all notes via API
 * @param page - Playwright page instance (for cookies)
 * @returns Array of notes
 */
export async function getNotesViaAPI(page: Page): Promise<NoteResponse[]> {
  const context = page.context();
  const cookies = await context.cookies();

  const response = await page.request.get("http://localhost:3000/api/notes", {
    headers: {
      Cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
    },
  });

  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Failed to get notes: ${response.status()} ${errorText}`);
  }

  const data = await response.json();
  return data.notes || [];
}

/**
 * Delete all user's notes via API
 * Useful for cleanup in teardown
 * @param page - Playwright page instance (for cookies)
 */
export async function deleteAllNotesViaAPI(page: Page): Promise<void> {
  const notes = await getNotesViaAPI(page);

  for (const note of notes) {
    await deleteNoteViaAPI(page, note.id);
  }
}

/**
 * Create sample test notes
 * @param page - Playwright page instance (for cookies)
 * @param count - Number of notes to create (default: 3)
 * @returns Array of created notes
 */
export async function createSampleNotes(page: Page, count = 3): Promise<NoteResponse[]> {
  const notes: NoteResponse[] = [];

  for (let i = 0; i < count; i++) {
    const note = await createNoteViaAPI(page, {
      original_content: `Testowa notatka ${i + 1}\n\nTo jest treść testowej notatki do celów E2E testing.`,
      summary_text: `Podsumowanie notatki ${i + 1}. Testujemy wyświetlanie notatek na liście.`,
      meeting_date: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD format
      goal_status: i % 2 === 0 ? "achieved" : "not_achieved",
      tag_name: i === 0 ? "E2E Test" : "Testowa Etykieta",
      is_ai_generated: i % 2 === 0,
    });

    notes.push(note);
  }

  return notes;
}
