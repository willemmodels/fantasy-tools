"use client";

import { Fragment, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PositionPill } from "@/components/shared/position-pill";
import { EmptyState } from "@/components/shared/empty-state";
import { useRankingsStore } from "@/store/use-rankings-store";
import { displayedHistoricalPoints, displayedProjection } from "@/lib/scoring";
import { useBigBallerValues } from "@/lib/use-big-baller-values";
import { cn } from "@/lib/utils";
import { Player } from "@/lib/types";

const COLUMN_COUNT = 8;

function SortableRow({
  player,
  rank,
  isFiltered,
  isBigBaller,
  bigBallerValue,
}: {
  player: Player;
  rank: number;
  isFiltered: boolean;
  isBigBaller: boolean;
  bigBallerValue?: number;
}) {
  const scoringFormat = useRankingsStore((s) => s.scoringFormat);
  const setSelectedPlayerId = useRankingsStore((s) => s.setSelectedPlayerId);
  const drafted = useRankingsStore((s) => s.drafted[player.id]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
    disabled: isFiltered,
  });

  // Big Baller has no points-scoring rule of its own — the historical column
  // stays PPR-scored for context, while Proj swaps to the auction $ value.
  // (Comparing scoringFormat itself, not the isBigBaller prop, so TS can narrow it.)
  const pointsFormat = scoringFormat === "BIG_BALLER" ? "PPR" : scoringFormat;

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => setSelectedPlayerId(player.id)}
      className={cn(
        "cursor-pointer hover:bg-[var(--surface-muted)]",
        isDragging && "relative z-10 bg-[var(--surface-muted)] shadow-sm",
        drafted && "opacity-40"
      )}
    >
      <TableCell className="w-6 px-2" onClick={(e) => e.stopPropagation()}>
        <button
          {...attributes}
          {...listeners}
          disabled={isFiltered}
          className="cursor-grab text-[var(--muted-foreground)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="w-10 font-bold tabular-nums">{rank}</TableCell>
      <TableCell className="font-medium">{player.name}</TableCell>
      <TableCell>
        <PositionPill position={player.position} />
      </TableCell>
      <TableCell className="text-[13px] text-[var(--muted-foreground)]">{player.team}</TableCell>
      <TableCell className="tabular-nums text-[13px]">{player.byeWeek}</TableCell>
      <TableCell className="tabular-nums">
        {displayedHistoricalPoints(player, pointsFormat).toFixed(0)}
      </TableCell>
      <TableCell className="tabular-nums font-medium">
        {isBigBaller ? `$${bigBallerValue ?? 1}` : displayedProjection(player, pointsFormat).toFixed(0)}
      </TableCell>
    </TableRow>
  );
}

export function RankingsTable() {
  const players = useRankingsStore((s) => s.players);
  const order = useRankingsStore((s) => s.order);
  const tiers = useRankingsStore((s) => s.tiers);
  const tierOf = useRankingsStore((s) => s.tierOf);
  const searchQuery = useRankingsStore((s) => s.searchQuery);
  const positionFilters = useRankingsStore((s) => s.positionFilters);
  const dragReorder = useRankingsStore((s) => s.dragReorder);
  const scoringFormat = useRankingsStore((s) => s.scoringFormat);

  const isBigBaller = scoringFormat === "BIG_BALLER";
  const bigBallerValues = useBigBallerValues(isBigBaller);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const tierById = useMemo(() => new Map(tiers.map((t) => [t.id, t.label])), [tiers]);

  const isFiltered = searchQuery.trim().length > 0 || positionFilters.length > 0;

  const orderedPlayers = order.map((id) => playerById.get(id)).filter((p): p is Player => !!p);

  const visiblePlayers = orderedPlayers.filter((p) => {
    if (positionFilters.length > 0 && !positionFilters.includes(p.position)) return false;
    if (searchQuery.trim() && !p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      return false;
    return true;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    dragReorder(String(active.id), String(over.id));
  }

  if (players.length === 0) {
    return <EmptyState message="Loading players…" />;
  }

  if (visiblePlayers.length === 0) {
    return <EmptyState message={`No players match "${searchQuery}"`} />;
  }

  const rows: { player: Player; rank: number; showTierHeader: boolean; tierId: string | null }[] = [];
  {
    let lastTierId: string | null | undefined = undefined;
    visiblePlayers.forEach((player, index) => {
      const currentTierId = isFiltered ? null : tierOf[player.id] ?? null;
      const showTierHeader = !isFiltered && currentTierId !== lastTierId;
      lastTierId = currentTierId;
      rows.push({ player, rank: index + 1, showTierHeader, tierId: currentTierId });
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <Table>
        <TableHeader className="sticky top-0 bg-[var(--background)]">
          <TableRow>
            <TableHead className="w-6" />
            <TableHead className="w-10">Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Pos</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Bye</TableHead>
            <TableHead>2025 Pts</TableHead>
            <TableHead>{isBigBaller ? "Value" : "Proj"}</TableHead>
          </TableRow>
        </TableHeader>
        <SortableContext
          items={visiblePlayers.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <TableBody>
            {rows.map(({ player, rank, showTierHeader, tierId }) => (
              <Fragment key={player.id}>
                {showTierHeader && tierId && (
                  <TableRow className="bg-[var(--surface-muted)] hover:bg-[var(--surface-muted)]">
                    <TableCell
                      colSpan={COLUMN_COUNT}
                      className="py-1.5 text-[12px] font-medium text-[var(--muted-foreground)]"
                    >
                      {tierById.get(tierId) ?? "Tier"}
                    </TableCell>
                  </TableRow>
                )}
                <SortableRow
                  player={player}
                  rank={rank}
                  isFiltered={isFiltered}
                  isBigBaller={isBigBaller}
                  bigBallerValue={bigBallerValues?.get(player.id)}
                />
              </Fragment>
            ))}
          </TableBody>
        </SortableContext>
      </Table>
    </DndContext>
  );
}
