import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingNote,
  getPendingNote,
  isPendingNoteExpired,
  PENDING_NOTE_EXPIRATION_MS,
  PENDING_NOTE_KEY,
  savePendingNote,
  type PendingNote,
} from "@/lib/utils/pending-note.utils";

describe("pending-note.utils", () => {
  // Helper to create a valid pending note
  const createValidNote = (overrides: Partial<PendingNote> = {}): PendingNote => ({
    summary_text: "Test summary",
    goal_status: "achieved",
    suggested_tag: "Work",
    original_content: "Test content",
    meeting_date: "2025-01-31",
    generated_at: Date.now(),
    ...overrides,
  });

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    sessionStorage.clear();
  });

  // ============================================================================
  // savePendingNote
  // ============================================================================

  describe("savePendingNote", () => {
    describe("happy path", () => {
      it("should save note to sessionStorage", () => {
        // Arrange
        const note = createValidNote();

        // Act
        savePendingNote(note);

        // Assert
        const stored = sessionStorage.getItem(PENDING_NOTE_KEY);
        expect(stored).toBeTruthy();

        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed).toEqual(note);
        }
      });

      it("should serialize all fields correctly", () => {
        // Arrange
        const note = createValidNote({
          summary_text: "Complex summary with 'quotes' and special chars: @#$%",
          goal_status: "not_achieved",
          suggested_tag: null,
          meeting_date: null,
        });

        // Act
        savePendingNote(note);

        // Assert
        const stored = sessionStorage.getItem(PENDING_NOTE_KEY);
        expect(stored).toBeTruthy();

        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed.summary_text).toBe(note.summary_text);
          expect(parsed.goal_status).toBe("not_achieved");
          expect(parsed.suggested_tag).toBeNull();
          expect(parsed.meeting_date).toBeNull();
        }
      });

      it("should overwrite existing note", () => {
        // Arrange
        const firstNote = createValidNote({ summary_text: "First" });
        const secondNote = createValidNote({ summary_text: "Second" });

        // Act
        savePendingNote(firstNote);
        savePendingNote(secondNote);

        // Assert
        const stored = sessionStorage.getItem(PENDING_NOTE_KEY);
        expect(stored).toBeTruthy();

        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed.summary_text).toBe("Second");
        }
      });
    });

    describe("sessionStorage unavailable", () => {
      it("should log warning when sessionStorage is completely unavailable", () => {
        // Arrange
        const note = createValidNote();
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        // Mock sessionStorage to simulate unavailable storage
        const setItemSpy = vi.spyOn(sessionStorage, "setItem").mockImplementation(() => {
          throw new Error("SecurityError");
        });

        // Act
        savePendingNote(note);

        // Assert
        expect(consoleWarnSpy).toHaveBeenCalledWith("sessionStorage is not available. Pending note will not be saved.");

        // Cleanup
        consoleWarnSpy.mockRestore();
        setItemSpy.mockRestore();
      });

      it("should not throw when sessionStorage.setItem fails", () => {
        // Arrange
        const note = createValidNote();
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        let callCount = 0;
        // Mock sessionStorage.setItem:
        // - First call (isStorageAvailable check) succeeds
        // - Second call (actual save) throws error
        const setItemSpy = vi.spyOn(sessionStorage, "setItem").mockImplementation(() => {
          callCount++;
          if (callCount > 1) {
            throw new Error("QuotaExceededError");
          }
        });

        // Act & Assert - should not throw
        expect(() => savePendingNote(note)).not.toThrow();
        expect(consoleErrorSpy).toHaveBeenCalled();

        // Cleanup
        consoleErrorSpy.mockRestore();
        setItemSpy.mockRestore();
      });
    });
  });

  // ============================================================================
  // getPendingNote
  // ============================================================================

  describe("getPendingNote", () => {
    describe("sessionStorage unavailable", () => {
      it("should return null when sessionStorage is completely unavailable", () => {
        // Arrange - Mock sessionStorage to simulate unavailable storage
        // isStorageAvailable() calls setItem with "__storage_test__"
        const setItemSpy = vi.spyOn(sessionStorage, "setItem").mockImplementation(() => {
          throw new Error("SecurityError: The operation is insecure");
        });

        // Act
        const result = getPendingNote();

        // Assert
        expect(result).toBeNull();

        // Cleanup
        setItemSpy.mockRestore();
      });
    });

    describe("happy path", () => {
      it("should retrieve valid note from sessionStorage", () => {
        // Arrange
        const note = createValidNote();
        savePendingNote(note);

        // Act
        const retrieved = getPendingNote();

        // Assert
        expect(retrieved).toEqual(note);
      });

      it("should return note with all fields intact", () => {
        // Arrange
        const note = createValidNote({
          summary_text: "Detailed summary",
          goal_status: "not_achieved",
          suggested_tag: "Personal",
          original_content: "Long original content...",
          meeting_date: "2025-02-15",
        });
        savePendingNote(note);

        // Act
        const retrieved = getPendingNote();

        // Assert
        expect(retrieved?.summary_text).toBe("Detailed summary");
        expect(retrieved?.goal_status).toBe("not_achieved");
        expect(retrieved?.suggested_tag).toBe("Personal");
        expect(retrieved?.meeting_date).toBe("2025-02-15");
      });
    });

    describe("no note exists", () => {
      it("should return null when no note is stored", () => {
        // Act
        const result = getPendingNote();

        // Assert
        expect(result).toBeNull();
      });

      it("should return null when storage is empty", () => {
        sessionStorage.clear();

        const result = getPendingNote();

        expect(result).toBeNull();
      });
    });

    describe("expiration handling", () => {
      it("should return note that is not expired (within 30 minutes)", () => {
        // Arrange - Note generated 29 minutes ago
        const twentyNineMinutesAgo = Date.now() - 29 * 60 * 1000;
        const note = createValidNote({ generated_at: twentyNineMinutesAgo });
        savePendingNote(note);

        // Act
        const retrieved = getPendingNote();

        // Assert
        expect(retrieved).toEqual(note);
      });

      it("should return null for expired note (> 30 minutes)", () => {
        // Arrange - Note generated 31 minutes ago
        const thirtyOneMinutesAgo = Date.now() - 31 * 60 * 1000;
        const note = createValidNote({ generated_at: thirtyOneMinutesAgo });
        savePendingNote(note);

        // Act
        const retrieved = getPendingNote();

        // Assert
        expect(retrieved).toBeNull();
      });

      it("should clear expired note from storage", () => {
        // Arrange
        const expiredNote = createValidNote({
          generated_at: Date.now() - PENDING_NOTE_EXPIRATION_MS - 1000,
        });
        savePendingNote(expiredNote);

        // Act
        getPendingNote();

        // Assert - note should be removed
        const stored = sessionStorage.getItem(PENDING_NOTE_KEY);
        expect(stored).toBeNull();
      });

      it("should handle expiration boundary (exactly 30 minutes)", () => {
        // Arrange - Mock Date.now() to ensure stable timestamp
        const mockNow = 1234567890000;
        const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(mockNow);

        const exactlyThirtyMinutes = mockNow - PENDING_NOTE_EXPIRATION_MS;
        const note = createValidNote({ generated_at: exactlyThirtyMinutes });
        savePendingNote(note);

        // Act
        const retrieved = getPendingNote();

        // Assert - should NOT be expired (condition is > not >=)
        expect(retrieved).toEqual(note);

        // Cleanup
        dateNowSpy.mockRestore();
      });

      it("should return null just after expiration (30:01)", () => {
        // Arrange - Mock Date.now() to ensure stable timestamp
        const mockNow = 1234567890000;
        const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(mockNow);

        const note = createValidNote({
          generated_at: mockNow - PENDING_NOTE_EXPIRATION_MS - 1,
        });
        savePendingNote(note);

        // Act
        const retrieved = getPendingNote();

        // Assert
        expect(retrieved).toBeNull();

        // Cleanup
        dateNowSpy.mockRestore();
      });

      it("should handle expiration boundary (29:59)", () => {
        // Arrange - Mock Date.now() to ensure stable timestamp
        const mockNow = 1234567890000;
        const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(mockNow);

        const almostThirtyMinutes = mockNow - PENDING_NOTE_EXPIRATION_MS + 1;
        const note = createValidNote({ generated_at: almostThirtyMinutes });
        savePendingNote(note);

        // Act
        const retrieved = getPendingNote();

        // Assert - should NOT be expired
        expect(retrieved).toEqual(note);

        // Cleanup
        dateNowSpy.mockRestore();
      });
    });

    describe("corrupted data handling", () => {
      it("should return null for invalid JSON", () => {
        // Suppress expected error logs in this test
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        // Arrange - Store invalid JSON
        sessionStorage.setItem(PENDING_NOTE_KEY, '{"invalid":"json');

        // Act
        const result = getPendingNote();

        // Assert
        expect(result).toBeNull();

        // Cleanup
        consoleErrorSpy.mockRestore();
      });

      it("should clear corrupted data from storage", () => {
        // Suppress expected error logs in this test
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        // Arrange
        sessionStorage.setItem(PENDING_NOTE_KEY, "not json at all");

        // Act
        getPendingNote();

        // Assert - corrupted data should be cleared
        const stored = sessionStorage.getItem(PENDING_NOTE_KEY);
        expect(stored).toBeNull();

        // Cleanup
        consoleErrorSpy.mockRestore();
      });

      it("should handle null stored value", () => {
        // Arrange
        sessionStorage.setItem(PENDING_NOTE_KEY, "null");

        // Act
        const result = getPendingNote();

        // Assert
        expect(result).toBeNull();
      });

      it("should handle empty string", () => {
        // Arrange
        sessionStorage.setItem(PENDING_NOTE_KEY, "");

        // Act
        const result = getPendingNote();

        // Assert
        expect(result).toBeNull();
      });
    });

    describe("invalid structure handling", () => {
      it("should return null for missing summary_text", () => {
        // Arrange
        const invalid = {
          goal_status: "achieved",
          original_content: "Test",
          generated_at: Date.now(),
        };
        sessionStorage.setItem(PENDING_NOTE_KEY, JSON.stringify(invalid));

        // Act
        const result = getPendingNote();

        // Assert
        expect(result).toBeNull();
      });

      it("should return null for missing goal_status", () => {
        // Arrange
        const invalid = {
          summary_text: "Test",
          original_content: "Test",
          generated_at: Date.now(),
        };
        sessionStorage.setItem(PENDING_NOTE_KEY, JSON.stringify(invalid));

        // Act
        const result = getPendingNote();

        // Assert
        expect(result).toBeNull();
      });

      it("should return null for missing original_content", () => {
        // Arrange
        const invalid = {
          summary_text: "Test",
          goal_status: "achieved",
          generated_at: Date.now(),
        };
        sessionStorage.setItem(PENDING_NOTE_KEY, JSON.stringify(invalid));

        // Act
        const result = getPendingNote();

        // Assert
        expect(result).toBeNull();
      });

      it("should return null for missing generated_at", () => {
        // Arrange
        const invalid = {
          summary_text: "Test",
          goal_status: "achieved",
          original_content: "Test",
        };
        sessionStorage.setItem(PENDING_NOTE_KEY, JSON.stringify(invalid));

        // Act
        const result = getPendingNote();

        // Assert
        expect(result).toBeNull();
      });

      it("should return null for wrong types", () => {
        // Arrange - generated_at should be number, not string
        const invalid = {
          summary_text: "Test",
          goal_status: "achieved",
          original_content: "Test",
          generated_at: "not a number",
        };
        sessionStorage.setItem(PENDING_NOTE_KEY, JSON.stringify(invalid));

        // Act
        const result = getPendingNote();

        // Assert
        expect(result).toBeNull();
      });

      it("should clear invalid structure from storage", () => {
        // Arrange
        const invalid = { summary_text: "Test" };
        sessionStorage.setItem(PENDING_NOTE_KEY, JSON.stringify(invalid));

        // Act
        getPendingNote();

        // Assert
        const stored = sessionStorage.getItem(PENDING_NOTE_KEY);
        expect(stored).toBeNull();
      });
    });
  });

  // ============================================================================
  // clearPendingNote
  // ============================================================================

  describe("clearPendingNote", () => {
    describe("sessionStorage unavailable", () => {
      it("should return early when sessionStorage is completely unavailable", () => {
        // Arrange - Mock sessionStorage to simulate unavailable storage
        const setItemSpy = vi.spyOn(sessionStorage, "setItem").mockImplementation(() => {
          throw new Error("SecurityError");
        });

        // Act & Assert - should not throw
        expect(() => clearPendingNote()).not.toThrow();

        // Cleanup
        setItemSpy.mockRestore();
      });
    });

    it("should remove note from sessionStorage", () => {
      // Arrange
      const note = createValidNote();
      savePendingNote(note);
      expect(sessionStorage.getItem(PENDING_NOTE_KEY)).toBeTruthy();

      // Act
      clearPendingNote();

      // Assert
      expect(sessionStorage.getItem(PENDING_NOTE_KEY)).toBeNull();
    });

    it("should not throw if no note exists", () => {
      // Act & Assert
      expect(() => clearPendingNote()).not.toThrow();
    });

    it("should not throw if sessionStorage is unavailable", () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock removeItem to throw, but allow isStorageAvailable to succeed
      let removeCallCount = 0;
      const removeItemSpy = vi.spyOn(sessionStorage, "removeItem").mockImplementation(() => {
        removeCallCount++;
        // First call is from isStorageAvailable test - let it succeed
        if (removeCallCount > 1) {
          throw new Error("Storage error");
        }
      });

      // Act & Assert
      expect(() => clearPendingNote()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to clear pending note:", expect.any(Error));

      // Cleanup
      consoleErrorSpy.mockRestore();
      removeItemSpy.mockRestore();
    });

    it("should work multiple times", () => {
      // Arrange
      savePendingNote(createValidNote());

      // Act
      clearPendingNote();
      clearPendingNote();
      clearPendingNote();

      // Assert
      expect(sessionStorage.getItem(PENDING_NOTE_KEY)).toBeNull();
    });
  });

  // ============================================================================
  // isPendingNoteExpired
  // ============================================================================

  describe("isPendingNoteExpired", () => {
    describe("sessionStorage unavailable", () => {
      it("should return false when sessionStorage is completely unavailable", () => {
        // Arrange - Mock sessionStorage to simulate unavailable storage
        const setItemSpy = vi.spyOn(sessionStorage, "setItem").mockImplementation(() => {
          throw new Error("SecurityError");
        });

        // Act
        const result = isPendingNoteExpired();

        // Assert
        expect(result).toBe(false);

        // Cleanup
        setItemSpy.mockRestore();
      });
    });

    it("should return false when no note exists", () => {
      // Act
      const result = isPendingNoteExpired();

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for valid note (not expired)", () => {
      // Arrange
      const note = createValidNote({ generated_at: Date.now() - 5 * 60 * 1000 }); // 5 minutes ago
      savePendingNote(note);

      // Act
      const result = isPendingNoteExpired();

      // Assert
      expect(result).toBe(false);
    });

    it("should return true for expired note (> 30 minutes)", () => {
      // Arrange
      const expiredNote = createValidNote({
        generated_at: Date.now() - 31 * 60 * 1000,
      });
      savePendingNote(expiredNote);

      // Act
      const result = isPendingNoteExpired();

      // Assert
      expect(result).toBe(true);
    });

    it("should return false at expiration boundary (exactly 30 minutes)", () => {
      // Arrange - Exactly 30 minutes (condition is > not >=)
      const note = createValidNote({
        generated_at: Date.now() - PENDING_NOTE_EXPIRATION_MS,
      });
      savePendingNote(note);

      // Act
      const result = isPendingNoteExpired();

      // Assert
      expect(result).toBe(false);
    });

    it("should return true just after expiration (30:01)", () => {
      // Arrange - Just over 30 minutes (1 ms more)
      const note = createValidNote({
        generated_at: Date.now() - PENDING_NOTE_EXPIRATION_MS - 1,
      });
      savePendingNote(note);

      // Act
      const result = isPendingNoteExpired();

      // Assert
      expect(result).toBe(true);
    });

    it("should return false just before expiration (29:59)", () => {
      // Arrange
      const note = createValidNote({
        generated_at: Date.now() - PENDING_NOTE_EXPIRATION_MS + 1,
      });
      savePendingNote(note);

      // Act
      const result = isPendingNoteExpired();

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for corrupted data", () => {
      // Arrange
      sessionStorage.setItem(PENDING_NOTE_KEY, "invalid json");

      // Act
      const result = isPendingNoteExpired();

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for invalid structure (no generated_at)", () => {
      // Arrange
      const invalid = { summary_text: "Test" };
      sessionStorage.setItem(PENDING_NOTE_KEY, JSON.stringify(invalid));

      // Act
      const result = isPendingNoteExpired();

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for wrong type (generated_at as string)", () => {
      // Arrange
      const invalid = {
        summary_text: "Test",
        goal_status: "achieved",
        original_content: "Test",
        generated_at: "not a number",
      };
      sessionStorage.setItem(PENDING_NOTE_KEY, JSON.stringify(invalid));

      // Act
      const result = isPendingNoteExpired();

      // Assert
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Integration scenarios
  // ============================================================================

  describe("integration scenarios", () => {
    it("should handle complete workflow: save → get → clear", () => {
      // Arrange
      const note = createValidNote();

      // Act & Assert - Save
      savePendingNote(note);
      expect(sessionStorage.getItem(PENDING_NOTE_KEY)).toBeTruthy();

      // Act & Assert - Get
      const retrieved = getPendingNote();
      expect(retrieved).toEqual(note);

      // Act & Assert - Clear
      clearPendingNote();
      expect(sessionStorage.getItem(PENDING_NOTE_KEY)).toBeNull();
      expect(getPendingNote()).toBeNull();
    });

    it("should handle save → check expiration → get", () => {
      // Arrange - Fresh note
      const note = createValidNote({ generated_at: Date.now() });

      // Act & Assert
      savePendingNote(note);
      expect(isPendingNoteExpired()).toBe(false);
      expect(getPendingNote()).toEqual(note);
    });

    it("should auto-clear expired note on get", () => {
      // Arrange - Expired note
      const expiredNote = createValidNote({
        generated_at: Date.now() - 32 * 60 * 1000,
      });
      savePendingNote(expiredNote);

      // Act & Assert - First get should return null and clear
      expect(getPendingNote()).toBeNull();
      expect(sessionStorage.getItem(PENDING_NOTE_KEY)).toBeNull();

      // Second get should also return null
      expect(getPendingNote()).toBeNull();
    });

    it("should handle null values for optional fields", () => {
      // Arrange
      const note = createValidNote({
        suggested_tag: null,
        meeting_date: null,
      });

      // Act
      savePendingNote(note);
      const retrieved = getPendingNote();

      // Assert
      expect(retrieved?.suggested_tag).toBeNull();
      expect(retrieved?.meeting_date).toBeNull();
    });
  });

  // ============================================================================
  // Constants validation
  // ============================================================================

  describe("constants", () => {
    it("should have correct storage key", () => {
      expect(PENDING_NOTE_KEY).toBe("pendingNote");
    });

    it("should have correct expiration time (30 minutes)", () => {
      const thirtyMinutesInMs = 30 * 60 * 1000;
      expect(PENDING_NOTE_EXPIRATION_MS).toBe(thirtyMinutesInMs);
      expect(PENDING_NOTE_EXPIRATION_MS).toBe(1800000);
    });
  });
});
