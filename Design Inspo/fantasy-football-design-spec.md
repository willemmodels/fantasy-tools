# Fantasy Football Tool — Design Specification

> A simple, sleek, no-frills tool for ranking players and running fantasy football drafts.
> This document is the single source of truth for layout, components, colors, typography, and interaction patterns.

---

## 1. Design Philosophy

- **Tool-first, not entertainment.** Every pixel serves a decision (who to draft, who to rank higher).
- **No decorative animations.** Transitions are 150ms opacity/color shifts only. No parallax, no bounce, no confetti.
- **Black/white/gray hierarchy.** Color is reserved for position tags and status indicators only.
- **Dense and scannable.** Information should be readable at a glance during a fast-paced draft.
- **Adjustable by the user.** The owner must be able to edit rankings, tiers, notes, and projections without touching code.

---

## 2. Color System

### Base Palette
| Token | Usage |
|-------|-------|
| `#000000` / `var(--text-primary)` | Primary text, active states, borders on hover |
| `#6B7280` / `var(--text-secondary)` | Secondary labels, column headers, metadata |
| `#9CA3AF` / `var(--text-tertiary)` | Disabled text, placeholder copy |
| `#E5E7EB` / `var(--border)` | Dividers, table borders, card borders |
| `#F3F4F6` / `var(--surface-muted)` | Hover backgrounds, zebra striping, tier rows |
| `#FFFFFF` / `var(--surface)` | Card backgrounds, elevated panels |

### Position Colors (Tags & Indicators Only)
| Position | Hex | Usage |
|----------|-----|-------|
| RB | `#DC2626` | Running back tags, draft cell accents |
| WR | `#2563EB` | Wide receiver tags |
| QB | `#16A34A` | Quarterback tags |
| TE | `#9333EA` | Tight end tags |
| K | `#6B7280` | Kicker tags (neutral) |
| DST | `#6B7280` | Defense tags (neutral) |

> **Rule:** Position colors are used ONLY for small pills/tags (max 12px text) and 1px borders. Never as background fills for entire rows or cards.

### Status Colors
| State | Hex | Usage |
|-------|-----|-------|
| Positive / Winner | `#16A34A` | Better stat in comparison view, "on the clock" highlight |
| Danger / Warning | `#DC2626` | Bye week conflict, duplicate position alert |
| Neutral | `#6B7280` | Baseline references, grid lines |

---

## 3. Typography

| Role | Size | Weight | Line-Height | Notes |
|------|------|--------|-------------|-------|
| Page title | 20px | 500 | 1.2 | "Rankings", "Draft Board" |
| Section label | 17px | 500 | 1.3 | Tier labels, group headers |
| Body / Table | 14px | 400 | 1.5 | Player names, stats, most content |
| Emphasized body | 14px | 500 | 1.5 | Active tab, selected row |
| Metadata | 12px | 400 | 1.4 | ADP, bye week, team abbreviations |
| Large metric | 28–36px | 500 | 1.1 | Card rank numbers, projection totals |

- **Font:** System sans-serif stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)
- **Numbers:** Always `font-variant-numeric: tabular-nums` for stats, ranks, ADP
- **Case:** Sentence case everywhere. No ALL CAPS, no Title Case.

---

## 4. Spacing & Shape

- **Base unit:** 4px
- **Scale:** 4 / 8 / 12 / 16 / 20 / 24 / 32px
- **Radii:** 6px (tags), 8px (buttons), 10px (cards/inputs), 12px (panels/modals)
- **Nested radius rule:** Inner radius = outer radius − padding. A 12px panel with 8px padding holds 4px-radius children.

---

## 5. Views & Layouts

### 5.1 Rankings Table (Primary View)

**Purpose:** The main interface for building and adjusting player rankings before and during a draft.

**Layout:**
- Full-width table with sticky header
- Controls bar above: search input (flex:1) + position filter pills (All, RB, WR, QB, TE)
- Tier breaks as full-width subheader rows (background: `var(--surface-muted)`)

**Columns (left to right):**
1. **Rank** — `tabular-nums`, 40px wide, bold
2. **Player** — Full name, bold
3. **Pos** — 6px-radius pill, position color
4. **Team** — 3-letter abbreviation
5. **Bye** — Week number
6. **2024 Pts** — Previous season total
7. **Proj** — Your projected points for current season
8. **ADP** — Average draft position (smaller, muted)

**Interactions:**
- Click column header to sort (toggle asc/desc)
- Drag row to re-rank (rank numbers auto-update)
- Click row to open player detail drawer
- Hover row → subtle background shift (`var(--surface-muted)`)
- Right-click row → context menu: "Move to tier…", "Add note", "Mark drafted"

**Tier System:**
- Tiers are user-editable groups (e.g., "Tier 1 — Elite", "Tier 2 — Strong RB1")
- Displayed as full-width rows between data rows
- Tier labels are 12px, muted color, left-aligned
- Drag a player across a tier boundary to reassign tier

---

### 5.2 Draft Board

**Purpose:** Live snake-draft tracker. Shows who has picked whom and whose turn is next.

**Layout:**
- CSS Grid: `(round-label) + (team-count columns)`
- Round numbers in leftmost column
- Each cell = one pick

**Cell States:**
| State | Visual |
|-------|--------|
| Empty | 1px `var(--border)`, white bg, min-height 60px |
| Filled | Same + player name (14px bold), position pill (10px), pick number (10px muted) |
| Current pick | 2px `var(--text-primary)` border, subtle shadow |
| My pick | Left border accent in position color |

