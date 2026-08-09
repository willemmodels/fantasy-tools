import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Player, ScoringFormat, Tier } from "@/lib/types";

interface RankingsState {
  players: Player[];
  order: string[];
  tiers: Tier[];
  tierOf: Record<string, string | null>;
  notes: Record<string, string>;
  drafted: Record<string, boolean>;
  scoringFormat: ScoringFormat;
  bigBallerMode: boolean;
  searchQuery: string;
  positionFilters: string[];
  selectedPlayerId: string | null;

  setPlayers: (players: Player[]) => void;
  dragReorder: (activeId: string, overId: string) => void;
  addTier: (label: string) => void;
  renameTier: (tierId: string, label: string) => void;
  removeTier: (tierId: string) => void;
  setTierForPlayer: (playerId: string, tierId: string | null) => void;
  setNote: (playerId: string, note: string) => void;
  toggleDrafted: (playerId: string) => void;
  setScoringFormat: (format: ScoringFormat) => void;
  toggleBigBallerMode: () => void;
  setSearchQuery: (query: string) => void;
  togglePositionFilter: (position: string) => void;
  setSelectedPlayerId: (playerId: string | null) => void;
}

const DEFAULT_TIERS: Tier[] = [
  { id: "tier-1", label: "Tier 1 — Elite" },
  { id: "tier-2", label: "Tier 2 — Strong starter" },
  { id: "tier-3", label: "Tier 3 — Solid depth" },
];

export const useRankingsStore = create<RankingsState>()(
  persist(
    (set, get) => ({
      players: [],
      order: [],
      tiers: DEFAULT_TIERS,
      tierOf: {},
      notes: {},
      drafted: {},
      scoringFormat: "PPR",
      bigBallerMode: false,
      searchQuery: "",
      positionFilters: [],
      selectedPlayerId: null,

      setPlayers: (players) => {
        const existingOrder = get().order;
        const knownIds = new Set(existingOrder);
        const incomingIds = new Set(players.map((p) => p.id));
        const survivingOrder = existingOrder.filter((id) => incomingIds.has(id));
        const newIds = players
          .filter((p) => !knownIds.has(p.id))
          .sort((a, b) => b.proj2026 - a.proj2026)
          .map((p) => p.id);
        set({ players, order: [...survivingOrder, ...newIds] });
      },

      dragReorder: (activeId, overId) => {
        if (activeId === overId) return;
        const order = [...get().order];
        const fromIndex = order.indexOf(activeId);
        const toIndex = order.indexOf(overId);
        if (fromIndex === -1 || toIndex === -1) return;
        const [moved] = order.splice(fromIndex, 1);
        order.splice(toIndex, 0, moved);

        // Landing inside a tier's block reassigns the dragged player to that tier —
        // tiers are just contiguous runs within `order`, keyed by tierOf.
        const newIndex = order.indexOf(activeId);
        const tierOf = { ...get().tierOf };
        const neighborId = order[newIndex - 1] ?? order[newIndex + 1] ?? null;
        tierOf[activeId] = neighborId ? tierOf[neighborId] ?? null : null;

        set({ order, tierOf });
      },

      addTier: (label) => {
        const id = `tier-${Date.now()}`;
        set({ tiers: [...get().tiers, { id, label }] });
      },

      renameTier: (tierId, label) => {
        set({
          tiers: get().tiers.map((t) => (t.id === tierId ? { ...t, label } : t)),
        });
      },

      removeTier: (tierId) => {
        const tierOf = { ...get().tierOf };
        for (const playerId of Object.keys(tierOf)) {
          if (tierOf[playerId] === tierId) tierOf[playerId] = null;
        }
        set({ tiers: get().tiers.filter((t) => t.id !== tierId), tierOf });
      },

      setTierForPlayer: (playerId, tierId) => {
        set({ tierOf: { ...get().tierOf, [playerId]: tierId } });
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
      toggleBigBallerMode: () => set({ bigBallerMode: !get().bigBallerMode }),
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
        order: state.order,
        tiers: state.tiers,
        tierOf: state.tierOf,
        notes: state.notes,
        drafted: state.drafted,
        scoringFormat: state.scoringFormat,
        bigBallerMode: state.bigBallerMode,
      }),
    }
  )
);
