import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Player, RankingsMode, ScoringFormat, Tier } from "@/lib/types";

interface RankingsState {
  players: Player[];
  mode: RankingsMode;
  order: string[];
  tiers: Tier[];
  tierOf: Record<string, string | null>;
  bigBallerOrder: string[];
  bigBallerTiers: Tier[];
  bigBallerTierOf: Record<string, string | null>;
  notes: Record<string, string>;
  drafted: Record<string, boolean>;
  scoringFormat: ScoringFormat;
  searchQuery: string;
  positionFilters: string[];
  selectedPlayerId: string | null;

  setPlayers: (players: Player[]) => void;
  setMode: (mode: RankingsMode) => void;
  dragReorder: (activeId: string, overId: string) => void;
  addTier: () => void;
  renameTier: (tierId: string, label: string) => void;
  removeTier: (tierId: string) => void;
  setTierForPlayer: (playerId: string, tierId: string | null) => void;
  setNote: (playerId: string, note: string) => void;
  toggleDrafted: (playerId: string) => void;
  setScoringFormat: (format: ScoringFormat) => void;
  setSearchQuery: (query: string) => void;
  togglePositionFilter: (position: string) => void;
  setSelectedPlayerId: (playerId: string | null) => void;
}

const DEFAULT_TIERS: Tier[] = [
  { id: "tier-1", label: "Tier 1 — Elite" },
  { id: "tier-2", label: "Tier 2 — Strong starter" },
  { id: "tier-3", label: "Tier 3 — Solid depth" },
];

export const MAX_TIERS = 10;

// "Tier N" → N, so a fresh tier always continues the existing sequence
// instead of a random/large number (e.g. a timestamp).
function tierNumber(label: string): number {
  const match = label.match(/^Tier (\d+)/);
  return match ? Number(match[1]) : 0;
}

// Rankings and Big Baller keep entirely separate order/tiers/tierOf —
// they're different draft strategies (12-team single-QB vs. 4-team
// 2QB/20-bench), so a player's spot in one has no bearing on the other.
// These key pairs let the order/tier actions below stay mode-generic
// instead of duplicating every action for each mode.
function orderKey(mode: RankingsMode): "order" | "bigBallerOrder" {
  return mode === "BIG_BALLER" ? "bigBallerOrder" : "order";
}
function tiersKey(mode: RankingsMode): "tiers" | "bigBallerTiers" {
  return mode === "BIG_BALLER" ? "bigBallerTiers" : "tiers";
}
function tierOfKey(mode: RankingsMode): "tierOf" | "bigBallerTierOf" {
  return mode === "BIG_BALLER" ? "bigBallerTierOf" : "tierOf";
}

