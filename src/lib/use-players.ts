"use client";

import { useEffect } from "react";
import { useRankingsStore } from "@/store/use-rankings-store";

// Central player list lives in the rankings store (it's the only module with
// no per-item fallback if unloaded); draft and trade pages piggyback on it.
export function usePlayers() {
  const players = useRankingsStore((s) => s.players);
  const setPlayers = useRankingsStore((s) => s.setPlayers);

  useEffect(() => {
    if (players.length > 0) return;
    fetch("/api/players")
      .then((res) => res.json())
      .then(setPlayers)
      .catch(() => {});
  }, [players.length, setPlayers]);

  return players;
}
