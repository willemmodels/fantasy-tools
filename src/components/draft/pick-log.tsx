"use client";

import { useMemo } from "react";
import { useDraftStore } from "@/store/use-draft-store";
import { useRankingsStore } from "@/store/use-rankings-store";
import { Button } from "@/components/ui/button";
import { PositionPill } from "@/components/shared/position-pill";
import { EmptyState } from "@/components/shared/empty-state";

export function PickLog() {
  const picks = useDraftStore((s) => s.picks);
  const teamNames = useDraftStore((s) => s.teamNames);
  const undoLastPick = useDraftStore((s) => s.undoLastPick);
  const players = useRankingsStore((s) => s.players);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  if (picks.length === 0) {
    return <EmptyState message="No picks yet." />;
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex-1 space-y-1 overflow-y-auto">
        {[...picks].reverse().map((pick) => {
          const player = playerById.get(pick.playerId);
          if (!player) return null;
          return (
            <div key={pick.overallPick} className="flex items-center gap-2 rounded-[8px] border border-[var(--border)] px-2 py-1.5 text-[13px]">
              <span className="w-8 text-[11px] tabular-nums text-[var(--muted-foreground)]">
                #{pick.overallPick}
              </span>
              <PositionPill position={player.position} className="text-[10px]" />
              <span className="flex-1 truncate font-medium">{player.name}</span>
              <span className="truncate text-[11px] text-[var(--muted-foreground)]">
                {teamNames[pick.teamIndex]}
              </span>
              {pick.price != null && (
                <span className="tabular-nums text-[11px]">${pick.price}</span>
              )}
            </div>
          );
        })}
      </div>
      <Button variant="outline" size="sm" onClick={undoLastPick}>
        Undo last pick
      </Button>
    </div>
  );
}
