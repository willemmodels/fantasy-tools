> SYSTEM_DIRECTIVE: INITIALIZE_PROJECT
> ROLE: EXPERT_FULLSTACK_DEV // AUDIENCE: DATA_ANALYST_ENGINEER
> DENSITY: TERMINAL_MAX // VERBOSITY: MINIMAL

[TECH_STACK_REQUIREMENTS]
FRAMEWORK  :: Next.js (App Router) + React + TypeScript
STYLING    :: TailwindCSS + ShadcnUI + Lucide Icons
STATE      :: Zustand (Global: Draft State, Custom Ranks, Tiers)
DND_ENGINE :: @dnd-kit OR @hello-pangea/dnd
DATA_LAYER :: Prisma + SQLite (Local)

[DB_SCHEMA_AND_SEED]
// TARGET: All active NFL players. Generate mock seed data.
type Player = {
  id: uuid
  name: string
  team: string
  position: enum(QB, RB, WR, TE, K)
  bye_week: int[5-14]
  year_in_league: int
  age: int
  contract: string // e.g., "$12M/yr-2027"
  stats_2025: json // { passYds, rushYds, recYds, tds, rec, tgts, tov, gp }
  fps_2025: float
  ppg_2025: float
  sos: int[1-10] // Positional defense difficulty matrix
  upside: int[1-5] // Algo: O-line + team OFF + target share
  bust_risk: int[1-5] // Algo: O-line + injury Hz + team success
  off_rating: float // Extrapolated from Vegas win totals/prop lines
  proj_2026: float // Formula: (Historical Baseline * .6) + (Vegas Proj * .4)
}

[MODULE_1_RANKINGS]
> VIEW: DND_TABLE_UI
- DROPDOWNS : Scoring_Format (PPR | Half-PPR | STD | Custom)
- TOGGLES   : Pos_Filter (ALL|QB|RB|WR|TE|K) -> Boolean array
- STATE     : Read/Write. Users can create/edit Tiers & drag-and-drop rows.
- COLUMNS   : Movable/Reorderable
  [ Name | Team | Pos_Rank (e.g. WR2) | Bye | SoS | Upside | Bust | Off_Rating ]
- MODAL     : onClick(Player.Name) -> Render <PlayerCard> containing full `Player` schema dump.

[MODULE_2_DRAFT_TRACKER]
> INIT_PROMPT: <RoomConfigModal>
- SCORING_SYS : PPR | STD | Half | Rookie | BIG_BALLER_STARTUP
- DRAFT_TYPE  : Snake | Auction
- ROSTER_CFG  : Custom slots (Start/Bench)
- USER_SLOT   : Int (Snake Pick OR Auction Budget)

> BIG_BALLER_STARTUP_PRESET (Enforce strict params)
- TYPE   : Auction
- BUDGET : $500
- ROSTER : 2QB, 4RB, 5WR, 2TE, 2FLX, 2K
- ALGO   : Dynamic Valuation Engine
  -> Calculate $ value per player based on:
     1. User's custom ranking index (Module 1)
     2. Value Over Replacement Player (VORP) specific to the 2QB/5WR scarcity.
     3. Kicker lock = $1 flat.
  -> Value updates dynamically as available FA pool shrinks.

> DRAFT_BOARD_UI
- TRACKER : Real-time log (User picks vs Opponent picks)
- POOL    : Sidebar/Bottom panel of available players.
- SORT    : Locked to custom rank order from Module 1.
- WARNING : Flag `bye_week` prominently in draft pool. Alert if >X rostered players share same bye.

[MODULE_3_TRADE_ANALYZER]
> VIEW: SIDE_BY_SIDE_COMPARISON
- SELECT  : $N players. Render stat/proj/metric tables.
- FLAG    : Highlight `bye_week` overlap collisions in red.

> VIEW: DND_TRADE_EVALUATOR
- CANVAS  : <Team_A_DropZone> vs <Team_B_DropZone>
- ASSETS  : Players (Proj PPG/Custom Rank) | Future Picks (Baseline Int Value) | FAAB ($)
- ENGINE  : Delta calculation.
  -> Eval inputs: Custom ranks, 2026_proj, positional scarcity.
  -> Output: [WINNER] | [LOSER] | [FAIR] -> Render graphical differential breakdown.

[EXECUTION_PHASES]
1. INIT Next.js + DB schema + Seed 50+ rich mock records.
2. ZUSTAND config (Ranks, Draft Room, Trade State).
3. BUILD Module 1 (DnD table, Columns, Tiers).
4. BUILD Module 2 (Config modal, Big Baller Auction Math, Bye-week logic).
5. BUILD Module 3 (Side-by-side matrices, Asset DnD, Delta Math).
6. OPTIMIZE UI -> Dark mode, tabular density, zero-latency state updates.
> EXECUTE.