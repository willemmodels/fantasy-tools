import { ReactNode } from "react";

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed border-[var(--border)] py-16 text-center">
      <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
      {action}
    </div>
  );
}
