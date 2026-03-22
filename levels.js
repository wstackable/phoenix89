/**
 * Phoenix PC Port - Level definitions and progression
 * Ported from levels.py - all 4 difficulty level sequences preserved.
 */

// ─── Coordinate data banks ────────────────────────────────────
// Ported directly from levels.asm
// Each entry is (x, y) in original TI-89 coords (remapped to 0-based)

function remapCoords(pairs) {
    const result = [];
    for (const [x, y] of pairs) {
        result.push([x - 48, y - 21]);
    }
    return result;
}

// Raw data from assembly (TI-89 absolute coordinates)
const standardRaw = [
    [70,20], [90,20], [110,20], [130,20], [150,20],
    [70,35], [90,35], [110,35], [130,35], [150,35],
    [70,50], [90,50], [110,50], [130,50], [150,50],
    [70,65], [90,65], [110,65], [130,65], [150,65],
];

const swingRaw = [
    [67,20], [87,20], [107,20], [127,20], [147,20],
    [73,35], [93,35], [113,35], [133,35], [153,35],
    [67,50], [87,50], [107,50], [127,50], [147,50],
    [73,65], [93,65], [113,65], [133,65], [153,65],
    [63,20], [83,20], [103,20], [123,20], [143,20],
    [73,35], [93,35], [113,35], [133,35], [153,35],
    [63,50], [83,50], [103,50], [123,50], [143,50],
];

const lowRaw = [
    [70,54], [90,54], [110,54], [130,54], [150,54],
    [70,69], [90,69], [110,69], [130,69], [150,69],
];

const multiRaw = [
    [64,52], [76,52], [88,52], [100,52], [112,52], [124,52], [136,52], [148,52],
    [64,61], [76,61], [88,61], [100,61], [112,61], [124,61], [136,61], [148,61],
    [64,70], [76,70], [88,70], [100,70], [112,70], [124,70], [136,70], [148,70],
];

const STANDARD_DATA_BANK = remapCoords(standardRaw);
const SWING_DATA_BANK = remapCoords(swingRaw);
const LOW_DATA_BANK = remapCoords(lowRaw);
const MULTI_DATA_BANK = remapCoords(multiRaw);

// ─── Enemy data block templates ───────────────────────────────
// Format: (etype, hp, width, height, sprite_name, data, destruct)

const ENEMY_1 = [ETYPE_STANDARD, 2, 8, 7, "enemy_1", -1, EDESTRUCT_NORMAL];
const ENEMY_2 = [ETYPE_STANDARD, 4, 11, 8, "enemy_2", -1, EDESTRUCT_NORMAL];
const ENEMY_3 = [ETYPE_SPINNER1, 8, 10, 10, "enemy3_1", -1, EDESTRUCT_NORMAL];
const ENEMY_4 = [ETYPE_SPINNER2, 12, 10, 10, "enemy4_1", -1, EDESTRUCT_NORMAL];
const ENEMY_5 = [ETYPE_ARROW, 6, 7, 13, "enemy_5", -1, EDESTRUCT_NORMAL];
const ENEMY_6 = [ETYPE_CROSS, 16, 7, 7, "enemy_6", -1, EDESTRUCT_NORMAL];
const ENEMY_7 = [ETYPE_SPINNER3, 20, 10, 10, "enemy7_1", -1, EDESTRUCT_SOLID];
const ENEMY_8 = [ETYPE_STANDARD, 6, 6, 5, "enemy_8", -1, EDESTRUCT_NORMAL];
const ENEMY_9 = [ETYPE_MODIFIED, 6, 6, 5, "enemy_8", -1, EDESTRUCT_NORMAL];
const ENEMY_0 = [ETYPE_OPERATOR_LOCATING, 30, 7, 7, "enemy_0_5", -1, EDESTRUCT_NORMAL];

const E_TRI = [ETYPE_TRIANGLE, 16, 13, 11, "triangle", null, EDESTRUCT_NORMAL];
const E_X = [ETYPE_RANDOM_X, 24, 9, 7, "e_x", null, EDESTRUCT_NORMAL];

const E_BOSS1 = [ETYPE_BOSS, 40, 17, 14, "boss_1", -90, EDESTRUCT_NORMAL];
const E_BOSS2 = [ETYPE_BOSS, 50, 17, 14, "boss_2", -150, EDESTRUCT_NORMAL];
const E_BOSS3 = [ETYPE_BOSS, 100, 17, 9, "boss_x", -100, EDESTRUCT_NORMAL];

