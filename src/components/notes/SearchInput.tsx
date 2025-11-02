import { Search, X } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * SearchInput - Client-side search with debounce
 *
 * Features:
 * - Debounce 300ms to avoid excessive filtering
 * - Clear button when has value
 * - Case-insensitive search
 */
export function SearchInput({ value, onChange, placeholder = "Szukaj w notatkach..." }: SearchInputProps) {
  const [inputValue, setInputValue] = useState(value);

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, onChange]);

  // Sync with external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleClear = useCallback(() => {
    setInputValue("");
    onChange("");
  }, [onChange]);

  return (
    <div className="relative" data-testid="search-input">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-glass-text" />
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="relative border-glass-border bg-linear-to-b from-glass-bg-from to-glass-bg-to pl-9 pr-9 text-glass-text placeholder:text-glass-text-muted backdrop-blur-xl"
        data-testid="search-input-field"
      />
      {inputValue && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-glass-text-muted hover:bg-white/5! hover:text-glass-text!"
          onClick={handleClear}
          data-testid="search-input-clear-button"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Wyczyść wyszukiwanie</span>
        </Button>
      )}
    </div>
  );
}
