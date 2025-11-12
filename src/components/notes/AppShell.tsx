import { Menu } from "lucide-react";
import { useState } from "react";
import { useInfiniteScroll } from "@/components/hooks/useInfiniteScroll";
import { useNoteFiltering } from "@/components/hooks/useNoteFiltering";
import { useNotesNavigation } from "@/components/hooks/useNotesNavigation";
import { useResponsive } from "@/components/hooks/useResponsive";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FiltersPanel } from "./FiltersPanel";
import { InfiniteLoader } from "./InfiniteLoader";
import { NoteList } from "./NoteList";
import { Pagination } from "./Pagination";
import { SearchInput } from "./SearchInput";
import { TagSidebar } from "./TagSidebar";
import type { NotesListDTO, TagsListDTO, NotesListQuery } from "@/types";

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

  // Navigation and filtering hooks
  const {
    searchTerm,
    setSearchTerm,
    selectedTagId,
    hasActiveFilters,
    handleTagSelect,
    handleFiltersChange,
    handlePageChange,
  } = useNotesNavigation({ query });

  // Responsive detection
  const isMobile = useResponsive();

  // Infinite scroll
  const { allNotes, isLoadingMore, hasMore, handleLoadMore } = useInfiniteScroll({ notes, query });

  // Client-side note filtering
  const notesForFiltering = isMobile ? allNotes : notes.notes;
  const filteredNotes = useNoteFiltering({ notes: notesForFiltering, searchTerm });

  const handleNoteClick = (id: string) => {
    window.location.href = `/notes/${id}`;
  };

  return (
    <div
      className="flex h-full w-full overflow-hidden bg-linear-to-br from-gradient-from via-gradient-via to-gradient-to"
      data-testid="app-shell"
    >
      {/* Desktop Sidebar */}
      <aside
        className="hidden h-full w-64 border-r border-glass-border bg-linear-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-xl md:block"
        data-testid="app-shell-desktop-sidebar"
      >
        <TagSidebar tags={tags.tags} selectedTagId={selectedTagId} onTagSelect={handleTagSelect} />
      </aside>

      {/* Mobile Header + Content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex h-14 items-center gap-4 border-b border-white/20 bg-linear-to-r from-gradient-from/85 via-gradient-via/85 to-gradient-to/85 px-4 shadow-lg backdrop-blur-xl md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-glass-text hover:text-glass-text-hover"
                data-testid="app-shell-mobile-menu-button"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 border-r border-glass-border bg-linear-to-br from-gradient-from via-gradient-via to-gradient-to p-0 backdrop-blur-xl"
              data-testid="app-shell-mobile-menu-content"
            >
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
          <h1 className="bg-linear-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-lg font-semibold text-transparent drop-shadow-lg">
            Moje notatki
          </h1>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6" data-testid="app-shell-main-content">
          {error && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-linear-to-b from-glass-bg-from to-glass-bg-to p-4 backdrop-blur-xl">
              <p className="text-sm font-medium text-destructive outline-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Błąd ładowania danych
              </p>
              <p className="text-sm text-glass-text-muted">{error}</p>
            </div>
          )}

          <div className="mx-auto max-w-5xl space-y-6">
            {/* Desktop Title */}
            <div className="hidden md:block">
              <h1 className="bg-linear-to-r from-gradient-heading-from via-gradient-heading-via to-gradient-heading-to bg-clip-text text-3xl font-bold text-transparent drop-shadow-lg">
                Moje notatki
              </h1>
              <p className="mt-2 text-sm text-glass-text-muted drop-shadow-md">
                Znaleziono {filteredNotes.length} z {notes.pagination.total} notatek
              </p>
            </div>

            {/* Search Input */}
            <SearchInput value={searchTerm} onChange={setSearchTerm} />

            {/* Filters Panel */}
            <FiltersPanel filters={query} onChange={handleFiltersChange} />

            {/* Notes List */}
            <NoteList
              items={filteredNotes}
              isLoading={false}
              searchTerm={searchTerm}
              hasActiveFilters={hasActiveFilters}
              onItemClick={handleNoteClick}
            />

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
