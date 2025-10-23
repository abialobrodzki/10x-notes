import { Menu } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FiltersPanel } from "./FiltersPanel";
import { InfiniteLoader } from "./InfiniteLoader";
import { NoteList } from "./NoteList";
import { Pagination } from "./Pagination";
import { SearchInput } from "./SearchInput";
import { TagSidebar } from "./TagSidebar";
import type { NotesListDTO, TagsListDTO, NotesListQuery, NoteListItemDTO } from "@/types";

interface AppShellProps {
  notes: NotesListDTO;
  tags: TagsListDTO;
  query: NotesListQuery;
  error: string | null;
}

/**
 * AppShell - Responsive layout container
 *
 * Desktop: Sidebar on left, content on right
 * Mobile: Drawer (Sheet) for sidebar, full-width content
 */
export function AppShell({ notes, tags, query, error }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [allNotes, setAllNotes] = useState<NoteListItemDTO[]>(notes.notes);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const selectedTagId = query.tag_id || null;

  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reset allNotes when notes change (e.g., from SSR or filter change)
  useEffect(() => {
    setAllNotes(notes.notes);
  }, [notes.notes]);

  const handleTagSelect = (tagId: string | null) => {
    // Update URL with new tag_id
    const url = new URL(window.location.href);
    if (tagId) {
      url.searchParams.set("tag_id", tagId);
    } else {
      url.searchParams.delete("tag_id");
    }
    // Reset to page 1 when changing filters
    url.searchParams.set("page", "1");
    window.location.href = url.toString();
  };

  const handleFiltersChange = (newFilters: NotesListQuery) => {
    // Update URL with new filters
    const url = new URL(window.location.href);

    // Apply all filter params
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      } else {
        url.searchParams.delete(key);
      }
    });

    window.location.href = url.toString();
  };

  const handlePageChange = (page: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(page));
    window.location.href = url.toString();
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || notes.pagination.page >= notes.pagination.total_pages) return;

    setIsLoadingMore(true);

    try {
      // Build URL for next page
      const url = new URL("/api/notes", window.location.origin);
      const nextPage = notes.pagination.page + 1;

      // Copy all current query params
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
      url.searchParams.set("page", String(nextPage));

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to load more notes");

      const data: NotesListDTO = await response.json();
      setAllNotes((prev) => [...prev, ...data.notes]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error loading more notes:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleNoteClick = (id: string) => {
    window.location.href = `/notes/${id}`;
  };

  // Client-side filtering by search term
  const filteredNotes = useMemo(() => {
    const notesToFilter = isMobile ? allNotes : notes.notes;

    if (!searchTerm || searchTerm.trim() === "") {
      return notesToFilter;
    }

    const term = searchTerm.toLowerCase();
    return notesToFilter.filter((note) => {
      const summaryMatch = note.summary_text?.toLowerCase().includes(term);
      const tagMatch = note.tag.name.toLowerCase().includes(term);
      return summaryMatch || tagMatch;
    });
  }, [isMobile, allNotes, notes.notes, searchTerm]);

  const hasMore = notes.pagination.page < notes.pagination.total_pages;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r border-border bg-card md:block">
        <TagSidebar tags={tags.tags} selectedTagId={selectedTagId} onTagSelect={handleTagSelect} />
      </aside>

      {/* Mobile Header + Content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <TagSidebar
                tags={tags.tags}
                selectedTagId={selectedTagId}
                onTagSelect={(tagId) => {
                  handleTagSelect(tagId);
                  setIsMobileMenuOpen(false);
                }}
              />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">Moje notatki</h1>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {error && (
            <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
              <p className="text-sm font-medium">Błąd ładowania danych</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="mx-auto max-w-5xl space-y-6">
            {/* Desktop Title */}
            <div className="hidden md:block">
              <h1 className="text-3xl font-bold">Moje notatki</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Znaleziono {filteredNotes.length} z {notes.pagination.total} notatek
              </p>
            </div>

            {/* Search Input */}
            <SearchInput value={searchTerm} onChange={setSearchTerm} />

            {/* Filters Panel */}
            <FiltersPanel filters={query} onChange={handleFiltersChange} />

            {/* Notes List */}
            <NoteList items={filteredNotes} isLoading={false} searchTerm={searchTerm} onItemClick={handleNoteClick} />

            {/* Pagination (Desktop) / Infinite Loader (Mobile) */}
            {!searchTerm && (
              <>
                {isMobile ? (
                  <InfiniteLoader loading={isLoadingMore} hasMore={hasMore} onLoadMore={handleLoadMore} />
                ) : (
                  <Pagination pagination={notes.pagination} onPageChange={handlePageChange} />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
