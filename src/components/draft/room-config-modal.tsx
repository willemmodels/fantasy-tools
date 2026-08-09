"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDraftStore, BIG_BALLER_STARTUP_ROSTER } from "@/store/use-draft-store";
import { DraftType, RosterConfig, ScoringFormat } from "@/lib/types";

const DEFAULT_ROSTER: RosterConfig = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 1,
  K: 1,
  BENCH: 6,
};

export function RoomConfigModal() {
  const config = useDraftStore((s) => s.config);
  const configure = useDraftStore((s) => s.configure);

  const [scoring, setScoring] = useState<ScoringFormat>("PPR");
  const [draftType, setDraftType] = useState<DraftType>("SNAKE");
  const [teams, setTeams] = useState(10);
  const [roster, setRoster] = useState<RosterConfig>(DEFAULT_ROSTER);
  const [budget, setBudget] = useState(200);
  const [userSlot, setUserSlot] = useState(1);

  function applyBigBallerPreset() {
    setDraftType("AUCTION");
    setBudget(500);
    setRoster(BIG_BALLER_STARTUP_ROSTER);
  }

  function handleStart() {
    const teamNames = Array.from({ length: teams }, (_, i) =>
      i === userSlot - 1 ? "You" : `Team ${i + 1}`
    );
    configure(
      { scoring, draftType, teams, roster, budget, userSlot, started: true },
      teamNames
    );
  }

  return (
    <Dialog open={!config}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Set up your draft room</DialogTitle>
          <DialogDescription>
            Configure scoring, draft type, and roster slots before the board opens.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Scoring</Label>
            <Select value={scoring} onValueChange={(v) => setScoring(v as ScoringFormat)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PPR">PPR</SelectItem>
                <SelectItem value="HALF">Half-PPR</SelectItem>
                <SelectItem value="STD">Standard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Draft type</Label>
            <Select value={draftType} onValueChange={(v) => setDraftType(v as DraftType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SNAKE">Snake</SelectItem>
                <SelectItem value="AUCTION">Auction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Teams</Label>
            <Input
              type="number"
              min={2}
              max={16}
              value={teams}
              onChange={(e) => setTeams(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{draftType === "AUCTION" ? "Budget ($)" : "Your pick #"}</Label>
            <Input
              type="number"
              min={1}
              value={draftType === "AUCTION" ? budget : userSlot}
              onChange={(e) =>
                draftType === "AUCTION"
                  ? setBudget(Number(e.target.value))
                  : setUserSlot(Number(e.target.value))
              }
            />
          </div>

          {draftType === "AUCTION" && (
            <div className="space-y-1.5">
              <Label>Your team slot</Label>
              <Input
                type="number"
                min={1}
                max={teams}
                value={userSlot}
                onChange={(e) => setUserSlot(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Roster slots</Label>
          <div className="grid grid-cols-4 gap-2 text-sm">
            {(Object.keys(roster) as (keyof RosterConfig)[]).map((slot) => (
              <div key={slot} className="flex items-center gap-1.5">
                <span className="w-10 text-[var(--muted-foreground)]">{slot}</span>
                <Input
                  type="number"
                  min={0}
                  className="h-8"
                  value={roster[slot]}
                  onChange={(e) =>
                    setRoster({ ...roster, [slot]: Number(e.target.value) })
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <Button variant="outline" size="sm" onClick={applyBigBallerPreset}>
            Big Baller Startup preset
          </Button>
          <Button onClick={handleStart}>Start draft</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
