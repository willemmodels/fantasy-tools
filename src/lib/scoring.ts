import { Player, ScoringFormat, SeasonStats } from "./types";

const RECEPTION_VALUE: Record<ScoringFormat, number> = {
  PPR: 1,
  HALF: 0.5,
  STD: 0,
};

// The mock schema keeps a single combined `tds` count rather than splitting
// pass/rush/rec TDs, so every TD is scored at the rush/rec rate (6pts) —
// slightly generous for a QB's passing TDs, but there's no split field to score them at 4.
export function scorePlayer(stats: SeasonStats, format: ScoringFormat): number {
  const receptionPts = stats.rec * RECEPTION_VALUE[format];
  return (
    stats.passYds * 0.04 +
    stats.rushYds * 0.1 +
    stats.recYds * 0.1 +
    stats.tds * 6 +
    receptionPts -
    stats.tov * 2
  );
}

export function scorePerGame(stats: SeasonStats, format: ScoringFormat): number {
  if (stats.gp === 0) return 0;
  return scorePlayer(stats, format) / stats.gp;
}

// fps2025/proj2026 are stored under a PPR baseline; rescale by the same
// PPR-vs-format ratio as the raw stat line rather than storing a value per format.
export function displayedHistoricalPoints(player: Player, format: ScoringFormat): number {
  return scorePlayer(player.stats2025, format);
}

export function displayedProjection(player: Player, format: ScoringFormat): number {
  const pprBase = scorePlayer(player.stats2025, "PPR");
  if (pprBase <= 0) return player.proj2026;
  const ratio = scorePlayer(player.stats2025, format) / pprBase;
  return player.proj2026 * ratio;
}
