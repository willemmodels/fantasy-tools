"use client";

import { useMemo, useState } from "react";
import { useDraftStore } from "@/store/use-draft-store";
import { useRankingsStore } from "@/store/use-rankings-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PositionPill } from "@/components/shared/position-pill";
import { RosterConfig } from "@/lib/types";

function rosterSpots(roster: RosterConfig) {
  return roster.QB + roster.RB + roster.WR + roster.TE + roster.FLEX + roster.K + roster.BENCH;
}

export function AuctionBoard() {
  const config = useDraftStore((s) => s.config);
  const picks = useDraftStore((s) => s.picks);
  const teamNames = useDraftStore((s) => s.teamNames);
  const nominatedPlayerId = useDraftStore((s) => s.nominatedPlayerId);
  const nominate = useDraftStore((s) => s.nominate);
  const draftPlayer = useDraftStore((s) => s.draftPlayer);
  const players = useRankingsStore((s) => s.players);

  const [bidTeam, setBidTeam] = useState(0);
  const [bidPrice, setBidPrice] = useState(1);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const nominatedPlayer = nominatedPlayerId ? playerById.get(nominatedPlayerId) : null;

  if (!config) return null;
  const spots = rosterSpots(config.roster);

  const spentByTeam = new Map<number, number>();
  const filledByTeam = new Map<number, number>();
  for (const pick of picks) {
    spentByTeam.set(pick.teamIndex, (spentByTeam.get(pick.teamIndex) ?? 0) + (pick.price ?? 0));
    filledByTeam.set(pick.teamIndex, (filledByTeam.get(pick.teamIndex) ?? 0) + 1);
  }

  function awardPick() {
    if (!nominatedPlayerId) return;
    draftPlayer(nominatedPlayerId, bidTeam, bidPrice);
    setBidPrice(1);
  }

  return (
    <div className="space-y-4">
      {nominatedPlayer && (
        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
          <span className="font-medium">{nominatedPlayer.name}</span>
          <PositionPill position={nominatedPlayer.position} />
          <span className="text-[13px] text-[var(--muted-foreground)]">on the block</span>
          <Select value={String(bidTeam)} onValueChange={(v) => setBidTeam(Number(v))}>
            <SelectTrigger className="ml-auto h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teamNames.map((name, i) => (
                <SelectItem key={i} value={String(i)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            value={bidPrice}
            onChange={(e) => setBidPrice(Number(e.target.value))}
            className="h-9 w-20"
          />
          <Button size="sm" onClick={awardPick}>
            Award pick
          </Button>
          <Button size="sm" variant="ghost" onClick={() => nominate(null)}>
            Cancel
          </Button>
        </div>
      )}

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${config.teams}, 1fr)` }}>
        {teamNames.map((name, i) => {
          const spent = spentByTeam.get(i) ?? 0;
          const filled = filledByTeam.get(i) ?? 0;
          const remaining = config.budget - spent;
          const spotsLeft = spots - filled;
          return (
            <div key={i} className="rounded-[10px] border border-[var(--border)] p-2 text-center">
              <p className="truncate text-[12px] font-medium">{name}</p>
              <p className="text-lg font-medium tabular-nums">${remaining}</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">{spotsLeft} spots left</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
