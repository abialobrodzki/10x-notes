import { Zap, CheckCircle2, XCircle, Coins, Clock, FileText, Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserStatsDTO } from "@/types";

interface StatsSectionProps {
  stats: UserStatsDTO;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description?: string;
}

/**
 * StatCard component
 * Displays a single metric with icon, label, and value
 */
function StatCard({ icon, label, value, description }: StatCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-glass-border bg-gradient-to-b from-glass-bg-from to-glass-bg-to backdrop-blur-lg p-4 shadow-md">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gradient-button-from to-gradient-button-to text-white shadow-lg">
        {icon}
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-glass-text-muted">{label}</p>
        <p className="text-2xl font-bold text-glass-text">{value}</p>
        {description && <p className="text-xs text-glass-text-muted">{description}</p>}
      </div>
    </div>
  );
}

/**
 * StatsSection component
 * Displays user statistics in card format
 * Shows AI generation metrics, notes count, and tags count
 */
export function StatsSection({ stats }: StatsSectionProps) {
  // Format average time (convert ms to seconds if >= 1000ms)
  const formatTime = (ms: number): string => {
    if (ms === 0) return "0 ms";
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  // Format large numbers with thousands separator
  const formatNumber = (num: number): string => {
    return num.toLocaleString("pl-PL");
  };

  return (
    <Card className="bg-gradient-to-b from-glass-bg-from to-glass-bg-to border-glass-border backdrop-blur-xl shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-glass-text">
          <Zap className="h-5 w-5" />
          Statystyki wykorzystania
        </CardTitle>
        <CardDescription className="text-glass-text-muted">Podsumowanie Twojej aktywności w 10xNotes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* AI Generation Stats */}
          <StatCard
            icon={<Zap className="h-5 w-5" />}
            label="Łącznie generacji AI"
            value={formatNumber(stats.total_generations)}
            description="Całkowita liczba prób wygenerowania podsumowań"
          />

          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Udane generacje"
            value={formatNumber(stats.successful_generations)}
            description="Pomyślnie wygenerowane podsumowania"
          />

          <StatCard
            icon={<XCircle className="h-5 w-5" />}
            label="Nieudane generacje"
            value={formatNumber(stats.failed_generations)}
            description="Generacje zakończone błędem"
          />

          <StatCard
            icon={<Coins className="h-5 w-5" />}
            label="Zużyte tokeny"
            value={formatNumber(stats.total_tokens)}
            description="Suma tokenów wykorzystanych przez model AI"
          />

          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Średni czas generacji"
            value={formatTime(stats.avg_time_ms)}
            description="Przeciętny czas odpowiedzi modelu AI"
          />

          {/* Content Stats */}
          <StatCard
            icon={<FileText className="h-5 w-5" />}
            label="Liczba notatek"
            value={formatNumber(stats.total_notes)}
            description="Utworzone przez Ciebie notatki"
          />

          <StatCard
            icon={<Tag className="h-5 w-5" />}
            label="Liczba etykiet"
            value={formatNumber(stats.total_tags)}
            description="Utworzone przez Ciebie etykiety"
          />
        </div>
      </CardContent>
    </Card>
  );
}
