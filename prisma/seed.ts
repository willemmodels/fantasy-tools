// Imports real NFL data from nflverse (https://github.com/nflverse/nflverse-data,
// public/CC0 community dataset) at seed time: active 2026 rosters, real 2025 season
// stats, the real 2026 schedule (bye weeks + posted sportsbook lines), and real
// contract data (best-effort — see loadContracts). Strength-of-schedule/upside/bust
// come from the user-supplied FantasyPros export (FantasyPros_2026_Draft_ALL_Rankings.csv
// at the project root) where a player matches by name; there's no free source for
// 2026 fantasy projections or per-player prop odds, so `proj2026` is this script's
// own estimate computed from the real inputs above — see the comment at its formula.
// Run with `npm run db:seed`. No network available? `npm run db:seed:mock` seeds
// synthetic players instead.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { fetchCsv, fetchGzipCsv, normalizeTeam, num } from "./nflverse";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

type Position = "QB" | "RB" | "WR" | "TE" | "K";
const FANTASY_POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K"];

// How many of each position to keep, ranked by real 2025 production — keeps the
// pool at the "fantasy-relevant" ~300-400 players agreed with the user, rather
// than importing every active roster spot (backups, long-snappers' teammates, etc).
const POSITION_CAPS: Record<Position, number> = { QB: 40, RB: 90, WR: 120, TE: 50, K: 32 };

// Rough season-long point expectation for a player with zero 2025 production
// (rookies, practice-squad call-ups) — not sourced, just keeps proj2026 off zero.
const ROOKIE_FLOOR: Record<Position, number> = { QB: 180, RB: 120, WR: 110, TE: 70, K: 110 };

const SEASON_START = new Date("2026-09-01");

function ageFromBirthDate(birthDate: string, fallbackYearsExp: number): number {
  if (!birthDate) return 22 + fallbackYearsExp;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return 22 + fallbackYearsExp;
  let age = SEASON_START.getFullYear() - dob.getFullYear();
  const monthDiff = SEASON_START.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && SEASON_START.getDate() < dob.getDate())) age--;
  return age;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'"]/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv|v)\.?$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

async function loadByeWeeksAndImpliedPoints() {
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

async function loadContracts() {
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

interface FpRating {
  upside: number | null;
  bust: number | null;
  sos: number | null;
}

// User-supplied FantasyPros export, read from the project root — not fetched,
// so this is skipped (falls back to the heuristics below) if the file is missing.
function loadFantasyProsRatings(): Map<string, FpRating> {
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

async function main() {
  console.log("Fetching 2026 rosters, 2025 stats, 2026 schedule, and contracts from nflverse…");

  const [roster, statsRows, contracts, { byeWeekByTeam, impliedPointsByTeam, leagueAvgImplied }] =
    await Promise.all([
      fetchCsv("rosters/roster_2026.csv"),
      fetchCsv("stats_player/stats_player_reg_2025.csv"),
      loadContracts(),
      loadByeWeeksAndImpliedPoints(),
    ]);
  const fpRatings = loadFantasyProsRatings();

  const statsByPlayerId = new Map(statsRows.map((r) => [r.player_id, r]));

  const active = roster.filter(
    (r) => r.status === "ACT" && FANTASY_POSITIONS.includes(r.position as Position)
  );

  type Built = Parameters<typeof prisma.player.create>[0]["data"];
  const byPosition: Record<Position, Built[]> = { QB: [], RB: [], WR: [], TE: [], K: [] };

  for (const row of active) {
    const position = row.position as Position;
    const team = normalizeTeam(row.team);
    const stats = statsByPlayerId.get(row.gsis_id);

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

    const teamImplied = impliedPointsByTeam.get(team) ?? leagueAvgImplied;
    const offenseFactor = teamImplied / leagueAvgImplied;

    const baseline = fps2025 > 0 ? fps2025 : ROOKIE_FLOOR[position];
    const vegasProj = baseline * offenseFactor;
    const proj2026 = baseline * 0.6 + vegasProj * 0.4;

    // Upside/bust/SoS come from the user-supplied FantasyPros export (real editorial
    // ratings, already on FantasyPros' own 1-5 scale) when the player is in it; players
    // outside its ~500-player pool fall back to this project's own heuristic from real
    // inputs (target share, team offense strength, games played, experience).
    const fp = fpRatings.get(normalizeName(row.full_name));
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
    const sos = fp?.sos ?? clamp(((byeWeekByTeam.get(team) ?? 10) % 5) + 1, 1, 5);

    // The free contracts dataset is frequently stale for recent extensions (verified
    // against several 2024/2025 deals), so anything unmatched gets an honest label
    // derived from real years-in-league instead of asserting a wrong dollar figure.
    const contract = contracts.get(normalizeName(row.full_name));
    const contractLabel = contract
      ? `$${Math.round(contract.apy / 1_000_000)}M/yr-${contract.endYear}`
      : yearsExp <= 3
        ? "Rookie deal"
        : "Veteran (contract unlisted)";

    byPosition[position].push({
      name: row.full_name,
      team,
      position,
      byeWeek: byeWeekByTeam.get(team) ?? 10,
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
    });
  }

  const players = FANTASY_POSITIONS.flatMap((position) =>
    byPosition[position]
      .sort((a, b) => b.fps2025 - a.fps2025)
      .slice(0, POSITION_CAPS[position])
  );

  await prisma.player.deleteMany();
  for (const data of players) {
    await prisma.player.create({ data });
  }

  console.log(`Seeded ${players.length} real players from nflverse (2026 rosters × 2025 stats).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