const E_SUPL = [ETYPE_SUPERBOSS_L, 150, 17, 11, "superboss_left", -5, EDESTRUCT_BOSS];
const E_SUPR = [ETYPE_SUPERBOSS_R, 150, 17, 11, "superboss_right", -5, EDESTRUCT_BOSS];
const E_SUPL_ = [ETYPE_SUPERBOSS_L, 250, 17, 15, "superboss_left_", -5, EDESTRUCT_BOSS];
const E_SUPR_ = [ETYPE_SUPERBOSS_R, 250, 17, 15, "superboss_right_", -5, EDESTRUCT_BOSS];

const E_FAKE = [ETYPE_FAKE1, 32767, 34, -10, "fake", -5, EDESTRUCT_NORMAL];

const E_SWOOP = [ETYPE_SWOOP, 40, 16, 10, "swoop1", 0, EDESTRUCT_NORMAL];

const E_MBL = [ETYPE_MEGABOSS_L, 1, 17, 17, "mbl", 1, EDESTRUCT_MBL];
const E_MBC = [ETYPE_MEGABOSS_C, 400, 17, 17, "mbc", 1, EDESTRUCT_MBC];
const E_MBR = [ETYPE_MEGABOSS_R, 1, 17, 17, "mbr", 1, EDESTRUCT_MBR];

function chooseEnemy(difficulty) {
    if (difficulty >= DIFF_HARD) {
        return ENEMY_9;
    }
    return ENEMY_8;
}

function makeEnemy(template, dataOverride = null) {
    const [etype, hp, w, h, sprite, data, destruct] = template;
    let finalData = dataOverride !== null ? dataOverride : (data !== null ? data : -1);
    const e = new Enemy(etype, hp, w, h, sprite, finalData, destruct);
    if (finalData !== null && typeof finalData === 'number') {
        if (finalData === 0x101 || etype === ETYPE_TRIANGLE) {
            e.dataX = 1;
            e.dataY = 1;
        }
    }
    return e;
}

// ─── Level loaders ─────────────────────────────────────────────
// Each returns { enemies, xyData, remaining }

function dataLevel(entries, dataBank = null) {
    const enemies = [];
    for (const [count, template] of entries) {
        for (let i = 0; i < count; i++) {
            enemies.push(makeEnemy(template));
        }
    }
    const remaining = enemies.length;
    let xy = dataBank ? [...dataBank] : [];
    while (xy.length < enemies.length) {
        xy.push([100, 40]);
    }
    return { enemies, xyData: xy, remaining };
}

function loadLevel1a(difficulty) {
    return dataLevel([[20, ENEMY_1]], STANDARD_DATA_BANK);
}

function loadLevel1b(difficulty) {
    return dataLevel([[20, ENEMY_1]], SWING_DATA_BANK);
}

function loadLevel1c(difficulty) {
    return dataLevel([[10, ENEMY_1], [1, E_BOSS1]], LOW_DATA_BANK);
}

function loadLevel2a(difficulty) {
    return dataLevel([[10, ENEMY_2], [10, ENEMY_1]], STANDARD_DATA_BANK);
}

function loadLevel2b(difficulty) {
    return dataLevel([[20, ENEMY_2]], SWING_DATA_BANK);
}

function loadLevel2c(difficulty) {
    return dataLevel([[10, ENEMY_2], [1, E_BOSS1]], LOW_DATA_BANK);
}

function loadLevel3a(difficulty) {
    const template = chooseEnemy(difficulty);
    return dataLevel([[10, template], [10, ENEMY_1]], STANDARD_DATA_BANK);
}

function loadLevel3b(difficulty) {
    const template = chooseEnemy(difficulty);
    return dataLevel([[20, template]], SWING_DATA_BANK);
}

function loadLevel3c(difficulty) {
    const template = chooseEnemy(difficulty);
    return dataLevel([[10, template], [1, E_BOSS1]], LOW_DATA_BANK);
}

function loadLevel4a(difficulty) {
    return dataLevel([[15, ENEMY_5]], STANDARD_DATA_BANK);
}

function loadLevel4b(difficulty) {
    return dataLevel([[20, ENEMY_5]], SWING_DATA_BANK);
}

function loadLevel4c(difficulty) {
    return dataLevel([[10, ENEMY_5], [1, E_BOSS1]], LOW_DATA_BANK);
}

function loadLevel5a(difficulty) {
    return dataLevel([[15, ENEMY_3]], STANDARD_DATA_BANK);
}

function loadLevel5b(difficulty) {
    return dataLevel([[20, ENEMY_3]], SWING_DATA_BANK);
}

