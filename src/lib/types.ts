export type Position = "QB" | "RB" | "WR" | "TE" | "K";

export const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K"];

export type ScoringFormat = "PPR" | "HALF" | "STD";

// A player's rank can legitimately differ across these four contexts (a
// Half-PPR TE isn't worth the same slot as in Standard, and Big Baller's
// 2QB/20-bench construct isn't a scoring format at all but still needs its
// own list) — each one gets a fully independent order/tiers in the
// rankings store, keyed by this type.
export type RankingsList = "PPR" | "HALF" | "STD" | "BIG_BALLER";

export interface SeasonStats {
  passYds: number;
  rushYds: number;
  recYds: number;
  tds: number;
  rec: number;
  tgts: number;
  tov: number;
  gp: number;
}

export interface Player {
  id: string;
  name: string;
  team: string;
  position: Position;
  byeWeek: number;
  yearInLeague: number;
  age: number;
  contract: string;
  stats2025: SeasonStats;
  fps2025: number;
  ppg2025: number;
  sos: number;
  upside: number;
  bustRisk: number;
  offRating: number;
  proj2026: number;
}

export interface Tier {
  id: string;
  label: string;
}

export interface RankedPlayer {
  playerId: string;
  rank: number;
  tierId: string | null;
  notes: string;
  drafted: boolean;
}

export type DraftType = "SNAKE" | "AUCTION";

export interface RosterConfig {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  FLEX: number;
  K: number;
  BENCH: number;
}

export const BIG_BALLER_STARTUP_ROSTER: RosterConfig = {
  QB: 2,
  RB: 4,
  WR: 5,
  TE: 2,
  FLEX: 2,
  K: 2,
  BENCH: 20,
};

export const BIG_BALLER_BUDGET = 500;
export const BIG_BALLER_TEAMS = 4;

export interface DraftPick {
  overallPick: number;
  round: number;
  teamIndex: number;
  playerId: string;
  price?: number;
}

export interface DraftRoomConfig {
  scoring: ScoringFormat;
  draftType: DraftType;
  teams: number;
  roster: RosterConfig;
  budget: number;
  userSlot: number;
  started: boolean;
  isBigBaller: boolean;
}

export type TradeAssetType = "PLAYER" | "PICK" | "FAAB";

export interface TradeAsset {
  id: string;
  type: TradeAssetType;
  side: "A" | "B" | null;
  label: string;
  playerId?: string;
  value: number;
}
