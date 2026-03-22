// Phoenix PC Port - Constants and Configuration
// Ported from Phoenix 7.6 by Patrick Davidson (TI-89/92 calculator game)

// Display settings - original TI-89 was 160x100 playable area
// We scale up 4x for comfortable PC play
const SCALE = 4;
const ORIG_WIDTH = 160;  // TI-89 visible width
const ORIG_HEIGHT = 100;  // TI-89 visible height
const SCREEN_WIDTH = ORIG_WIDTH * SCALE;
const SCREEN_HEIGHT = ORIG_HEIGHT * SCALE;

// The original coordinate system used 256x160 buffer with visible region
// TI-89: visible (48,21)-(207,119), playable (48,96)-(207,121)
// We remap to 0-based coords: x in [0,159], y in [0,99]
// Player movement area: y in [75, 95] (bottom quarter, above HUD at y=96)
const PLAYER_MIN_Y = 75;
const PLAYER_MAX_Y = 90;  // bottom of ship stays above HUD separator at y=91
const PLAYER_MIN_X = 0;
const PLAYER_MAX_X = 159;

// Frame rate
const FPS = 60;
// Original ran at ~30fps, so we advance game logic every 2 frames
const LOGIC_FRAMES = 2;

// Colors (monochrome LCD look)
const COLOR_BG = [202, 211, 185];       // Classic LCD green-gray
const COLOR_FG = [43, 63, 29];          // Dark LCD pixel
const COLOR_BG_INV = [43, 63, 29];     // Inverse mode
const COLOR_FG_INV = [202, 211, 185];

// Difficulty levels
const DIFF_BEGINNER = 1;
const DIFF_INTERMEDIATE = 2;
const DIFF_HARD = 3;
const DIFF_EXPERT = 4;

// Ship types
const SHIP_SIGMA = 0;
const SHIP_HEAVY_DESTROYER = 1;
const SHIP_PHOENIX = 2;
const SHIP_PURPLE_DEVIL = 3;      // Elise's ship
const SHIP_DOUBLE_BLASTERY = 4;   // Brady's ship
const SHIP_RED_BOMBER = 5;        // Caleb's ship

// Weapon indices (0-7 regular, 8-10 secret)
const WEAPON_NORMAL = 0;
const WEAPON_DOUBLE = 1;
const WEAPON_TRIPLE = 2;
const WEAPON_QUAD = 3;
const WEAPON_DUAL_PLASMA = 4;
const WEAPON_GOLDEN_ARCHES = 5;
const WEAPON_TRIPLE_PLASMA = 6;
const WEAPON_DELUXE_PLASMA = 7;
const WEAPON_SNIPER_LASER = 8;     // Purple Devil: multi-color sniper
const WEAPON_BLASTERY = 9;          // Double Blastery: rockets + fan lasers
const WEAPON_RED_CHARGE = 10;       // Red Bomber: charge beam + drones

// Shop items with prices
const SHOP_ITEMS = [
    ["Exit the shop!", 0],
    ["1-point shield recharge", 50],
    ["Extra bullet", 100],
    ["Double Cannon (2)", 250],
    ["Triple Cannon (3)", 400],
    ["Quadruple Cannon (4)", 500],
    ["Rapid-Fire Unit", 1000],
    ["Homing Missiles (addon)", 1000],
    ["Dual Plasma Cannon (5)", 1250],
    ["New Ship: Heavy Destroyer", 1500],
    ["Golden Arches (6)", 1750],
    ["New Ship: The Phoenix", 2000],
    ["Triple Plasma (7)", 2500],
    ["Deluxe Plasma (8)", 3000],
    ["Bombs x3", 500],
];

// Bomb settings
const INITIAL_BOMBS = 3;
const MAX_BOMBS = 9;
const BOMB_DAMAGE = 30;  // heavy damage to all on-screen enemies

// Max values
const MAX_SHIELD = 31;
const MAX_BULLETS = 24;
const INITIAL_BULLETS = 16;
const MAX_ENEMIES = 26;
const MAX_ENEMY_BULLETS = 16;
const MAX_CASH = 25000;

// Player ship definitions: (width, height, armor, weapon_x_offset, speed)
const SHIP_DEFS = {
    [SHIP_SIGMA]: { width: 13, height: 8, armor: 0, weapon_x: 6, speed: 2 },
    [SHIP_HEAVY_DESTROYER]: { width: 15, height: 8, armor: 5, weapon_x: 7, speed: 2 },
    [SHIP_PHOENIX]: { width: 11, height: 7, armor: 0, weapon_x: 5, speed: 3 },
    [SHIP_PURPLE_DEVIL]: { width: 19, height: 9, armor: 0, weapon_x: 9, speed: 3 },
    [SHIP_DOUBLE_BLASTERY]: { width: 17, height: 8, armor: 0, weapon_x: 8, speed: 2 },
    [SHIP_RED_BOMBER]: { width: 13, height: 8, armor: 0, weapon_x: 6, speed: 2 },
};

// Fire delays (frames between auto-fire shots at 30fps logic rate)
const FIRE_DELAY_NORMAL = 10;   // ~3 shots/sec
const FIRE_DELAY_RAPID = 3;     // ~10 shots/sec

// Special weapon cooldown (frames)
const SPECIAL_COOLDOWN = 96;

// Scoring
const DEFAULT_HIGH_SCORES = [
    ["---", 0],
    ["---", 0],
    ["---", 0],
    ["---", 0],
    ["---", 0],
    ["---", 0],
    ["---", 0],
    ["---", 0],
];

// Cash bonus values
const CASH_SMALL = 50;    // $ symbol
const CASH_LARGE = 100;   // $$ symbol
const CASH_HUGE = 500;    // $$$ symbol

// Enemy bullet types
const EB_NORMAL = "normal";
const EB_ARROW = "arrow";
const EB_AIMED = "aimed";
const EB_GUIDED_LEFT = "guided_left";
const EB_GUIDED_RIGHT = "guided_right";
