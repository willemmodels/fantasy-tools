export type Position = "QB" | "RB" | "WR" | "TE" | "K";

export const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K"];

export type ScoringFormat = "PPR" | "HALF" | "STD";

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
  adp: number;
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
