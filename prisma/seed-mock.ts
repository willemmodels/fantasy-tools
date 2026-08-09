import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const TEAMS = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN",
  "DET", "GB", "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA",
  "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB",
  "TEN", "WAS",
];

const FIRST_NAMES = [
  "Marcus", "Devin", "Jalen", "Trey", "Cameron", "Xavier", "Malik", "Jordan",
  "Tyler", "Brandon", "Elijah", "Isaiah", "DeShawn", "Andre", "Miles", "Kaden",
  "Justin", "Darius", "Terrence", "Aaron", "Cooper", "Preston", "Deion", "Nate",
  "Kyren", "Amari", "Chase", "Sean", "Rashad", "Micah",
];

const LAST_NAMES = [
  "Coleman", "Reyes", "Harmon", "Whitfield", "Sutton", "Boykin", "Marsh",
  "Delacroix", "Whitaker", "Odom", "Fontaine", "Kingsley", "Hollis", "Trask",
  "Bridges", "Calloway", "Renfro", "Sanders", "Ashworth", "Pruitt", "Vance",
  "Larkin", "McAllister", "Dubois", "Easton", "Farrow", "Gantt", "Holloway",
  "Ivory", "Jaramillo",
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 1): number {
  const v = Math.random() * (max - min) + min;
  return Math.round(v * 10 ** decimals) / 10 ** decimals;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

type Position = "QB" | "RB" | "WR" | "TE" | "K";

function makeStats(position: Position) {
  const gp = randInt(12, 17);
  switch (position) {
    case "QB": {
      const passYds = randInt(2800, 4800);
      const passTds = Math.round(passYds / randInt(140, 190));
      const rushYds = randInt(20, 650);
      const rushTds = randInt(0, 6);
      return {
        passYds,
        rushYds,
        recYds: 0,
        tds: passTds + rushTds,
        rec: 0,
        tgts: 0,
        tov: randInt(6, 18),
        gp,
      };
    }
    case "RB": {
      const rec = randInt(15, 90);
      return {
        passYds: 0,
        rushYds: randInt(350, 1700),
        recYds: randInt(80, 900),
        tds: randInt(2, 16),
        rec,
        tgts: Math.round(rec * randFloat(1.2, 1.5)),
        tov: randInt(0, 5),
        gp,
      };
    }
    case "WR": {
      const rec = randInt(35, 120);
      return {
        passYds: 0,
        rushYds: randInt(0, 120),
        recYds: randInt(350, 1700),
        tds: randInt(2, 14),
        rec,
        tgts: Math.round(rec * randFloat(1.3, 1.6)),
        tov: randInt(0, 3),
        gp,
      };
    }
    case "TE": {
      const rec = randInt(25, 95);
      return {
        passYds: 0,
        rushYds: 0,
        recYds: randInt(200, 1100),
        tds: randInt(1, 10),
        rec,
        tgts: Math.round(rec * randFloat(1.3, 1.6)),
        tov: randInt(0, 2),
        gp,
      };
    }
    case "K":
      return {
        passYds: 0,
        rushYds: 0,
        recYds: 0,
        tds: 0,
        rec: 0,
        tgts: 0,
        tov: 0,
        gp,
      };
  }
}

// Mirrors src/lib/scoring.ts's PPR formula; duplicated here since the seed
// script runs outside the Next.js app and only needs a fixed default format.
function fantasyPoints(stats: ReturnType<typeof makeStats>): number {
  return (
    stats.passYds * 0.04 +
    stats.rushYds * 0.1 +
    stats.recYds * 0.1 +
    stats.tds * 6 +
    stats.rec * 1 -
    stats.tov * 2
  );
}

function kickerPoints(): number {
  const fgMade = randInt(18, 34);
  const xpMade = randInt(20, 45);
  return fgMade * 3.3 + xpMade;
}

const ROSTER: { position: Position; count: number }[] = [
  { position: "QB", count: 10 },
  { position: "RB", count: 16 },
  { position: "WR", count: 18 },
  { position: "TE", count: 10 },
  { position: "K", count: 8 },
];

async function main() {
  const usedNames = new Set<string>();
  const players: Parameters<typeof prisma.player.create>[0]["data"][] = [];

  for (const { position, count } of ROSTER) {
    for (let i = 0; i < count; i++) {
      let name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      while (usedNames.has(name)) name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      usedNames.add(name);

      const stats = makeStats(position);
      const fps2025 = position === "K" ? kickerPoints() : fantasyPoints(stats);
      const ppg2025 = fps2025 / stats.gp;

      const offRating = randFloat(40, 99, 1);
      const vegasProj = fps2025 * (offRating / 70);
      const proj2026 = fps2025 * 0.6 + vegasProj * 0.4 + randFloat(-15, 15, 1);

      const age = randInt(21, 37);
      const yearInLeague = Math.max(0, Math.min(15, age - randInt(21, 23)));
      const contractYr = randInt(2026, 2029);
      const contractAav = randInt(1, 45);

      players.push({
        name,
        team: pick(TEAMS),
        position,
        byeWeek: randInt(5, 14),
        yearInLeague,
        age,
        contract: `$${contractAav}M/yr-${contractYr}`,
        statsJson: JSON.stringify(stats),
        fps2025: Math.round(fps2025 * 10) / 10,
        ppg2025: Math.round(ppg2025 * 10) / 10,
        sos: randInt(1, 10),
        upside: randInt(1, 5),
        bustRisk: randInt(1, 5),
        offRating,
        proj2026: Math.round(proj2026 * 10) / 10,
      });
    }
  }

  await prisma.player.deleteMany();
  for (const data of players) {
    await prisma.player.create({ data });
  }

  console.log(`Seeded ${players.length} mock players.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
