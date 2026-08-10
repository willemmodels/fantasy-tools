import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Player, RankingsList, ScoringFormat, Tier } from "@/lib/types";

export const RANKINGS_LISTS: RankingsList[] = ["PPR", "HALF", "STD", "BIG_BALLER"];

interface RankingsState {
  players: Player[];
  activeList: RankingsList;
  orders: Record<RankingsList, string[]>;
  tiers: Record<RankingsList, Tier[]>;
  tierOf: Record<RankingsList, Record<string, string | null>>;
  notes: Record<string, string>;
  drafted: Record<string, boolean>;
  searchQuery: string;
  positionFilters: string[];
  selectedPlayerId: string | null;

  setPlayers: (players: Player[]) => void;
  setActiveList: (list: RankingsList) => void;
  dragReorder: (activeId: string, overId: string) => void;
  addTier: () => void;
  renameTier: (tierId: string, label: string) => void;
  removeTier: (tierId: string) => void;
  setTierForPlayer: (playerId: string, tierId: string | null) => void;
  setNote: (playerId: string, note: string) => void;
  toggleDrafted: (playerId: string) => void;
  setSearchQuery: (query: string) => void;
  togglePositionFilter: (position: string) => void;
  setSelectedPlayerId: (playerId: string | null) => void;
}

const DEFAULT_TIERS: Tier[] = [
  { id: "tier-1", label: "Tier 1 — Elite" },
  { id: "tier-2", label: "Tier 2 — Strong starter" },
  { id: "tier-3", label: "Tier 3 — Solid depth" },
];

function emptyPerList<T>(factory: () => T): Record<RankingsList, T> {
  return {
    PPR: factory(),
    HALF: factory(),
    STD: factory(),
    BIG_BALLER: factory(),
  };
}

export const MAX_TIERS = 10;

// "Tier N" → N, so a fresh tier always continues the existing sequence
// instead of a random/large number (e.g. a timestamp).
function tierNumber(label: string): number {
  const match = label.match(/^Tier (\d+)/);
  return match ? Number(match[1]) : 0;
}

// Big Baller isn't a real scoring format, so anywhere that needs to scale
// displayed points (2025 pts, Proj) falls back to PPR while that list is active.
export function listDisplayFormat(list: RankingsList): ScoringFormat {
  return list === "BIG_BALLER" ? "PPR" : list;
}

export const useRankingsStore = create<RankingsState>()(
  persist(
    (set, get) => ({
      players: [],
      activeList: "PPR",
      orders: emptyPerList<string[]>(() => []),
      tiers: emptyPerList<Tier[]>(() => DEFAULT_TIERS.map((t) => ({ ...t }))),
      tierOf: emptyPerList<Record<string, string | null>>(() => ({})),
      notes: {},
      drafted: {},
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
        const orders = get().orders;
        set({
          players,
          orders: {
            PPR: reconcile(orders.PPR),
            HALF: reconcile(orders.HALF),
            STD: reconcile(orders.STD),
            BIG_BALLER: reconcile(orders.BIG_BALLER),
          },
        });
      },

      setActiveList: (list) => set({ activeList: list }),

      dragReorder: (activeId, overId) => {
        if (activeId === overId) return;
        const list = get().activeList;
        const order = [...get().orders[list]];
        const fromIndex = order.indexOf(activeId);
        const toIndex = order.indexOf(overId);
        if (fromIndex === -1 || toIndex === -1) return;
        const [moved] = order.splice(fromIndex, 1);
        order.splice(toIndex, 0, moved);

        // Landing inside a tier's block reassigns the dragged player to that tier —
        // tiers are just contiguous runs within `order`, keyed by tierOf.
        const newIndex = order.indexOf(activeId);
        const tierOf = { ...get().tierOf[list] };
        const neighborId = order[newIndex - 1] ?? order[newIndex + 1] ?? null;
        tierOf[activeId] = neighborId ? tierOf[neighborId] ?? null : null;

        set({
          orders: { ...get().orders, [list]: order },
          tierOf: { ...get().tierOf, [list]: tierOf },
        });
      },

      addTier: () => {
        const list = get().activeList;
        const tiers = get().tiers[list];
        if (tiers.length >= MAX_TIERS) return;
        const next = Math.max(0, ...tiers.map((t) => tierNumber(t.label))) + 1;
        set({
          tiers: { ...get().tiers, [list]: [...tiers, { id: `tier-${next}`, label: `Tier ${next}` }] },
        });
      },

      renameTier: (tierId, label) => {
        const list = get().activeList;
        set({
          tiers: {
            ...get().tiers,
            [list]: get().tiers[list].map((t) => (t.id === tierId ? { ...t, label } : t)),
          },
        });
      },

      removeTier: (tierId) => {
        const list = get().activeList;
        const tierOf = { ...get().tierOf[list] };
        for (const playerId of Object.keys(tierOf)) {
          if (tierOf[playerId] === tierId) tierOf[playerId] = null;
        }
        set({
          tiers: { ...get().tiers, [list]: get().tiers[list].filter((t) => t.id !== tierId) },
          tierOf: { ...get().tierOf, [list]: tierOf },
        });
      },

      setTierForPlayer: (playerId, tierId) => {
        const list = get().activeList;
        set({
          tierOf: { ...get().tierOf, [list]: { ...get().tierOf[list], [playerId]: tierId } },
        });
      },

      setNote: (playerId, note) => {
        set({ notes: { ...get().notes, [playerId]: note } });
      },

      toggleDrafted: (playerId) => {
        const drafted = { ...get().drafted };
        drafted[playerId] = !drafted[playerId];
        set({ drafted });
      },

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
        activeList: state.activeList,
        orders: state.orders,
        tiers: state.tiers,
        tierOf: state.tierOf,
        notes: state.notes,
        drafted: state.drafted,
      }),
    }
  )
);

// The active order/tiers/tierOf for whichever list (PPR/Half/Standard/Big
// Baller) is currently selected — components should read through these
// rather than indexing `orders`/`tiers`/`tierOf` directly so they follow
// the list toggle automatically.
export function useActiveOrder(): string[] {
  return useRankingsStore((s) => s.orders[s.activeList]);
}
export function useActiveTiers(): Tier[] {
  return useRankingsStore((s) => s.tiers[s.activeList]);
}
export function useActiveTierOf(): Record<string, string | null> {
  return useRankingsStore((s) => s.tierOf[s.activeList]);
}
export function useDisplayScoringFormat(): ScoringFormat {
  return useRankingsStore((s) => listDisplayFormat(s.activeList));
}
