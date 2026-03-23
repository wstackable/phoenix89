/**
 * Phoenix PC Port - Enemy types and AI behaviors
 * Ported from enemies.py (enemies2.asm, megaboss.asm, edestroy.asm)
 * All 35 enemy types faithfully reproduced.
 */

// ─── Enemy type constants ─────────────────────────────────────────
// These correspond to the ETYPE definitions in enemies2.asm
const ETYPE_NONE = "NONE";
const ETYPE_EXPLODE2 = "EXPLODE2";
const ETYPE_EXPLODE = "EXPLODE";
const ETYPE_STANDARD = "STANDARD";
const ETYPE_BOSS = "BOSS";
const ETYPE_BOSS_MAIN = "BOSS_MAIN";
const ETYPE_SPINNER1 = "SPINNER1";
const ETYPE_SPINNER2 = "SPINNER2";
const ETYPE_ARROW = "ARROW";
const ETYPE_CROSS = "CROSS";
const ETYPE_SPINNER3 = "SPINNER3";
const ETYPE_SUPERBOSS_L = "SUPERBOSS_L";
const ETYPE_SUPERBOSS_R = "SUPERBOSS_R";
const ETYPE_FAKE1 = "FAKE1";
const ETYPE_FAKE2 = "FAKE2";
const ETYPE_OPERATOR_LOCATING = "OPERATOR_LOCATING";
const ETYPE_OPERATOR_ENTERING = "OPERATOR_ENTERING";
const ETYPE_OPERATOR_FLYING = "OPERATOR_FLYING";
const ETYPE_TRIANGLE = "TRIANGLE";
const ETYPE_RANDOM_X = "RANDOM_X";
const ETYPE_MODIFIED = "MODIFIED";
const ETYPE_WHEEL_WAIT = "WHEEL_WAIT";
const ETYPE_WHEEL_ENTER = "WHEEL_ENTER";
const ETYPE_WHEEL_1 = "WHEEL_1";
const ETYPE_WHEEL_2 = "WHEEL_2";
const ETYPE_WHEEL_3 = "WHEEL_3";
const ETYPE_WHEEL_4 = "WHEEL_4";
const ETYPE_MWHEEL_WAIT = "MWHEEL_WAIT";
const ETYPE_MWHEEL_1 = "MWHEEL_1";
const ETYPE_MWHEEL_2 = "MWHEEL_2";
const ETYPE_MWHEEL_3 = "MWHEEL_3";
const ETYPE_MWHEEL_4 = "MWHEEL_4";
const ETYPE_SPINNER1M = "SPINNER1M";
const ETYPE_SPINNER2M = "SPINNER2M";
const ETYPE_SPINNER3M = "SPINNER3M";
const ETYPE_SPINNER4M = "SPINNER4M";
const ETYPE_SWOOP = "SWOOP";
const ETYPE_MEGABOSS_L = "MEGABOSS_L";
const ETYPE_MEGABOSS_C = "MEGABOSS_C";
const ETYPE_MEGABOSS_R = "MEGABOSS_R";
const ETYPE_MEGABOSS_DIE = "MEGABOSS_DIE";
const ETYPE_MBW_ASCEND = "MBW_ASCEND";
const ETYPE_MBW_SLIDE = "MBW_SLIDE";
const ETYPE_MBW_DESCEND = "MBW_DESCEND";
const ETYPE_MBW_DEFEND = "MBW_DEFEND";
const ETYPE_BOMB = "BOMB";

// Destruction types
const EDESTRUCT_NORMAL = "normal";
const EDESTRUCT_BOSS = "boss";
const EDESTRUCT_SOLID = "solid";
const EDESTRUCT_MBC = "mbc";
const EDESTRUCT_MBL = "mbl";
const EDESTRUCT_MBR = "mbr";

// Spinner image cycle lists
const SPINNER1_IMAGES = ["enemy3_1", "enemy3_2", "enemy3_3"];
const SPINNER2_IMAGES = ["enemy4_1", "enemy4_2", "enemy4_3"];
const SPINNER3_IMAGES = ["enemy7_1", "enemy7_2", "enemy7_3"];
const SPINNER4_IMAGES = ["enemy_small_1", "enemy_small_2", "enemy_small_3"];
const WHEEL_IMAGES = ["wheel_1", "wheel_2", "wheel_3", "wheel_4"];

// Explosion frame sequences
const EXPLOSION_FRAMES = [
    "explosion1", "explosion2", "explosion3", "explosion4",
    "explosion5", "explosion6", "explosion7", "explosion8"
];
const LARGE_EXPLOSION_FRAMES = [
    "lexplosion1", "lexplosion2", "lexplosion3", "lexplosion4",
    "lexplosion5", "lexplosion6", "lexplosion7", "lexplosion8",
    "lexplosion9"
];

// Swoop entry paths: (start_x, x_velocity, slide_y, exit_x)
// Remapped from TI-89 absolute (x-48, y-21) to 0-based game coords
const SWOOP_DATA = [
    [2, 1, 62, 142],
    [122, -1, 49, 22],
    [42, 1, 36, 102],
    [82, -1, 23, 62],
];

// ─── Enemy class ──────────────────────────────────────────────────

class Enemy {
    constructor(etype, hp, width, height, spriteName, data = -1, destruct = EDESTRUCT_NORMAL) {
        this.etype = etype;
        this.hp = hp;          // damage needed to destroy
        this.x = -300.0;       // offscreen until placed
        this.y = -300.0;
        this.width = width;
        this.height = height;
        this.spriteName = spriteName;
        this.data = data;      // multipurpose field
        this.dataX = 1;        // x velocity direction
        this.dataY = 1;        // y velocity direction
        this.destruct = destruct;
        this.alive = true;
        this.animFrame = 0;
        this.swoopPath = 0;    // for swoop enemies
        this.enterImage = 0;   // for operator entering animation
    }

    getRect() {
        return {
            x: Math.floor(this.x),
            y: Math.floor(this.y),
            width: this.width,
            height: this.height
        };
    }

    takeDamage(damage, weaponSystem) {
        this.hp -= damage;
        if (this.hp <= 0) {
            this.destroy(weaponSystem);
        }
    }

    destroy(weaponSystem) {
        if (this.destruct === EDESTRUCT_NORMAL) {
            this._destructNormal(weaponSystem);
        } else if (this.destruct === EDESTRUCT_BOSS) {
            this._destructBoss(weaponSystem);
        } else if (this.destruct === EDESTRUCT_SOLID) {
            this._destructSolid(weaponSystem);
        } else if (this.destruct === EDESTRUCT_MBC) {
            this._destructMbc(weaponSystem);
        } else if (this.destruct === EDESTRUCT_MBL) {
            this._destructMbl(weaponSystem);
        } else if (this.destruct === EDESTRUCT_MBR) {
            this._destructMbr(weaponSystem);
        }
    }

    _destructNormal(weaponSystem) {
        if ([ETYPE_SPINNER3, ETYPE_SPINNER3M].includes(this.etype)) {
            this._destructSolid(weaponSystem);
        } else {
            this._startExplosion();
        }
    }

