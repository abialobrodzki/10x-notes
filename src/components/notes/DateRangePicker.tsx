import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateISO } from "@/types";

interface DateRangePickerProps {
  dateFrom: DateISO | undefined;
  dateTo: DateISO | undefined;
  onDateFromChange: (date: DateISO | undefined) => void;
  onDateToChange: (date: DateISO | undefined) => void;
}

/**
 * DateRangePicker - Select date range for filtering notes
 *
 * Features:
 * - Two separate date pickers (from/to)
 * - ISO format (YYYY-MM-DD)
 * - Polish locale
 */
export function DateRangePicker({ dateFrom, dateTo, onDateFromChange, onDateToChange }: DateRangePickerProps) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const fromDate = dateFrom ? new Date(dateFrom) : undefined;
  const toDate = dateTo ? new Date(dateTo) : undefined;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {/* Date From */}
      <Popover open={fromOpen} onOpenChange={setFromOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal sm:w-[200px]",
              !fromDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {fromDate ? format(fromDate, "PPP", { locale: pl }) : "Data od"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={fromDate}
            onSelect={(date) => {
              onDateFromChange(date ? format(date, "yyyy-MM-dd") : undefined);
              setFromOpen(false);
            }}
            initialFocus
            locale={pl}
          />
        </PopoverContent>
      </Popover>

      {/* Date To */}
      <Popover open={toOpen} onOpenChange={setToOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal sm:w-[200px]",
              !toDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {toDate ? format(toDate, "PPP", { locale: pl }) : "Data do"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={toDate}
            onSelect={(date) => {
              onDateToChange(date ? format(date, "yyyy-MM-dd") : undefined);
              setToOpen(false);
            }}
            disabled={(date) => {
              // Disable dates before dateFrom
              if (fromDate) {
                return date < fromDate;
              }
              return false;
            }}
            initialFocus
            locale={pl}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
