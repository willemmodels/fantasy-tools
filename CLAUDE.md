# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal fantasy football tool with three modules: player **Rankings** (drag-and-drop tiered board), a **Draft Tracker** (snake or auction), and a **Trade Analyzer** (side-by-side comparison + drag-and-drop trade evaluator). All data is mock/seeded — there is no live stats feed.

Two documents outside `src/` are the product/design source of truth and should be consulted for anything not obvious from the code:
- [INIT.md](INIT.md) — the original feature spec (data model, module requirements, the "Big Baller Startup" auction preset).
- [Design Inspo/fantasy-football-design-spec.md](Design%20Inspo/fantasy-football-design-spec.md) — the authoritative visual spec (colors, typography, spacing, per-view layout, empty states). It explicitly takes precedence over any conflicting detail in INIT.md (e.g. it specifies a light theme; INIT.md's passing mention of dark mode was not built — see "Deferred" below).

## Commands

```bash
npm run dev        # start dev server (Next.js + Turbopack)
npm run build      # production build
npm run lint       # eslint
npm run db:seed    # wipe and regenerate the 60+ mock players (tsx prisma/seed.ts)
npx prisma studio  # browse/edit the SQLite dev.db directly
npx prisma migrate dev --name <name>   # after editing prisma/schema.prisma
npx prisma generate                    # regenerate the client (also runs on migrate)
```

There is no test suite. Verify changes by running `npm run build` and walking the three routes (`/rankings`, `/draft`, `/trade`) in a browser.

## Architecture

**Data flow:** SQLite (`dev.db`) is the only persistence for player data, seeded via `prisma/seed.ts`. The app reads it once through `GET /api/players` (`src/app/api/players/route.ts`), and every page loads the full player list into the client-side `useRankingsStore` via the shared `usePlayers()` hook (`src/lib/use-players.ts`) — the Draft and Trade modules don't fetch independently, they read `players` off the rankings store. Everything else (custom rank order, tiers, notes, draft picks, trade assets) is client state that lives in Zustand stores under `src/store/`, persisted to `localStorage`.

**Prisma 7 driver adapter:** this project uses the new `prisma-client` generator (output at `src/generated/prisma`, gitignored) with the `@prisma/adapter-better-sqlite3` driver adapter — plain `new PrismaClient()` with no adapter will throw. See `src/lib/prisma.ts` for the singleton and `prisma/seed.ts` for the seed script's own instance. Both read `DATABASE_URL` from `.env` (`file:./dev.db`, resolved relative to the process cwd, i.e. the project root).

**Custom rank order is the spine of the Rankings module.** `useRankingsStore` (`src/store/use-rankings-store.ts`) keeps a single `order: string[]` of player IDs — that array *is* the rank (index + 1 = displayed rank). Tiers are not a separate grouping structure; a tier is just a contiguous run of players in `order` sharing the same `tierOf[playerId]`. Dragging a row (`dragReorder` in the store) relocates it in `order` and reassigns its tier to whatever tier its new neighbors belong to — there's no separate "assign to tier" step. `RankingsTable` (`src/components/rankings/rankings-table.tsx`) renders tier header rows by scanning `order` for `tierOf` changes. Filtering (search/position) hides rows but drag-and-drop is disabled while filtered, since reordering a filtered subset against the full `order` array is ambiguous.

**Scoring format is applied at render time, not stored per-format.** Seed data (`fps2025`, `proj2026`) is generated under a PPR baseline. `src/lib/scoring.ts`'s `displayedHistoricalPoints`/`displayedProjection` rescale those numbers live by the ratio between the raw stat line scored under the selected format vs. under PPR — there's no per-format column in the DB.

**Draft module** (`src/store/use-draft-store.ts`, `src/components/draft/`): `DraftRoomConfig` is set once via the room-config modal and gates the rest of the page (`RoomConfigModal` renders whenever `config` is null, including after "Reset draft"). Snake vs. auction is one config flag; `SnakeBoard` derives the on-the-clock team from `teamIndexForPick` (`src/lib/draft-logic.ts`, standard serpentine order), while `AuctionBoard` uses a nominate → award-pick flow and prices the live pool via `computeAuctionValues` (`src/lib/valuation.ts`) — a VORP engine where replacement level is the Nth-best remaining player at each position (N scales with roster config + a fixed FLEX-share split across RB/WR/TE), kickers are flat-priced at $1 and excluded from the VORP pool, and dollar values are recomputed from scratch on every render off the currently-undrafted pool.

**Trade module** (`src/store/use-trade-store.ts`, `src/components/trade/`): the Compare tab is read-only (pick up to 3 players, highlight the better value per stat row). The DnD evaluator treats players/picks/FAAB as a flat `TradeAsset[]` with a `side: "A" | "B" | null`; `@dnd-kit/core`'s plain draggable/droppable (not the `sortable` variant used in Rankings) moves assets between three zones. Trade value for players comes from `tradePlayerValue` (rank + proj2026 + a static `POSITION_SCARCITY` multiplier in `src/lib/valuation.ts`) since the trade module has no draft-room roster context to derive scarcity from the way the auction engine does.

## Deferred (intentionally not built)

CSV import/export, right-click context menus, draggable column reordering, long-press mobile quick-actions, dark mode. If asked to build on top of this, don't half-implement these — either build them properly or leave them out.

## Conventions

- Design tokens (colors, the light-only palette) live in `src/app/globals.css` as CSS custom properties (`--pos-*`, `--status-*`, `--surface-muted`) layered on top of shadcn's default token set — reuse these rather than hardcoding hex values.
- shadcn/ui primitives are in `src/components/ui/` (this project's shadcn config uses the `@base-ui/react` based components, not Radix — check the existing primitive before assuming Radix-style props).
- Module-specific components are grouped under `src/components/{rankings,draft,trade}/`; cross-module pieces (position pill, empty state, nav) are in `src/components/shared/`.
