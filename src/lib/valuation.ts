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

type ValueOf = (player: Player) => number;

const defaultValueOf: ValueOf = (p) => p.proj2026;

export function computeReplacementLevels(
  players: Player[],
  roster: RosterConfig,
  teams: number,
  valueOf: ValueOf = defaultValueOf
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
    const sorted = [...byPosition[pos]].sort((a, b) => valueOf(b) - valueOf(a));
    const rank = replacementRank(pos, roster, teams);
    const replacementPlayer = sorted[Math.min(rank, sorted.length) - 1];
    levels[pos] = replacementPlayer ? valueOf(replacementPlayer) : 0;
  }
  return levels as Record<Position, number>;
}

export function vorp(
  player: Player,
  replacementLevels: Record<Position, number>,
  valueOf: ValueOf = defaultValueOf
): number {
  return valueOf(player) - replacementLevels[player.position];
}

// Reassigns each available player's VORP-relevant "value" according to the
// user's custom Rankings order instead of raw proj2026: take the pool's own
// proj2026 numbers, sort them into a curve, then hand that curve out in the
// order the user ranked these same players. Whoever they ranked #1 among
// what's left gets the pool's top number, regardless of whose projection it
// originally was — the auction engine's math (positional scarcity, VORP)
// doesn't change, only which player gets which number going into it.
export function reorderValuesByRank(
  availablePlayers: Player[],
  order: string[]
): Map<string, number> {
  const curve = availablePlayers.map((p) => p.proj2026).sort((a, b) => b - a);
  const availableIds = new Set(availablePlayers.map((p) => p.id));
  const rankedIds = order.filter((id) => availableIds.has(id));

  const values = new Map<string, number>();
  rankedIds.forEach((id, i) => values.set(id, curve[i] ?? 0));
  // A player missing from `order` (shouldn't normally happen) keeps their
  // own proj2026 rather than silently falling out of pricing.
  for (const p of availablePlayers) {
    if (!values.has(p.id)) values.set(p.id, p.proj2026);
  }
  return values;
}

export interface AuctionValueOptions {
  budgetPerTeam: number;
  teams: number;
  roster: RosterConfig;
  // Custom Rankings order — when provided, dollar values follow the user's
  // own ranking (via reorderValuesByRank) instead of raw proj2026.
  order?: string[];
}

// Kickers are flat-priced at $1 (per the "Big Baller Startup" preset rule) and
// excluded from the VORP pool so they don't distort skill-position pricing.
const KICKER_FLAT_PRICE = 1;

export function computeAuctionValues(
  availablePlayers: Player[],
  options: AuctionValueOptions
): Map<string, number> {
  const { budgetPerTeam, teams, roster, order } = options;
  const values = new Map<string, number>();

  const rosterSpotsPerTeam =
    roster.QB + roster.RB + roster.WR + roster.TE + roster.FLEX + roster.K + roster.BENCH;
  const totalPool = budgetPerTeam * teams;
  const totalSpots = rosterSpotsPerTeam * teams;
  // Reserve a $1 minimum bid for every remaining roster spot, kickers included.
  const reserve = totalSpots;
  const distributable = Math.max(0, totalPool - reserve);

  const rankValues = order ? reorderValuesByRank(availablePlayers, order) : null;
  const valueOf: ValueOf = rankValues ? (p) => rankValues.get(p.id) ?? p.proj2026 : defaultValueOf;

  const replacementLevels = computeReplacementLevels(availablePlayers, roster, teams, valueOf);

  const skillPlayers = availablePlayers.filter((p) => p.position !== "K");
  const positiveVorps = skillPlayers
    .map((p) => Math.max(0, vorp(p, replacementLevels, valueOf)))
    .reduce((sum, v) => sum + v, 0);

  for (const player of availablePlayers) {
    if (player.position === "K") {
      values.set(player.id, KICKER_FLAT_PRICE);
      continue;
    }
    const playerVorp = Math.max(0, vorp(player, replacementLevels, valueOf));
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
