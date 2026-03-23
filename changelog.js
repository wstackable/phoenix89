/**
 * Phoenix 89 — Version Change Log
 * Each entry: { version: "X.XX", date: "Mon YYYY", changes: ["...", ...] }
 * Newest first. Update this file each time we push a new version.
 */

const CHANGELOG = [
    {
        version: "1.60",
        date: "Mar 2026",
        changes: [
            "Mobile: high score name entry now opens virtual keyboard (tap screen to type)",
            "Mobile: feedback/bug report screen fully functional (tap to type, tappable submit/cancel buttons)",
            "Mobile: level select and difficulty now changeable (tap left/right sides of the row)",
            "Mobile: versions page now supports touch-drag scrolling instead of one-tap-at-a-time",
            "Mobile: all menu text enlarged for readability (title, menus, high scores, shop)",
            "Mobile: shop items use larger fonts and taller rows for easier tap targets",
            "Mobile: added thumbstick visual cue in left sidebar during gameplay",
            "Mobile: added radio/music button in right sidebar to cycle tracks",
            "Mobile: all 'Press ENTER' / 'Press any key' prompts now show tap equivalents",
            "Mobile: selected menu items and shop rows get a highlight background",
            "Fixed radio cycling muting all sound on iOS (AudioContext resume on interaction)",
            "Fixed double-character bug on mobile text input (keyboard events no longer duplicated)",
        ]
    },
    {
        version: "1.59",
        date: "Mar 2026",
        changes: [
            "New scoring system: HP-based kill points, wave clear bonuses, perfect wave bonuses, level reached bonus",
            "Scorecard redesigned to show full breakdown with level/wave where you died",
            "High scores now separated by difficulty with tabs and scrolling (top 25 per difficulty)",
            "Difficulty multipliers updated: Beginner x1, Intermediate x1.5, Hard x2.5, Expert x4",
            "Secret Hangar: pick ship first, then choose difficulty on separate screen",
            "Fixed HUD level/wave display (was showing L2-W1 on first level)",
            "Fixed homing missiles not firing with ultimate weapons (bullet cap was blocking them)",
            "Removed 'Claude Edition' branding from main menu, victory screen, and about",
            "Mobile phone and tablet support with virtual joystick and touch controls",
            "Responsive canvas scaling for any screen size with landscape orientation lock",
            "Touch-friendly menus: tap to navigate shop, secret hangar, high scores, etc.",
            "Fixed bombs destroying money drops (cash pickups now preserved through bomb blasts)",
            "Fixed high scores not prompting for name entry after game over",
            "Removed legacy local high score list — all scores are now global via Firebase",
        ]
    },
    {
        version: "1.58",
        date: "Mar 2026",
        changes: [
            "Victory screen with fireworks and pulsing VICTORY text",
            "Scrolling credits with ship sprites and secret hangar reveal",
            "Epic Chiptune end credits music plays through victory and high scores",
            "Caleb's weapon changed to red laser fan (bulletType 10)",
            "Fixed red bullets appearing yellow (new draw function)",
            "Fixed cash pickup boundary (y>119 → y>ORIG_HEIGHT+5)",
            "Shop status text larger and split to two lines",
            "Secret Hangar now has difficulty selector (left/right)",
            "Special weapon tip shown when launching Brady/Caleb ships",
            "High scores switched from CSV to TSV for fresher data",
            "Changelog footer shows scroll instructions",
            "High scores backend switched to Firebase Realtime Database",
            "Scorecard and high scores restyled to match main menu theme",
            "High scores always shows global Firebase leaderboard",
            "Secret Hangar: pick ship first, then choose difficulty",
        ]
    },
    {
        version: "1.57",
        date: "Mar 2026",
        changes: [
            "Loading screen with progress bar — preloads all music",
            "Press any key to start prompt after loading",
            "All audio tracks cached as blobs for instant playback",
        ]
    },
    {
        version: "1.56",
        date: "Mar 2026",
        changes: [
            "Added radio song display (top-right HUD)",
            "Updated music library — new tracks, removed old ones",
            "Fixed music resetting to menu on keypress during gameplay",
            "Fixed autoplay retry race condition (AbortError vs NotAllowedError)",
            "Added scrollable Versions screen to main menu",
            "Simplified high score — Enemies + Cash Bonus × Difficulty",
            "Removed bullets feature and extra bullet from shop",
            "HUD status line changed from S: to Score:",
            "New Ship: The Phoenix — smaller, faster, 25% more damage, gold sprite",
            "Ship descriptions added to shop menu",
            "Ship switching — press Enter on owned ship to equip it",
            "Updated About screen text and codebase stats",
        ]
    },
    {
        version: "1.55",
        date: "Mar 2026",
        changes: [
            "Added music autoplay retry system for browser policy",
            "Menu music now plays after first user interaction",
            "Stored pending music type for deferred playback",
        ]
    },
    {
        version: "1.54",
        date: "Mar 2026",
        changes: [
            "Added version numbering to main menu",
            "GitHub Pages deployment (wstackable.github.io/phoenix89)",
        ]
    },
    {
        version: "1.53",
        date: "Mar 2026",
        changes: [
            "Fixed secret ships (Brady/Elise/Caleb) starting with all upgrades owned",
            "Secret ships now earn shop upgrades like normal players",
            "Custom shield/HP stats per secret ship preserved",
        ]
    },
    {
        version: "1.52",
        date: "Mar 2026",
        changes: [
            "Created economy.js — centralized all tunable economy values",
            "Audited full income curve across 13 levels",
            "Difficulty-scaled drop rates and boss cash multipliers",
            "Balanced shop progression vs income (forces meaningful upgrade choices)",
        ]
    },
    {
        version: "1.51",
        date: "Mar 2026",
        changes: [
            "Fixed double cash drops from explosions (3 root causes)",
            "Added _cashDropped guard to large explosion handler",
            "Fixed megabomb explosion state init (data, height reset)",
            "Fixed etype string/number mismatch in detonateBomb",
        ]
    },
    {
        version: "1.50",
        date: "Mar 2026",
        changes: [
            "ASM Mechanics Overhaul — major boss AI rewrite",
            "Megaboss: 3-phase system (sweep, fans+missiles, maximum aggression)",
            "Megaboss sides enter enraged independent mode when center dies",
            "Guard wheels now phase-aware (passive → firing → dangerous)",
            "Superboss enhanced with burst fire and guided missiles",
            "Fixed boss firing rates (missing >>1 shift from ASM port)",
            "Fixed Superboss L/R firing same frame (ASM uses +1 offset)",
        ]
    },
    {
        version: "1.40",
        date: "Mar 2026",
        changes: [
            "Expanded game window from 160x100 to 160x140",
            "Doubled vertical dodging space between enemies and player",
            "Fixed max level selector from 20 to 13",
            "Full web port feature parity with Python version",
        ]
    },
    {
        version: "1.30",
        date: "Mar 2026",
        changes: [
            "Web port: ported all game systems to HTML5 Canvas + vanilla JS",
            "OffscreenCanvas sprite caching with color tinting",
            "requestAnimationFrame loop at 60fps, logic at 30fps",
            "Procedural Web Audio API sound synthesis",
            "Background music system with track rotation",
            "localStorage high score persistence",
        ]
    },
    {
        version: "1.20",
        date: "Feb 2026",
        changes: [
            "Secret Hangar with 3 hidden ships (press S x5)",
            "Elise's Purple Devil — quad color-shifting star cannon + rainbow dragon",
            "Brady's Double Blastery — charge-based mega laser bomb (20s charge)",
            "Caleb's Red Bomber — companion attack drones",
            "Ship preview sprites in Secret Hangar selection",
        ]
    },
    {
        version: "1.10",
        date: "Feb 2026",
        changes: [
            "In-game shop system for weapon upgrades between waves",
            "6 weapon types: Normal, Dual Plasma, Triple, Homing, Beam, Smart Bomb",
            "Segmented HP bar with pixel heart icon",
            "HUD: cash, shield, level/wave, weapon indicator",
            "Death explosion animation with particle effects",
        ]
    },
    {
        version: "1.00",
        date: "Jan 2026",
        changes: [
            "Initial port from TI-89 68k assembly (Phoenix 7.6 by Patrick Davidson)",
            "35+ enemy types with unique AI from original ASM",
            "Multi-color pixel sprite system (replacing monochrome LCD)",
            "5 boss fights across 13 levels with 40+ waves",
            "Color theme system per level group",
            "Scrolling star field with parallax depth layers",
            "Space backgrounds (nebulae, planets)",
            "Warp speed transitions between level groups",
        ]
    },
];