function loadLevel5c(difficulty) {
    return dataLevel([[10, ENEMY_5], [1, E_BOSS1], [1, E_BOSS2]], LOW_DATA_BANK);
}

function loadLevel6a(difficulty) {
    return dataLevel([[10, ENEMY_4], [10, ENEMY_3]], STANDARD_DATA_BANK);
}

function loadLevel6b(difficulty) {
    return dataLevel([[20, ENEMY_4]], SWING_DATA_BANK);
}

function loadLevel6c(difficulty) {
    const enemies = [];
    const xy = [...LOW_DATA_BANK];
    for (let i = 0; i < 10; i++) {
        enemies.push(makeEnemy(ENEMY_4));
    }
    for (let i = 0; i < 3; i++) {
        const delay = -150 - i * 60;
        enemies.push(makeEnemy(E_BOSS2, delay));
    }
    while (xy.length < enemies.length) {
        xy.push([100, 40]);
    }
    return { enemies, xyData: xy, remaining: enemies.length };
}

function loadLevel7a(difficulty) {
    return dataLevel([[20, ENEMY_6]], STANDARD_DATA_BANK);
}

function loadLevel7b(difficulty) {
    return dataLevel([[20, ENEMY_6]], SWING_DATA_BANK);
}

function loadLevel7c(difficulty) {
    return dataLevel([[24, ENEMY_6], [1, E_BOSS3]], MULTI_DATA_BANK);
}

function loadLevel8a(difficulty) {
    return dataLevel([[10, ENEMY_7], [10, ENEMY_3]], STANDARD_DATA_BANK);
}

function loadLevel8b(difficulty) {
    return dataLevel([[20, ENEMY_7]], SWING_DATA_BANK);
}

function loadLevel8c(difficulty) {
    const enemies = [];
    const xy = [...LOW_DATA_BANK];
    for (let i = 0; i < 10; i++) {
        const e = makeEnemy(ENEMY_7);
        e.destruct = EDESTRUCT_SOLID;
        enemies.push(e);
    }
    for (let i = 0; i < 3; i++) {
        const delay = -150 - i * 60;
        enemies.push(makeEnemy(E_BOSS2, delay));
    }
    while (xy.length < enemies.length) {
        xy.push([100, 40]);
    }
    return { enemies, xyData: xy, remaining: enemies.length };
}

function loadTriangles(difficulty, levelNumber) {
    const count = Math.min(levelNumber, MAX_ENEMIES);
    const enemies = [];
    for (let i = 0; i < count; i++) {
        const e = makeEnemy(E_TRI);
        e.dataX = [-2, -1, 1, 2][Math.floor(Math.random() * 4)];
        e.dataY = [-2, -1, 1, 2][Math.floor(Math.random() * 4)];
        enemies.push(e);
    }
    return { enemies, xyData: [], remaining: enemies.length };
}

function loadSwoop(difficulty) {
    const count = 8 + difficulty * 2;
    const enemies = [];
    for (let i = 0; i < count; i++) {
        enemies.push(makeEnemy(E_SWOOP));
    }
    return { enemies, xyData: [], remaining: enemies.length };
}

function loadSuperboss(difficulty) {
    const enemies = [];
    enemies.push(makeEnemy(E_FAKE));
    enemies.push(makeEnemy(E_SUPL));
    enemies.push(makeEnemy(E_SUPR));
    const remaining = enemies.length - 1;  // fake doesn't count
    return { enemies, xyData: [], remaining };
}

function loadSuperbossHard(difficulty) {
    const enemies = [];
    const xy = [...LOW_DATA_BANK];
    for (let i = 0; i < 10; i++) {
        enemies.push(makeEnemy(ENEMY_9));
    }
    enemies.push(makeEnemy(E_FAKE));
    enemies.push(makeEnemy(E_SUPL));
    enemies.push(makeEnemy(E_SUPR));
    while (xy.length < enemies.length) {
        xy.push([100, 40]);
    }
    const remaining = enemies.length - 1;
    return { enemies, xyData: xy, remaining };
}

function loadSuperbossPlus(difficulty) {
    const enemies = [];
    enemies.push(makeEnemy(E_FAKE));
    enemies.push(makeEnemy(E_SUPL_));
    enemies.push(makeEnemy(E_SUPR_));
    for (let i = 0; i < 22; i++) {
        enemies.push(makeEnemy(ENEMY_0));
    }
    const remaining = enemies.length - 1;
    return { enemies, xyData: [], remaining };
}

function loadOperators(difficulty) {
    const enemies = [];
    for (let i = 0; i < 12; i++) {
        enemies.push(makeEnemy(ENEMY_0));
    }
    return { enemies, xyData: [], remaining: enemies.length };
}

