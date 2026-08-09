import { Player, Position, RosterConfig } from "./types";

// FLEX slots are split across the three skill positions by typical
// fantasy usage rates rather than evenly, since RBs/WRs fill FLEX far more often than TEs.
const FLEX_SHARE: Record<"RB" | "WR" | "TE", number> = {
  RB: 0.45,
  WR: 0.45,
  TE: 0.1,
};

export function replacementRank(
  position: Position,
  roster: RosterConfig,
  teams: number
): number {
  const base = roster[position] ?? 0;
  const flexAdd =
    position === "RB" || position === "WR" || position === "TE"
      ? roster.FLEX * FLEX_SHARE[position]
      : 0;
  return Math.max(1, Math.round(teams * (base + flexAdd)));
}

export function computeReplacementLevels(
  players: Player[],
  roster: RosterConfig,
  teams: number
): Record<Position, number> {
  const levels: Partial<Record<Position, number>> = {};
  const byPosition: Record<Position, Player[]> = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    K: [],
  };
  for (const p of players) byPosition[p.position].push(p);

  for (const pos of Object.keys(byPosition) as Position[]) {
    const sorted = [...byPosition[pos]].sort((a, b) => b.proj2026 - a.proj2026);
    const rank = replacementRank(pos, roster, teams);
    const replacementPlayer = sorted[Math.min(rank, sorted.length) - 1];
    levels[pos] = replacementPlayer ? replacementPlayer.proj2026 : 0;
  }
  return levels as Record<Position, number>;
}

export function vorp(player: Player, replacementLevels: Record<Position, number>): number {
  return player.proj2026 - replacementLevels[player.position];
}

export interface AuctionValueOptions {
  budgetPerTeam: number;
  teams: number;
  roster: RosterConfig;
}

// Kickers are flat-priced at $1 (per the "Big Baller Startup" preset rule) and
// excluded from the VORP pool so they don't distort skill-position pricing.
const KICKER_FLAT_PRICE = 1;

export function computeAuctionValues(
  availablePlayers: Player[],
  options: AuctionValueOptions
): Map<string, number> {
  const { budgetPerTeam, teams, roster } = options;
  const values = new Map<string, number>();

  const rosterSpotsPerTeam =
    roster.QB + roster.RB + roster.WR + roster.TE + roster.FLEX + roster.K + roster.BENCH;
  const totalPool = budgetPerTeam * teams;
  const totalSpots = rosterSpotsPerTeam * teams;
  // Reserve a $1 minimum bid for every remaining roster spot, kickers included.
  const reserve = totalSpots;
  const distributable = Math.max(0, totalPool - reserve);

  const replacementLevels = computeReplacementLevels(availablePlayers, roster, teams);

  const skillPlayers = availablePlayers.filter((p) => p.position !== "K");
  const positiveVorps = skillPlayers
    .map((p) => Math.max(0, vorp(p, replacementLevels)))
    .reduce((sum, v) => sum + v, 0);

  for (const player of availablePlayers) {
    if (player.position === "K") {
      values.set(player.id, KICKER_FLAT_PRICE);
      continue;
    }
    const playerVorp = Math.max(0, vorp(player, replacementLevels));
    const share = positiveVorps > 0 ? playerVorp / positiveVorps : 0;
    const dollarValue = 1 + share * distributable;
    values.set(player.id, Math.round(dollarValue));
  }

  return values;
}

// Static positional scarcity multipliers for the trade analyzer, which has no
// draft-room roster context to derive scarcity from the way computeAuctionValues does.
export const POSITION_SCARCITY: Record<Position, number> = {
  QB: 0.85,
  RB: 1.1,
  WR: 1.05,
  TE: 0.95,
  K: 0.5,
};

export interface TradeValueOptions {
  rank: number;
  totalPlayers: number;
  scarcityMultiplier: number;
}

// A simple composite: rank (position in the custom board) matters most,
// proj2026 anchors it to real production, and scarcityMultiplier lets
// positional need (from RosterConfig fill state) nudge value up or down.
export function tradePlayerValue(
  player: Player,
  { rank, totalPlayers, scarcityMultiplier }: TradeValueOptions
): number {
  const rankScore = ((totalPlayers - rank + 1) / totalPlayers) * 100;
  const projScore = player.proj2026 / 3;
  return (rankScore * 0.6 + projScore * 0.4) * scarcityMultiplier;
}
