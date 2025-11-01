import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotesService } from "@/lib/services/notes.service";
import type { Database } from "@/db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Unit tests for NotesService
 * Focus: Find-or-create tag logic, tag resolution, access control
 * Coverage target: 75%
 */

describe("NotesService", () => {
  let service: NotesService;
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    } as unknown as SupabaseClient<Database>;

    service = new NotesService(mockSupabase);
  });

  describe("getNotes - List with Filtering", () => {
    const userId = "user-123";

    it("should fetch own notes without shared notes", async () => {
      const mockOwnNotes = [
        {
          id: "note-1",
          summary_text: "Summary 1",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z",
          updated_at: "2025-10-31T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
      ];

      // Mock own notes query
      const mockNotesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockNotesQuery.eq.mockResolvedValue({
        data: mockOwnNotes,
        error: null,
      });

      // Mock public_links query
      const mockPublicLinksQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      // Mock RPC for shared counts
      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [],
        error: null,
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockNotesQuery) // Own notes
        .mockReturnValueOnce(mockPublicLinksQuery); // Public links

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: false,
      });

      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].id).toBe("note-1");
      expect(result.pagination.total).toBe(1);
    });

    it("should filter shared notes by tag_id and goal_status", async () => {
      const userId = "user-123";
      const tagId = "tag-filter";
      const mockOwnNotes: never[] = [];
      const mockSharedNotes = [
        {
          id: "note-shared",
          user_id: "other-user",
          summary_text: "Shared note",
          goal_status: "achieved",
          meeting_date: "2025-10-15",
          is_ai_generated: true,
          created_at: "2025-10-15T12:00:00Z",
          updated_at: "2025-10-15T12:00:00Z",
          tags: { id: tagId, name: "Shared" },
        },
      ];

      const mockOwnQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockOwnQuery.eq
        .mockReturnValueOnce(mockOwnQuery)
        .mockReturnValueOnce(mockOwnQuery)
        .mockResolvedValueOnce({ data: mockOwnNotes, error: null });

      const mockTagAccessQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ tag_id: tagId }],
          error: null,
        }),
      };

      const mockSharedQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockSharedQuery.eq
        .mockReturnValueOnce(mockSharedQuery)
        .mockResolvedValueOnce({ data: mockSharedNotes, error: null });

      const mockPublicLinksQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockOwnQuery)
        .mockReturnValueOnce(mockTagAccessQuery)
        .mockReturnValueOnce(mockSharedQuery)
        .mockReturnValueOnce(mockPublicLinksQuery);

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: true,
        tag_id: tagId,
        goal_status: "achieved",
      });

      expect(result.notes).toHaveLength(1);
      expect(mockSharedQuery.eq).toHaveBeenCalledWith("tag_id", tagId);
      expect(mockSharedQuery.eq).toHaveBeenCalledWith("goal_status", "achieved");
    });

    it("should filter shared notes by date range", async () => {
      const userId = "user-123";
      const mockOwnNotes: never[] = [];
      const mockSharedNotes = [
        {
          id: "note-shared",
          user_id: "other-user",
          summary_text: "Shared note",
          goal_status: "achieved",
          meeting_date: "2025-10-15",
          is_ai_generated: true,
          created_at: "2025-10-15T12:00:00Z",
          updated_at: "2025-10-15T12:00:00Z",
          tags: { id: "tag-2", name: "Shared" },
        },
      ];

      const mockOwnQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      };
      mockOwnQuery.lte.mockResolvedValue({ data: mockOwnNotes, error: null });

      const mockTagAccessQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ tag_id: "tag-2" }],
          error: null,
        }),
      };

      const mockSharedQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      };
      mockSharedQuery.lte.mockResolvedValue({ data: mockSharedNotes, error: null });

      const mockPublicLinksQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockOwnQuery)
        .mockReturnValueOnce(mockTagAccessQuery)
        .mockReturnValueOnce(mockSharedQuery)
        .mockReturnValueOnce(mockPublicLinksQuery);

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: true,
        date_from: "2025-10-01",
        date_to: "2025-10-31",
      });

      expect(result.notes).toHaveLength(1);
      expect(mockSharedQuery.gte).toHaveBeenCalledWith("meeting_date", "2025-10-01");
      expect(mockSharedQuery.lte).toHaveBeenCalledWith("meeting_date", "2025-10-31");
    });

    it("should include shared notes when user has tag access", async () => {
      const mockOwnNotes = [
        {
          id: "note-own",
          summary_text: "Own",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z",
          updated_at: "2025-10-31T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
      ];

      const mockSharedNotes = [
        {
          id: "note-shared",
          summary_text: "Shared",
          goal_status: "achieved",
          meeting_date: "2025-10-30",
          is_ai_generated: true,
          created_at: "2025-10-30T12:00:00Z",
          updated_at: "2025-10-30T12:00:00Z",
          user_id: "other-user",
          tags: { id: "tag-2", name: "Shared" },
        },
      ];

      // Mock own notes
      const mockOwnQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockOwnQuery.eq.mockResolvedValue({ data: mockOwnNotes, error: null });

      // Mock tag_access to return shared tag IDs
      const mockTagAccessQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockTagAccessQuery.eq.mockResolvedValue({
        data: [{ tag_id: "tag-2" }],
        error: null,
      });

      // Mock shared notes query
      const mockSharedQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
      };
      mockSharedQuery.in.mockResolvedValue({ data: mockSharedNotes, error: null });

      // Mock public_links
      const mockPublicLinksQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      // Mock RPC
      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockOwnQuery) // Own notes
        .mockReturnValueOnce(mockTagAccessQuery) // Tag access
        .mockReturnValueOnce(mockSharedQuery) // Shared notes
        .mockReturnValueOnce(mockPublicLinksQuery); // Public links

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: true,
      });

      expect(result.notes).toHaveLength(2);
      expect(result.notes.some((n) => n.id === "note-own")).toBe(true);
      expect(result.notes.some((n) => n.id === "note-shared")).toBe(true);
    });

    it("should handle empty shared tags gracefully", async () => {
      const mockOwnNotes = [
        {
          id: "note-1",
          summary_text: "Own",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z",
          updated_at: "2025-10-31T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
      ];

      const mockOwnQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockOwnQuery.eq.mockResolvedValue({ data: mockOwnNotes, error: null });

      // Mock tag_access - no shared tags
      const mockTagAccessQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockTagAccessQuery.eq.mockResolvedValue({ data: [], error: null });

      // Mock public_links
      const mockPublicLinksQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockOwnQuery)
        .mockReturnValueOnce(mockTagAccessQuery)
        .mockReturnValueOnce(mockPublicLinksQuery);

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: true,
      });

      // Should only have own notes (no shared)
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].id).toBe("note-1");
    });

    it("should throw error when fetching shared tags fails", async () => {
      const mockOwnNotes: never[] = [];

      const mockOwnQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockOwnQuery.eq.mockResolvedValue({ data: mockOwnNotes, error: null });

      // Mock tag_access error
      const mockTagAccessQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockTagAccessQuery.eq.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockOwnQuery)
        .mockReturnValueOnce(mockTagAccessQuery);

      await expect(
        service.getNotes(userId, {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
          include_shared: true,
        })
      ).rejects.toThrow("Failed to fetch shared tags");
    });

    it("should throw error when fetching shared notes fails", async () => {
      const mockOwnNotes: never[] = [];

      const mockOwnQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockOwnQuery.eq.mockResolvedValue({ data: mockOwnNotes, error: null });

      const mockTagAccessQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockTagAccessQuery.eq.mockResolvedValue({
        data: [{ tag_id: "tag-1" }],
        error: null,
      });

      // Mock shared notes error
      const mockSharedQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
      };
      mockSharedQuery.in.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockOwnQuery)
        .mockReturnValueOnce(mockTagAccessQuery)
        .mockReturnValueOnce(mockSharedQuery);

      await expect(
        service.getNotes(userId, {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
          include_shared: true,
        })
      ).rejects.toThrow("Failed to fetch shared notes");
    });

    it("should throw error when fetching own notes fails", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockQuery.eq.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await expect(
        service.getNotes(userId, {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
          include_shared: false,
        })
      ).rejects.toThrow("Failed to fetch own notes");
    });

    it("should handle empty notes list (no public links to fetch)", async () => {
      const mockEmptyQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [], // No notes
          error: null,
        }),
      };

      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockEmptyQuery);

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: false,
      });

      expect(result.notes).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      // Should not try to fetch public links when there are no notes
    });

    it("should handle public_links query error gracefully", async () => {
      const mockOwnNotes = [
        {
          id: "note-1",
          summary_text: "Summary",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z",
          updated_at: "2025-10-31T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
      ];

      const mockNotesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockNotesQuery.eq.mockResolvedValue({ data: mockOwnNotes, error: null });

      // Mock public_links error - should be handled gracefully
      const mockPublicLinksQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "DB error" },
        }),
      };

      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockNotesQuery)
        .mockReturnValueOnce(mockPublicLinksQuery);

      // Should not throw - gracefully handle error
      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: false,
      });

      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].has_public_link).toBe(false); // Default when error
    });

    it("should handle shared_recipients RPC error gracefully", async () => {
      const mockOwnNotes = [
        {
          id: "note-1",
          summary_text: "Summary",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z",
          updated_at: "2025-10-31T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
      ];

      const mockNotesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockNotesQuery.eq.mockResolvedValue({ data: mockOwnNotes, error: null });

      const mockPublicLinksQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      // Mock RPC error - should be handled gracefully
      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: "RPC error" },
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockNotesQuery)
        .mockReturnValueOnce(mockPublicLinksQuery);

      // Should not throw
      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: false,
      });

      expect(result.notes).toHaveLength(1);
      // shared_recipients should not be included when RPC fails
    });

    it("should filter by tag_id and goal_status", async () => {
      const tagId = "tag-work";
      const mockNotes = [
        {
          id: "note-1",
          summary_text: "Achieved goal",
          goal_status: "achieved",
          meeting_date: "2025-10-15",
          is_ai_generated: true,
          created_at: "2025-10-15T12:00:00Z",
          updated_at: "2025-10-15T12:00:00Z",
          user_id: userId,
          tags: { id: tagId, name: "Work" },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // The last eq in the chain should resolve with data
      mockQuery.eq
        .mockReturnValueOnce(mockQuery) // user_id
        .mockReturnValueOnce(mockQuery) // tag_id
        .mockResolvedValueOnce({ data: mockNotes, error: null }); // goal_status

      const mockPublicLinks = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockPublicLinks);

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: false,
        tag_id: tagId,
        goal_status: "achieved",
      });

      expect(result.notes).toHaveLength(1);
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", userId);
      expect(mockQuery.eq).toHaveBeenCalledWith("tag_id", tagId);
      expect(mockQuery.eq).toHaveBeenCalledWith("goal_status", "achieved");
    });

    it("should filter by date range (date_from and date_to)", async () => {
      const mockNotes = [
        {
          id: "note-1",
          summary_text: "1",
          goal_status: "achieved",
          meeting_date: "2025-10-15",
          is_ai_generated: true,
          created_at: "2025-10-15T12:00:00Z",
          updated_at: "2025-10-15T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      };
      mockQuery.lte.mockResolvedValue({ data: mockNotes, error: null });

      const mockPublicLinks = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockPublicLinks);

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: false,
        date_from: "2025-10-01",
        date_to: "2025-10-31",
      });

      expect(result.notes).toHaveLength(1);
      expect(mockQuery.gte).toHaveBeenCalledWith("meeting_date", "2025-10-01");
      expect(mockQuery.lte).toHaveBeenCalledWith("meeting_date", "2025-10-31");
    });

    it("should sort by meeting_date ascending", async () => {
      const mockNotes = [
        {
          id: "note-new",
          summary_text: "New",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z",
          updated_at: "2025-10-31T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
        {
          id: "note-old",
          summary_text: "Old",
          goal_status: "achieved",
          meeting_date: "2025-10-28",
          is_ai_generated: true,
          created_at: "2025-10-28T12:00:00Z",
          updated_at: "2025-10-28T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockQuery.eq.mockResolvedValue({ data: mockNotes, error: null });

      const mockPublicLinks = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockPublicLinks);

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "meeting_date",
        order: "asc", // Ascending
        include_shared: false,
      });

      // Should be sorted oldest first (note-old, note-new)
      expect(result.notes[0].id).toBe("note-old");
      expect(result.notes[1].id).toBe("note-new");
    });

    it("should sort by updated_at descending", async () => {
      const mockNotes = [
        {
          id: "note-1",
          summary_text: "1",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z",
          updated_at: "2025-10-31T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
        {
          id: "note-2",
          summary_text: "2",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z",
          updated_at: "2025-10-31T14:00:00Z", // Updated later
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockQuery.eq.mockResolvedValue({ data: mockNotes, error: null });

      const mockPublicLinks = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockPublicLinks);

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "updated_at",
        order: "desc",
        include_shared: false,
      });

      // Should be sorted by updated_at desc (note-2, note-1)
      expect(result.notes[0].id).toBe("note-2");
      expect(result.notes[1].id).toBe("note-1");
    });

    it("should use secondary sort by ID when primary sort values are equal", async () => {
      const mockNotes = [
        {
          id: "note-aaa",
          summary_text: "First alphabetically",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z", // Same timestamp
          updated_at: "2025-10-31T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
        {
          id: "note-zzz",
          summary_text: "Last alphabetically",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z", // Same timestamp
          updated_at: "2025-10-31T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockQuery.eq.mockResolvedValue({ data: mockNotes, error: null });

      const mockPublicLinks = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockPublicLinks);

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: false,
      });

      // When timestamps are equal, should use secondary sort by ID
      // The sort logic ensures stable pagination
      expect(result.notes[0].id).toBe("note-aaa");
      expect(result.notes[1].id).toBe("note-zzz");
    });

    it("should sort multiple notes with same timestamp by ID in both directions", async () => {
      // Test with 3+ notes to ensure sort compares IDs in both directions
      const mockNotes = [
        {
          id: "note-zzz",
          summary_text: "Last alphabetically",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z", // Same timestamp
          updated_at: "2025-10-31T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
        {
          id: "note-aaa",
          summary_text: "First alphabetically",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z", // Same timestamp
          updated_at: "2025-10-31T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
        {
          id: "note-mmm",
          summary_text: "Middle alphabetically",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z", // Same timestamp
          updated_at: "2025-10-31T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockQuery.eq.mockResolvedValue({ data: mockNotes, error: null });

      const mockTagAccessQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockTagAccessQuery.eq.mockResolvedValue({ data: [], error: null });

      const mockPublicLinks = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockQuery) // Own notes query
        .mockReturnValueOnce(mockPublicLinks); // Public links query (include_shared=false so no tag_access)

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: false,
      });

      // Should be sorted by ID (with multiple elements, sort compares in both directions)
      // Sort algorithm will compare elements bidirectionally to determine final order
      expect(result.notes).toHaveLength(3);
      expect(result.notes[0].id).toBe("note-aaa");
      expect(result.notes[1].id).toBe("note-mmm");
      expect(result.notes[2].id).toBe("note-zzz");
    });

    it("should deduplicate notes when user owns a shared tag", async () => {
      const ownedTagId = "tag-owned-and-shared";
      const duplicateNote = {
        id: "note-duplicate",
        summary_text: "Duplicate",
        goal_status: "achieved",
        meeting_date: "2025-10-31",
        is_ai_generated: true,
        created_at: "2025-10-31T12:00:00Z",
        updated_at: "2025-10-31T12:00:00Z",
        user_id: userId,
        tags: { id: ownedTagId, name: "Owned" },
      };

      // Mock own notes (includes duplicate)
      const mockOwnQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockOwnQuery.eq.mockResolvedValue({ data: [duplicateNote], error: null });

      // Mock tag_access - user has access to their own tag (edge case)
      const mockTagAccessQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockTagAccessQuery.eq.mockResolvedValue({
        data: [{ tag_id: ownedTagId }],
        error: null,
      });

      // Mock shared notes query - returns same note
      const mockSharedQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
      };
      mockSharedQuery.in.mockResolvedValue({ data: [duplicateNote], error: null });

      const mockPublicLinks = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockOwnQuery)
        .mockReturnValueOnce(mockTagAccessQuery)
        .mockReturnValueOnce(mockSharedQuery)
        .mockReturnValueOnce(mockPublicLinks);

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: true,
      });

      // Should only have 1 note (deduplicated)
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].id).toBe("note-duplicate");
    });

    it("should include public_link data when note has active link", async () => {
      const mockNotes = [
        {
          id: "note-with-link",
          summary_text: "Has link",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z",
          updated_at: "2025-10-31T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockQuery.eq.mockResolvedValue({ data: mockNotes, error: null });

      // Mock public_links with active link
      const mockPublicLinks = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ note_id: "note-with-link", is_enabled: true }],
          error: null,
        }),
      };

      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockPublicLinks);

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: false,
      });

      expect(result.notes[0].has_public_link).toBe(true);
    });

    it("should include shared_recipients count for owned tags", async () => {
      const mockNotes = [
        {
          id: "note-1",
          summary_text: "Note",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z",
          updated_at: "2025-10-31T12:00:00Z",
          user_id: userId,
          tags: { id: "tag-1", name: "Work" },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockQuery.eq.mockResolvedValue({ data: mockNotes, error: null });

      const mockPublicLinks = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      // Mock RPC to return shared count
      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ tag_id: "tag-1", recipients_count: 3 }],
        error: null,
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockPublicLinks);

      const result = await service.getNotes(userId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: false,
      });

      expect(result.notes[0].tag.shared_recipients).toBe(3);
    });

    it("should not include shared_recipients for non-owned tags", async () => {
      const sharedUserId = "shared-123";
      const mockNotes = [
        {
          id: "note-shared",
          summary_text: "Shared note",
          goal_status: "achieved",
          meeting_date: "2025-10-31",
          is_ai_generated: true,
          created_at: "2025-10-31T12:00:00Z",
          updated_at: "2025-10-31T12:00:00Z",
          user_id: "other-user", // Not current user
          tags: { id: "tag-shared", name: "Shared" },
        },
      ];

      const mockOwnQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockOwnQuery.eq.mockResolvedValue({ data: [], error: null }); // No own notes

      const mockTagAccess = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockTagAccess.eq.mockResolvedValue({
        data: [{ tag_id: "tag-shared" }],
        error: null,
      });

      const mockSharedQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
      };
      mockSharedQuery.in.mockResolvedValue({ data: mockNotes, error: null });

      const mockPublicLinks = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockOwnQuery)
        .mockReturnValueOnce(mockTagAccess)
        .mockReturnValueOnce(mockSharedQuery)
        .mockReturnValueOnce(mockPublicLinks);

      const result = await service.getNotes(sharedUserId, {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        include_shared: true,
      });

      // shared_recipients should NOT be included for non-owned notes
      expect(result.notes[0].tag.shared_recipients).toBeUndefined();
      expect(result.notes[0].is_owner).toBe(false);
    });
  });

  describe("createNote - Find or Create Tag Logic", () => {
    const userId = "user-123";
    const tagName = "Meeting Notes";

    it("should throw error when neither tag_id nor tag_name provided", async () => {
      await expect(
        service.createNote(userId, {
          original_content: "Test content",
          // No tag_id or tag_name
        })
      ).rejects.toThrow("Either tag_id or tag_name must be provided");
    });

    it("should use existing tag_id when provided", async () => {
      const tagId = "tag-456";

      // Mock: Verify tag ownership
      const mockTagQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: tagId },
          error: null,
        }),
      };

      // Mock: Insert note
      const mockNoteInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "note-789",
            user_id: userId,
            tag_id: tagId,
            original_content: "Test content",
            summary_text: null,
            goal_status: null,
            suggested_tag: null,
            meeting_date: "2025-10-31",
            is_ai_generated: false,
            created_at: "2025-10-31T12:00:00Z",
            updated_at: "2025-10-31T12:00:00Z",
            tags: { id: tagId, name: tagName },
          },
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockTagQuery) // First call: verify tag
        .mockReturnValueOnce(mockNoteInsert); // Second call: insert note

      const result = await service.createNote(userId, {
        tag_id: tagId,
        original_content: "Test content",
      });

      expect(result.id).toBe("note-789");
      expect(result.tag.id).toBe(tagId);
      expect(mockTagQuery.eq).toHaveBeenCalledWith("id", tagId);
      expect(mockTagQuery.eq).toHaveBeenCalledWith("user_id", userId);
    });

    it("should throw error when tag_id is not owned by user", async () => {
      const tagId = "tag-456";

      // Mock: Tag not found (ownership verification failed)
      const mockTagQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockTagQuery);

      await expect(
        service.createNote(userId, {
          tag_id: tagId,
          original_content: "Test content",
        })
      ).rejects.toThrow("TAG_NOT_FOUND_OR_ACCESS_DENIED");
    });

    it("should find existing tag by name (case-insensitive)", async () => {
      const existingTagId = "tag-existing";

      // Mock: Find existing tag by name
      const mockFindTag = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: existingTagId },
          error: null,
        }),
      };

      // Mock: Insert note
      const mockNoteInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "note-789",
            user_id: userId,
            tag_id: existingTagId,
            original_content: "Test content",
            summary_text: null,
            goal_status: null,
            suggested_tag: null,
            meeting_date: "2025-10-31",
            is_ai_generated: false,
            created_at: "2025-10-31T12:00:00Z",
            updated_at: "2025-10-31T12:00:00Z",
            tags: { id: existingTagId, name: tagName },
          },
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockFindTag) // First call: find tag
        .mockReturnValueOnce(mockNoteInsert); // Second call: insert note

      const result = await service.createNote(userId, {
        tag_name: tagName,
        original_content: "Test content",
      });

      expect(result.tag.id).toBe(existingTagId);
      expect(mockFindTag.ilike).toHaveBeenCalledWith("name", tagName);
    });

    it("should create new tag when tag_name not found", async () => {
      const newTagId = "tag-new";

      // Mock: Tag not found (PGRST116 = no rows)
      const mockFindTag = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };

      // Mock: Create new tag
      const mockCreateTag = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: newTagId },
          error: null,
        }),
      };

      // Mock: Insert note
      const mockNoteInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "note-789",
            user_id: userId,
            tag_id: newTagId,
            original_content: "Test content",
            summary_text: null,
            goal_status: null,
            suggested_tag: null,
            meeting_date: "2025-10-31",
            is_ai_generated: false,
            created_at: "2025-10-31T12:00:00Z",
            updated_at: "2025-10-31T12:00:00Z",
            tags: { id: newTagId, name: tagName },
          },
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockFindTag) // First: search for tag
        .mockReturnValueOnce(mockCreateTag) // Second: create tag
        .mockReturnValueOnce(mockNoteInsert); // Third: insert note

      const result = await service.createNote(userId, {
        tag_name: tagName,
        original_content: "Test content",
      });

      expect(result.tag.id).toBe(newTagId);
      expect(mockCreateTag.insert).toHaveBeenCalledWith({
        user_id: userId,
        name: tagName,
      });
    });

    it("should handle race condition in tag creation (unique constraint violation)", async () => {
      const existingTagId = "tag-race-winner";

      // Mock: Tag not found initially
      const mockFindTag = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };

      // Mock: Tag creation fails with unique constraint (23505)
      const mockCreateTagFail = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "23505", message: "Unique constraint violation" },
        }),
      };

      // Mock: Retry SELECT after race condition
      const mockRetryFind = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: existingTagId },
          error: null,
        }),
      };

      // Mock: Insert note
      const mockNoteInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "note-789",
            user_id: userId,
            tag_id: existingTagId,
            original_content: "Test content",
            summary_text: null,
            goal_status: null,
            suggested_tag: null,
            meeting_date: "2025-10-31",
            is_ai_generated: false,
            created_at: "2025-10-31T12:00:00Z",
            updated_at: "2025-10-31T12:00:00Z",
            tags: { id: existingTagId, name: tagName },
          },
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockFindTag) // 1. Initial search
        .mockReturnValueOnce(mockCreateTagFail) // 2. Failed insert
        .mockReturnValueOnce(mockRetryFind) // 3. Retry search
        .mockReturnValueOnce(mockNoteInsert); // 4. Insert note

      const result = await service.createNote(userId, {
        tag_name: tagName,
        original_content: "Test content",
      });

      expect(result.tag.id).toBe(existingTagId);
      // Should retry SELECT after race condition
      expect(mockRetryFind.ilike).toHaveBeenCalledWith("name", tagName);
    });

    it("should throw error when tag search fails with database error", async () => {
      // Mock: Tag search fails with non-PGRST116 error
      const mockFindTag = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST301", message: "Database connection failed" },
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockFindTag);

      await expect(
        service.createNote(userId, {
          original_content: "Test",
          tag_name: "Work",
        })
      ).rejects.toThrow("Failed to search for tag: Database connection failed");
    });

    it("should throw error when tag creation fails with database error", async () => {
      // Mock: Tag not found (PGRST116)
      const mockFindTag = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };

      // Mock: Tag creation fails with non-unique-constraint error
      const mockCreateTag = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST500", message: "Internal server error" },
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockFindTag)
        .mockReturnValueOnce(mockCreateTag);

      await expect(
        service.createNote(userId, {
          original_content: "Test",
          tag_name: "Work",
        })
      ).rejects.toThrow("Failed to create tag: Internal server error");
    });

    it("should throw error when race condition retry fails", async () => {
      // Mock: Tag not found initially
      const mockFindTag = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };

      // Mock: Tag creation fails with unique constraint
      const mockCreateTagFail = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "23505", message: "Unique constraint violation" },
        }),
      };

      // Mock: Retry SELECT also fails
      const mockRetryFail = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Still not found" },
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockFindTag)
        .mockReturnValueOnce(mockCreateTagFail)
        .mockReturnValueOnce(mockRetryFail);

      await expect(
        service.createNote(userId, {
          tag_name: tagName,
          original_content: "Test content",
        })
      ).rejects.toThrow("Tag creation race condition retry failed");
    });

    it("should auto-set is_ai_generated to false when summary_text is null", async () => {
      const tagId = "tag-456";

      // Mock tag verification
      const mockTagQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: tagId },
          error: null,
        }),
      };

      // Mock note insert - capture inserted data
      let insertedData: unknown = null;
      const mockNoteInsert = {
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data;
          return mockNoteInsert;
        }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "note-789",
            user_id: userId,
            tag_id: tagId,
            original_content: "Test content",
            summary_text: null,
            goal_status: null,
            suggested_tag: null,
            meeting_date: "2025-10-31",
            is_ai_generated: false,
            created_at: "2025-10-31T12:00:00Z",
            updated_at: "2025-10-31T12:00:00Z",
            tags: { id: tagId, name: "Test" },
          },
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockTagQuery)
        .mockReturnValueOnce(mockNoteInsert);

      await service.createNote(userId, {
        tag_id: tagId,
        original_content: "Test content",
        // No summary_text provided
      });

      expect(insertedData).toHaveProperty("is_ai_generated", false);
    });

    it("should throw error when note insert operation fails", async () => {
      const tagId = "tag-456";

      // Mock: Tag verification passes
      const mockTagQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: tagId },
          error: null,
        }),
      };

      // Mock: Note insert fails with database error
      const mockNoteInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Constraint violation" },
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockTagQuery)
        .mockReturnValueOnce(mockNoteInsert);

      await expect(
        service.createNote(userId, {
          original_content: "Test",
          tag_id: tagId,
        })
      ).rejects.toThrow("Failed to create note: Constraint violation");
    });

    it("should throw error when note creation returns no data", async () => {
      const tagId = "tag-456";

      // Mock: Tag verification passes
      const mockTagQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: tagId },
          error: null,
        }),
      };

      // Mock: Note insert succeeds but returns no data
      const mockNoteInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockTagQuery)
        .mockReturnValueOnce(mockNoteInsert);

      await expect(
        service.createNote(userId, {
          original_content: "Test",
          tag_id: tagId,
        })
      ).rejects.toThrow("Note creation failed: no data returned");
    });

    it("should use provided is_ai_generated when summary_text is present", async () => {
      const tagId = "tag-456";

      const mockTagQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: tagId },
          error: null,
        }),
      };

      let insertedData: unknown = null;
      const mockNoteInsert = {
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data;
          return mockNoteInsert;
        }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "note-789",
            user_id: userId,
            tag_id: tagId,
            original_content: "Test content",
            summary_text: "AI summary",
            goal_status: null,
            suggested_tag: null,
            meeting_date: "2025-10-31",
            is_ai_generated: true,
            created_at: "2025-10-31T12:00:00Z",
            updated_at: "2025-10-31T12:00:00Z",
            tags: { id: tagId, name: "Test" },
          },
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockTagQuery)
        .mockReturnValueOnce(mockNoteInsert);

      await service.createNote(userId, {
        tag_id: tagId,
        original_content: "Test content",
        summary_text: "AI summary",
        is_ai_generated: true,
      });

      expect(insertedData).toHaveProperty("is_ai_generated", true);
    });

    it("should default is_ai_generated to true when summary_text is present but is_ai_generated not provided", async () => {
      const tagId = "tag-456";

      const mockTagQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: tagId }, error: null }),
      };

      let insertedData: unknown;
      const mockNoteInsert = {
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data;
          return mockNoteInsert;
        }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "note-789",
            original_content: "Test content",
            summary_text: "AI summary",
            goal_status: null,
            suggested_tag: null,
            meeting_date: "2025-10-31",
            is_ai_generated: true,
            created_at: "2025-10-31T12:00:00Z",
            updated_at: "2025-10-31T12:00:00Z",
            tags: { id: tagId, name: "Test" },
          },
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockTagQuery)
        .mockReturnValueOnce(mockNoteInsert);

      await service.createNote(userId, {
        tag_id: tagId,
        original_content: "Test content",
        summary_text: "AI summary",
        // is_ai_generated NOT provided - should default to true
      });

      expect(insertedData).toHaveProperty("is_ai_generated", true);
    });
  });

  describe("getNoteById - Access Control", () => {
    const userId = "user-123";
    const noteId = "note-456";

    it("should return note for owner", async () => {
      const mockNoteQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: noteId,
            user_id: userId, // Owner
            tag_id: "tag-789",
            original_content: "Content",
            summary_text: "Summary",
            goal_status: "achieved",
            suggested_tag: null,
            meeting_date: "2025-10-31",
            is_ai_generated: true,
            created_at: "2025-10-31T12:00:00Z",
            updated_at: "2025-10-31T12:00:00Z",
            tags: { id: "tag-789", name: "Work" },
          },
          error: null,
        }),
      };

      // Mock public link query
      const mockPublicLink = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            token: "token-123",
            is_enabled: true,
          },
          error: null,
        }),
      };

      // Mock tag_access query
      const mockTagAccess = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockTagAccess.eq.mockResolvedValue({
        data: [],
        error: null,
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockNoteQuery) // Get note
        .mockReturnValueOnce(mockPublicLink) // Get public link
        .mockReturnValueOnce(mockTagAccess); // Get tag access count

      const result = await service.getNoteById(userId, noteId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(noteId);
      expect(result?.is_owner).toBe(true);
      expect(result?.public_link).toEqual({
        token: "token-123",
        is_enabled: true,
        url: "/share/token-123",
      });
    });

    it("should return note for owner without public link", async () => {
      const mockNoteQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: noteId,
            user_id: userId, // Owner
            tag_id: "tag-789",
            original_content: "Content",
            summary_text: "Summary",
            goal_status: "achieved",
            suggested_tag: null,
            meeting_date: "2025-10-31",
            is_ai_generated: true,
            created_at: "2025-10-31T12:00:00Z",
            updated_at: "2025-10-31T12:00:00Z",
            tags: { id: "tag-789", name: "Work" },
          },
          error: null,
        }),
      };

      // Mock public link query - no link exists (data is null)
      const mockPublicLink = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null, // No public link
          error: null,
        }),
      };

      // Mock tag access count
      const mockTagAccess = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockTagAccess.eq.mockResolvedValue({
        data: [],
        error: null,
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockNoteQuery) // Get note
        .mockReturnValueOnce(mockPublicLink) // Get public link (null)
        .mockReturnValueOnce(mockTagAccess); // Get tag access count

      const result = await service.getNoteById(userId, noteId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(noteId);
      expect(result?.is_owner).toBe(true);
      expect(result?.public_link).toBeNull(); // No public link
    });

    it("should return note for user with shared tag access", async () => {
      const ownerUserId = "owner-999";
      const sharedUserId = "shared-123";
      const tagId = "tag-789";

      const mockNoteQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: noteId,
            user_id: ownerUserId, // Different owner
            tag_id: tagId,
            original_content: "Content",
            summary_text: "Summary",
            goal_status: "achieved",
            suggested_tag: null,
            meeting_date: "2025-10-31",
            is_ai_generated: true,
            created_at: "2025-10-31T12:00:00Z",
            updated_at: "2025-10-31T12:00:00Z",
            tags: { id: tagId, name: "Work" },
          },
          error: null,
        }),
      };

      // Mock tag_access verification (shared access granted)
      const mockTagAccessCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { tag_id: tagId },
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockNoteQuery)
        .mockReturnValueOnce(mockTagAccessCheck);

      const result = await service.getNoteById(sharedUserId, noteId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(noteId);
      expect(result?.is_owner).toBe(false);
      expect(result?.public_link).toBeNull(); // Not owner, no public link
    });

    it("should return null when note not found", async () => {
      const mockNoteQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockNoteQuery);

      const result = await service.getNoteById(userId, noteId);

      expect(result).toBeNull();
    });

    it("should return null when user has no access (not owner, no shared access)", async () => {
      const ownerUserId = "owner-999";
      const unauthorizedUserId = "unauthorized-123";

      const mockNoteQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: noteId,
            user_id: ownerUserId, // Different owner
            tag_id: "tag-789",
            original_content: "Content",
            summary_text: "Summary",
            goal_status: "achieved",
            suggested_tag: null,
            meeting_date: "2025-10-31",
            is_ai_generated: true,
            created_at: "2025-10-31T12:00:00Z",
            updated_at: "2025-10-31T12:00:00Z",
            tags: { id: "tag-789", name: "Work" },
          },
          error: null,
        }),
      };

      // Mock tag_access verification (no shared access)
      const mockTagAccessCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "No access" },
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockNoteQuery)
        .mockReturnValueOnce(mockTagAccessCheck);

      const result = await service.getNoteById(unauthorizedUserId, noteId);

      expect(result).toBeNull();
    });

    it("should handle null tag_access data and return shared_recipients as 0", async () => {
      const mockNoteQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: noteId,
            user_id: userId, // Owner
            tag_id: "tag-789",
            original_content: "Content",
            summary_text: "Summary",
            goal_status: "achieved",
            suggested_tag: null,
            meeting_date: "2025-10-31",
            is_ai_generated: true,
            created_at: "2025-10-31T12:00:00Z",
            updated_at: "2025-10-31T12:00:00Z",
            tags: { id: "tag-789", name: "Work" },
          },
          error: null,
        }),
      };

      // Mock public link query
      const mockPublicLink = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      // Mock tag_access query returning null data
      const mockTagAccess = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockNoteQuery)
        .mockReturnValueOnce(mockPublicLink)
        .mockReturnValueOnce(mockTagAccess);

      const result = await service.getNoteById(userId, noteId);

      expect(result).not.toBeNull();
      expect(result?.tag.shared_recipients).toBe(0);
    });
  });

  describe("updateNote - Ownership Checks", () => {
    const userId = "user-123";
    const noteId = "note-456";

    it("should update note when user is owner", async () => {
      // Mock: Check existing note ownership
      const mockCheckOwnership = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: noteId, user_id: userId },
          error: null,
        }),
      };

      // Mock: Update note
      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: noteId,
            original_content: "Updated content",
            summary_text: "Updated summary",
            goal_status: "achieved",
            suggested_tag: null,
            meeting_date: "2025-10-31",
            is_ai_generated: true,
            created_at: "2025-10-31T12:00:00Z",
            updated_at: "2025-10-31T13:00:00Z",
            tags: { id: "tag-789", name: "Work" },
          },
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockCheckOwnership)
        .mockReturnValueOnce(mockUpdate);

      const result = await service.updateNote(userId, noteId, {
        summary_text: "Updated summary",
      });

      expect(result.id).toBe(noteId);
      expect(result.summary_text).toBe("Updated summary");
    });

    it("should throw error when note not found", async () => {
      const mockCheckOwnership = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockCheckOwnership);

      await expect(service.updateNote(userId, noteId, { summary_text: "Updated" })).rejects.toThrow("NOTE_NOT_FOUND");
    });

    it("should throw error when user is not owner", async () => {
      const ownerUserId = "owner-999";

      const mockCheckOwnership = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: noteId, user_id: ownerUserId }, // Different owner
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockCheckOwnership);

      await expect(service.updateNote(userId, noteId, { summary_text: "Updated" })).rejects.toThrow("NOTE_NOT_OWNED");
    });

    it("should verify tag ownership when updating tag_id", async () => {
      const newTagId = "tag-new";

      // Mock: Check note ownership
      const mockCheckOwnership = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: noteId, user_id: userId },
          error: null,
        }),
      };

      // Mock: Verify new tag ownership
      const mockCheckTag = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: newTagId },
          error: null,
        }),
      };

      // Mock: Update note
      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: noteId,
            original_content: "Content",
            summary_text: "Summary",
            goal_status: "achieved",
            suggested_tag: null,
            meeting_date: "2025-10-31",
            is_ai_generated: true,
            created_at: "2025-10-31T12:00:00Z",
            updated_at: "2025-10-31T13:00:00Z",
            tags: { id: newTagId, name: "New Tag" },
          },
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockCheckOwnership) // Check note ownership
        .mockReturnValueOnce(mockCheckTag) // Check tag ownership
        .mockReturnValueOnce(mockUpdate); // Update note

      await service.updateNote(userId, noteId, { tag_id: newTagId });

      expect(mockCheckTag.eq).toHaveBeenCalledWith("id", newTagId);
      expect(mockCheckTag.eq).toHaveBeenCalledWith("user_id", userId);
    });

    it("should throw error when updating to tag not owned by user", async () => {
      const newTagId = "tag-not-owned";

      // Mock: Check note ownership (passes)
      const mockCheckOwnership = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: noteId, user_id: userId },
          error: null,
        }),
      };

      // Mock: Verify tag ownership (fails)
      const mockCheckTag = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Tag not found" },
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockCheckOwnership)
        .mockReturnValueOnce(mockCheckTag);

      await expect(service.updateNote(userId, noteId, { tag_id: newTagId })).rejects.toThrow("TAG_NOT_OWNED");
    });

    it("should throw error when update operation fails", async () => {
      // Mock: Check note ownership (passes)
      const mockCheckOwnership = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: noteId, user_id: userId },
          error: null,
        }),
      };

      // Mock: Update fails with database error
      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection failed" },
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockCheckOwnership)
        .mockReturnValueOnce(mockUpdate);

      await expect(service.updateNote(userId, noteId, { summary_text: "Updated" })).rejects.toThrow(
        "Failed to update note: Database connection failed"
      );
    });

    it("should throw error when no data returned after update", async () => {
      // Mock: Check note ownership (passes)
      const mockCheckOwnership = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: noteId, user_id: userId },
          error: null,
        }),
      };

      // Mock: Update succeeds but returns no data
      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockCheckOwnership)
        .mockReturnValueOnce(mockUpdate);

      await expect(service.updateNote(userId, noteId, { summary_text: "Updated" })).rejects.toThrow(
        "Note update failed: no data returned"
      );
    });
  });

  describe("deleteNote - Ownership Checks", () => {
    const userId = "user-123";
    const noteId = "note-456";

    it("should delete note when user is owner", async () => {
      // Mock: Check ownership
      const mockCheckOwnership = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: noteId, user_id: userId },
          error: null,
        }),
      };

      // Mock: Delete note (supports chaining .eq().eq())
      const mockEqChain = {
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      const mockDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue(mockEqChain),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockCheckOwnership)
        .mockReturnValueOnce(mockDelete);

      await service.deleteNote(userId, noteId);

      expect(mockDelete.delete).toHaveBeenCalled();
      expect(mockDelete.eq).toHaveBeenCalledWith("id", noteId);
      expect(mockEqChain.eq).toHaveBeenCalledWith("user_id", userId);
    });

    it("should throw error when note not found", async () => {
      const mockCheckOwnership = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockCheckOwnership);

      await expect(service.deleteNote(userId, noteId)).rejects.toThrow("NOTE_NOT_FOUND");
    });

    it("should throw error when user is not owner", async () => {
      const ownerUserId = "owner-999";

      const mockCheckOwnership = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: noteId, user_id: ownerUserId },
          error: null,
        }),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockCheckOwnership);

      await expect(service.deleteNote(userId, noteId)).rejects.toThrow("NOTE_NOT_OWNED");
    });

    it("should throw error when delete operation fails", async () => {
      // Mock: Check ownership (passes)
      const mockCheckOwnership = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: noteId, user_id: userId },
          error: null,
        }),
      };

      // Mock: Delete fails with database error
      const mockEqChain = {
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Foreign key constraint violation" },
        }),
      };
      const mockDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue(mockEqChain),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockCheckOwnership)
        .mockReturnValueOnce(mockDelete);

      await expect(service.deleteNote(userId, noteId)).rejects.toThrow(
        "Failed to delete note: Foreign key constraint violation"
      );
    });
  });
});
