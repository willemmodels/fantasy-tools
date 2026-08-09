"use client";

import { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export function TradeDropZone({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[160px] flex-col gap-1.5 rounded-[10px] border border-[var(--border)] p-3",
        isOver && "border-[var(--foreground)] bg-[var(--surface-muted)]"
      )}
    >
      <p className="text-[12px] font-medium text-[var(--muted-foreground)]">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
