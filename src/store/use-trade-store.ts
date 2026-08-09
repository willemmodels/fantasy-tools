import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TradeAsset } from "@/lib/types";

interface TradeState {
  comparisonPlayerIds: string[];
  assets: TradeAsset[];

  addToComparison: (playerId: string) => void;
  removeFromComparison: (playerId: string) => void;
  clearComparison: () => void;

  addAsset: (asset: TradeAsset) => void;
  moveAsset: (assetId: string, side: "A" | "B" | null) => void;
  removeAsset: (assetId: string) => void;
  clearAssets: () => void;
}

const MAX_COMPARISON = 3;

export const useTradeStore = create<TradeState>()(
  persist(
    (set, get) => ({
      comparisonPlayerIds: [],
      assets: [],

      addToComparison: (playerId) => {
        const current = get().comparisonPlayerIds;
        if (current.includes(playerId) || current.length >= MAX_COMPARISON) return;
        set({ comparisonPlayerIds: [...current, playerId] });
      },

      removeFromComparison: (playerId) => {
        set({
          comparisonPlayerIds: get().comparisonPlayerIds.filter((id) => id !== playerId),
        });
      },

      clearComparison: () => set({ comparisonPlayerIds: [] }),

      addAsset: (asset) => set({ assets: [...get().assets, asset] }),

      moveAsset: (assetId, side) => {
        set({
          assets: get().assets.map((a) => (a.id === assetId ? { ...a, side } : a)),
        });
      },

      removeAsset: (assetId) => {
        set({ assets: get().assets.filter((a) => a.id !== assetId) });
      },

      clearAssets: () => set({ assets: [] }),
    }),
    { name: "trade-store" }
  )
);
