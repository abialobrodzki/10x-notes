import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useTagCombobox } from "@/components/hooks/useTagCombobox";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { NoteDetailDTO } from "@/types";

interface TagComboboxProps {
  currentTag: NoteDetailDTO["tag"];
  isOwner: boolean;
  onSelectTag: (tagId: string) => Promise<void>;
  onCreateTag: (name: string) => Promise<void>;
  isSaving: boolean;
}

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
  const {
    isOpen,
    searchQuery,
    filteredTags,
    showCreateOption,
    isLoading,
    setIsOpen,
    setSearchQuery,
    handleSelectTag,
    handleCreateTag,
  } = useTagCombobox({
    currentTag,
    onSelectTag,
    onCreateTag,
    isSaving,
  });

  return (
    <div className="space-y-4" data-testid="tag-combobox">
      {/* Section header */}
      <h3 className="bg-linear-to-r from-gradient-heading-from to-purple-200 bg-clip-text text-lg font-semibold text-transparent">
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
            className="w-full justify-between"
            data-testid="tag-combobox-trigger-button"
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
              <span data-testid="tag-combobox-current-tag-name">{currentTag.name}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] border-input-border dropdown-content-glass-no-border p-0">
          <Command className="bg-transparent">
            <CommandInput
              placeholder="Szukaj etykiety..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="border-glass-border text-glass-text placeholder:text-input-placeholder"
              data-testid="tag-combobox-search-input"
            />
            <CommandList>
              <CommandEmpty
                className="py-6 text-center text-sm text-glass-text-muted"
                data-testid="tag-combobox-empty-message"
              >
                {isLoading ? "Ładowanie..." : "Nie znaleziono etykiety"}
              </CommandEmpty>

              {/* Existing tags */}
              {filteredTags.length > 0 && (
                <CommandGroup>
                  {filteredTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.id}
                      onSelect={() => handleSelectTag(tag.id)}
                      className="dropdown-item-glass cursor-pointer"
                      data-testid={`tag-combobox-existing-tag-item-${tag.id}`}
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
                <CommandGroup>
                  <CommandItem
                    value={`create-${searchQuery}`}
                    onSelect={handleCreateTag}
                    className="dropdown-item-glass cursor-pointer text-green-200"
                    data-testid="tag-combobox-create-new-tag-option"
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
      {isSaving && (
        <p className="text-sm text-glass-text-muted" data-testid="tag-combobox-loading-indicator">
          Zapisywanie...
        </p>
      )}
    </div>
  );
}
