import { Sparkles } from "lucide-react";
import { GoalStatusBadge } from "@/components/shared/GoalStatusBadge";
import { SuggestedTagBadge } from "./SuggestedTagBadge";
import type { AiSummaryDTO } from "@/types";

interface SummaryCardProps {
  data: AiSummaryDTO;
}

/**
 * SummaryCard - Display AI-generated summary results
 * Features:
 * - Summary text (XSS-safe, plain text only)
 * - Goal achievement status with visual indicator
 * - Suggested tag badge
 * - Generation metrics (time, tokens)
 * - ARIA role="status" for accessibility
 */
export function SummaryCard({ data }: SummaryCardProps) {
  const formatGenerationTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div
      className="space-y-6 rounded-lg border border-green-500/30 bg-green-500/10 p-6"
      role="status"
      aria-live="polite"
      aria-label="Wygenerowane podsumowanie"
      data-testid="summary-card"
    >
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Sparkles className="h-5 w-5 text-green-400" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-green-200">Podsumowanie wygenerowane</h2>
      </div>

      {/* Summary Text */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-glass-text">Streszczenie:</h3>
        <p
          className="whitespace-pre-wrap rounded-md bg-glass-bg-to p-4 text-sm leading-relaxed text-glass-text-hover"
          data-testid="summary-card-summary-text"
        >
          {data.summary_text}
        </p>
      </div>

      {/* Goal Status */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-glass-text">Status celów:</h3>
        <GoalStatusBadge status={data.goal_status} showIcon data-testid="goal-status-display" />
      </div>

      {/* Suggested Tag */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-glass-text">Sugerowana etykieta:</h3>
        <SuggestedTagBadge tagName={data.suggested_tag} />
      </div>

      {/* Generation Metrics */}
      <div className="flex items-center space-x-4 border-t border-glass-border pt-4 text-xs text-glass-text-muted">
        <span data-testid="summary-card-generation-time">
          Czas generowania: {formatGenerationTime(data.generation_time_ms)}
        </span>
        <span>•</span>
        <span data-testid="summary-card-tokens-used">Tokeny: {data.tokens_used.toLocaleString("pl-PL")}</span>
      </div>
    </div>
  );
}
