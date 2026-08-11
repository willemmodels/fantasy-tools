// One-off additive insert for a single named player missing from the pool
// (e.g. excluded by POSITION_CAPS due to a down/injury year) — never touches
// existing rows, same safety property as add-rookies.ts. Usage:
//   npx tsx prisma/add-player.ts "Full Name"
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { fetchCsv } from "./nflverse";
import {
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
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: npx tsx prisma/add-player.ts "Full Name"');
    process.exit(1);
  }

  const [roster, statsRows, contracts, { byeWeekByTeam, impliedPointsByTeam, leagueAvgImplied }] =
    await Promise.all([
      fetchCsv("rosters/roster_2026.csv"),
      fetchCsv("stats_player/stats_player_reg_2025.csv"),
      loadContracts(),
      loadByeWeeksAndImpliedPoints(),
    ]);
  const fpRatings = loadFantasyProsRatings();
  const statsByPlayerId = new Map(statsRows.map((r) => [r.player_id, r]));

  const row = roster.find((r) => normalizeName(r.full_name) === normalizeName(target));
  if (!row) {
    console.error(`"${target}" not found in the 2026 roster feed.`);
    process.exit(1);
  }

  const existing = await prisma.player.findFirst({
    where: { name: { equals: row.full_name } },
  });
  if (existing) {
    console.log(`"${row.full_name}" is already in the DB — nothing to do.`);
    return;
  }

  const ctx = { statsByPlayerId, byeWeekByTeam, impliedPointsByTeam, leagueAvgImplied, contracts, fpRatings };
  const created = await prisma.player.create({ data: buildPlayerRecord(row, ctx) });
  console.log(`Added ${created.name} (${created.position}, ${created.team}), proj2026=${created.proj2026}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
