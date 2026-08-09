import { Position } from "@/lib/types";
import { cn } from "@/lib/utils";

const POSITION_VAR: Record<Position, string> = {
  QB: "var(--pos-qb)",
  RB: "var(--pos-rb)",
  WR: "var(--pos-wr)",
  TE: "var(--pos-te)",
  K: "var(--pos-k)",
};

export function PositionPill({ position, className }: { position: Position; className?: string }) {
  const color = POSITION_VAR[position];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[6px] border px-1.5 py-0.5 text-[12px] font-medium",
        className
      )}
      style={{ color, borderColor: color }}
    >
      {position}
    </span>
  );
}