export const useRankingsStore = create<RankingsState>()(
  persist(
    (set, get) => ({
      players: [],
      mode: "STANDARD",
      order: [],
      tiers: DEFAULT_TIERS,
      tierOf: {},
      bigBallerOrder: [],
      bigBallerTiers: DEFAULT_TIERS.map((t) => ({ ...t })),
      bigBallerTierOf: {},
      notes: {},
      drafted: {},
      scoringFormat: "PPR",
      searchQuery: "",
      positionFilters: [],
      selectedPlayerId: null,

      setPlayers: (players) => {
        const incomingIds = new Set(players.map((p) => p.id));
        function reconcile(existingOrder: string[]) {
          const knownIds = new Set(existingOrder);
          const survivingOrder = existingOrder.filter((id) => incomingIds.has(id));
          const newIds = players
            .filter((p) => !knownIds.has(p.id))
            .sort((a, b) => b.proj2026 - a.proj2026)
            .map((p) => p.id);
          return [...survivingOrder, ...newIds];
        }
        set({
          players,
          order: reconcile(get().order),
          bigBallerOrder: reconcile(get().bigBallerOrder),
        });
      },

      setMode: (mode) => set({ mode }),

      dragReorder: (activeId, overId) => {
        if (activeId === overId) return;
        const mode = get().mode;
        const oKey = orderKey(mode);
        const tKey = tierOfKey(mode);
        const order = [...get()[oKey]];
        const fromIndex = order.indexOf(activeId);
        const toIndex = order.indexOf(overId);
        if (fromIndex === -1 || toIndex === -1) return;
        const [moved] = order.splice(fromIndex, 1);
        order.splice(toIndex, 0, moved);

        // Landing inside a tier's block reassigns the dragged player to that tier —
        // tiers are just contiguous runs within `order`, keyed by tierOf.
        const newIndex = order.indexOf(activeId);
        const tierOf = { ...get()[tKey] };
        const neighborId = order[newIndex - 1] ?? order[newIndex + 1] ?? null;
        tierOf[activeId] = neighborId ? tierOf[neighborId] ?? null : null;

        set({ [oKey]: order, [tKey]: tierOf } as Partial<RankingsState>);
      },

      addTier: () => {
        const mode = get().mode;
        const tKey = tiersKey(mode);
        const tiers = get()[tKey];
        if (tiers.length >= MAX_TIERS) return;
        const next = Math.max(0, ...tiers.map((t) => tierNumber(t.label))) + 1;
        set({ [tKey]: [...tiers, { id: `tier-${next}`, label: `Tier ${next}` }] } as Partial<RankingsState>);
      },

      renameTier: (tierId, label) => {
        const mode = get().mode;
        const tKey = tiersKey(mode);
        set({
          [tKey]: get()[tKey].map((t) => (t.id === tierId ? { ...t, label } : t)),
        } as Partial<RankingsState>);
      },

      removeTier: (tierId) => {
        const mode = get().mode;
        const tKey = tiersKey(mode);
        const toKey = tierOfKey(mode);
        const tierOf = { ...get()[toKey] };
        for (const playerId of Object.keys(tierOf)) {
          if (tierOf[playerId] === tierId) tierOf[playerId] = null;
        }
        set({
          [tKey]: get()[tKey].filter((t) => t.id !== tierId),
          [toKey]: tierOf,
        } as Partial<RankingsState>);
      },

      setTierForPlayer: (playerId, tierId) => {
        const mode = get().mode;
        const toKey = tierOfKey(mode);
        set({ [toKey]: { ...get()[toKey], [playerId]: tierId } } as Partial<RankingsState>);
      },

      setNote: (playerId, note) => {
        set({ notes: { ...get().notes, [playerId]: note } });
      },

      toggleDrafted: (playerId) => {
        const drafted = { ...get().drafted };
        drafted[playerId] = !drafted[playerId];
        set({ drafted });
      },

      setScoringFormat: (format) => set({ scoringFormat: format }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      togglePositionFilter: (position) => {
        const current = get().positionFilters;
        set({
          positionFilters: current.includes(position)
            ? current.filter((p) => p !== position)
            : [...current, position],
        });
      },

      setSelectedPlayerId: (playerId) => set({ selectedPlayerId: playerId }),
    }),
    {
      name: "rankings-store",
      partialize: (state) => ({
        mode: state.mode,
        order: state.order,
        tiers: state.tiers,
        tierOf: state.tierOf,
        bigBallerOrder: state.bigBallerOrder,
        bigBallerTiers: state.bigBallerTiers,
        bigBallerTierOf: state.bigBallerTierOf,
        notes: state.notes,
        drafted: state.drafted,
        scoringFormat: state.scoringFormat,
      }),
    }
  )
);

// The active order/tiers/tierOf for whichever mode (Standard vs. Big Baller)
// is currently selected — components should read through these rather than
// the raw `order`/`tiers`/`tierOf` fields so they follow the mode toggle.
export function useActiveOrder(): string[] {
  return useRankingsStore((s) => (s.mode === "BIG_BALLER" ? s.bigBallerOrder : s.order));
}
export function useActiveTiers(): Tier[] {
  return useRankingsStore((s) => (s.mode === "BIG_BALLER" ? s.bigBallerTiers : s.tiers));
}
export function useActiveTierOf(): Record<string, string | null> {
  return useRankingsStore((s) => (s.mode === "BIG_BALLER" ? s.bigBallerTierOf : s.tierOf));
}
