import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TagsListDTO, NoteDetailDTO } from "@/types";

interface TagComboboxProps {
  currentTag: NoteDetailDTO["tag"];
  isOwner: boolean;
  onSelectTag: (tagId: string) => Promise<void>;
  onCreateTag: (name: string) => Promise<void>;
  isSaving: boolean;
}

/**
 * Fetcher for tags list
 */
const tagsFetcher = async (url: string): Promise<TagsListDTO> => {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch tags");
  }

  return response.json();
};

/**
 * TagCombobox - Select existing tag or create new one
 * Features:
 * - Search/filter tags
 * - Create new tag with "Create: {name}" option
 * - Optimistic updates
 * - Handles 409 conflict (tag already exists)
 * - Disabled for non-owners
 */
export default function TagCombobox({ currentTag, isOwner, onSelectTag, onCreateTag, isSaving }: TagComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch tags list (only owned tags)
  const { data: tagsData, isLoading } = useSWR<TagsListDTO>("/api/tags?include_shared=false", tagsFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  // Memoize tags array to prevent exhaustive-deps warnings
  const tags = useMemo(() => tagsData?.tags || [], [tagsData]);

  // Filter tags based on search query
  const filteredTags = useMemo(() => {
    if (!searchQuery) return tags;

    const query = searchQuery.toLowerCase();
    return tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [tags, searchQuery]);

  // Check if search query matches existing tag exactly
  const exactMatch = useMemo(() => {
    return tags.find((tag) => tag.name.toLowerCase() === searchQuery.toLowerCase());
  }, [tags, searchQuery]);

  // Show "Create new" option only if:
  // 1. There's a search query
  // 2. No exact match exists
  // 3. Query is not empty after trim
  const showCreateOption = searchQuery.trim() && !exactMatch;

  const handleSelectTag = async (tagId: string) => {
    if (!isOwner || isSaving) return;

    try {
      await onSelectTag(tagId);
      setIsOpen(false);
      setSearchQuery("");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to select tag:", error);
    }
  };

  const handleCreateTag = async () => {
    if (!isOwner || isSaving || !searchQuery.trim()) return;

    try {
      await onCreateTag(searchQuery.trim());
      setIsOpen(false);
      setSearchQuery("");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to create tag:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section header */}
      <h3 className="bg-gradient-to-r from-gradient-heading-from to-purple-200 bg-clip-text text-lg font-semibold text-transparent">
        Etykieta
      </h3>

      {/* Combobox */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            disabled={!isOwner || isSaving}
            className="w-full justify-between border-input-border bg-glass-bg-from text-glass-text hover:border-glass-border-hover hover:bg-input-bg"
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              <span>{currentTag.name}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] border-input-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to p-0 backdrop-blur-xl">
          <Command className="bg-transparent">
            <CommandInput
              placeholder="Szukaj etykiety..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="border-glass-border text-glass-text placeholder:text-input-placeholder"
            />
            <CommandList>
              <CommandEmpty className="py-6 text-center text-sm text-glass-text-muted">
                {isLoading ? "Ładowanie..." : "Nie znaleziono etykiety"}
              </CommandEmpty>

              {/* Existing tags */}
              {filteredTags.length > 0 && (
                <CommandGroup heading="Etykiety" className="text-glass-text-muted">
                  {filteredTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.id}
                      onSelect={() => handleSelectTag(tag.id)}
                      className="cursor-pointer text-glass-text aria-selected:bg-input-bg"
                    >
                      <Check className={`mr-2 h-4 w-4 ${currentTag.id === tag.id ? "opacity-100" : "opacity-0"}`} />
                      <span className="flex-1">{tag.name}</span>
                      {tag.note_count !== undefined && (
                        <span className="text-xs text-input-placeholder">({tag.note_count})</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Create new tag option */}
              {showCreateOption && (
                <CommandGroup heading="Akcje" className="text-glass-text-muted">
                  <CommandItem
                    value={`create-${searchQuery}`}
                    onSelect={handleCreateTag}
                    className="cursor-pointer text-green-200 aria-selected:bg-input-bg"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Utwórz nową: &quot;{searchQuery.trim()}&quot;</span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Loading indicator */}
      {isSaving && <p className="text-sm text-glass-text-muted">Zapisywanie...</p>}
    </div>
  );
}
