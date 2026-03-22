# Phoenix 89, Claude Edition 1.1 — Project Documentation

## What This Is

A web port (HTML5 Canvas + JavaScript) of "Phoenix 7.6", a shoot-em-up game originally written in 68k assembly for the TI-89 graphing calculator by Patrick Davidson in 2004. The game was first ported to Python/Pygame by Will Stackable with Claude, then ported again to pure browser JS. This is the web version.

The game is a vertical scrolling shooter: waves of enemies descend, the player shoots them, collects cash drops, buys upgrades at shops between levels, and fights escalating bosses across 13 stages culminating in a multi-phase Megaboss finale.

## Repository

- **GitHub**: `wstackable/phoenix89`
- **Branch**: `main` (primary), `asm-mechanics-overhaul` (feature branch, merged into main)
- **Owner**: Will Stackable (will@arborxr.com)

## Folder Structure

```
Phoenix TI-89 Game/                  # Root project folder
├── Web Phoenix 89/                  # ← THIS IS THE WEB PORT (active codebase)
│   ├── index.html                   # Entry point, canvas setup, script loading
│   ├── economy.js                   # Tunable economy config (cash, drops, shop prices)
│   ├── constants.js                 # Game constants (screen size, weapons, ships, etc.)
│   ├── sprites.js                   # All sprite data as pixel arrays + OffscreenCanvas cache
│   ├── sound.js                     # Procedural sound synthesis (no audio files for SFX)
│   ├── player.js                    # Player ship, movement, weapons, ships, specials
│   ├── weapons.js                   # Bullet systems (player + enemy), collisions, cash deploy
│   ├── enemies.js                   # All 35+ enemy types, AI behaviors, boss mechanics
│   ├── levels.js                    # Level definitions, wave sequences, enemy placement
│   ├── ui.js                        # Menus, HUD, shop, title screen, high scores
│   ├── game.js                      # Main game loop, state machine, input, rendering
│   ├── music/                       # Background music tracks (MP3)
│   └── .git/                        # Git repo root is HERE, not parent folder
│
├── phoenix_pc/                      # Python/Pygame PC port (predecessor, reference only)
├── Phoenix 89 TI-89 ASM Games/     # Original TI-89 ASM source (reference)
├── *.asm                            # Root-level ASM files (original game source)
├── screenshots/                     # Game screenshots
└── Phoenix 89 - Change Log.md       # Change log from the Python port era
```

**IMPORTANT**: The git repo is rooted at `Web Phoenix 89/`, NOT the parent folder. All git commands must be run from inside `Web Phoenix 89/`.

## Tech Stack

- Pure HTML5 Canvas 2D — no frameworks, no build step, no dependencies
- Single `index.html` loads all JS files via `<script>` tags in order
- OffscreenCanvas for sprite caching and color tinting
- requestAnimationFrame game loop at 60fps, game logic at 30fps (LOGIC_FRAMES=2)
- Procedural sound synthesis via Web Audio API
- localStorage for high score persistence

## Script Load Order (matters — no modules)

```
economy.js → constants.js → sprites.js → sound.js → player.js → weapons.js → enemies.js → levels.js → ui.js → game.js
```

All files share the global scope. Constants defined in earlier files are available to later files. Economy.js must load first since constants.js references `ECONOMY.shopItems`.

## Core Architecture

### Coordinate System
- Original TI-89: 160×100 pixel LCD
- Current: 160×140 game coordinates (expanded height for more dodging room)
- Rendered at 4× scale: 640×560 pixel canvas
- Enemies occupy the top portion (~y 0-60), player moves in y 30-124
- The extra 40px of height (vs original 100) is between enemies and player

### Game Loop
- `requestAnimationFrame` drives rendering at 60fps
- Game logic only advances every 2 frames (30fps effective, matching original ASM timing)
- `cycleCounter` increments each logic frame — used by enemy AI for deterministic firing patterns
- ASM-style bitmask operations (lsr, and, bcc) ported to JS bitwise ops

