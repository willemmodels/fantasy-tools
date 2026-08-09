"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTradeStore } from "@/store/use-trade-store";
import { useRankingsStore } from "@/store/use-rankings-store";
import { PositionPill } from "@/components/shared/position-pill";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { displayedHistoricalPoints, displayedProjection } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { Player } from "@/lib/types";

interface StatRow {
  label: string;
  higherIsBetter: boolean;
  value: (player: Player, rank: number) => number;
}

export function ComparisonTable() {
  const comparisonPlayerIds = useTradeStore((s) => s.comparisonPlayerIds);
  const addToComparison = useTradeStore((s) => s.addToComparison);
  const removeFromComparison = useTradeStore((s) => s.removeFromComparison);
  const players = useRankingsStore((s) => s.players);
  const order = useRankingsStore((s) => s.order);
  const scoringFormat = useRankingsStore((s) => s.scoringFormat);
  // The trade comparison always shows points, even if Rankings is set to
  // the Big Baller $ format — fall back to PPR rather than a dollar figure.
  const pointsFormat = scoringFormat === "BIG_BALLER" ? "PPR" : scoringFormat;
  const [query, setQuery] = useState("");

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const rankById = useMemo(() => new Map(order.map((id, i) => [id, i + 1])), [order]);

  const selected = comparisonPlayerIds
    .map((id) => playerById.get(id))
    .filter((p): p is Player => !!p);

  const suggestions =
    query.trim().length > 0
      ? players
          .filter(
            (p) =>
              !comparisonPlayerIds.includes(p.id) &&
              p.name.toLowerCase().includes(query.trim().toLowerCase())
          )
          .slice(0, 6)
      : [];

  const rows: StatRow[] = [
    { label: "Rank", higherIsBetter: false, value: (_p, rank) => rank },
    { label: "2025 pts", higherIsBetter: true, value: (p) => displayedHistoricalPoints(p, pointsFormat) },
    { label: "Proj 2026", higherIsBetter: true, value: (p) => displayedProjection(p, pointsFormat) },
    { label: "Rushing yards", higherIsBetter: true, value: (p) => p.stats2025.rushYds },
    { label: "Receptions", higherIsBetter: true, value: (p) => p.stats2025.rec },
    { label: "Receiving yards", higherIsBetter: true, value: (p) => p.stats2025.recYds },
    { label: "Total TDs", higherIsBetter: true, value: (p) => p.stats2025.tds },
    { label: "Games played", higherIsBetter: true, value: (p) => p.stats2025.gp },
  ];

  const byeGroups = new Map<number, number>();
  for (const p of selected) byeGroups.set(p.byeWeek, (byeGroups.get(p.byeWeek) ?? 0) + 1);
  const conflictWeeks = [...byeGroups.entries()].filter(([, count]) => count > 1).map(([w]) => w);

  return (
    <div className="space-y-4">
      {selected.length < 3 && (
        <div className="relative max-w-sm">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add a player to compare…"
            className="h-9"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-[8px] border border-[var(--border)] bg-[var(--background)] shadow-sm">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                  onClick={() => {
                    addToComparison(p.id);
                    setQuery("");
                  }}
                >
                  <PositionPill position={p.position} className="text-[10px]" />
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {conflictWeeks.length > 0 && (
        <div className="rounded-[8px] border border-[var(--status-danger)] bg-red-50 px-3 py-2 text-[13px] text-[var(--status-danger)] dark:bg-red-950/40">
          Bye week collision on week{conflictWeeks.length > 1 ? "s" : ""} {conflictWeeks.join(", ")}
        </div>
      )}

      {selected.length === 0 ? (
        <EmptyState message="Select two players to compare" />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="w-40 text-left text-[12px] text-[var(--muted-foreground)]" />
              {selected.map((p) => (
                <th key={p.id} className="px-3 py-2 text-left">
                  <div className="flex items-center gap-2">
                    <PositionPill position={p.position} />
                    <span className="font-medium">{p.name}</span>
                    <button onClick={() => removeFromComparison(p.id)}>
                      <X className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                    </button>
                  </div>
                  <p className="text-[12px] text-[var(--muted-foreground)]">
                    {p.team} · Bye {p.byeWeek}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const values = selected.map((p) => row.value(p, rankById.get(p.id) ?? 0));
              const best = row.higherIsBetter ? Math.max(...values) : Math.min(...values);
              const allEqual = values.every((v) => v === values[0]);
              return (
                <tr key={row.label} className="border-t border-[var(--border)]">
                  <td className="py-2 text-[13px] text-[var(--muted-foreground)]">{row.label}</td>
                  {values.map((v, i) => (
                    <td
                      key={selected[i].id}
                      className={cn(
                        "px-3 py-2 tabular-nums",
                        !allEqual && v === best && "font-bold text-[var(--status-positive)]"
                      )}
                    >
                      {Number.isInteger(v) ? v : v.toFixed(0)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