function loadOperators3boss(difficulty) {
    const enemies = [];
    for (let i = 0; i < 12; i++) {
        enemies.push(makeEnemy(ENEMY_0));
    }
    for (let i = 0; i < 3; i++) {
        const delay = -120 - i * 60;
        enemies.push(makeEnemy(E_BOSS2, delay));
    }
    return { enemies, xyData: [], remaining: enemies.length };
}

function loadOperators5boss(difficulty) {
    const enemies = [];
    for (let i = 0; i < 20; i++) {
        enemies.push(makeEnemy(ENEMY_0));
    }
    for (let i = 0; i < 5; i++) {
        const delay = -120 - i * 30;
        enemies.push(makeEnemy(E_BOSS2, delay));
    }
    return { enemies, xyData: [], remaining: enemies.length };
}

function loadRandx1(difficulty) {
    const enemies = [];
    for (let i = 0; i < 12; i++) {
        enemies.push(makeEnemy(E_X));
    }
    return { enemies, xyData: [], remaining: enemies.length };
}

function loadRandx2(difficulty) {
    const enemies = [];
    for (let i = 0; i < 12; i++) {
        enemies.push(makeEnemy(E_X));
    }
    for (let i = 0; i < 3; i++) {
        const delay = -120 - i * 60;
        enemies.push(makeEnemy(E_BOSS2, delay));
    }
    return { enemies, xyData: [], remaining: enemies.length };
}

function loadRandx3(difficulty) {
    const enemies = [];
    for (let i = 0; i < 20; i++) {
        enemies.push(makeEnemy(E_X));
    }
    for (let i = 0; i < 5; i++) {
        const delay = -120 - i * 30;
        enemies.push(makeEnemy(E_BOSS2, delay));
    }
    return { enemies, xyData: [], remaining: enemies.length };
}

function loadWheel(count, separation, isMwheel = false) {
    const enemies = [];
    const etype = isMwheel ? ETYPE_MWHEEL_WAIT : ETYPE_WHEEL_WAIT;
    for (let i = 0; i < count; i++) {
        const e = new Enemy(etype, 40, 15, 15, "wheel_1", 1 + i * separation, EDESTRUCT_NORMAL);
        enemies.push(e);
    }
    return { enemies, xyData: [], remaining: count };
}

function loadMegaboss(difficulty) {
    const enemies = [];
    const eC = makeEnemy(E_MBC);
    eC.hp = difficulty * 400;
    enemies.push(eC);
    enemies.push(makeEnemy(E_MBL));
    enemies.push(makeEnemy(E_MBR));
    // Pad for guard wheel slots
    for (let i = 0; i < 5; i++) {
        const pad = new Enemy(ETYPE_STANDARD, 0, 0, 0, "", -1, EDESTRUCT_NORMAL);
        pad.alive = false;
        enemies.push(pad);
    }
    return { enemies, xyData: [], remaining: 3 };
}

// ─── Level sequence tables ─────────────────────────────────────
// Special level identifiers
const LVL_SHOP = "SHOP";
const LVL_FREE_SHIP = "FREE_SHIP";
const LVL_RESTART = "RESTART";

// Level loader map
const LEVEL_LOADERS = {
    "1A": loadLevel1a,
    "1B": loadLevel1b,
    "1C": loadLevel1c,
    "2A": loadLevel2a,
    "2B": loadLevel2b,
    "2C": loadLevel2c,
    "3A": loadLevel3a,
    "3B": loadLevel3b,
    "3C": loadLevel3c,
    "4A": loadLevel4a,
    "4B": loadLevel4b,
    "4C": loadLevel4c,
    "5A": loadLevel5a,
    "5B": loadLevel5b,
    "5C": loadLevel5c,
    "6A": loadLevel6a,
    "6B": loadLevel6b,
    "6C": loadLevel6c,
    "7A": loadLevel7a,
    "7B": loadLevel7b,
    "7C": loadLevel7c,
    "8A": loadLevel8a,
    "8B": loadLevel8b,
    "8C": loadLevel8c,
    "TRIANGLES": loadTriangles,
    "SWOOP": loadSwoop,
    "SUPERBOSS": loadSuperboss,
    "SUPERBOSS_HARD": loadSuperbossHard,
    "SUPERBOSS_PLUS": loadSuperbossPlus,
    "OPERATORS": loadOperators,
    "OPERATORS_3BOSS": loadOperators3boss,
    "OPERATORS_5BOSS": loadOperators5boss,
    "X1": loadRandx1,
    "X2": loadRandx2,
    "X3": loadRandx3,
    "MEGABOSS": loadMegaboss,
};