### Enemy System (enemies.js — largest file, ~1580 lines)
- `Enemy` class: etype, hp, position, sprite, destruct type, animation state
- `EnemyManager` class: manages all enemies, dispatches AI per frame
- AI dispatch at line ~310: giant if/else chain mapping etype → handler method
- 35+ enemy types including: STANDARD, BOSS, SPINNER1-4, ARROW, CROSS, SWOOP, TRIANGLE, RANDOM_X, OPERATOR, WHEEL, MWHEEL, SUPERBOSS_L/R, MEGABOSS_L/C/R, MBW (guard wheels), BOMB
- Destruction types: NORMAL (small explosion), BOSS (large explosion), SOLID (may split), MBC/MBL/MBR (megaboss pieces)
- Explosion system: enemies transition to ETYPE_EXPLODE or ETYPE_EXPLODE2, animate through frames, then call `_explosionFinished` or `_largeExplosionFinished` which handles cash drops

### Megaboss (Level 13 — Final Boss)
The Megaboss is a 3-piece boss: center (C), left (L), and right (R).

**Multi-phase center (`_aiMegabossC`):**
- Phase 1 (HP > 66%): Sweep speed 1, bomb volleys every 48 frames, guard wheels at edges
- Phase 2 (HP 33-66%): Sweep speed 1.5, 3-bullet fan spreads every 40 frames, guided missiles, boss dives to y=30
- Phase 3 (HP < 33%): Sweep speed 2 every frame, 5-bullet wide fans every 20 frames, rapid aimed fire, dives to y=40, extra wheel spawning

**Side pieces (`_aiMegabossL/R`):**
- While center alive: follow center position, fire aimed shots
- When center dies: enter "enraged" independent mode via `_aiMegabossSideEnraged`
  - Become killable (destruct switches to EDESTRUCT_BOSS, HP set to 80+)
  - Fast independent bouncing movement
  - Rapid aimed fire, spread bursts, bombs, guided missiles

**Guard wheels (`_mbwAscend/Slide/Descend/Defend`):**
- 4-state cycle: rise up, slide horizontally, descend, defend position
- Phase-aware: fire aimed bullets in Phase 2+, bombs in Phase 3
- Spawned from megaboss pad slots (slots 3-7 in enemies array)

### Superboss (Level 9/12)
- Left and Right pieces with FAKE center piece (invulnerable decoy)
- Burst fire patterns, guided missiles (Hard+), fan spreads
- L side uses `cycleCounter + 1` offset (matches ASM) so L and R don't fire same frame

### Economy System (economy.js)
All tunable values centralized in one file:
- `levelCashValues`: cash per drop indexed by level [40, 40, 50, 60, 75, 90, 110, 130, 150, 175, 200, 225, 250]
- `cashDropBaseDenom`: base 1-in-N chance (5), modified by difficulty
- `diffDropRateMod`: {Beginner: -1, Intermediate: 0, Hard: +1, Expert: +2}
- `diffBossDropMult`: {Beginner: 1.3, Intermediate: 1.0, Hard: 0.8, Expert: 0.6}
- `bossDropTables`: tiered loot tables (early/mid/late) with weighted random rolls
- `shopItems`: all shop prices and item names
- `maxCash`: wallet cap (25000)

Cash drops work via `EnemyBullet` entities with negative damage — when player collides, negative damage = cash added.

### Weapons System (weapons.js)
- Player bullets: normal, double, triple, quad, plasma variants, golden arches, homing, sniper, etc.
- Enemy bullets: aimed shots, bombs, guided missiles, bubble shots
- `fireEnemyAimed(x, y, player, damage, sprite, speed)`: calculates angle to player, spawns bullet
- `deployCash(x, y, value)`: spawns cash pickup as enemy bullet with negative damage
- Max 16 enemy bullets on screen simultaneously
- Fan/spread shots use "fake player" positions offset from real player to create spread angles

