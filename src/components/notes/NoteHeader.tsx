import { Users } from "lucide-react";
import type { NoteDetailDTO } from "@/types";

interface NoteHeaderProps {
  tag: NoteDetailDTO["tag"];
  isOwner: NoteDetailDTO["is_owner"];
  publicLink: NoteDetailDTO["public_link"];
}

/**
 * NoteHeader - Header section with meta information
 * Displays tag badge, owner/recipient badge, and public link status
 */
export default function NoteHeader({ tag, isOwner, publicLink }: NoteHeaderProps) {
  return (
    <div className="rounded-2xl border border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to p-6 backdrop-blur-xl">
      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm text-glass-text-muted" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          <li>
            <a href="/notes" className="hover-link">
              Notatki
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-glass-text">
            Szczegóły
          </li>
        </ol>
      </nav>

      {/* Meta badges */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Tag badge - clickable to filter */}
        <a
          href={`/notes?tag_id=${tag.id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-500/20 px-3 py-1 text-sm font-medium text-purple-100 hover-tag"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <span>{tag.name}</span>
        </a>

        {/* Owner/Recipient badge */}
        {isOwner ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-400/30 bg-green-500/20 px-3 py-1 text-sm font-medium text-green-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Właściciel</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/20 px-3 py-1 text-sm font-medium text-glass-text">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span>Udostępniono</span>
          </span>
        )}

        {/* Public link badge (only for owners) */}
        {isOwner && publicLink && publicLink.is_enabled && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-500/20 px-3 py-1 text-sm font-medium text-yellow-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <span>Link publiczny aktywny</span>
          </span>
        )}

        {/* Tag shared with users badge (only for owners with shared tags) */}
        {isOwner && (tag.shared_recipients ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/20 px-3 py-1 text-sm font-medium text-amber-100">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>
              Udostępniono {tag.shared_recipients} użytkownik{tag.shared_recipients === 1 ? "owi" : "om"}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