// Wheel levels need special handling
const WHEEL_LEVELS = {
    "WHEEL5": [5, 32, false],
    "WHEEL8": [8, 20, false],
    "WHEEL10": [10, 16, false],
    "WHEEL16": [16, 10, false],
    "MWHEEL8": [8, 45, true],
    "MWHEEL10": [10, 36, true],
    "MWHEEL15": [15, 24, true],
    "MWHEEL20": [20, 18, true],
};

// ─── Level sequences per difficulty ───────────────────────────
// Matches exactly the assembly level_table_easy/medium/hard/expert

const LEVEL_SEQ_EASY = [
    "1A", "1B",
    "1C", LVL_SHOP,
    "2A", "2B", "2C", "TRIANGLES", LVL_SHOP,
    "3A", "3B", "3C", "TRIANGLES", LVL_SHOP,
    "4A", "4B", "4C", LVL_SHOP,
    "5A", "5B", "5C", LVL_SHOP,
    "6A", "6B", "6C", LVL_SHOP,
    "7A", "7B", "7C", LVL_SHOP,
    "8A", "8B", "8C", LVL_SHOP,
    "SWOOP", "SUPERBOSS", LVL_FREE_SHIP, LVL_SHOP,
    "WHEEL5", "MWHEEL8", LVL_SHOP,
    "X1", "X2", "X3",
    "MEGABOSS", LVL_RESTART,
];

const LEVEL_SEQ_MEDIUM = [
    "1A", "1B", "1C", LVL_SHOP,
    "2A", "2B", "2C", "TRIANGLES", LVL_SHOP,
    "3A", "3B", "3C", "TRIANGLES", LVL_SHOP,
    "4A", "4B", "4C", "TRIANGLES", LVL_SHOP,
    "5A", "5B", "5C", LVL_SHOP,
    "6A", "6B", "6C", LVL_SHOP,
    "7A", "7B", "7C", LVL_SHOP,
    "8A", "8B", "8C", LVL_SHOP,
    "SWOOP", "SUPERBOSS", LVL_FREE_SHIP, LVL_SHOP,
    "WHEEL5", "WHEEL8", "MWHEEL10", LVL_SHOP,
    "X1", "X2", "X3", LVL_SHOP,
    "OPERATORS", "OPERATORS_3BOSS", "OPERATORS_5BOSS", "OPERATORS_5BOSS",
    "SWOOP", "SUPERBOSS_PLUS",
    "MEGABOSS", LVL_RESTART,
];

const LEVEL_SEQ_HARD = [
    "1A", "1B", "1C", LVL_SHOP,
    "2A", "2B", "2C", "TRIANGLES", LVL_SHOP,
    "3A", "3B", "3C", "TRIANGLES", LVL_SHOP,
    "4A", "4B", "4C", "TRIANGLES", LVL_SHOP,
    "5A", "5B", "5C", LVL_SHOP,
    "6A", "6B", "6C", LVL_SHOP,
    "7A", "7B", "7C", LVL_SHOP,
    "8A", "8B", "8C", LVL_SHOP,
    "SWOOP", "SUPERBOSS", LVL_SHOP,
    "WHEEL5", "WHEEL8", "WHEEL10", "MWHEEL15", LVL_SHOP,
    "X1", "X2", "X3", LVL_SHOP,
    "OPERATORS", "OPERATORS_3BOSS", "OPERATORS_5BOSS", "OPERATORS_5BOSS",
    "SWOOP", "SUPERBOSS_PLUS",
    "MEGABOSS", LVL_RESTART,
];

const LEVEL_SEQ_EXPERT = [
    "1A", "1B", "1C", LVL_SHOP,
    "2A", "2B", "2C", "TRIANGLES", LVL_SHOP,
    "3A", "3B", "3C", "TRIANGLES", LVL_SHOP,
    "4A", "4B", "4C", "TRIANGLES", LVL_SHOP,
    "5A", "5B", "5C", LVL_SHOP,
    "6A", "6B", "6C", LVL_SHOP,
    "7A", "7B", "7C", LVL_SHOP,
    "8A", "8B", "8C", LVL_SHOP,
    "SWOOP", "SUPERBOSS", LVL_SHOP,
    "WHEEL5", "WHEEL8", "WHEEL10", "MWHEEL15", LVL_SHOP,
    "X1", "X2", "X3", LVL_SHOP,
    "OPERATORS", "OPERATORS_3BOSS", "OPERATORS_5BOSS", "OPERATORS_5BOSS",
    "SWOOP", "SUPERBOSS_PLUS", "SWOOP", "SUPERBOSS_PLUS",
    "MEGABOSS", LVL_RESTART,
];

