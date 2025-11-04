import { type Page } from "playwright/test";

/**
 * Helper functions for managing test notes via API
 */

export interface CreateNoteParams {
  original_content: string;
  summary_text: string;
  meeting_date?: string | null;
  goal_status: "achieved" | "not_achieved";
  tag_name: string;
  is_ai_generated?: boolean;
}

export interface NoteResponse {
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

  try {
    const response = await page.request.post("http://localhost:3000/api/notes", {
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
      },
      data: noteData,
    });

    if (!response.ok()) {
      const errorText = await response.text();
      console.warn(`Warning: Failed to create note: ${response.status()}`);
      throw new Error(`Failed to create note: ${response.status()} ${errorText}`);
    }

    const contentType = response.headers()["content-type"];
    if (!contentType || !contentType.includes("application/json")) {
      console.warn(`Warning: Unexpected content type when creating note: ${contentType}`);
      throw new Error(`Unexpected content type: ${contentType}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Warning: Error creating note: ${error}`);
    throw error;
  }
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
    // Ignore 404 errors since the note may have been shared (no delete permission) or already removed
    if (response.status() !== 404) {
      throw new Error(`Failed to delete note: ${response.status()} ${errorText}`);
    }
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

  try {
    const response = await page.request.get("http://localhost:3000/api/notes", {
      headers: {
        Cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
      },
    });

    if (!response.ok()) {
      console.warn(`Warning: Failed to get notes: ${response.status()}`);
      return [];
    }

    const contentType = response.headers()["content-type"];
    if (!contentType || !contentType.includes("application/json")) {
      console.warn(`Warning: Unexpected content type: ${contentType}`);
      return [];
    }

    const data = await response.json();
    return data.notes || [];
  } catch (error) {
    console.warn(`Warning: Error getting notes: ${error}`);
    return [];
  }
}

/**
 * Delete all user's notes via API
 * Useful for cleanup in teardown
 * @param page - Playwright page instance (for cookies)
 */
export async function deleteAllNotesViaAPI(page: Page): Promise<void> {
  const notes = await getNotesViaAPI(page);
  const chunkSize = 5;
  for (let i = 0; i < notes.length; i += chunkSize) {
    const chunk = notes.slice(i, i + chunkSize);
    await Promise.all(chunk.map((note) => deleteNoteViaAPI(page, note.id)));
  }
}

/**
 * Create sample test notes
 * @param page - Playwright page instance (for cookies)
 * @param count - Number of notes to create (default: 3)
 * @returns Array of created notes
 */
export async function createSampleNotes(page: Page, count = 1): Promise<NoteResponse[]> {
  const notes: NoteResponse[] = [];
  for (let i = 0; i < count; i++) {
    const note = await createNoteViaAPI(page, {
      original_content: `This is a test note ${i}`,
      summary_text: `This is a summary ${i}`,
      tag_name: "test",
      goal_status: "not_achieved",
    });
    notes.push(note);
  }
  return notes;
}

export interface PublicLinkResponse {
  token: string;
  note_id: string;
  is_enabled: boolean;
  created_at: string;
}

/**
 * Create a public link for a note via API
 * @param page - Playwright page instance (for cookies)
 * @param noteId - Note ID to create public link for
 * @returns Public link data with token
 */
export async function createPublicLinkViaAPI(page: Page, noteId: string): Promise<PublicLinkResponse> {
  const context = page.context();
  const cookies = await context.cookies();

  try {
    const response = await page.request.post(`http://localhost:3000/api/notes/${noteId}/public-link`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
      },
      data: {},
    });

    if (!response.ok()) {
      const errorText = await response.text();
      console.warn(`Warning: Failed to create public link: ${response.status()}`);
      throw new Error(`Failed to create public link: ${response.status()} ${errorText}`);
    }

    const contentType = response.headers()["content-type"];
    if (!contentType || !contentType.includes("application/json")) {
      console.warn(`Warning: Unexpected content type when creating public link: ${contentType}`);
      throw new Error(`Unexpected content type: ${contentType}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Warning: Error creating public link: ${error}`);
    throw error;
  }
}

/**
 * Update public link settings via API
 * @param page - Playwright page instance (for cookies)
 * @param noteId - Note ID
 * @param updates - Fields to update (e.g., { is_enabled: false })
 */
export async function updatePublicLinkViaAPI(
  page: Page,
  noteId: string,
  updates: { is_enabled?: boolean }
): Promise<PublicLinkResponse> {
  const context = page.context();
  const cookies = await context.cookies();

  try {
    const response = await page.request.patch(`http://localhost:3000/api/notes/${noteId}/public-link`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
      },
      data: updates,
    });

    if (!response.ok()) {
      const errorText = await response.text();
      console.warn(`Warning: Failed to update public link: ${response.status()}`);
      throw new Error(`Failed to update public link: ${response.status()} ${errorText}`);
    }

    const contentType = response.headers()["content-type"];
    if (!contentType || !contentType.includes("application/json")) {
      console.warn(`Warning: Unexpected content type when updating public link: ${contentType}`);
      throw new Error(`Unexpected content type: ${contentType}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Warning: Error updating public link: ${error}`);
    throw error;
  }
}
