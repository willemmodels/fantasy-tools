// Imports real NFL data from nflverse (https://github.com/nflverse/nflverse-data,
// public/CC0 community dataset) at seed time: active 2026 rosters, real 2025 season
// stats, the real 2026 schedule (bye weeks + posted sportsbook lines), and real
// contract data (best-effort — see loadContracts). Strength-of-schedule/upside/bust
// come from the user-supplied FantasyPros export (FantasyPros_2026_Draft_ALL_Rankings.csv
// at the project root) where a player matches by name; there's no free source for
// 2026 fantasy projections or per-player prop odds, so `proj2026` is this script's
// own estimate computed from the real inputs above — see buildPlayerRecord in
// data-loaders.ts for the formula.
// Run with `npm run db:seed`. No network available? `npm run db:seed:mock` seeds
// synthetic players instead.
//
// WARNING: this wipes and regenerates every Player row (fresh `id`s via
// @default(uuid())), which invalidates any custom rankings order stored in a
// browser's localStorage. To add newly-drafted rookies without disturbing an
// in-progress ranking, use `npm run db:add-rookies` instead — it only inserts
// players missing from the existing DB, never touches existing rows/ids.
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
} from "./data-loaders";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

// How many of each position to keep, ranked by real 2025 production — keeps the
// pool at the "fantasy-relevant" ~300-400 players agreed with the user, rather
// than importing every active roster spot (backups, long-snappers' teammates, etc).
const POSITION_CAPS: Record<Position, number> = { QB: 40, RB: 90, WR: 120, TE: 50, K: 32 };

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

  const ctx = { statsByPlayerId, byeWeekByTeam, impliedPointsByTeam, leagueAvgImplied, contracts, fpRatings };
  const byPosition: Record<Position, ReturnType<typeof buildPlayerRecord>[]> = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    K: [],
  };

  for (const row of active) {
    byPosition[row.position as Position].push(buildPlayerRecord(row, ctx));
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