const LEVEL_SEQUENCES = {
    [DIFF_BEGINNER]: LEVEL_SEQ_EASY,
    [DIFF_INTERMEDIATE]: LEVEL_SEQ_MEDIUM,
    [DIFF_HARD]: LEVEL_SEQ_HARD,
    [DIFF_EXPERT]: LEVEL_SEQ_EXPERT,
};

// Boss levels: beating these triggers music change and warp transition
const BOSS_LEVELS = new Set([
    "1C", "2C", "3C", "4C", "5C", "6C", "7C", "8C",
    "SUPERBOSS", "SUPERBOSS_HARD", "SUPERBOSS_PLUS", "MEGABOSS",
]);

function isBossLevel(levelId) {
    return BOSS_LEVELS.has(levelId);
}

// ─── Level Groups ─────────────────────────────────────────────
// A "level" is a group of waves ending with a boss fight.
// Each level has a number, a color-themed boss name, and a color theme.

// Map each wave ID to which level group (1-based) it belongs to
const WAVE_TO_LEVEL = {};
// Levels 1-8: waves xA, xB, xC
for (let n = 1; n <= 8; n++) {
    for (const s of ["A", "B", "C"]) {
        WAVE_TO_LEVEL[`${n}${s}`] = n;
    }
}
WAVE_TO_LEVEL["TRIANGLES"] = 0;  // determined at runtime
// Level 9: Swoop + Superboss
WAVE_TO_LEVEL["SWOOP"] = 9;
WAVE_TO_LEVEL["SUPERBOSS"] = 9;
WAVE_TO_LEVEL["SUPERBOSS_HARD"] = 9;
// Level 10: Wheels
for (const w of ["WHEEL5", "WHEEL8", "WHEEL10", "WHEEL16",
                 "MWHEEL8", "MWHEEL10", "MWHEEL15", "MWHEEL20"]) {
    WAVE_TO_LEVEL[w] = 10;
}
// Level 11: X-enemies + operators
WAVE_TO_LEVEL["X1"] = 11;
WAVE_TO_LEVEL["X2"] = 11;
WAVE_TO_LEVEL["X3"] = 11;
WAVE_TO_LEVEL["OPERATORS"] = 11;
WAVE_TO_LEVEL["OPERATORS_3BOSS"] = 11;
WAVE_TO_LEVEL["OPERATORS_5BOSS"] = 11;
// Level 12: Superboss Plus (harder difficulties)
WAVE_TO_LEVEL["SUPERBOSS_PLUS"] = 12;
// Level 13: Megaboss (final)
WAVE_TO_LEVEL["MEGABOSS"] = 13;