### Level System (levels.js)
- 13 level groups, each containing multiple waves (A, B, C sub-waves + boss)
- Levels 1-8: standard enemies with escalating difficulty
- Level 9: Swoop + Superboss
- Level 10: Guard Wheels
- Level 11: Operators + Random-X enemies
- Level 12: Superboss Plus (enhanced)
- Level 13: Megaboss (final)
- 4 difficulty sequences: Easy, Medium, Hard, Expert (different wave compositions)
- Shop visits (LVL_SHOP) interspersed between level groups
- `WAVE_TO_LEVEL` maps wave IDs to level groups (1-13) for economy scaling

### Player Ships (player.js)
- 6 ships total: Sigma (default), Heavy Destroyer, Phoenix, Purple Devil (Elise), Double Blastery (Brady), Red Bomber (Caleb)
- Ships 3-5 are secret ships unlocked via Secret Hangar (press S×5 on title)
- Each ship has unique stats (width, height, armor, speed) and special weapons
- Purple Devil: quad color-shifting star cannon, rainbow dragon protector
- Double Blastery: charge-based mega laser bomb (20sec charge, B key to fire)
- Red Bomber: companion attack drones

### UI System (ui.js)
- Title screen with animated TI-89 calculator mockup
- Main menu: New Game, Continue, Difficulty, Level Select (capped at 13), High Scores, etc.
- In-game HUD: shield bar, cash display, weapon indicator, level/wave counter
- Shop menu between levels
- Game over / high score entry screens

## Important Technical Details

### ASM Porting Patterns
The original game used 68k assembly with specific timing patterns. When porting:
- `lsr #1,d0` → `d0 >> 1` (logical shift right)
- `bcc` (branch if carry clear) → `(value & 1) === 0` (even check)
- `and.w #$1F,d0` → `d0 & 0x1F` (bitmask)
- The ASM pattern `lsr #1 → bcc → and.w` means: shift right (divide by 2), branch on even/odd, then mask the shifted value
- `cycleCounter` is the central timing mechanism — enemy AI uses bitmasks on it for firing patterns

### Known Bug History (Fixed)
These bugs have been found and fixed. Document them so they don't get reintroduced:

1. **Megaboss never fired bombs**: Shoot/move branches were swapped AND bitmask was applied to `cycleCounter` instead of `cycleCounter >> 1`. The ASM does `lsr #1` before masking, so JS must use `(this.cycleCounter >> 1) & mask`.

2. **Regular boss fired at 2× rate**: Missing `>> 1` shift before fire rate mask. Was checking `cycleCounter & 31` instead of `(cycleCounter >> 1) & 31`.

3. **Superboss L and R fired same frame**: ASM uses `cycleCounter + 1` for L side to offset timing. JS was using `cycleCounter` for both.

4. **Double cash drops**: Three root causes:
   - `_largeExplosionFinished` had no `_cashDropped` guard (added)
   - `_megaBombDamage` in game.js didn't reset `e.data = 0` or `e.height = -10000` when forcing explosion state, so bullets could re-hit during explosion
   - `detonateBomb` in weapons.js checked `![2, 3, 4].includes(e.etype)` but etypes are STRINGS not numbers — guard never worked. Fixed to use `["EXPLODE", "EXPLODE2", "NONE"].includes(e.etype)`.

5. **Level selector went past 13**: Hardcoded max was 20 in ui.js, changed to 13.

6. **Megaboss sides went inert when center died**: `handleMegabossCenterDestroyed()` existed but was never called. Replaced with enraged independent mode system.

### Etype String vs Number Warning
Enemy types (ETYPE_*) are STRING constants like "EXPLODE", "BOSS", etc. — NOT numbers. Any code checking etype must compare against strings. The constants are defined in enemies.js lines 9-54. Since weapons.js loads BEFORE enemies.js, weapons.js must use string literals like `"EXPLODE"` directly, not the constant names.

### Guard Wheel Slot Layout (Megaboss)
The enemies array for the megaboss level is:
- Slot 0: Megaboss Center
- Slot 1: Megaboss Left
- Slot 2: Megaboss Right
- Slots 3-10: Pad slots for guard wheels and bombs (8 slots for multi-phase spawning)

