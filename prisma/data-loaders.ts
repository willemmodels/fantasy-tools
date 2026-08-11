// Shared nflverse data-loading + per-player derivation logic, used by both
// seed.ts (full reseed) and add-rookies.ts (additive rookie-only insert).
// Split out because seed.ts self-executes its destructive main() on import —
// importing it from anywhere else would wipe the DB as a side effect.
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { fetchCsv, fetchGzipCsv, normalizeTeam, num } from "./nflverse";

export type Position = "QB" | "RB" | "WR" | "TE" | "K";
export const FANTASY_POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K"];

// Rough season-long point expectation for a player with zero 2025 production
// (rookies, practice-squad call-ups) — not sourced, just keeps proj2026 off zero.
const ROOKIE_FLOOR: Record<Position, number> = { QB: 180, RB: 120, WR: 110, TE: 70, K: 110 };

const SEASON_START = new Date("2026-09-01");

export function ageFromBirthDate(birthDate: string, fallbackYearsExp: number): number {
  if (!birthDate) return 22 + fallbackYearsExp;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return 22 + fallbackYearsExp;
  let age = SEASON_START.getFullYear() - dob.getFullYear();
  const monthDiff = SEASON_START.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && SEASON_START.getDate() < dob.getDate())) age--;
  return age;
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'"]/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv|v)\.?$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export async function loadByeWeeksAndImpliedPoints() {
  const games = (await fetchCsv("schedules/games.csv")).filter(
    (g) => g.season === "2026" && g.game_type === "REG"
  );

  const weeksPlayed = new Map<string, Set<number>>();
  const impliedPoints = new Map<string, number[]>();

  for (const g of games) {
    const home = normalizeTeam(g.home_team);
    const away = normalizeTeam(g.away_team);
    const week = num(g.week);
    for (const team of [home, away]) {
      if (!weeksPlayed.has(team)) weeksPlayed.set(team, new Set());
      weeksPlayed.get(team)!.add(week);
    }
    if (g.spread_line && g.total_line) {
      const total = num(g.total_line);
      const spread = num(g.spread_line);
      const homeImplied = total / 2 + spread / 2;
      const awayImplied = total / 2 - spread / 2;
      if (!impliedPoints.has(home)) impliedPoints.set(home, []);
      if (!impliedPoints.has(away)) impliedPoints.set(away, []);
      impliedPoints.get(home)!.push(homeImplied);
      impliedPoints.get(away)!.push(awayImplied);
    }
  }

  const byeWeekByTeam = new Map<string, number>();
  for (const [team, weeks] of weeksPlayed) {
    for (let w = 1; w <= 18; w++) {
      if (!weeks.has(w)) {
        byeWeekByTeam.set(team, w);
        break;
      }
    }
  }

  const impliedPointsByTeam = new Map<string, number>();
  for (const [team, values] of impliedPoints) {
    impliedPointsByTeam.set(team, values.reduce((a, b) => a + b, 0) / values.length);
  }
  const leagueAvgImplied =
    [...impliedPointsByTeam.values()].reduce((a, b) => a + b, 0) / impliedPointsByTeam.size;

  return { byeWeekByTeam, impliedPointsByTeam, leagueAvgImplied };
}

export async function loadContracts() {
  const rows = await fetchGzipCsv("contracts/historical_contracts.csv.gz");
  const byName = new Map<string, { apy: number; endYear: number; yearSigned: number }>();
  for (const row of rows) {
    if (row.is_active !== "TRUE") continue;
    const key = normalizeName(row.player);
    const yearSigned = num(row.year_signed);
    const endYear = yearSigned + num(row.years);
    // A player can have multiple is_active rows (extensions/restructures) —
    // keep the most recently signed one, and drop anything already expired,
    // since a stale "active" flag in this dataset shouldn't be shown as current.
    if (endYear < 2026) continue;
    const existing = byName.get(key);
    if (existing && existing.yearSigned >= yearSigned) continue;
    byName.set(key, { apy: num(row.apy), endYear, yearSigned });
  }
  return byName;
}

// "5 out of 5" / "4 out of 5 stars" → 4. Shared parser for FantasyPros' rating columns.
function starRating(value: string | undefined): number | null {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : null;
}

export interface FpRating {
  upside: number | null;
  bust: number | null;
  sos: number | null;
}

// User-supplied FantasyPros export, read from the project root — not fetched,
// so this is skipped (falls back to the heuristics below) if the file is missing.
export function loadFantasyProsRatings(): Map<string, FpRating> {
  const byName = new Map<string, FpRating>();
  let text: string;
  try {
    text = readFileSync("FantasyPros_2026_Draft_ALL_Rankings.csv", "utf-8");
  } catch {
    console.warn("FantasyPros CSV not found — using heuristic upside/bust/sos for all players.");
    return byName;
  }
  // relax_column_count: the export has a couple of stray short rows (tier dividers)
  // with fewer fields than the header — skip them instead of throwing.
  const rows: Record<string, string>[] = parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
  for (const row of rows) {
    const name = row["PLAYER NAME"];
    if (!name) continue;
    byName.set(normalizeName(name), {
      upside: starRating(row["UPSIDE "]),
      bust: starRating(row["BUST "]),
      sos: starRating(row["SOS SEASON"]),
    });
  }
  return byName;
}

