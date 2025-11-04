import { GlassCard } from "@/components/ui/composed/GlassCard";
import GoalStatusRadio from "./GoalStatusRadio";
import MeetingDatePicker from "./MeetingDatePicker";
import NoteHeader from "./NoteHeader";
import OriginalContentSection from "./OriginalContentSection";
import PublicLinkSection from "./PublicLinkSection";
import SummaryEditor from "./SummaryEditor";
import TagAccessButton from "./TagAccessButton";
import TagCombobox from "./TagCombobox";
import type { NoteDetailDTO, UpdateNoteCommand, GoalStatus, PublicLinkDTO } from "@/types";

interface NoteContentProps {
  note: NoteDetailDTO;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  noteId: string;
  savingFields: Record<string, boolean>;
  onSaveSummary: (summary: UpdateNoteCommand["summary_text"]) => Promise<void>;
  onGoalStatusChange: (goalStatus: GoalStatus | null) => Promise<void>;
  onMeetingDateChange: (date: UpdateNoteCommand["meeting_date"]) => Promise<void>;
  onSelectTag: (tagId: string) => Promise<void>;
  onCreateTag: (tagName: string) => Promise<void>;
  onPublicLinkUpdate: (publicLink: PublicLinkDTO | null) => void;
}

/**
 * NoteContent component - Renders the main content of note detail page
 * Presentational component that receives all data and callbacks as props
 */
export default function NoteContent({
  note,
  scrollContainerRef,
  noteId,
  savingFields,
  onSaveSummary,
  onGoalStatusChange,
  onMeetingDateChange,
  onSelectTag,
  onCreateTag,
  onPublicLinkUpdate,
}: NoteContentProps) {
  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-auto bg-linear-to-br from-gradient-from via-gradient-via to-gradient-to p-4 sm:p-8"
      data-testid="note-detail-page"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header with meta information */}
        <NoteHeader tag={note.tag} isOwner={note.is_owner} publicLink={note.public_link} />

        {/* Original content section */}
        <OriginalContentSection originalContent={note.original_content} />

        {/* Summary editor panel */}
        <GlassCard padding="lg">
          <SummaryEditor
            value={note.summary_text}
            isOwner={note.is_owner}
            onSave={onSaveSummary}
            isSaving={savingFields.summary}
          />
        </GlassCard>

        {/* Goal status and meeting date grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Goal status */}
          <GlassCard padding="lg">
            <GoalStatusRadio
              value={note.goal_status}
              isOwner={note.is_owner}
              onChange={onGoalStatusChange}
              isSaving={savingFields.goal}
            />
          </GlassCard>

          {/* Meeting date */}
          <GlassCard padding="lg">
            <MeetingDatePicker
              value={note.meeting_date}
              isOwner={note.is_owner}
              onChange={onMeetingDateChange}
              isSaving={savingFields.date}
            />
          </GlassCard>
        </div>

        {/* Tag selection and access management */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Tag combobox */}
          <GlassCard padding="lg">
            <TagCombobox
              currentTag={note.tag}
              isOwner={note.is_owner}
              onSelectTag={onSelectTag}
              onCreateTag={onCreateTag}
              isSaving={savingFields.tag}
            />
          </GlassCard>

          {/* Tag access management */}
          <GlassCard padding="lg">
            <TagAccessButton tagId={note.tag.id} isOwner={note.is_owner} />
          </GlassCard>
        </div>

        {/* Public link section (only for owners) */}
        {note.is_owner && (
          <GlassCard padding="lg">
            <PublicLinkSection
              publicLink={note.public_link}
              noteId={noteId}
              isOwner={note.is_owner}
              onUpdate={onPublicLinkUpdate}
            />
          </GlassCard>
        )}
      </div>
    </div>
  );
}