    _startExplosion() {
        this.height = -10000;  // effectively untouchable
        if (this.width >= 15) {
            this.etype = ETYPE_EXPLODE2;
            this.spriteName = LARGE_EXPLOSION_FRAMES[0];
        } else {
            this.etype = ETYPE_EXPLODE;
            this.spriteName = EXPLOSION_FRAMES[0];
        }
        this.animFrame = 0;
        this.data = 0;
    }

    _destructSolid(weaponSystem) {
        const roll = Math.floor(Math.random() * 6);
        if (roll + weaponSystem.difficulty > 5) {
            // Become a small spinner
            this.etype = ETYPE_SPINNER4M;
            this.height -= 2;
            this.width -= 2;
            this.hp = 8;
            this.dataX = 1;
            this.dataY = 1;
            this.destruct = EDESTRUCT_NORMAL;
        } else {
            this._startExplosion();
        }
    }

    _destructBoss(weaponSystem) {
        this.etype = ETYPE_EXPLODE2;
        this.height = -10000;
        this.spriteName = LARGE_EXPLOSION_FRAMES[0];
        this.animFrame = 0;
        this.data = 0;
    }

    _destructMbc(weaponSystem) {
        this._startExplosion();
    }

    _destructMbl(weaponSystem) {
        this.hp = 1;  // Set to 1 so it can take hits without dying again
    }

    _destructMbr(weaponSystem) {
        this.hp = 1;
    }

    draw(ctx, spriteMgr, scale = SCALE) {
        if (!this.alive || this.y < -5 || this.x < -5) {
            return;
        }
        const sprite = spriteMgr.get(this.spriteName);
        if (sprite) {
            ctx.drawImage(sprite, Math.floor(this.x * scale), Math.floor(this.y * scale));
        }
    }
}

// ─── EnemyManager class ───────────────────────────────────────────

class EnemyManager {
    constructor() {
        this.enemies = [];
        this.enemiesRemaining = 0;
        this.killCount = 0;      // running kill counter for score display
        this.scorePoints = 0;    // running score from kills
        this.wavesCleared = 0;   // total waves completed
        this.perfectWaves = 0;   // waves cleared without taking damage
        this.cycleCounter = 0;   // global frame counter
        this.difficulty = DIFF_BEGINNER;
        this.currentLevel = 1;   // current level group (1-9+) for economy scaling
        this.xyData = [];        // coordinate table for formation enemies
        this.flags = 0;          // bit flags for swoop entry paths
        this.weaponSystemRef = null;
    }

    clear() {
        this.enemies = [];
        this.enemiesRemaining = 0;
        this.flags = 0;
    }

