"use client";

import { Search, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { POSITIONS, RankingsList } from "@/lib/types";
import { MAX_TIERS, RANKINGS_LISTS, useActiveTiers, useRankingsStore } from "@/store/use-rankings-store";
import { cn } from "@/lib/utils";

const LIST_LABELS: Record<RankingsList, string> = {
  PPR: "PPR",
  HALF: "Half-PPR",
  STD: "Standard",
  BIG_BALLER: "Big Baller",
};

export function ControlsBar() {
  const searchQuery = useRankingsStore((s) => s.searchQuery);
  const setSearchQuery = useRankingsStore((s) => s.setSearchQuery);
  const positionFilters = useRankingsStore((s) => s.positionFilters);
  const togglePositionFilter = useRankingsStore((s) => s.togglePositionFilter);
  const activeList = useRankingsStore((s) => s.activeList);
  const setActiveList = useRankingsStore((s) => s.setActiveList);
  const addTier = useRankingsStore((s) => s.addTier);
  const tiers = useActiveTiers();
  const removeTier = useRankingsStore((s) => s.removeTier);

  return (
    <div className="border-b border-[var(--border)] px-6 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players…"
            className="h-9 pl-8"
          />
        </div>

        <div className="flex items-center gap-1 rounded-[8px] border border-[var(--border)] p-0.5">
          {RANKINGS_LISTS.map((list) => (
            <button
              key={list}
              onClick={() => setActiveList(list)}
              className={cn(
                "rounded-[6px] px-2.5 py-1 text-sm transition-colors",
                activeList === list
                  ? "bg-[var(--surface-muted)] font-medium"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {LIST_LABELS[list]}
            </button>
          ))}
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

        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5"
          disabled={tiers.length >= MAX_TIERS}
          onClick={() => addTier()}
        >
          <Plus className="h-4 w-4" />
          Add tier
        </Button>
      </div>

      {tiers.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-[var(--muted-foreground)]">Tiers:</span>
          {tiers.map((tier) => (
            <span
              key={tier.id}
              className="flex items-center gap-1 rounded-[8px] border border-[var(--border)] px-2 py-1 text-[12px]"
            >
              {tier.label}
              <button
                onClick={() => removeTier(tier.id)}
                aria-label={`Remove ${tier.label}`}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
