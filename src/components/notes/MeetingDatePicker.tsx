import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { NoteDetailDTO, UpdateNoteCommand, DateISO } from "@/types";

interface MeetingDatePickerProps {
  value: NoteDetailDTO["meeting_date"];
  isOwner: boolean;
  onChange: (date: UpdateNoteCommand["meeting_date"]) => Promise<void>;
  isSaving: boolean;
}

/**
 * MeetingDatePicker - Date picker for meeting date
 * Features:
 * - Polish locale (pl-PL) for display
 * - YYYY-MM-DD format for API
 * - Optimistic updates with rollback
 * - Disabled for non-owners
 * - Clear button to remove date
 */
export default function MeetingDatePicker({ value, isOwner, onChange, isSaving }: MeetingDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Convert YYYY-MM-DD string to Date object
  const dateValue = value ? new Date(value) : undefined;

  const handleSelect = async (date: Date | undefined) => {
    if (!isOwner || isSaving) {
      return;
    }

    // Convert Date to YYYY-MM-DD format (undefined maps to undefined for API)
    const formattedDate: DateISO | undefined = date ? format(date, "yyyy-MM-dd") : undefined;

    try {
      await onChange(formattedDate);
      setIsOpen(false);
    } catch (error) {
      // Error handled by parent with rollback
      // eslint-disable-next-line no-console
      console.error("Failed to update meeting date:", error);
    }
  };

  const handleClear = async () => {
    if (!isOwner || isSaving) {
      return;
    }

    try {
      await onChange(undefined);
      setIsOpen(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to clear meeting date:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section header */}
      <h3 className="bg-gradient-to-r from-gradient-heading-from to-purple-200 bg-clip-text text-lg font-semibold text-transparent">
        Data spotkania
      </h3>

      {/* Date picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={!isOwner || isSaving}
            className={`w-full justify-start border-input-border bg-glass-bg-from text-left font-normal text-glass-text hover:border-glass-border-hover hover:bg-input-bg ${
              !value && "text-input-placeholder"
            }`}
            aria-label="Wybierz datę spotkania"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {value && dateValue ? format(dateValue, "d MMMM yyyy", { locale: pl }) : <span>Wybierz datę</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto border-input-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to p-0 backdrop-blur-xl"
          align="start"
        >
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleSelect}
            disabled={!isOwner || isSaving}
            locale={pl}
            initialFocus
            className="text-glass-text"
          />
          {value && (
            <div className="border-t border-glass-border p-3">
              <Button
                onClick={handleClear}
                disabled={!isOwner || isSaving}
                variant="outline"
                size="sm"
                className="w-full border-red-400/30 bg-red-500/20 text-red-100 hover:border-red-400/50 hover:bg-red-500/30"
              >
                Wyczyść datę
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Loading indicator */}
      {isSaving && <p className="text-sm text-glass-text-muted">Zapisywanie...</p>}
    </div>
  );
}
