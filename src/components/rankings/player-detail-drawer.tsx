"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PositionPill } from "@/components/shared/position-pill";
import { useRankingsStore } from "@/store/use-rankings-store";
import { displayedHistoricalPoints, displayedProjection } from "@/lib/scoring";

const STAT_ROWS: { key: keyof import("@/lib/types").SeasonStats; label: string }[] = [
  { key: "passYds", label: "Passing yards" },
  { key: "rushYds", label: "Rushing yards" },
  { key: "recYds", label: "Receiving yards" },
  { key: "rec", label: "Receptions" },
  { key: "tgts", label: "Targets" },
  { key: "tds", label: "Total TDs" },
  { key: "tov", label: "Turnovers" },
  { key: "gp", label: "Games played" },
];

export function PlayerDetailDrawer() {
  const selectedPlayerId = useRankingsStore((s) => s.selectedPlayerId);
  const setSelectedPlayerId = useRankingsStore((s) => s.setSelectedPlayerId);
  const players = useRankingsStore((s) => s.players);
  const tiers = useRankingsStore((s) => s.tiers);
  const tierOf = useRankingsStore((s) => s.tierOf);
  const setTierForPlayer = useRankingsStore((s) => s.setTierForPlayer);
  const notes = useRankingsStore((s) => s.notes);
  const setNote = useRankingsStore((s) => s.setNote);
  const drafted = useRankingsStore((s) => s.drafted);
  const toggleDrafted = useRankingsStore((s) => s.toggleDrafted);
  const scoringFormat = useRankingsStore((s) => s.scoringFormat);

  const player = players.find((p) => p.id === selectedPlayerId) ?? null;

  return (
    <Sheet
      open={!!player}
      onOpenChange={(open) => {
        if (!open) setSelectedPlayerId(null);
      }}
    >
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px]">
        {player && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-lg">{player.name}</SheetTitle>
                <PositionPill position={player.position} />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {player.team} · Bye {player.byeWeek} · Age {player.age} · Yr{" "}
                {player.yearInLeague} · {player.contract}
              </p>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4">
              <div className="mb-4 grid grid-cols-3 gap-2 rounded-[10px] border border-[var(--border)] p-3 text-center">
                <div>
                  <p className="text-[12px] text-[var(--muted-foreground)]">2025 Pts</p>
                  <p className="text-lg font-medium tabular-nums">
                    {displayedHistoricalPoints(player, scoringFormat).toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-[var(--muted-foreground)]">Proj 2026</p>
                  <p className="text-lg font-medium tabular-nums">
                    {displayedProjection(player, scoringFormat).toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-[var(--muted-foreground)]">SoS</p>
                  <p className="text-lg font-medium tabular-nums">{player.sos}/5</p>
                </div>
              </div>

              <table className="mb-4 w-full text-sm">
                <tbody>
                  {STAT_ROWS.map(({ key, label }) => (
                    <tr key={key} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-1.5 text-[var(--muted-foreground)]">{label}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {player.stats2025[key]}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-1.5 text-[var(--muted-foreground)]">Upside</td>
                    <td className="py-1.5 text-right tabular-nums">{player.upside}/5</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-[var(--muted-foreground)]">Bust risk</td>
                    <td className="py-1.5 text-right tabular-nums">{player.bustRisk}/5</td>
                  </tr>
                </tbody>
              </table>

              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">
                  Tier
                </label>
                <Select
                  value={tierOf[player.id] ?? "none"}
                  onValueChange={(v) => setTierForPlayer(player.id, v === "none" ? null : v)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No tier</SelectItem>
                    {tiers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">
                  Notes
                </label>
                <Textarea
                  value={notes[player.id] ?? ""}
                  onChange={(e) => setNote(player.id, e.target.value)}
                  placeholder="Add a note…"
                  className="min-h-[80px]"
                />
              </div>
            </div>

            <SheetFooter>
              <Button
                variant={drafted[player.id] ? "secondary" : "default"}
                onClick={() => toggleDrafted(player.id)}
              >
                {drafted[player.id] ? "Marked drafted" : "Mark drafted"}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