    update(player, weaponSystem) {
        this.weaponSystemRef = weaponSystem;
        this.cycleCounter += 1;

        // Free swoop path flags for swoops that died or turned into explosions
        let usedPaths = 0;
        for (const e of this.enemies) {
            if (e.alive && e.etype === ETYPE_SWOOP && e.y >= 0) {
                usedPaths |= (1 << e.swoopPath);
            }
        }
        this.flags = usedPaths;

        for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            if (!e.alive || e.etype === ETYPE_NONE) {
                continue;
            }
            this._dispatch(e, i, player, weaponSystem);
        }
    }

    _dispatch(e, idx, player, ws) {
        const etype = e.etype;

        if (etype === ETYPE_STANDARD) {
            this._aiStandard(e, idx, player, ws);
        } else if (etype === ETYPE_MODIFIED) {
            this._aiModified(e, idx, player, ws);
        } else if (etype === ETYPE_ARROW) {
            this._aiArrow(e, idx, player, ws);
        } else if (etype === ETYPE_CROSS) {
            this._aiCross(e, idx, player, ws);
        } else if (etype === ETYPE_BOSS) {
            this._aiBoss(e, idx, player, ws);
        } else if (etype === ETYPE_BOSS_MAIN) {
            this._aiBossMain(e, idx, player, ws);
        } else if (etype === ETYPE_FAKE1) {
            this._aiFake1(e, idx, player, ws);
        } else if (etype === ETYPE_FAKE2) {
            this._aiFake2(e, idx, player, ws);
        } else if ([ETYPE_SPINNER1, ETYPE_SPINNER2, ETYPE_SPINNER3].includes(etype)) {
            this._aiSpinnerInit(e, idx, player, ws);
        } else if ([ETYPE_SPINNER1M, ETYPE_SPINNER2M, ETYPE_SPINNER3M, ETYPE_SPINNER4M].includes(etype)) {
            this._aiSpinnerModified(e, idx, player, ws);
        } else if (etype === ETYPE_OPERATOR_LOCATING) {
            this._aiOperatorLocating(e);
        } else if (etype === ETYPE_OPERATOR_ENTERING) {
            this._aiOperatorEntering(e);
        } else if (etype === ETYPE_OPERATOR_FLYING) {
            this._aiOperatorFlying(e, idx, player, ws);
        } else if (etype === ETYPE_TRIANGLE) {
            this._aiTriangle(e, player, ws);
        } else if (etype === ETYPE_RANDOM_X) {
            this._aiRandomX(e);
        } else if (etype === ETYPE_WHEEL_WAIT) {
            this._aiWheelWait(e);
        } else if (etype === ETYPE_WHEEL_ENTER) {
            this._aiWheelEnter(e, ws);
        } else if (etype === ETYPE_WHEEL_1) {
            this._aiWheel1(e, ws);
        } else if (etype === ETYPE_WHEEL_2) {
            this._aiWheel2(e, ws);
        } else if (etype === ETYPE_WHEEL_3) {
            this._aiWheel3(e, ws);
        } else if (etype === ETYPE_WHEEL_4) {
            this._aiWheel4(e, ws);
        } else if (etype === ETYPE_MWHEEL_WAIT) {
            this._aiMwheelWait(e);
        } else if (etype === ETYPE_MWHEEL_1) {
            this._aiMwheel1(e, ws);
        } else if (etype === ETYPE_MWHEEL_2) {
            this._aiMwheel2(e, ws);
        } else if (etype === ETYPE_MWHEEL_3) {
            this._aiMwheel3(e, ws);
        } else if (etype === ETYPE_MWHEEL_4) {
            this._aiMwheel4(e, ws);
        } else if (etype === ETYPE_SWOOP) {
            this._aiSwoop(e, player, ws);
        } else if (etype === ETYPE_SUPERBOSS_L) {
            this._aiSuperbossL(e, idx, player, ws);
        } else if (etype === ETYPE_SUPERBOSS_R) {
            this._aiSuperbossR(e, idx, player, ws);
        } else if (etype === ETYPE_MEGABOSS_C) {
            this._aiMegabossC(e, idx, player, ws);
        } else if (etype === ETYPE_MEGABOSS_L) {
            this._aiMegabossL(e, idx, player, ws);
        } else if (etype === ETYPE_MEGABOSS_R) {
            this._aiMegabossR(e, idx, player, ws);
        } else if (etype === ETYPE_MEGABOSS_DIE) {
            this._aiMegabossDie(e);
        } else if (etype === ETYPE_MBW_ASCEND) {
            this._aiMbwAscend(e, player, ws);
        } else if (etype === ETYPE_MBW_SLIDE) {
            this._aiMbwSlide(e, player, ws);
        } else if (etype === ETYPE_MBW_DESCEND) {
            this._aiMbwDescend(e, player, ws);
        } else if (etype === ETYPE_MBW_DEFEND) {
            this._aiMbwDefend(e, player, ws);
        } else if (etype === ETYPE_BOMB) {
            this._aiBomb(e, player, ws);
        } else if (etype === ETYPE_EXPLODE) {
            this._aiExplode(e);
        } else if (etype === ETYPE_EXPLODE2) {
            this._aiExplode2(e, ws);
        }
    }

    _getCoord(idx) {
        if (idx < this.xyData.length) {
            return this.xyData[idx];
        }
        return [100, 40];
    }

    // ─── STANDARD / MODIFIED / ARROW / CROSS ───────────────────────────

    _aiFormationCommon(e, idx, player, ws, fireFunc, fireChance) {
        // data < 0: waiting to enter
        // data == 0: descending into position
        // data > 0: in formation, swinging
        if (e.data < 0) {
            // Waiting to enter
            const [tx, ty] = this._getCoord(idx);
            const check = (ty + this.cycleCounter) & 127;
            if (check === 0) {
                e.x = tx;
                e.y = 0;
                e.data = 0;
            }
            return;
        }

        if (e.data === 0) {
            // Descending into position
            e.y += 1;
            const [tx, ty] = this._getCoord(idx);
            if (e.y >= ty) {
                e.y = ty;
                e.data = 1;
            }
            return;
        }

        // In formation: swing movement with difficulty-enhanced patterns
        // Hard/Expert: faster swing cycle (shift 4 instead of 5 = 2× speed)
        const shiftAmt = (this.difficulty >= DIFF_HARD) ? 4 : 5;
        const phase = (this.cycleCounter >> shiftAmt) & 3;
        if (phase === 0) {
            e.x += 1;
        } else if (phase === 1) {
            if (this.cycleCounter & 1) {
                e.y += 1;
            }
        } else if (phase === 2) {
            e.x -= 1;
        } else {
            if (this.cycleCounter & 1) {
                e.y -= 1;
            }
        }

        // Hard/Expert: formation enemies occasionally dive toward player
        if (this.difficulty >= DIFF_HARD && e.data === 1) {
            // Every 256 cycles, check if this enemy should dive
            if ((this.cycleCounter + idx * 37) % 256 === 0 && this.enemiesRemaining > 4) {
                e.data = 2;  // enter dive state
                e.diveTargetY = Math.min(e.y + 30, 70);
                e.diveReturnY = e.y;
                e.divePhase = 0;  // 0=diving down, 1=returning
            }
        }

        // Handle dive state
        if (e.data === 2) {
            if (e.divePhase === 0) {
                e.y += 2;
                // Track player X slightly
                if (e.x < player.x) e.x += 1;
                else if (e.x > player.x) e.x -= 1;
                if (e.y >= e.diveTargetY) {
                    e.divePhase = 1;
                }
            } else {
                e.y -= 1;
                if (e.y <= e.diveReturnY) {
                    e.y = e.diveReturnY;
                    e.data = 1;  // back to formation
                }
            }
        }

        // ASM-style cycle-based deterministic firing
        // Only odd-indexed enemies fire (matches ASM d7 bit 0 check)
        // Fires when (cycleCounter + idx*7) % scaledChance === 0
        const d7Bit0 = idx & 1;
        if (d7Bit0) {
            // Scale fire chance by difficulty: Expert fires ~2× more
            const diffScale = { 1: 1.5, 2: 1.0, 3: 0.75, 4: 0.5 }[this.difficulty] || 1.0;
            const scaledChance = Math.max(8, Math.floor(fireChance * diffScale));
            const firePhase = (this.cycleCounter + idx * 7) % scaledChance;
            if (firePhase === 0) {
                fireFunc.call(this, e, player, ws);
            }
        }
    }

    _fireBomb(e, player, ws) {
        ws.fireEnemyBomb(e.x, e.y, 1, player);
    }

    _fireMissile(e, player, ws) {
        ws.fireEnemyMissile(e.x, e.y, player);
    }

    _fireArrow(e, player, ws) {
        ws.fireEnemyBullet(e.x + 3, e.y + e.height, player, "arrow");
    }

    _fireGuided(e, player, ws) {
        ws.fireEnemyGuided(e.x, e.y, player);
    }

    _fireCannon(e, player, ws) {
        ws.fireEnemyAimed(e.x + 3, e.y + 8, player);
    }

    _aiStandard(e, idx, player, ws) {
        this._aiFormationCommon(e, idx, player, ws, this._fireBomb, 62);
    }

    _aiModified(e, idx, player, ws) {
        this._aiFormationCommon(e, idx, player, ws, this._fireMissile, 52);
    }

    _aiArrow(e, idx, player, ws) {
        this._aiFormationCommon(e, idx, player, ws, this._fireArrow, 75);
    }

    _aiCross(e, idx, player, ws) {
        this._aiFormationCommon(e, idx, player, ws, this._fireGuided, 100);
    }

    // ─── SPINNERS ──────────────────────────────────────────────────

    _getSpinnerImages(e) {
        if ([ETYPE_SPINNER1, ETYPE_SPINNER1M].includes(e.etype)) {
            return SPINNER1_IMAGES;
        } else if ([ETYPE_SPINNER2, ETYPE_SPINNER2M].includes(e.etype)) {
            return SPINNER2_IMAGES;
        } else if ([ETYPE_SPINNER3, ETYPE_SPINNER3M].includes(e.etype)) {
            return SPINNER3_IMAGES;
        } else if (e.etype === ETYPE_SPINNER4M) {
            return SPINNER4_IMAGES;
        }
        return SPINNER1_IMAGES;
    }

    _spinAnimate(e) {
        const imgs = this._getSpinnerImages(e);
        const frameIdx = ((this.cycleCounter >> 1) % imgs.length);
        e.spriteName = imgs[frameIdx];
    }

    _aiSpinnerInit(e, idx, player, ws) {
        this._spinAnimate(e);

        // Check if should transition to free-moving
        if (e.data > 0 && this.enemiesRemaining < 8) {
            if (e.etype === ETYPE_SPINNER1) {
                e.etype = ETYPE_SPINNER1M;
            } else if (e.etype === ETYPE_SPINNER2) {
                e.etype = ETYPE_SPINNER2M;
            } else if (e.etype === ETYPE_SPINNER3) {
                e.etype = ETYPE_SPINNER3M;
            }
            return;
        }

        this._aiFormationCommon(e, idx, player, ws, this._fireCannon, 85);
    }

    _aiSpinnerModified(e, idx, player, ws) {
        this._spinAnimate(e);

        // Cycle-based firing for free-moving spinners
        const d7Bit0 = idx & 1;
        if (d7Bit0) {
            const diffScale = { 1: 1.5, 2: 1.0, 3: 0.75, 4: 0.5 }[this.difficulty] || 1.0;
            const scaledChance = Math.max(8, Math.floor(53 * diffScale));
            if ((this.cycleCounter + idx * 11) % scaledChance === 0) {
                this._fireCannon(e, player, ws);
            }
        }

        // Movement: operator-style with cycle-based direction changes
        e.y += e.dataY;
        if (e.y >= 65) {
            e.dataY = -1;
        } else if (e.y <= 29) {
            e.dataY = 1;
        } else if (e.y === 47 && (this.cycleCounter + idx * 13) % 4 === 0) {
            e.dataY = -1;
        }

        e.x += e.dataX;
        if (e.x <= 16) {
            e.dataX = 1;
        } else if (e.x >= 144) {
            e.dataX = -1;
        } else if ((Math.floor(e.x) & 31) === 0 && (this.cycleCounter + idx * 17) % 4 === 0) {
            e.dataX = -e.dataX;
        }
    }

    // ─── BOSS ──────────────────────────────────────────────────

    _aiBoss(e, idx, player, ws) {
        if (e.data < 0) {
            e.data += 1;
            if (e.data === 0) {
                e.x = 20;
                e.y = -21;
            }
            return;
        }

        e.y += 1;
        if (e.y >= 0) {
            e.y = 0;
            e.etype = ETYPE_BOSS_MAIN;
            e.dataX = 1;
            e.dataY = 1;
        }
    }

    _aiBossMain(e, idx, player, ws) {
        e.x += e.dataX;
        const xMax = 157 - e.width;
        if (e.x >= xMax) {
            e.dataX = -1;
        } else if (e.x <= 2) {
            e.dataX = 1;
        }

        // ASM: lsr.b #1,d0; bcc no_y_adjust (odd cycles = Y adjust, even = fire check)
        if (this.cycleCounter & 1) {
            e.y += e.dataY;
            if (e.y <= 0) {
                e.dataY = 1;
            } else if (e.y >= 19) {
                e.dataY = -1;
            }
        } else {
            // ASM: d0 = cycleCounter >> 1, then and.w #31 (or #15 for Expert)
            // Fires every 64 cycles (32 on Expert)
            const d0 = this.cycleCounter >> 1;
            const fireRate = this.difficulty === DIFF_EXPERT ? 15 : 31;
            if (e.width !== 34 && (d0 & fireRate) === 0) {
                ws.fireEnemyAimed(e.x, e.y + 8, player);
                ws.fireEnemyAimed(e.x + 14, e.y + 8, player);
            }
        }
    }

    _aiFake1(e, idx, player, ws) {
        e.hp = 32767;  // invincible
        if (e.data < 0) {
            e.data += 1;
            if (e.data === 0) {
                e.x = 20;
                e.y = -21;
            }
            return;
        }
        e.y += 1;
        if (e.y >= 0) {
            e.y = 0;
            e.etype = ETYPE_FAKE2;
            e.dataX = 1;
            e.dataY = 1;
        }
    }

    _aiFake2(e, idx, player, ws) {
        e.hp = 32767;
        this._aiBossMain(e, idx, player, ws);
    }

    // ─── OPERATOR ──────────────────────────────────────────────────

    _aiOperatorLocating(e) {
        e.etype = ETYPE_OPERATOR_ENTERING;
        e.x = Math.floor(Math.random() * (143 - 16 + 1)) + 16;
        e.y = Math.floor(Math.random() * (62 - 31 + 1)) + 31;
        e.enterImage = 5;
        e.spriteName = "enemy_0_5";
    }

    _aiOperatorEntering(e) {
        if ((this.cycleCounter & 1) === 0) {
            return;
        }
        e.enterImage -= 1;
        const frame = e.enterImage;
        if (frame >= 0) {
            e.spriteName = `enemy_0_${frame}`;
        }
        if (frame <= 0) {
            e.etype = ETYPE_OPERATOR_FLYING;
            e.spriteName = "enemy_0";
            e.dataX = 1;
            e.dataY = 1;
        }
    }

    _aiOperatorFlying(e, idx, player, ws) {
        // Wait until fully on screen
        if (e.y < 29) {
            e.y += 1;
            return;
        }

        // Cycle-based firing for operators
        if (idx & 1) {
            const diffScale = { 1: 1.5, 2: 1.0, 3: 0.75, 4: 0.5 }[this.difficulty] || 1.0;
            const scaledChance = Math.max(8, Math.floor(50 * diffScale));
            if ((this.cycleCounter + idx * 11) % scaledChance === 0) {
                this._fireCannon(e, player, ws);
            }
        }

        // Y movement
        e.y += e.dataY;
        if (e.y >= 65) {
            e.dataY = -1;
        } else if (e.y <= 29) {
            e.dataY = 1;
        } else if (e.y === 47 && (this.cycleCounter + idx * 13) % 4 === 0) {
            e.dataY = -1;
        }

        // X movement
        e.x += e.dataX;
        if (e.x <= 16) {
            e.dataX = 1;
        } else if (e.x >= 144) {
            e.dataX = -1;
        } else if ((Math.floor(e.x) & 31) === 0 && (this.cycleCounter + idx * 17) % 4 === 0) {
            e.dataX = -e.dataX;
        }
    }

    // ─── TRIANGLE ──────────────────────────────────────────────────

    _aiTriangle(e, player, ws) {
        if (e.x < 0) {
            e.y = 1;
            e.x = Math.floor(Math.random() * (130 - 16 + 1)) + 16;
            e.dataX = Math.floor(Math.random() * 3) + 1;
            e.dataY = Math.floor(Math.random() * 3) + 1;
        }

        e.x += e.dataX;
        if (e.x < 5) {
            e.dataX = Math.floor(Math.random() * 4) + 1;
        } else if (e.x > 145) {
            e.dataX = -(Math.floor(Math.random() * 3) + 1);
        }

        e.y += e.dataY;
        if (e.y < 0) {
            e.dataY = Math.floor(Math.random() * 4) + 1;
        } else if (e.y > 60) {
            e.dataY = -(Math.floor(Math.random() * 3) + 1);
        }

        // Difficulty-scaled triangle firing: Expert every ~128, Beginner every ~256
        const triFireMask = this.difficulty === DIFF_EXPERT ? 127 :
                             this.difficulty === DIFF_HARD ? 191 : 255;
        if ((this.cycleCounter & triFireMask) === 0) {
            ws.fireEnemyAimed(e.x + 4, e.y + 3, player);
        }
    }

    // ─── RANDOM_X ──────────────────────────────────────────────────

    _aiRandomX(e) {
        e.etype = ETYPE_OPERATOR_FLYING;
        e.x = Math.floor(Math.random() * (143 - 16 + 1)) + 16;
        e.y = Math.floor(Math.random() * 91) - 90;
        e.dataX = 1;
        e.dataY = 1;
    }

    // ─── WHEEL (small circle) ─────────────────────────────────

    _wheelSpin(e, ws) {
        e.animFrame = (e.animFrame + 1) % WHEEL_IMAGES.length;
        e.spriteName = WHEEL_IMAGES[e.animFrame];

        if ((this.cycleCounter & 31) === (e.x % 32 & 31)) {
            const player = ws._getPlayerRef ? ws._getPlayerRef() : null;
            if (player) {
                ws.fireEnemyAimed(e.x + 6, e.y + 6, player);
            }
        }
    }

    _aiWheelWait(e) {
        e.data -= 1;
        if (e.data <= 0) {
            e.etype = ETYPE_WHEEL_ENTER;
            e.x = 29;
            e.y = 0;
        }
    }

    _aiWheelEnter(e, ws) {
        this._wheelGeneral(e, ws);
        e.x += 1;
        e.y += 2;
        if (e.y >= 50) {
            e.y = 50;
            e.etype = ETYPE_WHEEL_1;
            e.data = 64;
        }
    }

    _aiWheel1(e, ws) {
        this._wheelGeneral(e, ws);
        e.x += 2;
        if (this.cycleCounter & 1) {
            e.y -= 1;
        }
        e.data -= 1;
        if (e.data <= 0) {
            e.etype = ETYPE_WHEEL_2;
            e.data = 16;
        }
    }

    _aiWheel2(e, ws) {
        this._wheelGeneral(e, ws);
        e.y += 2;
        if (this.cycleCounter & 1) {
            e.x += 1;
        }
        e.data -= 1;
        if (e.data <= 0) {
            e.etype = ETYPE_WHEEL_3;
            e.data = 64;
        }
    }

    _aiWheel3(e, ws) {
        this._wheelGeneral(e, ws);
        e.x -= 2;
        if (this.cycleCounter & 1) {
            e.y += 1;
        }
        e.data -= 1;
        if (e.data <= 0) {
            e.etype = ETYPE_WHEEL_4;
            e.data = 16;
        }
    }

    _aiWheel4(e, ws) {
        this._wheelGeneral(e, ws);
        e.y -= 2;
        if (this.cycleCounter & 1) {
            e.x -= 1;
        }
        e.data -= 1;
        if (e.data <= 0) {
            e.etype = ETYPE_WHEEL_1;
            e.data = 64;
        }
    }

    _wheelGeneral(e, ws) {
        e.animFrame = (e.animFrame + 1) % WHEEL_IMAGES.length;
        e.spriteName = WHEEL_IMAGES[e.animFrame];

        if ((this.cycleCounter & 31) === (Math.floor(e.x) % 26)) {
            const player = ws._getPlayerRef ? ws._getPlayerRef() : null;
            if (player) {
                ws.fireEnemyAimed(e.x + 6, e.y + 6, player);
            }
        }
    }

    // ─── MWHEEL (large circle) ─────────────────────────────────

    _aiMwheelWait(e) {
        e.data -= 1;
        if (e.data <= 0) {
            e.etype = ETYPE_MWHEEL_1;
            e.x = 9;
            e.y = 0;
        }
    }

    _aiMwheel1(e, ws) {
        this._wheelGeneral(e, ws);
        e.y += 1;
        if (e.y >= 51) {
            e.etype = ETYPE_MWHEEL_2;
        }
    }

    _aiMwheel2(e, ws) {
        this._wheelGeneral(e, ws);
        e.x += 1;
        if (e.x >= 137) {
            e.etype = ETYPE_MWHEEL_3;
        }
    }

    _aiMwheel3(e, ws) {
        this._wheelGeneral(e, ws);
        e.y -= 1;
        if (e.y <= 0) {
            e.etype = ETYPE_MWHEEL_4;
        }
    }

    _aiMwheel4(e, ws) {
        this._wheelGeneral(e, ws);
        e.x -= 1;
        if (e.x <= 9) {
            e.etype = ETYPE_MWHEEL_1;
        }
    }

    // ─── SWOOP ─────────────────────────────────────────────────

    _aiSwoop(e, player, ws) {
        if (e.y < 0) {
            // Waiting to enter
            if ((this.cycleCounter & 31) !== 0) {
                return;
            }
            const path = Math.floor(Math.random() * 4);
            if (this.flags & (1 << path)) {
                return;
            }
            this.flags |= (1 << path);
            e.y = 0;
            e.x = SWOOP_DATA[path][0];
            e.swoopPath = path;
            return;
        }

        // Image animation
        if (this.cycleCounter & 1) {
            e.spriteName = "swoop1";
        } else {
            e.spriteName = "swoop2";
        }

        // Difficulty-scaled swoop firing rate: Expert fires every ~32 frames, Beginner ~80
        const swoopFireMask = this.difficulty === DIFF_EXPERT ? 31 :
                               this.difficulty === DIFF_HARD ? 47 : 63;
        if ((this.cycleCounter & swoopFireMask) === (Math.floor(e.x) % 26)) {
            if (this.difficulty === DIFF_EXPERT) {
                // Expert: aimed 3× damage bullets
                ws.fireEnemyAimed(e.x + 4, e.y + 4, player, 3, 2.0);
            } else if (this.difficulty === DIFF_HARD) {
                // Hard: aimed normal damage
                ws.fireEnemyAimed(e.x + 4, e.y + 4, player, 1, 2.0);
            } else {
                ws.fireEnemyBullet(e.x + 6, e.y + 4, player, "normal");
            }
        }

        // Movement: faster on Expert
        const swoopSpeed = this.difficulty >= DIFF_HARD ? 2 : 1;
        const path = e.swoopPath;
        const [entryX, xv, slideY, exitX] = SWOOP_DATA[path];

        if (e.y === slideY) {
            e.x += xv * swoopSpeed;
            if ((xv > 0 && e.x >= exitX) || (xv < 0 && e.x <= exitX)) {
                e.y -= 1;
            }
        } else if (e.x === exitX || (xv > 0 && e.x > exitX) || (xv < 0 && e.x < exitX)) {
            e.y -= swoopSpeed;
            if (e.y < -10) {
                e.alive = false;
                this.enemiesRemaining -= 1;
                this.flags &= ~(1 << path);
            }
        } else {
            e.y += swoopSpeed;
        }
    }

    // ─── SUPERBOSS ─────────────────────────────────────────────

    _aiSuperbossL(e, idx, player, ws) {
        if (idx > 0 && idx - 1 < this.enemies.length) {
            const parent = this.enemies[idx - 1];
            e.x = parent.x;
            e.y = parent.y;
        }
        if (e.x + 5 <= 0) return;

        // Aggressive firing: base rate every 32 frames, Expert every 20
        const fireRate = this.difficulty === DIFF_EXPERT ? 19 : 31;
        const cc = (this.cycleCounter + 1 + idx * 7);

        if ((cc & fireRate) === 0) {
            ws.fireEnemyAimed(e.x + 5, e.y + 8, player, 1, "bubble", 2.0);
        }
        // Burst fire: second shot 8 frames later
        if (((cc - 8) & fireRate) === 0) {
            ws.fireEnemyAimed(e.x + 3, e.y + 10, player, 1, "bubble", 1.6);
        }
        // Hard/Expert: occasional guided missile
        if (this.difficulty >= DIFF_HARD && (cc % 97) === 0) {
            ws.fireEnemyGuided(e.x, e.y + 4, player);
        }
    }

    _aiSuperbossR(e, idx, player, ws) {
        if (idx >= 2 && idx - 2 < this.enemies.length) {
            const parent = this.enemies[idx - 2];
            e.x = parent.x + 17;
            e.y = parent.y;
        }
        if (e.x + 5 <= 0) return;

        // Aggressive firing: offset from L side for alternating volleys
        const fireRate = this.difficulty === DIFF_EXPERT ? 19 : 31;
        const cc = (this.cycleCounter + idx * 7);

        if ((cc & fireRate) === 0) {
            ws.fireEnemyAimed(e.x + 5, e.y + 8, player, 1, "bubble", 2.0);
        }
        // Burst fire: second shot 8 frames later
        if (((cc - 8) & fireRate) === 0) {
            ws.fireEnemyAimed(e.x + 7, e.y + 10, player, 1, "bubble", 1.6);
        }
        // Hard/Expert: occasional spread (3 bullets in fan)
        if (this.difficulty >= DIFF_HARD && ((cc + 48) % 97) === 0) {
            const fakeL = { x: player.x - 25, y: player.y };
            const fakeR = { x: player.x + 25, y: player.y };
            ws.fireEnemyAimed(e.x + 5, e.y + 8, player, 1, "bubble", 1.8);
            ws.fireEnemyAimed(e.x + 5, e.y + 8, fakeL, 1, "bubble", 1.5);
            ws.fireEnemyAimed(e.x + 5, e.y + 8, fakeR, 1, "bubble", 1.5);
        }
    }

    // ─── MEGABOSS ──────────────────────────────────────────────
    // Multi-phase epic boss fight:
    //   Phase 1 (>66% HP): Steady sweep, bomb volleys, guard wheel spawns
    //   Phase 2 (33-66%): Faster, aimed spreads, side cannons activate, dives
    //   Phase 3 (<33%): Frantic, all weapons, continuous wheel spawns, charges

    _getMegabossPhase(e) {
        if (!e.maxHp || e.maxHp <= 0) return 1;
        const pct = e.hp / e.maxHp;
        if (pct > 0.66) return 1;
        if (pct > 0.33) return 2;
        return 3;
    }

    _aiMegabossC(e, idx, player, ws) {
        // --- Entrance sequence ---
        if (e.y < 0) {
            e.y = 0;
            e.data = 1;
            e.x = 54;
            e.mbDiveState = 0;      // 0 = normal sweep, 1 = diving down, 2 = returning
            e.mbBaseY = 17;         // home row
            e.mbDiveTarget = 17;
            return;
        }

        if (e.y < 17 && !e.mbDiveState) {
            e.y += 1;
            return;
        }

        // Initialize dive state if not set
        if (e.mbDiveState === undefined) {
            e.mbDiveState = 0;
            e.mbBaseY = 17;
            e.mbDiveTarget = 17;
        }

        const phase = this._getMegabossPhase(e);
        const cc = this.cycleCounter;

        // --- Dive mechanic (Phase 2+): boss dips toward player then retreats ---
        if (e.mbDiveState === 1) {
            e.y += 1;
            if (e.y >= e.mbDiveTarget) {
                e.y = e.mbDiveTarget;
                e.mbDiveState = 2;
            }
            // Fire while diving!
            if ((cc & 7) === 0) {
                ws.fireEnemyAimed(e.x + 8, e.y + 14, player, 1, "bubble", 2.5);
            }
        } else if (e.mbDiveState === 2) {
            e.y -= 1;
            if (e.y <= e.mbBaseY) {
                e.y = e.mbBaseY;
                e.mbDiveState = 0;
            }
        }

        // --- Trigger dives in Phase 2+ ---
        if (phase >= 2 && e.mbDiveState === 0) {
            const diveChance = phase === 3 ? 127 : 255;
            if ((cc % diveChance) === 73) {
                e.mbDiveState = 1;
                // Dive deeper in Phase 3
                e.mbDiveTarget = phase === 3 ? 40 : 30;
            }
        }

        // --- Movement (every frame in Phase 3, odd frames otherwise) ---
        const moveThisFrame = phase === 3 || (cc & 1);
        if (moveThisFrame && e.mbDiveState === 0) {
            // Speed scales with phase
            const speed = phase === 3 ? 2 : (phase === 2 ? 1.5 : 1);
            e.x += e.data * speed;

            if (e.x <= 20) {
                e.data = 1;
                this._spawnMbw(idx, 3, e.x + 2, e.y, -1);
            } else if (e.x >= 100) {
                e.data = -1;
                this._spawnMbw(idx, 4, e.x + 2, e.y, 1);
            }
            // Phase 3: also try to spawn wheels from additional slots
            if (phase === 3 && (cc & 63) === 0) {
                for (let s = 5; s <= 7; s++) {
                    const dir = (s & 1) ? -1 : 1;
                    this._spawnMbw(idx, s, e.x + 8, e.y, dir);
                    break;  // spawn one at a time
                }
            }
        }

        // --- Attack patterns by phase ---

        // Phase 1: Bomb volleys every 48 frames
        if (phase >= 1) {
            const bombRate = phase === 3 ? 24 : (phase === 2 ? 36 : 48);
            if ((cc % bombRate) === 0) {
                this._megabossFireBomb(e, idx, e.x + 3, e.y + 8);
                if (phase >= 2) {
                    // Second bomb offset
                    this._megabossFireBomb(e, idx, e.x + 13, e.y + 8);
                }
            }
        }

        // Phase 2+: Aimed bullet spreads every 40 frames
        if (phase >= 2) {
            const spreadRate = phase === 3 ? 20 : 40;
            if ((cc % spreadRate) === Math.floor(spreadRate / 2)) {
                this._megabossFireSpread(e, player, ws, phase === 3 ? 5 : 3);
            }
        }

        // Phase 3: Rapid aimed fire
        if (phase === 3 && (cc & 11) === 0) {
            ws.fireEnemyAimed(e.x + 8, e.y + 14, player, 1, "bubble", 2.2);
        }

        // Phase 2+: Guided missiles from edges of boss
        if (phase >= 2 && (cc % 53) === 0) {
            ws.fireEnemyGuided(e.x, e.y + 8, player);
        }
        if (phase === 3 && (cc % 53) === 26) {
            ws.fireEnemyGuided(e.x + 14, e.y + 8, player);
        }
    }

    _megabossFireSpread(e, player, ws, count) {
        const cx = e.x + 8;
        const cy = e.y + 14;
        // Center shot
        ws.fireEnemyAimed(cx, cy, player, 1, "bubble", 2.0);

        if (count >= 3) {
            // Side shots aimed at offset positions
            const fakeL = { x: player.x - 20, y: player.y };
            const fakeR = { x: player.x + 20, y: player.y };
            ws.fireEnemyAimed(cx - 3, cy, fakeL, 1, "bubble", 1.7);
            ws.fireEnemyAimed(cx + 3, cy, fakeR, 1, "bubble", 1.7);
        }
        if (count >= 5) {
            // Wide fan shots
            const fakeWL = { x: player.x - 45, y: player.y };
            const fakeWR = { x: player.x + 45, y: player.y };
            ws.fireEnemyAimed(cx - 5, cy, fakeWL, 1, "bubble", 1.4);
            ws.fireEnemyAimed(cx + 5, cy, fakeWR, 1, "bubble", 1.4);
        }
    }

    _megabossFireBomb(e, idx, bx, by) {
        // Find a free slot in the enemy array to spawn a bomb entity
        for (let i = 5; i < this.enemies.length; i++) {
            const candidate = this.enemies[i];
            if (!candidate.alive || candidate.etype === ETYPE_NONE) {
                candidate.alive = true;
                candidate.etype = ETYPE_BOMB;
                candidate.x = bx;
                candidate.y = by;
                candidate.width = 7;
                candidate.height = 7;
                candidate.hp = 20;
                candidate.spriteName = "ball";
                candidate.destruct = EDESTRUCT_NORMAL;
                this.enemiesRemaining += 1;
                break;
            }
        }
    }

    _spawnMbw(mbIdx, offset, x, y, direction) {
        const slot = mbIdx + offset;
        if (slot >= this.enemies.length) {
            return;
        }
        const w = this.enemies[slot];
        if (w.alive && w.etype !== ETYPE_NONE) {
            return;
        }
        w.alive = true;
        w.etype = ETYPE_MBW_ASCEND;
        w.hp = 70;
        w.x = x;
        w.y = y;
        w.width = 15;
        w.height = 15;
        w.spriteName = WHEEL_IMAGES[0];
        w.data = direction;
        w.destruct = EDESTRUCT_NORMAL;
        this.enemiesRemaining += 1;
    }

    // Side cannons: follow center while alive, become independent enraged bosses when center dies
    _isMegabossCenterAlive(centerEnemy) {
        return centerEnemy && centerEnemy.alive &&
               (centerEnemy.etype === ETYPE_MEGABOSS_C);
    }

    _aiMegabossL(e, idx, player, ws) {
        const center = idx >= 1 ? this.enemies[idx - 1] : null;
        const centerAlive = this._isMegabossCenterAlive(center);

        if (centerAlive) {
            // --- Following center ---
            e.x = center.x - 17;
            e.y = center.y;

            const phase = this._getMegabossPhase(center);
            if (phase >= 2) {
                const fireRate = phase === 3 ? 15 : 31;
                if (((this.cycleCounter + 5) & fireRate) === 0) {
                    ws.fireEnemyAimed(e.x + 8, e.y + 12, player, 1, "bubble", 1.8);
                }
                if (phase === 3 && (this.cycleCounter % 41) === 0) {
                    ws.fireEnemyBomb(e.x + 4, e.y, 1, player);
                }
            }
        } else {
            // --- Center is dead: ENRAGED independent mode ---
            this._aiMegabossSideEnraged(e, player, ws, -1);
        }
    }

    _aiMegabossR(e, idx, player, ws) {
        const center = idx >= 2 ? this.enemies[idx - 2] : null;
        const centerAlive = this._isMegabossCenterAlive(center);

        if (centerAlive) {
            // --- Following center ---
            e.x = center.x + 17;
            e.y = center.y;

            const phase = this._getMegabossPhase(center);
            if (phase >= 2) {
                const fireRate = phase === 3 ? 15 : 31;
                if (((this.cycleCounter + 13) & fireRate) === 0) {
                    ws.fireEnemyAimed(e.x + 4, e.y + 12, player, 1, "bubble", 1.8);
                }
                if (phase === 3 && (this.cycleCounter % 47) === 0) {
                    ws.fireEnemyBomb(e.x + 4, e.y, 1, player);
                }
            }
        } else {
            // --- Center is dead: ENRAGED independent mode ---
            this._aiMegabossSideEnraged(e, player, ws, 1);
        }
    }

    _aiMegabossSideEnraged(e, player, ws, startDir) {
        // First frame of enraged mode: initialize independent movement
        if (!e.mbEnraged) {
            e.mbEnraged = true;
            e.dataX = startDir;
            e.dataY = 1;
            // Become a real killable boss with substantial HP
            e.destruct = EDESTRUCT_BOSS;
            e.hp = Math.max(e.hp, 80);
            e.maxHp = e.hp;
        }

        // Independent bouncing movement — fast and aggressive
        e.x += e.dataX * 2;
        if (e.x <= 2) e.dataX = 1;
        else if (e.x >= 140) e.dataX = -1;

        if (this.cycleCounter & 1) {
            e.y += e.dataY;
            if (e.y <= 0) e.dataY = 1;
            else if (e.y >= 45) e.dataY = -1;
        }

        const cc = this.cycleCounter;

        // Rapid aimed fire
        if ((cc & 15) === 0) {
            ws.fireEnemyAimed(e.x + 8, e.y + 12, player, 1, "bubble", 2.2);
        }

        // Spread bursts every 32 frames
        if ((cc & 31) === 0) {
            const fakeL = { x: player.x - 20, y: player.y };
            const fakeR = { x: player.x + 20, y: player.y };
            ws.fireEnemyAimed(e.x + 8, e.y + 12, fakeL, 1, "bubble", 1.6);
            ws.fireEnemyAimed(e.x + 8, e.y + 12, fakeR, 1, "bubble", 1.6);
        }

        // Bombs
        if ((cc % 29) === 0) {
            ws.fireEnemyBomb(e.x + 4, e.y, 1, player);
        }

        // Guided missiles
        if ((cc % 47) === 0) {
            ws.fireEnemyGuided(e.x + 4, e.y + 8, player);
        }
    }

    _aiMegabossDie(e) {
        e.x += e.data;
        if (e.x <= 0 || e.x >= 174) {
            e.alive = false;
            this.enemiesRemaining -= 1;
        }
    }

    // ─── MEGABOSS GUARD WHEELS ─────────────────────────────────
    // Enhanced: fire during all movement phases, more aggressive in later boss phases

    _mbwSpin(e) {
        e.animFrame = (e.animFrame + 1) % WHEEL_IMAGES.length;
        e.spriteName = WHEEL_IMAGES[e.animFrame];
    }

    _mbwGetBossPhase() {
        // Check if the megaboss center (slot 0) exists and get its phase
        if (this.enemies.length > 0) {
            const center = this.enemies[0];
            if (center.alive && (center.etype === ETYPE_MEGABOSS_C)) {
                return this._getMegabossPhase(center);
            }
        }
        return 1;
    }

    _aiMbwAscend(e, player, ws) {
        this._mbwSpin(e);
        e.y -= 2;
        // Phase 2+: fire while ascending
        if (this._mbwGetBossPhase() >= 2 && (this.cycleCounter & 31) === 0 && player) {
            ws.fireEnemyAimed(e.x + 7, e.y + 10, player, 1, "bubble", 1.5);
        }
        if (e.y <= 1) {
            e.etype = ETYPE_MBW_SLIDE;
        }
    }

    _aiMbwSlide(e, player, ws) {
        this._mbwSpin(e);
        const bossPhase = this._mbwGetBossPhase();
        // Phase 3: faster slide
        const slideSpeed = bossPhase === 3 ? 2 : 1;
        e.x += e.data * slideSpeed;
        // Fire while sliding in Phase 2+
        if (bossPhase >= 2 && (this.cycleCounter & 15) === 0 && player) {
            ws.fireEnemyBomb(e.x + 4, e.y, 1, player);
        }
        if (e.x <= 1 || e.x >= 145) {
            e.etype = ETYPE_MBW_DESCEND;
        }
    }

    _aiMbwDescend(e, player, ws) {
        this._mbwSpin(e);
        const bossPhase = this._mbwGetBossPhase();
        e.y += bossPhase === 3 ? 2 : 1;
        // Fire while descending in Phase 2+
        if (bossPhase >= 2 && (this.cycleCounter & 23) === 0 && player) {
            ws.fireEnemyAimed(e.x + 7, e.y + 10, player, 1, "bubble", 1.8);
        }
        if (e.y >= 50) {
            e.etype = ETYPE_MBW_DEFEND;
        }
    }

    _aiMbwDefend(e, player, ws) {
        this._mbwSpin(e);
        if (!player) return;
        const bossPhase = this._mbwGetBossPhase();
        // Fire rate scales with boss phase: 48/32/16 frames
        const fireRate = bossPhase === 3 ? 15 : (bossPhase === 2 ? 31 : 47);
        if (((this.cycleCounter + 1) & fireRate) === 0) {
            ws.fireEnemyAimed(e.x + 7, e.y + 10, player, 1, "bubble", 2.0);
        }
        // Phase 3: also fire bombs downward
        if (bossPhase === 3 && (this.cycleCounter % 37) === 0) {
            ws.fireEnemyBomb(e.x + 4, e.y, 1, player);
        }
    }

    // ─── BOMB (semi-smart) ─────────────────────────────────────

    _aiBomb(e, player, ws) {
        if (e.y > player.y) {
            this._destructBomb(e);
            return;
        }
        ws.fireEnemyAimed(e.x, e.y, player);
        this._destructBomb(e);
    }

    _destructBomb(e) {
        e.alive = false;
        this.enemiesRemaining -= 1;
    }

    // ─── EXPLOSIONS ────────────────────────────────────────────

    _aiExplode(e) {
        e.hp = 32767;
        e.data += 1;
        if (e.data % 2 === 0) {
            e.animFrame += 1;
            if (e.animFrame >= EXPLOSION_FRAMES.length) {
                this._explosionFinished(e, this.weaponSystemRef);
                return;
            }
            e.spriteName = EXPLOSION_FRAMES[e.animFrame];
        }
    }

    _aiExplode2(e, ws) {
        e.hp = 32767;
        e.data += 1;
        if (e.data % 2 === 0) {
            e.animFrame += 1;
            if (e.animFrame >= LARGE_EXPLOSION_FRAMES.length) {
                this._largeExplosionFinished(e, ws);
                return;
            }
            e.spriteName = LARGE_EXPLOSION_FRAMES[e.animFrame];
        }
    }

    // ─── ECONOMIC MODEL ──────────────────────────────────────────
    // All tunable values are in economy.js — edit that file to adjust.
    // See economy.js for target income, difficulty modifiers, and boss loot tables.

    _getLevelCashValue() {
        // Base drop value scales with level — values from economy.js
        const vals = ECONOMY.levelCashValues;
        const idx = Math.min(this.currentLevel, vals.length - 1);
        return vals[idx];
    }

    _getCashDropChance() {
        // Drop rate: 1 in N kills. Difficulty-scaled via economy.js
        const baseDenom = ECONOMY.cashDropBaseDenom;
        const diffMod = ECONOMY.diffDropRateMod[this.difficulty] || 0;
        return Math.max(ECONOMY.cashDropMinDenom, baseDenom + diffMod);
    }

    _getBossDropValue() {
        // Boss drops: roll against level-tiered loot table from economy.js
        const level = this.currentLevel;
        const roll = Math.floor(Math.random() * 10);

        // Find the right tier
        const tables = ECONOMY.bossDropTables;
        let table;
        if (level <= tables.early.maxLevel) {
            table = tables.early.table;
        } else if (level <= tables.mid.maxLevel) {
            table = tables.mid.table;
        } else {
            table = tables.late.table;
        }

        // Roll against cumulative thresholds
        let base = table[table.length - 1][1];  // fallback to last entry
        for (const [threshold, value] of table) {
            if (roll < threshold) {
                base = value;
                break;
            }
        }

        // Difficulty modifier on boss drops
        const diffMult = ECONOMY.diffBossDropMult[this.difficulty] || 1.0;
        return Math.floor(base * diffMult);
    }

    _explosionFinished(e, ws) {
        // Guard: prevent any enemy from dropping cash more than once
        if (e._cashDropped) {
            e.alive = false;
            this.enemiesRemaining -= 1;
            return;
        }
        e._cashDropped = true;

        // Small enemy cash drop: level-scaled value, difficulty-scaled chance
        const dropDenom = this._getCashDropChance();
        if (ws && Math.floor(Math.random() * dropDenom) === 0) {
            ws.deployCash(e.x, e.y, this._getLevelCashValue());
        }
        e.alive = false;
        this.enemiesRemaining -= 1;
        this.killCount += 1;
        // HP-based scoring: tougher enemies = more points
        const hp = e.maxHp || 1;
        this.scorePoints += Math.ceil(hp * ECONOMY.pointsPerHp);
    }

    _largeExplosionFinished(e, ws) {
        // Guard: prevent any enemy from dropping cash more than once
        if (e._cashDropped) {
            e.alive = false;
            this.enemiesRemaining -= 1;
            return;
        }
        e._cashDropped = true;

        const hp = e.maxHp || 1;
        const isBoss = (e.destruct === EDESTRUCT_BOSS || e.destruct === EDESTRUCT_MBC);

        if (ws === null) {
            e.alive = false;
            this.enemiesRemaining -= 1;
            this.killCount += 1;
            this.scorePoints += Math.ceil(hp * ECONOMY.pointsPerHp * (isBoss ? ECONOMY.bossHpMultiplier : 1));
            return;
        }

        if (isBoss) {
            // Boss: always drops cash, value scales with level
            const value = this._getBossDropValue();
            ws.deployCash(e.x, e.y, value);
            this.scorePoints += Math.ceil(hp * ECONOMY.pointsPerHp * ECONOMY.bossHpMultiplier);
        } else {
            // Non-boss large: same as small enemies
            const dropDenom = this._getCashDropChance();
            if (Math.floor(Math.random() * dropDenom) === 0) {
                ws.deployCash(e.x, e.y, this._getLevelCashValue());
            }
            this.scorePoints += Math.ceil(hp * ECONOMY.pointsPerHp);
        }

        e.alive = false;
        this.enemiesRemaining -= 1;
        this.killCount += 1;
    }

    // ─── Megaboss destruction handling ─────────────────────────

    handleMegabossCenterDestroyed(centerIdx) {
        if (centerIdx >= 1) {
            const left = this.enemies[centerIdx - 1];
            if (left.alive) {
                left.etype = ETYPE_MEGABOSS_DIE;
                left.data = -2;
            }
        }
        if (centerIdx + 1 < this.enemies.length) {
            const right = this.enemies[centerIdx + 1];
            if (right.alive) {
                right.etype = ETYPE_MEGABOSS_DIE;
                right.data = 2;
            }
        }
    }

    handleMegabossSideDestroyed(sideIdx, isLeft) {
        if (isLeft && sideIdx + 1 < this.enemies.length) {
            const center = this.enemies[sideIdx + 1];
        } else if (!isLeft && sideIdx >= 2) {
            const center = this.enemies[sideIdx - 2];
        }
    }

    // ─── Drawing ───────────────────────────────────────────────

    draw(ctx, spriteMgr, scale = SCALE) {
        for (const e of this.enemies) {
            if (e.alive && e.etype !== ETYPE_NONE) {
                e.draw(ctx, spriteMgr, scale);
            }
        }
    }

    getAliveCount() {
        return this.enemies.filter(e =>
            e.alive && e.etype !== ETYPE_NONE &&
            ![ETYPE_EXPLODE, ETYPE_EXPLODE2].includes(e.etype)
        ).length;
    }

    levelComplete() {
        return this.enemiesRemaining <= 0;
    }

    // ─── Wave spawning ─────────────────────────────────────────

    spawnWave(waveDef) {
        this.clear();
        // waveDef should contain enemies, xy_data, and remaining count
        if (waveDef.enemies) {
            this.enemies = waveDef.enemies;
        }
        if (waveDef.xyData) {
            this.xyData = waveDef.xyData;
        }
        if (typeof waveDef.remaining === 'number') {
            this.enemiesRemaining = waveDef.remaining;
        }
    }
}