export interface BuildContext {
  statsByPlayerId: Map<string, Record<string, string>>;
  byeWeekByTeam: Map<string, number>;
  impliedPointsByTeam: Map<string, number>;
  leagueAvgImplied: number;
  contracts: Map<string, { apy: number; endYear: number; yearSigned: number }>;
  fpRatings: Map<string, FpRating>;
}

export interface BuiltPlayer {
  name: string;
  team: string;
  position: Position;
  byeWeek: number;
  yearInLeague: number;
  age: number;
  contract: string;
  statsJson: string;
  fps2025: number;
  ppg2025: number;
  sos: number;
  upside: number;
  bustRisk: number;
  offRating: number;
  proj2026: number;
}

export function buildPlayerRecord(row: Record<string, string>, ctx: BuildContext): BuiltPlayer {
  const position = row.position as Position;
  const team = normalizeTeam(row.team);
  const stats = ctx.statsByPlayerId.get(row.gsis_id);

  const passYds = num(stats?.passing_yards);
  const rushYds = num(stats?.rushing_yards);
  const recYds = num(stats?.receiving_yards);
  const rec = num(stats?.receptions);
  const tgts = num(stats?.targets);
  const gp = num(stats?.games);
  const tds = num(stats?.passing_tds) + num(stats?.rushing_tds) + num(stats?.receiving_tds);
  const tov =
    num(stats?.passing_interceptions) +
    num(stats?.sack_fumbles_lost) +
    num(stats?.rushing_fumbles_lost) +
    num(stats?.receiving_fumbles_lost);
  const targetShare = num(stats?.target_share);
  const fps2025 = num(stats?.fantasy_points_ppr);
  const ppg2025 = gp > 0 ? fps2025 / gp : 0;

  const yearsExp = num(row.years_exp);
  const age = ageFromBirthDate(row.birth_date, yearsExp);

  const teamImplied = ctx.impliedPointsByTeam.get(team) ?? ctx.leagueAvgImplied;
  const offenseFactor = teamImplied / ctx.leagueAvgImplied;

  const baseline = fps2025 > 0 ? fps2025 : ROOKIE_FLOOR[position];
  const vegasProj = baseline * offenseFactor;
  const proj2026 = baseline * 0.6 + vegasProj * 0.4;

  // Upside/bust/SoS come from the user-supplied FantasyPros export (real editorial
  // ratings, already on FantasyPros' own 1-5 scale) when the player is in it; players
  // outside its ~500-player pool fall back to this project's own heuristic from real
  // inputs (target share, team offense strength, games played, experience).
  const fp = ctx.fpRatings.get(normalizeName(row.full_name));
  const upside =
    fp?.upside ??
    clamp(
      1 +
        (targetShare > 0.25 ? 2 : targetShare > 0.15 ? 1 : 0) +
        (offenseFactor > 1.1 ? 2 : offenseFactor > 1 ? 1 : 0),
      1,
      5
    );
  const bustRisk =
    fp?.bust ??
    clamp(1 + (age > 29 ? 1 : 0) + (yearsExp === 0 ? 1 : 0) + (gp > 0 && gp < 10 ? 2 : 0), 1, 5);
  // Fallback sos (no FantasyPros match) has no real defensive-matchup data source —
  // illustrative only, deterministic from bye week rather than actual schedule difficulty.
  const sos = fp?.sos ?? clamp(((ctx.byeWeekByTeam.get(team) ?? 10) % 5) + 1, 1, 5);

  // The free contracts dataset is frequently stale for recent extensions (verified
  // against several 2024/2025 deals), so anything unmatched gets an honest label
  // derived from real years-in-league instead of asserting a wrong dollar figure.
  const contract = ctx.contracts.get(normalizeName(row.full_name));
  const contractLabel = contract
    ? `$${Math.round(contract.apy / 1_000_000)}M/yr-${contract.endYear}`
    : yearsExp <= 3
      ? "Rookie deal"
      : "Veteran (contract unlisted)";

  return {
    name: row.full_name,
    team,
    position,
    byeWeek: ctx.byeWeekByTeam.get(team) ?? 10,
    yearInLeague: yearsExp,
    age,
    contract: contractLabel,
    statsJson: JSON.stringify({ passYds, rushYds, recYds, tds, rec, tgts, tov, gp }),
    fps2025: Math.round(fps2025 * 10) / 10,
    ppg2025: Math.round(ppg2025 * 10) / 10,
    sos,
    upside,
    bustRisk,
    offRating: Math.round(teamImplied * 10) / 10,
    proj2026: Math.round(proj2026 * 10) / 10,
  };
}