**Interactions:**
- Click empty cell → open player picker modal
- Click filled cell → view player detail
- Auto-scroll to current pick on load
- Show "On the clock: Team A" banner above board

**Snake Logic:**
- Odd rounds: left → right
- Even rounds: right → left
- Visual indicator (small arrow) shows draft direction

---

### 5.3 Player Cards

**Purpose:** Browsing view for users who prefer visual scanning over table rows.

**Layout:**
- Responsive grid: 3 columns on desktop, 2 on tablet, 1 on mobile
- Gap: 12px

**Card Structure (top to bottom):**
1. **Header row:** Large rank number (28px) + position pill (right-aligned)
2. **Player name** — 16px bold
3. **Team / Bye** — 13px muted
4. **Stat row:** 3-column grid — 2024 pts | Proj | ADP
5. **Note** — 12px secondary text, top border separator

**Card Interactions:**
- Hover: border darkens to `var(--text-quaternary)`
- Click: expand to full player detail (modal or drawer)
- Long-press (mobile): quick actions menu

---

### 5.4 Player Comparison

**Purpose:** Side-by-side stat breakdown for "who do I draft?" decisions.

**Layout:**
- 3-column table: Stat label | Player A | Player B
- Header row shows player name (16px bold) + position/team/bye (12px muted)

**Highlighting:**
- Better value in each row gets `var(--positive)` color + bold weight
- Equal values stay neutral
- Final row shows "Tier difference" summary

**Stats to Compare:**
- Rank, 2024 pts, Projection, Rushing yards, Rushing TDs, Receptions, Receiving yards, Games played, ADP

**Interactions:**
- Swap button to flip Player A / Player B
- "Add to comparison" from any player card/table row
- Up to 3 players can be compared (table expands horizontally)

---

## 6. Global Components

### 6.1 Search Input
- Height: 36px
- Padding: 8px 12px
- Border: 1px `var(--border)`, radius 10px
- Focus: border → `var(--text-primary)`, no glow/shadow
- Placeholder: "Search players…" (muted)
- Live filter as you type (no debounce needed for <500 rows)

### 6.2 Filter Pills
- Padding: 6px 14px
- Border: 1px `var(--border)`, radius 8px
- Active state: bg `var(--surface)`, border `var(--text-quaternary)`, text bold
- Inactive: transparent bg, muted text
- Multiple selection allowed (e.g., RB + WR)

### 6.3 Player Detail Drawer (Slide-in)
- Width: 420px max, 100% on mobile
- Slides in from right
- Content: Full stat table, notes field (editable), tier selector, "Drafted" button
- Close: X button or click outside
- No backdrop blur — solid semi-transparent overlay (`rgba(0,0,0,0.3)`)

### 6.4 "My Team" Sidebar
- Fixed right panel, 280px wide (collapsible on mobile)
- Shows current roster by position
- Tracks: starters filled, bench spots, bye week conflicts
- Updates live as draft board changes
- Position slots show player name or "Empty" in muted text

---

## 7. Data Structure (Suggested)

```typescript
interface Player {
  id: string;
  rank: number;
  name: string;
  position: 'RB' | 'WR' | 'QB' | 'TE' | 'K' | 'DST';
  team: string;        // 3-letter code
  byeWeek: number;
  stats2024: number;   // fantasy points
  projection: number;  // your projected points
  adp: number;         // average draft position
  tier: number;        // tier ID
  notes: string;
  rushingYards?: number;
  rushingTDs?: number;
  receptions?: number;
  receivingYards?: number;
  gamesPlayed?: number;
}

interface DraftState {
  teams: string[];           // team names
  rosterSize: number;        // rounds
  currentPick: number;       // overall pick number (1-indexed)
  picks: Map<string, Player>; // key: "round-teamIndex", value: Player
  myTeamIndex: number;
}

interface Tier {
  id: number;
  label: string;  // e.g., "Tier 1 — Elite"
  color?: string; // optional override
}
```

---

## 8. Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| ≥1024px | Full layout. Table + sidebar visible. Draft board shows all teams. |
| 768–1023px | Table view full width. Draft board horizontal scroll. Cards 2-col. Sidebar collapses to icon. |
| <768px | Single column everything. Draft board switches to "current pick + recent picks" view. Cards 1-col. Bottom nav for view switching. |

---

## 9. Animation Rules

Allowed:
- 150ms opacity transitions on hover states
- 200ms `transform: translateX` for drawer slide-in
- 100ms background-color on row hover

Forbidden:
- Loading spinners (use skeleton rows)
- Bounce/elastic easings
- Parallax
- Auto-playing carousels
- Scroll-triggered reveals
- Gradient backgrounds or glassmorphism

---

## 10. Export / Persistence

The user must be able to:
- Export rankings as CSV (rank, name, pos, team, tier, notes, projection)
- Import rankings from CSV to override defaults
- Save draft state locally (localStorage) with "Resume draft" prompt
- Reset to default rankings with one confirmation

---

## 11. Empty States

| Context | Message |
|---------|---------|
| No search results | "No players match 'query'" + "Clear filters" button |
| Empty draft board | "Draft not started. Set up your league to begin." |
| Empty comparison | "Select two players to compare" + link to rankings |
| Empty "My Team" | "You haven't drafted anyone yet." |

---

## 12. Accessibility

- All tables use proper `<table>`, `<th>`, `<td>` semantics
- Sortable columns have `aria-sort` attributes
- Color is never the sole indicator (position tags include text)
- Focus rings: 2px solid `var(--text-primary)`, offset 2px
- Minimum touch target: 44×44px on mobile

---

*Version 1.0 — Design spec for fantasy football ranking & draft tool*
