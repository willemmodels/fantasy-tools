import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Player } from "@/lib/types";

export async function GET() {
  const rows = await prisma.player.findMany();

  const players: Player[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    team: row.team,
    position: row.position,
    byeWeek: row.byeWeek,
    yearInLeague: row.yearInLeague,
    age: row.age,
    contract: row.contract,
    stats2025: JSON.parse(row.statsJson),
    fps2025: row.fps2025,
    ppg2025: row.ppg2025,
    sos: row.sos,
    upside: row.upside,
    bustRisk: row.bustRisk,
    offRating: row.offRating,
    proj2026: row.proj2026,
  }));

  return NextResponse.json(players);
}
