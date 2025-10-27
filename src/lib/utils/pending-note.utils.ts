/**
 * Pending Note Utilities
 *
 * Manages temporary storage of AI-generated notes for anonymous users
 * Uses sessionStorage with 30-minute expiration
 */

import type { GoalStatus } from "@/types";

// ============================================================================
// Constants
// ============================================================================

/** Storage key for pending note */
export const PENDING_NOTE_KEY = "pendingNote";

/** Expiration time: 30 minutes in milliseconds */
export const PENDING_NOTE_EXPIRATION_MS = 30 * 60 * 1000;

// ============================================================================
// Types
// ============================================================================

/**
 * Structure of a pending note stored in sessionStorage
 */
export interface PendingNote {
  /** AI-generated summary text */
  summary_text: string;
  /** Goal achievement status */
  goal_status: GoalStatus;
  /** Suggested tag name (nullable) */
  suggested_tag: string | null;
  /** Original content that was summarized */
  original_content: string;
  /** Meeting date (ISO string, nullable) */
  meeting_date: string | null;
  /** Timestamp when note was generated (for expiration tracking) */
  generated_at: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if sessionStorage is available
 * Returns false in environments where storage is disabled or unavailable
 */
function isStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Saves a pending note to sessionStorage
 *
 * @param note - The note data to save
 * @throws Will silently fail if sessionStorage is unavailable
 *
 * @example
 * savePendingNote({
 *   summary_text: "Meeting summary...",
 *   goal_status: "achieved",
 *   suggested_tag: "Work",
 *   original_content: "Original text...",
 *   meeting_date: "2025-01-15",
 *   generated_at: Date.now()
 * });
 */
export function savePendingNote(note: PendingNote): void {
  if (!isStorageAvailable()) {
    // eslint-disable-next-line no-console
    console.warn("sessionStorage is not available. Pending note will not be saved.");
    return;
  }

  try {
    const serialized = JSON.stringify(note);
    sessionStorage.setItem(PENDING_NOTE_KEY, serialized);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to save pending note:", error);
  }
}

/**
 * Retrieves a pending note from sessionStorage
 *
 * @returns The pending note if valid and not expired, otherwise null
 *
 * @example
 * const note = getPendingNote();
 * if (note) {
 *   console.log("Found pending note:", note.summary_text);
 * }
 */
export function getPendingNote(): PendingNote | null {
  if (!isStorageAvailable()) {
    return null;
  }

  try {
    const serialized = sessionStorage.getItem(PENDING_NOTE_KEY);

    if (!serialized) {
      return null;
    }

    const note = JSON.parse(serialized) as PendingNote;

    // Validate structure
    if (
      !note ||
      typeof note.summary_text !== "string" ||
      typeof note.goal_status !== "string" ||
      typeof note.original_content !== "string" ||
      typeof note.generated_at !== "number"
    ) {
      // Invalid structure - clear it
      clearPendingNote();
      return null;
    }

    // Check expiration
    const now = Date.now();
    const age = now - note.generated_at;

    if (age > PENDING_NOTE_EXPIRATION_MS) {
      // Expired - clear it
      clearPendingNote();
      return null;
    }

    return note;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to retrieve pending note:", error);
    // Clear corrupted data
    clearPendingNote();
    return null;
  }
}

/**
 * Clears the pending note from sessionStorage
 *
 * @example
 * clearPendingNote(); // Note is removed from storage
 */
export function clearPendingNote(): void {
  if (!isStorageAvailable()) {
    return;
  }

  try {
    sessionStorage.removeItem(PENDING_NOTE_KEY);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to clear pending note:", error);
  }
}

/**
 * Checks if the current pending note has expired
 *
 * @returns true if note exists and is expired, false otherwise
 *
 * @example
 * if (isPendingNoteExpired()) {
 *   console.log("Note has expired and should be discarded");
 * }
 */
export function isPendingNoteExpired(): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    const serialized = sessionStorage.getItem(PENDING_NOTE_KEY);

    if (!serialized) {
      return false;
    }

    const note = JSON.parse(serialized) as PendingNote;

    if (!note || typeof note.generated_at !== "number") {
      return false;
    }

    const now = Date.now();
    const age = now - note.generated_at;

    return age > PENDING_NOTE_EXPIRATION_MS;
  } catch {
    return false;
  }
}
