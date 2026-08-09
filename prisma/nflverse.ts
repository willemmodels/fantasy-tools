import { gunzipSync } from "node:zlib";
import { parse } from "csv-parse/sync";

const RELEASES = "https://github.com/nflverse/nflverse-data/releases/download";

// Roster data uses "AZ" for Arizona; the schedule and stats releases use "ARI".
// Normalizing at read time keeps every downstream lookup keyed the same way.
const TEAM_CODE_FIXES: Record<string, string> = { AZ: "ARI" };

export function normalizeTeam(code: string): string {
  return TEAM_CODE_FIXES[code] ?? code;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.text();
}

async function fetchGzipText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return gunzipSync(buf).toString("utf-8");
}

function parseCsv(text: string): Record<string, string>[] {
  return parse(text, { columns: true, skip_empty_lines: true });
}

export async function fetchCsv(path: string): Promise<Record<string, string>[]> {
  return parseCsv(await fetchText(`${RELEASES}/${path}`));
}

export async function fetchGzipCsv(path: string): Promise<Record<string, string>[]> {
  return parseCsv(await fetchGzipText(`${RELEASES}/${path}`));
}

export function num(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
