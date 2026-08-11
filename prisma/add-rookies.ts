// Inserts this year's rookies (years_exp === 0 on the active 2026 roster) that
// are missing from the existing DB — additive only, never touches or removes
// existing rows. Unlike seed.ts, this doesn't regenerate ids, so it's safe to
// run after you've already started customizing your rankings order: new
// rookies just show up as brand-new players, which the rankings store appends
// to the end of your existing order automatically (see setPlayers in
// use-rankings-store.ts) rather than reshuffling anything you've already ranked.
// Run with `npm run db:add-rookies`.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { fetchCsv } from "./nflverse";
import {
  FANTASY_POSITIONS,
  Position,
  buildPlayerRecord,
  loadByeWeeksAndImpliedPoints,
  loadContracts,
  loadFantasyProsRatings,
  normalizeName,
} from "./data-loaders";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

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

  const rookies = roster.filter(
    (r) =>
      r.status === "ACT" &&
      FANTASY_POSITIONS.includes(r.position as Position) &&
      r.years_exp === "0"
  );

  const existingNames = new Set(
    (await prisma.player.findMany({ select: { name: true } })).map((p) => normalizeName(p.name))
  );
  const missing = rookies.filter((r) => !existingNames.has(normalizeName(r.full_name)));

  if (missing.length === 0) {
    console.log("No missing rookies — DB is already up to date.");
    return;
  }

  const ctx = { statsByPlayerId, byeWeekByTeam, impliedPointsByTeam, leagueAvgImplied, contracts, fpRatings };
  for (const row of missing) {
    await prisma.player.create({ data: buildPlayerRecord(row, ctx) });
  }

  console.log(
    `Added ${missing.length} rookies (of ${rookies.length} total in this year's active-roster class) without touching existing players.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
