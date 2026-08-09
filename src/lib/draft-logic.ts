import { Player } from "./types";

// Odd rounds go left-to-right, even rounds reverse (standard snake draft).
export function teamIndexForPick(overallPick: number, teams: number): number {
  const zeroBased = overallPick - 1;
  const round = Math.floor(zeroBased / teams);
  const posInRound = zeroBased % teams;
  return round % 2 === 0 ? posInRound : teams - 1 - posInRound;
}

export function roundForPick(overallPick: number, teams: number): number {
  return Math.floor((overallPick - 1) / teams) + 1;
}

export function byeWeekConflicts(
  rosteredPlayers: Player[],
  threshold = 3
): Map<number, Player[]> {
  const byBye = new Map<number, Player[]>();
  for (const player of rosteredPlayers) {
    const list = byBye.get(player.byeWeek) ?? [];
    list.push(player);
    byBye.set(player.byeWeek, list);
  }
  const conflicts = new Map<number, Player[]>();
  for (const [week, players] of byBye) {
    if (players.length >= threshold) conflicts.set(week, players);
  }
  return conflicts;
}
