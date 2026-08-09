"use client";

import { usePlayers } from "@/lib/use-players";
import { ControlsBar } from "@/components/rankings/controls-bar";
import { RankingsTable } from "@/components/rankings/rankings-table";
import { PlayerDetailDrawer } from "@/components/rankings/player-detail-drawer";

export default function RankingsPage() {
  usePlayers();

  return (
    <div className="flex flex-col">
      <div className="border-b border-[var(--border)] px-6 py-4">
        <h1 className="text-xl font-medium">Rankings</h1>
      </div>
      <ControlsBar />
      <div className="flex-1 overflow-x-auto px-6 py-4">
        <RankingsTable />
      </div>
      <PlayerDetailDrawer />
    </div>
  );
}
