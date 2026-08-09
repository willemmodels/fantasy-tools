"use client";

import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POSITIONS, ScoringFormat } from "@/lib/types";
import { useRankingsStore } from "@/store/use-rankings-store";
import { cn } from "@/lib/utils";

export function ControlsBar() {
  const searchQuery = useRankingsStore((s) => s.searchQuery);
  const setSearchQuery = useRankingsStore((s) => s.setSearchQuery);
  const positionFilters = useRankingsStore((s) => s.positionFilters);
  const togglePositionFilter = useRankingsStore((s) => s.togglePositionFilter);
  const scoringFormat = useRankingsStore((s) => s.scoringFormat);
  const setScoringFormat = useRankingsStore((s) => s.setScoringFormat);
  const bigBallerMode = useRankingsStore((s) => s.bigBallerMode);
  const toggleBigBallerMode = useRankingsStore((s) => s.toggleBigBallerMode);
  const addTier = useRankingsStore((s) => s.addTier);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-6 py-3">
      <div className="relative max-w-xs flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search players…"
          className="h-9 pl-8"
        />
      </div>

      <div className="flex items-center gap-1">
        {POSITIONS.map((pos) => {
          const active = positionFilters.includes(pos);
          return (
            <button
              key={pos}
              onClick={() => togglePositionFilter(pos)}
              className={cn(
                "rounded-[8px] border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-[var(--foreground)] bg-[var(--surface-muted)] font-medium"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {pos}
            </button>
          );
        })}
      </div>

      <Select value={scoringFormat} onValueChange={(v) => setScoringFormat(v as ScoringFormat)}>
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PPR">PPR</SelectItem>
          <SelectItem value="HALF">Half-PPR</SelectItem>
          <SelectItem value="STD">Standard</SelectItem>
        </SelectContent>
      </Select>

      <button
        onClick={toggleBigBallerMode}
        title="Show auction dollar values under the Big Baller Startup format (2QB/5WR, 4 teams, $500 budget)"
        className={cn(
          "rounded-[8px] border px-3 py-1.5 text-sm transition-colors",
          bigBallerMode
            ? "border-[var(--foreground)] bg-[var(--surface-muted)] font-medium"
            : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        )}
      >
        Big Baller
      </button>

      <Button
        variant="outline"
        size="sm"
        className="ml-auto gap-1.5"
        onClick={() => addTier(`Tier ${Date.now() % 1000}`)}
      >
        <Plus className="h-4 w-4" />
        Add tier
      </Button>
    </div>
  );
}