### Explosion Flow
1. Enemy HP ≤ 0 → `destroy()` → `_startExplosion()` sets etype to EXPLODE/EXPLODE2, height to -10000 (unhittable)
2. Each frame: `_aiExplode`/`_aiExplode2` advances animation
3. Animation complete → `_explosionFinished`/`_largeExplosionFinished` → drops cash (with `_cashDropped` guard), sets `alive = false`

### Difficulty System
- 4 levels: Beginner (1), Intermediate (2), Hard (3), Expert (4)
- Affects: enemy count, enemy types, boss HP, cash drop rates, boss cash multipliers, firing patterns
- Some enemy AI checks `this.difficulty` directly for variant behaviors
- HP scaling happens in levels.js after enemy creation

## File Size Reference (current)

| File | Lines | Purpose |
|------|-------|---------|
| enemies.js | 1,581 | Enemy AI, 35+ types, boss mechanics, economy methods |
| sprites.js | 1,574 | Pixel art data, sprite cache, color tinting |
| game.js | 1,439 | Main loop, state machine, input, rendering, collisions |
| ui.js | 1,315 | All menus, HUD, shop, title screen |
| levels.js | 954 | Level definitions, wave sequences, placement data |
| weapons.js | 891 | Bullet systems, collision detection, cash deployment |
| player.js | 784 | Player ships, movement, weapon firing, specials |
| sound.js | 492 | Procedural audio synthesis |
| economy.js | 118 | Centralized economy tuning values |
| constants.js | 115 | Screen size, weapons, ships, difficulty constants |
| index.html | 61 | Canvas setup, script loading |

## Git Workflow

