"use client";

import { useMemo } from "react";
import { useDraftStore } from "@/store/use-draft-store";
import { useRankingsStore } from "@/store/use-rankings-store";
import { PositionPill } from "@/components/shared/position-pill";
import { byeWeekConflicts } from "@/lib/draft-logic";
import { Position } from "@/lib/types";

export function MyTeamSidebar() {
  const config = useDraftStore((s) => s.config);
  const picks = useDraftStore((s) => s.picks);
  const players = useRankingsStore((s) => s.players);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  if (!config) return null;
  const myTeamIndex = config.userSlot - 1;
  const myPicks = picks.filter((p) => p.teamIndex === myTeamIndex);
  const myPlayers = myPicks
    .map((p) => playerById.get(p.playerId))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const conflicts = byeWeekConflicts(myPlayers, 3);

  const countByPos: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0 };
  for (const p of myPlayers) countByPos[p.position] += 1;

  return (
    <div className="space-y-3">
      {conflicts.size > 0 && (
        <div className="rounded-[8px] border border-[var(--status-danger)] bg-red-50 p-2 text-[12px] text-[var(--status-danger)] dark:bg-red-950/40">
          {Array.from(conflicts.entries()).map(([week, ps]) => (
            <p key={week}>
              {ps.length} players share bye week {week}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5 text-center text-[12px]">
        {(Object.keys(countByPos) as Position[]).map((pos) => (
          <div key={pos} className="rounded-[8px] border border-[var(--border)] py-1.5">
            <p className="font-medium">{countByPos[pos]}/{config.roster[pos]}</p>
            <p className="text-[var(--muted-foreground)]">{pos}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {myPlayers.length === 0 && (
          <p className="py-4 text-center text-[13px] text-[var(--muted-foreground)]">
            You haven&apos;t drafted anyone yet.
          </p>
        )}
        {myPlayers.map((player) => (
          <div key={player.id} className="flex items-center gap-2 rounded-[8px] border border-[var(--border)] px-2 py-1.5 text-[13px]">
            <PositionPill position={player.position} className="text-[10px]" />
            <span className="flex-1 truncate">{player.name}</span>
            <span className="text-[11px] text-[var(--muted-foreground)]">Bye {player.byeWeek}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
