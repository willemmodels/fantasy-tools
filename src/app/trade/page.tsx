"use client";

import { usePlayers } from "@/lib/use-players";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ComparisonTable } from "@/components/trade/comparison-table";
import { TradeEvaluator } from "@/components/trade/trade-evaluator";

export default function TradePage() {
  usePlayers();

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-medium">Trade Analyzer</h1>
      <Tabs defaultValue="compare">
        <TabsList>
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="evaluate">Trade Evaluator</TabsTrigger>
        </TabsList>
        <TabsContent value="compare" className="pt-4">
          <ComparisonTable />
        </TabsContent>
        <TabsContent value="evaluate" className="pt-4">
          <TradeEvaluator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
