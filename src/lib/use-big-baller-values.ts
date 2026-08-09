"use client";

import { useMemo } from "react";
import { useRankingsStore } from "@/store/use-rankings-store";
import { computeAuctionValues } from "@/lib/valuation";
import { BIG_BALLER_BUDGET, BIG_BALLER_STARTUP_ROSTER, BIG_BALLER_TEAMS, Player } from "@/lib/types";

// Shared by RankingsTable and PlayerDetailDrawer so the "Big Baller" format
// prices the same undrafted pool the same way in both places.
export function useBigBallerValues(active: boolean): Map<string, number> | null {
  const players = useRankingsStore((s) => s.players);
  const drafted = useRankingsStore((s) => s.drafted);

  return useMemo(() => {
    if (!active) return null;
    const available: Player[] = players.filter((p) => !drafted[p.id]);
    return computeAuctionValues(available, {
      budgetPerTeam: BIG_BALLER_BUDGET,
      teams: BIG_BALLER_TEAMS,
      roster: BIG_BALLER_STARTUP_ROSTER,
    });
  }, [active, players, drafted]);
}