Will pushes from his own terminal (authenticated via GitHub web). When committing:
- Will runs `git add .` then `git commit -m "message"` then `git push` from his terminal
- All work happens in `Web Phoenix 89/` directory (that's where .git lives)

## Version Number

**IMPORTANT**: Each time we reach a push point, increment the version number in `ui.js` (line ~406):
```javascript
const subtitle = "Claude Edition X.XX";
```
Current version: **1.53**. Increment by 0.01 each push (1.54, 1.55, 1.56, etc.).

## ASM Reference Files

The original TI-89 assembly source is available for reference when porting behaviors:
- `Phoenix 89 TI-89 ASM Games/megaboss.asm` — Megaboss AI, guard wheel state machine
- `Phoenix 89 TI-89 ASM Games/enemies2.asm` — All enemy AI routines
- Root-level `*.asm` files — Original source (enemies.asm, bullets.asm, collide.asm, etc.)

When decoding ASM firing patterns, the key pattern is:
```asm
lsr #1,d0       ; d0 = cycleCounter >> 1
bcc skip        ; if original was odd, skip (even cycles = shoot)
and.w #$1F,d0   ; mask the SHIFTED value
beq fire        ; fire when masked value == 0
```

## Session History & Design Decisions

### Session: March 21-22, 2026 (Cowork — Claude Opus)

This session covered a major overhaul of boss mechanics, bug fixes, and economy system work. Here's what Will requested and what was done:

**Request 1: "Overhaul levels 12 and 13 — bosses are boring and barely do anything, we need an EPIC finale"**

Decision: Rather than just making existing bosses fire faster, we designed a multi-phase system for the Megaboss:
- Added `_getMegabossPhase(e)` using HP percentage thresholds (>66%, 33-66%, <33%)
- Phase 1: Standard sweep + bombs (establishes the pattern)
- Phase 2: Faster sweep, aimed fan spreads, guided missiles, boss dives toward player
- Phase 3: Maximum aggression — fast sweep every frame, 5-bullet fans, rapid aimed fire, extra wheel spawns
- Created `_megabossFireSpread()` for fan shots using "fake player" positions to angle bullets
- Enhanced guard wheels to be phase-aware: passive in Phase 1, actively firing in Phase 2+, dangerous in Phase 3
- Enhanced Superboss with burst fire and guided missiles for harder difficulties

**Request 2: "Fix the main menu level selector — goes past 13"**

Simple fix: changed hardcoded max from 20 to 13 in ui.js.

**Request 3: "When you kill the middle main boss the other side ones don't fire anymore"**

Decision: The original code had `handleMegabossCenterDestroyed()` that was never called. Instead of just calling it (which makes sides fly off screen — boring), we designed an "enraged mode":
- When center dies, sides detect it and enter independent mode
- They become killable (switch destruct to EDESTRUCT_BOSS, get 80 HP)
- Fast independent bouncing movement
- Rapid fire, spread bursts, bombs, guided missiles
- This makes the fight feel like it has a second phase after killing the center

**Request 4: "Make the game window bigger — not enough room to dodge bullets"**

Decision: Expanded ORIG_HEIGHT from 100 to 140 (40% taller). This doubles the vertical dodging space from 54px to 94px. Enemies still occupy the top portion; the extra space is between enemies and player. PLAYER_MAX_Y adjusted from 84 to 124. Canvas scaled to 640×560.

Will confirmed this felt right after testing.

**Request 5: "Normal enemies on levels 3, 4, 5 are dropping double cash"**

Investigation found THREE root causes:
1. `_largeExplosionFinished` had no duplicate guard → added `_cashDropped` flag
2. `_megaBombDamage` in game.js set etype to explosion but didn't reset `e.data = 0` or `e.height = -10000`, allowing bullets to re-hit → fixed
3. `detonateBomb` in weapons.js compared etype strings against numbers `[2, 3, 4]` which NEVER matched → fixed to use string comparison

Decision: Added defensive `_cashDropped` guard on BOTH explosion handlers, plus fixed the two underlying bugs. Belt-and-suspenders approach.

**Request 6: "Can you audit the economy and create a config file so I can easily adjust values?"**

Decision: Created `economy.js` with all tunable values extracted from hardcoded locations across enemies.js, constants.js, weapons.js, and player.js. Economy audit showed balanced progression:
- L1-L8 total income ~$13,000 on Intermediate
- Buying everything costs ~$31,250 (exceeds $25K wallet cap — forces meaningful upgrade choices)
- Difficulty scaling: Beginner generous (1-in-4 drops, 1.3× boss cash) to Expert tight (1-in-7, 0.6×)

Will made some adjustments to economy.js values after reviewing.

### Prior Work (Python Port Era — before this session)

The game was originally ported from TI-89 assembly to Python/Pygame. Key features built during that era (documented in Change Log):
- 35+ enemy types with unique AI ported from ASM
- Multi-color pixel sprite system (replacing monochrome LCD)
- 5 boss fights, full level progression with 40+ waves
- Color theme system per level group
- Scrolling star field with parallax
- In-game shop system
- 6 ship types including 3 secret ships (Purple Devil, Double Blastery, Red Bomber)
- Each secret ship has unique special weapons (dragon protector, charge beam, attack drones)
- Procedural sound synthesis
- Background music system
- Secret Hangar menu (S×5 on title screen)
- Segmented HP bar with pixel heart icon

The web port translates all of this from Python/Pygame to HTML5 Canvas + vanilla JS.

## Current State (as of March 2026)

The game is fully playable with all 13 levels, working boss fights including the multi-phase Megaboss finale, 6 ships (3 secret), full economy system, and shop progression. The latest commit on main includes the ASM mechanics overhaul with all boss AI fixes, economy config extraction, double cash bug fixes, and expanded game window.

## What's Next / Known Issues

- GitHub connector for Claude Cowork doesn't provide push/pull (SSH blocked in sandbox, no MCP write tools). Will pushes from his terminal.
- Will plans to transition to Claude Code for better git integration
- Economy values in economy.js are actively being tuned through playtesting
- The `handleMegabossCenterDestroyed()` function in enemies.js (~line 1528) is dead code — never called, replaced by the enraged mode system. Can be removed.
- Levels 9-13 income hasn't been precisely audited (special stages with variable enemy counts)
