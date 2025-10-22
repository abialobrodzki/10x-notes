import { useState } from "react";
import type { NoteDetailDTO } from "@/types";

interface OriginalContentSectionProps {
  originalContent: NoteDetailDTO["original_content"];
}

/**
 * OriginalContentSection - Displays original note content with expand/collapse
 * Shows truncated content by default with "Show more" option
 * XSS-safe plain text rendering
 */
export default function OriginalContentSection({ originalContent }: OriginalContentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Split content into lines for truncation
  const lines = originalContent.split("\n");
  const shouldTruncate = lines.length > 8;
  const displayedLines = isExpanded || !shouldTruncate ? lines : lines.slice(0, 8);

  return (
    <div className="rounded-2xl border border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to p-8 backdrop-blur-xl">
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="bg-gradient-to-r from-gradient-heading-from to-purple-200 bg-clip-text text-xl font-semibold text-transparent">
          Oryginalna treść
        </h2>

        {shouldTruncate && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-glass-text underline-offset-4 transition-colors hover:text-glass-text-hover hover:underline"
            aria-expanded={isExpanded}
            aria-controls="original-content"
          >
            {isExpanded ? "Pokaż mniej" : "Pokaż więcej"}
          </button>
        )}
      </div>

      {/* Content */}
      <div
        id="original-content"
        className="rounded-lg border border-glass-border bg-glass-bg-to p-4 font-mono text-sm text-glass-text-muted"
      >
        <pre className="whitespace-pre-wrap break-words">{displayedLines.join("\n")}</pre>

        {/* Show more indicator when truncated */}
        {shouldTruncate && !isExpanded && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsExpanded(true)}
              className="inline-flex items-center gap-2 text-sm font-medium text-glass-text transition-colors hover:text-input-text"
            >
              <span>Pokaż pozostałe {lines.length - 8} linii</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
