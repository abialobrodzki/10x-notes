import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaginationDTO } from "@/types";

interface PaginationProps {
  pagination: PaginationDTO;
  onPageChange: (page: number) => void;
}

/**
 * Pagination - Desktop pagination controls
 *
 * Features:
 * - First/Last page buttons
 * - Previous/Next page buttons
 * - Page number display with ellipsis for large ranges
 * - Disabled states for boundary conditions
 */
export function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { page, total_pages } = pagination;

  // Generate page numbers to display (max 7 buttons)
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (total_pages <= 7) {
      return Array.from({ length: total_pages }, (_, i) => i + 1);
    }

    // Always show: first, last, current, and 2 around current
    const pages: (number | "ellipsis")[] = [];

    if (page <= 3) {
      // Near start: 1 2 3 4 5 ... last
      pages.push(1, 2, 3, 4, 5, "ellipsis", total_pages);
    } else if (page >= total_pages - 2) {
      // Near end: 1 ... -4 -3 -2 -1 last
      pages.push(1, "ellipsis", total_pages - 4, total_pages - 3, total_pages - 2, total_pages - 1, total_pages);
    } else {
      // Middle: 1 ... current-1 current current+1 ... last
      pages.push(1, "ellipsis", page - 1, page, page + 1, "ellipsis", total_pages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (total_pages <= 1) {
    return null; // Don't show pagination for single page
  }

  return (
    <nav className="flex items-center justify-center gap-2" role="navigation" aria-label="Paginacja notatek">
      {/* First Page */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(1)}
        disabled={page === 1}
        aria-label="Pierwsza strona"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      {/* Previous Page */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Poprzednia strona"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page Numbers */}
      {pageNumbers.map((pageNum, index) => {
        if (pageNum === "ellipsis") {
          return (
            <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
              ...
            </span>
          );
        }

        return (
          <Button
            key={pageNum}
            variant={page === pageNum ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(pageNum)}
            aria-label={`Strona ${pageNum}`}
            aria-current={page === pageNum ? "page" : undefined}
          >
            {pageNum}
          </Button>
        );
      })}

      {/* Next Page */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page + 1)}
        disabled={page === total_pages}
        aria-label="Następna strona"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Last Page */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(total_pages)}
        disabled={page === total_pages}
        aria-label="Ostatnia strona"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
