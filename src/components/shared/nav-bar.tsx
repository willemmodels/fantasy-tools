"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/rankings", label: "Rankings" },
  { href: "/draft", label: "Draft Board" },
  { href: "/trade", label: "Trade Analyzer" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-6 border-b border-[var(--border)] bg-[var(--background)] px-6">
      <span className="text-[15px] font-medium">Fantasy Tool</span>
      <nav className="flex items-center gap-1">
        {LINKS.map((link) => {
          const active = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-[8px] px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-[var(--surface-muted)] font-medium text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
