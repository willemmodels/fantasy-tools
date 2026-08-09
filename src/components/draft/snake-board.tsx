"use client";

import { useMemo } from "react";
import { useDraftStore } from "@/store/use-draft-store";
import { useRankingsStore } from "@/store/use-rankings-store";
import { PositionPill } from "@/components/shared/position-pill";
import { teamIndexForPick } from "@/lib/draft-logic";
import { cn } from "@/lib/utils";
import { RosterConfig } from "@/lib/types";

function totalRounds(roster: RosterConfig) {
  return roster.QB + roster.RB + roster.WR + roster.TE + roster.FLEX + roster.K + roster.BENCH;
}

export function SnakeBoard() {
  const config = useDraftStore((s) => s.config);
  const picks = useDraftStore((s) => s.picks);
  const teamNames = useDraftStore((s) => s.teamNames);
  const players = useRankingsStore((s) => s.players);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const pickByCell = useMemo(() => {
    const map = new Map<string, (typeof picks)[number]>();
    for (const pick of picks) map.set(`${pick.round}-${pick.teamIndex}`, pick);
    return map;
  }, [picks]);

  if (!config) return null;
  const rounds = totalRounds(config.roster);
  const currentPick = picks.length + 1;
  const currentTeam = teamIndexForPick(currentPick, config.teams);
  const currentRound = Math.floor((currentPick - 1) / config.teams) + 1;

  return (
    <div className="overflow-auto">
      <div className="mb-3 flex items-center gap-3 text-sm">
        <span className="rounded-[8px] bg-[var(--surface-muted)] px-3 py-1.5 font-medium">
          On the clock: {teamNames[currentTeam]}
        </span>
        <span className="text-[var(--muted-foreground)]">
          Pick {currentPick} · Round {currentRound}
        </span>
      </div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `48px repeat(${config.teams}, minmax(120px, 1fr))` }}
      >
        <div />
        {teamNames.map((name, i) => (
          <div key={i} className="truncate px-1 text-center text-[12px] font-medium text-[var(--muted-foreground)]">
            {name}
          </div>
        ))}
        {Array.from({ length: rounds }, (_, roundIdx) => {
          const round = roundIdx + 1;
          return (
            <div key={round} className="contents">
              <div className="flex items-center justify-center text-[12px] text-[var(--muted-foreground)]">
                {round}
              </div>
              {teamNames.map((_, teamIndex) => {
                const pick = pickByCell.get(`${round}-${teamIndex}`);
                const player = pick ? playerById.get(pick.playerId) : undefined;
                const isCurrent = round === currentRound && teamIndex === currentTeam;
                return (
                  <div
                    key={teamIndex}
                    className={cn(
                      "flex min-h-[60px] flex-col justify-center gap-0.5 rounded-[8px] border border-[var(--border)] bg-[var(--background)] p-1.5",
                      isCurrent && "border-2 border-[var(--foreground)] shadow-sm",
                      teamIndex === config.userSlot - 1 && "border-l-4"
                    )}
                  >
                    {player ? (
                      <>
                        <span className="truncate text-[13px] font-medium">{player.name}</span>
                        <div className="flex items-center gap-1">
                          <PositionPill position={player.position} className="text-[10px]" />
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            #{pick!.overallPick}
                          </span>
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
