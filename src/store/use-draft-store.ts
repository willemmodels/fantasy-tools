import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DraftPick, DraftRoomConfig } from "@/lib/types";
import { roundForPick, teamIndexForPick } from "@/lib/draft-logic";

interface DraftState {
  config: DraftRoomConfig | null;
  teamNames: string[];
  picks: DraftPick[];
  nominatedPlayerId: string | null;

  configure: (config: DraftRoomConfig, teamNames: string[]) => void;
  draftPlayer: (playerId: string, teamIndex: number, price?: number) => void;
  nominate: (playerId: string | null) => void;
  undoLastPick: () => void;
  resetDraft: () => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      config: null,
      teamNames: [],
      picks: [],
      nominatedPlayerId: null,

      configure: (config, teamNames) => {
        set({ config, teamNames, picks: [], nominatedPlayerId: null });
      },

      draftPlayer: (playerId, teamIndex, price) => {
        const { config, picks } = get();
        if (!config) return;
        const overallPick = picks.length + 1;
        const pick: DraftPick = {
          overallPick,
          round:
            config.draftType === "SNAKE"
              ? roundForPick(overallPick, config.teams)
              : Math.floor(overallPick / config.teams) + 1,
          teamIndex,
          playerId,
          price,
        };
        set({ picks: [...picks, pick], nominatedPlayerId: null });
      },

      nominate: (playerId) => set({ nominatedPlayerId: playerId }),

      undoLastPick: () => set({ picks: get().picks.slice(0, -1) }),

      resetDraft: () => set({ config: null, teamNames: [], picks: [], nominatedPlayerId: null }),
    }),
    { name: "draft-store" }
  )
);

export function currentSnakeTeamIndex(overallPick: number, teams: number): number {
  return teamIndexForPick(overallPick, teams);
}
