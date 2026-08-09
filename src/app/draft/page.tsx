"use client";

import { usePlayers } from "@/lib/use-players";
import { useDraftStore } from "@/store/use-draft-store";
import { RoomConfigModal } from "@/components/draft/room-config-modal";
import { SnakeBoard } from "@/components/draft/snake-board";
import { AuctionBoard } from "@/components/draft/auction-board";
import { DraftPoolPanel } from "@/components/draft/draft-pool-panel";
import { MyTeamSidebar } from "@/components/draft/my-team-sidebar";
import { PickLog } from "@/components/draft/pick-log";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function DraftPage() {
  usePlayers();
  const config = useDraftStore((s) => s.config);
  const resetDraft = useDraftStore((s) => s.resetDraft);

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <RoomConfigModal />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-medium">Draft Board</h1>
          {config && (
            <Button variant="ghost" size="sm" onClick={resetDraft}>
              Reset draft
            </Button>
          )}
        </div>
        {config?.draftType === "SNAKE" && <SnakeBoard />}
        {config?.draftType === "AUCTION" && <AuctionBoard />}
      </div>

      {config && (
        <div className="w-[320px] shrink-0 border-l border-[var(--border)] p-4">
          <Tabs defaultValue="pool" className="h-full">
            <TabsList className="w-full">
              <TabsTrigger value="pool" className="flex-1">
                Pool
              </TabsTrigger>
              <TabsTrigger value="team" className="flex-1">
                My Team
              </TabsTrigger>
              <TabsTrigger value="log" className="flex-1">
                Log
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pool" className="h-[calc(100%-40px)]">
              <DraftPoolPanel />
            </TabsContent>
            <TabsContent value="team" className="h-[calc(100%-40px)] overflow-y-auto">
              <MyTeamSidebar />
            </TabsContent>
            <TabsContent value="log" className="h-[calc(100%-40px)]">
              <PickLog />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
