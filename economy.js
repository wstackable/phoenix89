// Phoenix 89, Claude Edition 1.1 — Economy Configuration
// ======================================================
// All tunable economy values in one place for easy testing.
// Adjust these values and reload the game to see changes.
//
// Estimated income per level (Intermediate difficulty):
//   L1: ~$550   L2: ~$650   L3: ~$975   L4: ~$1075
//   L5: ~$1490  L6: ~$2810  L7: ~$2234  L8: ~$3210
//   Total L1-L8: ~$13,000 (+ bonus from L9-L13 specials)
//   Buying everything costs ~$31,250 (exceeds $25K wallet cap = must prioritize)

const ECONOMY = {

    // ─── NORMAL ENEMY CASH DROPS ─────────────────────────────────
    // When a normal enemy dies, there's a 1-in-N chance it drops cash.
    // The value of the drop is determined by the current level.

    // Cash value per drop, indexed by level (0-based: level 1 = index 0)
    // More levels than stages because boss/special levels still use this
    levelCashValues: [40, 40, 50, 60, 75, 90, 110, 130, 150, 175, 200, 225, 250],

    // Base denominator for drop chance: 1 in N kills drops cash
    // Higher = rarer drops. Difficulty modifies this (see below).
    cashDropBaseDenom: 5,

    // Min denominator (floor) so drops never get TOO frequent
    cashDropMinDenom: 3,

    // ─── DIFFICULTY MODIFIERS ────────────────────────────────────
    // These affect drop rates and boss drop values per difficulty.
    // Keyed by DIFF_BEGINNER(1), DIFF_INTERMEDIATE(2), DIFF_HARD(3), DIFF_EXPERT(4)

    // Added to cashDropBaseDenom: negative = more drops, positive = fewer
    // Beginner: 1 in 4 kills, Intermediate: 1 in 5, Hard: 1 in 6, Expert: 1 in 7
    diffDropRateMod: { 1: -1, 2: 0, 3: 1, 4: 2 },

    // Multiplier on boss cash drops
    // Beginner gets 30% bonus, Expert gets 40% penalty
    diffBossDropMult: { 1: 1.3, 2: 1.0, 3: 0.8, 4: 0.6 },

    // ─── BOSS CASH DROP TABLES ───────────────────────────────────
    // When a boss dies, it always drops cash. The value is rolled from
    // a loot table based on the current level tier.
    // Format: array of [cumulativeChance, value] — roll 0-9, pick first match
    //   e.g. [4, 75] means rolls 0-3 (40% chance) give $75

    bossDropTables: {
        // Levels 0-2 (stages 1-3): Early bosses, modest payouts
        early: {
            maxLevel: 2,
            table: [
                [4, 75],     // 40% chance: $75
                [8, 150],    // 40% chance: $150
                [10, 300],   // 20% chance: $300
            ]
        },
        // Levels 3-5 (stages 4-6): Mid bosses, moderate payouts
        mid: {
            maxLevel: 5,
            table: [
                [3, 150],    // 30% chance: $150
                [7, 300],    // 40% chance: $300
                [9, 500],    // 20% chance: $500
                [10, 750],   // 10% chance: $750
            ]
        },
        // Levels 6+ (stages 7+): Late/final bosses, big payouts
        late: {
            maxLevel: 999,
            table: [
                [3, 300],    // 30% chance: $300
                [7, 500],    // 40% chance: $500
                [9, 800],    // 20% chance: $800
                [10, 1200],  // 10% chance: $1200
            ]
        }
    },

    // ─── CASH PICKUP SPRITES ─────────────────────────────────────
    // Thresholds for which sprite to show for cash drops
    // Below small threshold → small sprite, below medium → medium, else large
    cashSpriteSmallMax: 50,     // $50 or less → small "$" icon
    cashSpriteMediumMax: 100,   // $51-$100 → medium "$$" icon
    // Above 100 → large "$$$" icon

    // ─── SCORING ─────────────────────────────────────────────────
    pointsPerSmallKill: 10,
    pointsPerBossKill: 50,

    // ─── SHOP PRICES ─────────────────────────────────────────────
    // [displayName, price] — index matters (matches weapon/upgrade IDs)
    // Tier targets:
    //   Tier 1 (L1-2, ~$500/level):  Shield, Bullets, Double
    //   Tier 2 (L3-4, ~$800/level):  Triple, Quad, Bombs
    //   Tier 3 (L5-6, ~$1200/level): Rapid-Fire, Homing, Plasma
    //   Tier 4 (L7-8, ~$1600/level): Ships, Golden Arches
    //   Tier 5 (L9+,  ~$2000/level): Triple/Deluxe Plasma
    shopItems: [
        ["Exit the shop!", 0],                 // idx 0
        ["1-point shield recharge", 50],       // idx 1 — always affordable
        ["Double Cannon (2)", 400],            // idx 2 — Tier 1
        ["Triple Cannon (3)", 800],            // idx 3 — Tier 2
        ["Quadruple Cannon (4)", 1200],        // idx 4 — Tier 2
        ["Rapid-Fire Unit", 2000],             // idx 5 — Tier 3
        ["Homing Missiles (addon)", 1600],     // idx 6 — Tier 3
        ["Dual Plasma Cannon (5)", 2500],      // idx 7 — Tier 3
        ["New Ship: Heavy Destroyer (Extra Armor)", 3000], // idx 8 — Tier 4
        ["Golden Arches (6)", 3500],           // idx 9 — Tier 4
        ["New Ship: The Phoenix (Fast + Powerful)", 4000],   // idx 10 — Tier 4
        ["Triple Plasma (7)", 5000],           // idx 11 — Tier 5
        ["Deluxe Plasma (8)", 6500],           // idx 12 — Tier 5
        ["Bombs x3", 600],                     // idx 13 — Tier 2
    ],

    // ─── WALLET LIMITS ───────────────────────────────────────────
    maxCash: 25000,
};