// Level info: number → { name, theme }
const LEVEL_INFO = {
    1: {
        name: "Crimson Scouts",
        theme: {
            name: "Crimson",
            bg: [12, 3, 3],
            stars: [160, 80, 70],
            player: [100, 220, 255],
            enemy: [230, 45, 45],
            player_bullet: [255, 255, 80],
            enemy_bullet: [255, 120, 60],
            explosion: [255, 180, 50],
            hud: [255, 200, 160],
            border: [100, 30, 25],
        },
    },
    2: {
        name: "Azure Armada",
        theme: {
            name: "Azure",
            bg: [3, 6, 22],
            stars: [80, 120, 200],
            player: [255, 220, 80],
            enemy: [60, 130, 255],
            player_bullet: [100, 255, 140],
            enemy_bullet: [180, 80, 255],
            explosion: [150, 200, 255],
            hud: [140, 200, 255],
            border: [25, 45, 110],
        },
    },
    3: {
        name: "Emerald Swarm",
        theme: {
            name: "Emerald",
            bg: [3, 14, 5],
            stars: [60, 160, 80],
            player: [255, 180, 80],
            enemy: [40, 210, 70],
            player_bullet: [255, 80, 180],
            enemy_bullet: [80, 255, 200],
            explosion: [200, 255, 80],
            hud: [150, 255, 140],
            border: [25, 85, 35],
        },
    },
    4: {
        name: "Golden Arrows",
        theme: {
            name: "Golden",
            bg: [14, 10, 3],
            stars: [150, 130, 60],
            player: [180, 220, 255],
            enemy: [240, 190, 40],
            player_bullet: [255, 100, 100],
            enemy_bullet: [200, 220, 60],
            explosion: [255, 220, 80],
            hud: [255, 220, 120],
            border: [90, 70, 20],
        },
    },
    5: {
        name: "Violet Spinners",
        theme: {
            name: "Violet",
            bg: [10, 3, 18],
            stars: [130, 90, 180],
            player: [80, 255, 160],
            enemy: [190, 60, 230],
            player_bullet: [255, 230, 80],
            enemy_bullet: [255, 80, 180],
            explosion: [255, 160, 255],
            hud: [210, 170, 255],
            border: [70, 35, 110],
        },
    },
    6: {
        name: "Cobalt Legion",
        theme: {
            name: "Cobalt",
            bg: [3, 3, 18],
            stars: [70, 90, 180],
            player: [255, 140, 60],
            enemy: [50, 100, 255],
            player_bullet: [0, 255, 220],
            enemy_bullet: [200, 60, 255],
            explosion: [120, 180, 255],
            hud: [100, 180, 255],
            border: [30, 40, 120],
        },
    },
    7: {
        name: "Scarlet Fortress",
        theme: {
            name: "Scarlet",
            bg: [18, 3, 3],
            stars: [180, 80, 60],
            player: [80, 255, 255],
            enemy: [255, 40, 30],
            player_bullet: [160, 255, 80],
            enemy_bullet: [255, 180, 40],
            explosion: [255, 120, 40],
            hud: [255, 160, 120],
            border: [120, 35, 25],
        },
    },
    8: {
        name: "Silver Storm",
        theme: {
            name: "Silver",
            bg: [8, 8, 12],
            stars: [150, 160, 190],
            player: [100, 200, 255],
            enemy: [220, 220, 240],
            player_bullet: [255, 180, 60],
            enemy_bullet: [180, 100, 255],
            explosion: [255, 255, 180],
            hud: [210, 215, 235],
            border: [80, 85, 110],
        },
    },
    9: {
        name: "Neon Overlord",
        theme: {
            name: "Neon",
            bg: [3, 3, 12],
            stars: [60, 180, 200],
            player: [0, 255, 200],
            enemy: [255, 0, 200],
            player_bullet: [255, 255, 0],
            enemy_bullet: [0, 150, 255],
            explosion: [255, 200, 50],
            hud: [0, 255, 180],
            border: [60, 80, 130],
        },
    },
    10: {
        name: "Bronze Gauntlet",
        theme: {
            name: "Bronze",
            bg: [12, 8, 3],
            stars: [140, 110, 60],
            player: [120, 220, 255],
            enemy: [210, 150, 60],
            player_bullet: [255, 80, 120],
            enemy_bullet: [180, 200, 50],
            explosion: [255, 200, 80],
            hud: [220, 180, 100],
            border: [85, 60, 25],
        },
    },
    11: {
        name: "Ivory Phantom",
        theme: {
            name: "Ivory",
            bg: [6, 6, 10],
            stars: [170, 170, 150],
            player: [255, 100, 80],
            enemy: [230, 230, 210],
            player_bullet: [80, 255, 180],
            enemy_bullet: [200, 180, 100],
            explosion: [255, 250, 160],
            hud: [230, 225, 200],
            border: [90, 85, 65],
        },
    },
    12: {
        name: "Plasma Apex",
        theme: {
            name: "Plasma",
            bg: [8, 3, 14],
            stars: [120, 80, 180],
            player: [255, 255, 100],
            enemy: [255, 60, 180],
            player_bullet: [80, 255, 255],
            enemy_bullet: [200, 80, 255],
            explosion: [255, 170, 255],
            hud: [200, 140, 255],
            border: [65, 40, 110],
        },
    },
    13: {
        name: "Obsidian Omega",
        theme: {
            name: "Obsidian",
            bg: [2, 2, 4],
            stars: [100, 60, 60],
            player: [255, 120, 40],
            enemy: [180, 180, 200],
            player_bullet: [80, 255, 120],
            enemy_bullet: [255, 50, 50],
            explosion: [255, 140, 30],
            hud: [255, 160, 60],
            border: [50, 35, 35],
        },
    },
};

function getLevelNumber(levelId) {
    return WAVE_TO_LEVEL[levelId] || 0;
}

function getLevelInfo(levelNum) {
    return LEVEL_INFO[levelNum] || null;
}

function getLevelTheme(levelNum) {
    const info = LEVEL_INFO[levelNum];
    if (info) {
        return info.theme;
    }
    return null;
}

function getLevelName(levelNum) {
    const info = LEVEL_INFO[levelNum];
    if (info) {
        return info.name;
    }
    return `Level ${levelNum}`;
}

