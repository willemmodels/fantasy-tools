"use client";

import { useMemo, useState } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { useTradeStore } from "@/store/use-trade-store";
import { useActiveOrder, useRankingsStore } from "@/store/use-rankings-store";
import { TradeDropZone } from "./trade-drop-zone";
import { TradeAssetChip } from "./trade-asset-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PositionPill } from "@/components/shared/position-pill";
import { POSITION_SCARCITY, tradePlayerValue } from "@/lib/valuation";
import { cn } from "@/lib/utils";

let assetCounter = 0;
function nextAssetId() {
  assetCounter += 1;
  return `asset-${assetCounter}`;
}

export function TradeEvaluator() {
  const assets = useTradeStore((s) => s.assets);
  const addAsset = useTradeStore((s) => s.addAsset);
  const moveAsset = useTradeStore((s) => s.moveAsset);
  const removeAsset = useTradeStore((s) => s.removeAsset);
  const clearAssets = useTradeStore((s) => s.clearAssets);
  const players = useRankingsStore((s) => s.players);
  const order = useActiveOrder();

  const [playerQuery, setPlayerQuery] = useState("");
  const [pickValue, setPickValue] = useState(10);
  const [faabValue, setFaabValue] = useState(20);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const rankById = useMemo(() => new Map(order.map((id, i) => [id, i + 1])), [order]);
  const usedPlayerIds = useMemo(
    () => new Set(assets.filter((a) => a.type === "PLAYER").map((a) => a.playerId)),
    [assets]
  );

  const suggestions =
    playerQuery.trim().length > 0
      ? players
          .filter(
            (p) => !usedPlayerIds.has(p.id) && p.name.toLowerCase().includes(playerQuery.trim().toLowerCase())
          )
          .slice(0, 6)
      : [];

  function assetValue(asset: (typeof assets)[number]): number {
    if (asset.type !== "PLAYER" || !asset.playerId) return asset.value;
    const player = playerById.get(asset.playerId);
    if (!player) return 0;
    return tradePlayerValue(player, {
      rank: rankById.get(player.id) ?? players.length,
      totalPlayers: Math.max(players.length, 1),
      scarcityMultiplier: POSITION_SCARCITY[player.position],
    });
  }

  const sideATotal = assets.filter((a) => a.side === "A").reduce((sum, a) => sum + assetValue(a), 0);
  const sideBTotal = assets.filter((a) => a.side === "B").reduce((sum, a) => sum + assetValue(a), 0);
  const total = sideATotal + sideBTotal;
  const diffPct = total > 0 ? ((sideATotal - sideBTotal) / total) * 100 : 0;
  const verdict = Math.abs(diffPct) < 8 ? "Fair" : diffPct > 0 ? "Team A wins" : "Team B wins";

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const side = over.id === "unassigned" ? null : (over.id as "A" | "B");
    moveAsset(String(active.id), side);
  }

  function renderChips(side: "A" | "B" | null) {
    return assets
      .filter((a) => a.side === side)
      .map((a) => <TradeAssetChip key={a.id} asset={a} onRemove={removeAsset} />);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative w-56">
          <Input
            value={playerQuery}
            onChange={(e) => setPlayerQuery(e.target.value)}
            placeholder="Add a player…"
            className="h-9"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-[8px] border border-[var(--border)] bg-[var(--background)] shadow-sm">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                  onClick={() => {
                    addAsset({ id: nextAssetId(), type: "PLAYER", side: null, label: p.name, playerId: p.id, value: 0 });
                    setPlayerQuery("");
                  }}
                >
                  <PositionPill position={p.position} className="text-[10px]" />
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <Input
          type="number"
          value={pickValue}
          onChange={(e) => setPickValue(Number(e.target.value))}
          className="h-9 w-20"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            addAsset({ id: nextAssetId(), type: "PICK", side: null, label: `Pick (${pickValue})`, value: pickValue })
          }
        >
          <Plus className="h-4 w-4" /> Add pick
        </Button>

        <Input
          type="number"
          value={faabValue}
          onChange={(e) => setFaabValue(Number(e.target.value))}
          className="h-9 w-20"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            addAsset({ id: nextAssetId(), type: "FAAB", side: null, label: `$${faabValue} FAAB`, value: faabValue })
          }
        >
          <Plus className="h-4 w-4" /> Add FAAB
        </Button>

        <Button variant="ghost" size="sm" className="ml-auto" onClick={clearAssets}>
          Clear all
        </Button>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <TradeDropZone id="unassigned" label="Unassigned assets">
          {renderChips(null)}
        </TradeDropZone>

        <div className="grid grid-cols-2 gap-3">
          <TradeDropZone id="A" label="Team A">
            {renderChips("A")}
          </TradeDropZone>
          <TradeDropZone id="B" label="Team B">
            {renderChips("B")}
          </TradeDropZone>
        </div>
      </DndContext>

      {assets.length > 0 && (
        <div className="rounded-[10px] border border-[var(--border)] p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>Team A: {sideATotal.toFixed(0)}</span>
            <span
              className={cn(
                "font-medium",
                verdict === "Fair"
                  ? "text-[var(--status-neutral)]"
                  : "text-[var(--status-positive)]"
              )}
            >
              {verdict}
            </span>
            <span>Team B: {sideBTotal.toFixed(0)}</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div
              className="bg-[var(--status-positive)]"
              style={{ width: `${total > 0 ? (sideATotal / total) * 100 : 50}%` }}
            />
            <div
              className="bg-[var(--pos-wr)]"
              style={{ width: `${total > 0 ? (sideBTotal / total) * 100 : 50}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
