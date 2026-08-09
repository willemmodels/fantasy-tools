"use client";

import { useMemo, useState } from "react";
import { useDraftStore, currentSnakeTeamIndex } from "@/store/use-draft-store";
import { useRankingsStore } from "@/store/use-rankings-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PositionPill } from "@/components/shared/position-pill";
import { EmptyState } from "@/components/shared/empty-state";
import { computeAuctionValues } from "@/lib/valuation";
import { displayedProjection } from "@/lib/scoring";

export function DraftPoolPanel() {
  const config = useDraftStore((s) => s.config);
  const picks = useDraftStore((s) => s.picks);
  const nominate = useDraftStore((s) => s.nominate);
  const draftPlayer = useDraftStore((s) => s.draftPlayer);
  const players = useRankingsStore((s) => s.players);
  const order = useRankingsStore((s) => s.order);
  const scoringFormat = useRankingsStore((s) => s.scoringFormat);
  const [query, setQuery] = useState("");

  const draftedIds = useMemo(() => new Set(picks.map((p) => p.playerId)), [picks]);
  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const available = order
    .map((id) => playerById.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p && !draftedIds.has(p.id))
    .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  const auctionValues = useMemo(() => {
    if (!config || config.draftType !== "AUCTION") return null;
    return computeAuctionValues(available, { budgetPerTeam: config.budget, teams: config.teams, roster: config.roster });
  }, [available, config]);

  if (!config) return null;

  function handleDraftClick(playerId: string) {
    if (config!.draftType === "AUCTION") {
      nominate(playerId);
    } else {
      const teamIndex = currentSnakeTeamIndex(picks.length + 1, config!.teams);
      draftPlayer(playerId, teamIndex);
    }
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter pool…"
        className="h-8"
      />
      <div className="flex-1 space-y-1 overflow-y-auto">
        {available.length === 0 && <EmptyState message="No players left in the pool." />}
        {available.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-2 rounded-[8px] border border-[var(--border)] px-2 py-1.5 text-[13px]"
          >
            <PositionPill position={player.position} className="text-[10px]" />
            <span className="flex-1 truncate font-medium">{player.name}</span>
            <span className="w-8 text-[11px] text-[var(--muted-foreground)]">
              Bye {player.byeWeek}
            </span>
            {auctionValues ? (
              <span className="w-10 tabular-nums text-[12px] font-medium">
                ${auctionValues.get(player.id) ?? 1}
              </span>
            ) : (
              <span className="w-10 tabular-nums text-[12px] text-[var(--muted-foreground)]">
                {displayedProjection(player, scoringFormat).toFixed(0)}
              </span>
            )}
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleDraftClick(player.id)}>
              {config.draftType === "AUCTION" ? "Nominate" : "Draft"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