// ─── LevelManager class ───────────────────────────────────────

class LevelManager {
    constructor(difficulty = DIFF_BEGINNER) {
        this.difficulty = difficulty;
        this.levelNumber = 0;
        this.sequence = LEVEL_SEQUENCES[difficulty];
        this.gameFinished = false;
        this.timeBonusCounter = 100000;
        this.lastLoadedLevel = null;
        this.currentLevelGroup = 0;
        this.waveInLevel = 0;
    }

    reset(difficulty) {
        this.difficulty = difficulty;
        this.levelNumber = 0;
        this.sequence = LEVEL_SEQUENCES[difficulty];
        this.gameFinished = false;
        this.timeBonusCounter = 100000;
        this.currentLevelGroup = 0;
        this.waveInLevel = 0;
    }

    getCurrentLevelName() {
        if (this.levelNumber < this.sequence.length) {
            return this.sequence[this.levelNumber];
        }
        return LVL_RESTART;
    }

    loadNextLevel(enemyManager) {
        if (this.levelNumber >= this.sequence.length) {
            this.levelNumber = 0;
            this.gameFinished = true;
        }

        const levelId = this.sequence[this.levelNumber];
        this.levelNumber += 1;
        this.lastLoadedLevel = levelId;

        // Special levels
        if ([LVL_SHOP, LVL_FREE_SHIP, LVL_RESTART].includes(levelId)) {
            if (levelId === LVL_RESTART) {
                this.gameFinished = true;
            }
            return levelId;
        }

        // Combat level
        enemyManager.clear();
        enemyManager.difficulty = this.difficulty;

        // Track which level group and wave within it
        const newGroup = getLevelNumber(levelId);
        if (newGroup > 0 && newGroup !== this.currentLevelGroup) {
            this.currentLevelGroup = newGroup;
            this.waveInLevel = 0;
        }
        this.waveInLevel += 1;

        let enemies, xy, remaining;

        if (levelId in WHEEL_LEVELS) {
            const [count, sep, isMwheel] = WHEEL_LEVELS[levelId];
            const result = loadWheel(count, sep, isMwheel);
            enemies = result.enemies;
            xy = result.xyData;
            remaining = result.remaining;
        } else if (levelId === "TRIANGLES") {
            const loader = LEVEL_LOADERS[levelId];
            const result = loader(this.difficulty, this.levelNumber);
            enemies = result.enemies;
            xy = result.xyData;
            remaining = result.remaining;
        } else if (levelId in LEVEL_LOADERS) {
            const loader = LEVEL_LOADERS[levelId];
            const result = loader(this.difficulty);
            enemies = result.enemies;
            xy = result.xyData;
            remaining = result.remaining;
        } else {
            return null;  // unknown level, skip
        }

        // Scale enemy HP based on difficulty and progression
        const diffBase = { 1: 1.0, 2: 1.15, 3: 1.3, 4: 1.5 }[this.difficulty] || 1.0;
        const progress = Math.min(1.0, this.levelNumber / Math.max(1, this.sequence.length));
        const hpMult = diffBase + progress * (0.5 + 0.3 * this.difficulty);
        for (const e of enemies) {
            if (e.hp < 32000) {
                e.hp = Math.max(e.hp, Math.floor(e.hp * hpMult));
            }
        }

        enemyManager.enemies = enemies;
        enemyManager.xyData = xy;
        enemyManager.enemiesRemaining = remaining;

        return null;  // normal combat level
    }

    tickTimeBonus() {
        if (this.timeBonusCounter > 0) {
            this.timeBonusCounter -= 1;
        }
    }

    get timeBonus() {
        return this.timeBonusCounter;
    }

    // ASM base scores: Easy=0, Normal=150000, Hard=300000, Nightmare=500000
    getBaseScore() {
        const baseScores = { 1: 0, 2: 150000, 3: 300000, 4: 500000 };
        return baseScores[this.difficulty] || 0;
    }

    // Running score for HUD display (ASM formula)
    getRunningScore(player) {
        if (player.cheated) return 0;
        const base = this.getBaseScore();
        const time = Math.max(0, this.timeBonusCounter);
        const shield = Math.floor(player.shield / 16);
        const cash = player.cash * 16;
        return base + time + shield + cash;
    }

    calculateScore(player) {
        if (player.cheated) {
            return 0;
        }

        const base = this.getBaseScore();
        const timeScore = Math.max(0, this.timeBonusCounter);
        const shieldScore = Math.floor(player.shield / 16);
        const cashScore = player.cash * 16;

        return base + timeScore + shieldScore + cashScore;
    }
}
