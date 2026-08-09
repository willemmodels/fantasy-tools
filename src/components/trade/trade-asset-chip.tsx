"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { TradeAsset } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TradeAssetChip({
  asset,
  onRemove,
}: {
  asset: TradeAsset;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: asset.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "flex items-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-[13px] shadow-sm",
        isDragging && "z-20 opacity-70"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab font-medium">
        {asset.label}
      </button>
      <button onClick={() => onRemove(asset.id)}>
        <X className="h-3 w-3 text-[var(--muted-foreground)]" />
      </button>
    </div>
  );
}
