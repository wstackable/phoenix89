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
        this.cycleCounter = 0;  // global frame counter
        this.difficulty = DIFF_BEGINNER;
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
            this._aiMegabossL(e, idx);
        } else if (etype === ETYPE_MEGABOSS_R) {
            this._aiMegabossR(e, idx);
        } else if (etype === ETYPE_MEGABOSS_DIE) {
            this._aiMegabossDie(e);
        } else if (etype === ETYPE_MBW_ASCEND) {
            this._aiMbwAscend(e, ws);
        } else if (etype === ETYPE_MBW_SLIDE) {
            this._aiMbwSlide(e, ws);
        } else if (etype === ETYPE_MBW_DESCEND) {
            this._aiMbwDescend(e, ws);
        } else if (etype === ETYPE_MBW_DEFEND) {
            this._aiMbwDefend(e, ws);
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

        // In formation: swing movement
        const phase = (this.cycleCounter >> 5) & 3;
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

        // Shooting
        const d7Bit0 = idx & 1;
        if (d7Bit0) {
            const roll = Math.floor(Math.random() * fireChance);
            if (roll === 0) {
                fireFunc.call(this, e, player, ws);
            }
        }
    }

    _fireBomb(e, player, ws) {
        ws.fireEnemyBomb(e.x, e.y);
    }

    _fireMissile(e, player, ws) {
        ws.fireEnemyMissile(e.x, e.y);
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

        const d7Bit0 = idx & 1;
        if (d7Bit0) {
            const fireRoll = Math.floor(Math.random() * 64);
            if (fireRoll === 0) {
                this._fireCannon(e, player, ws);
            }
        }

        // Movement: operator-style
        e.y += e.dataY;
        if (e.y >= 65) {
            e.dataY = -1;
        } else if (e.y <= 29) {
            e.dataY = 1;
        } else if (e.y === 47 && Math.random() < 0.5) {
            e.dataY = -1;
        }

        e.x += e.dataX;
        if (e.x <= 16) {
            e.dataX = 1;
        } else if (e.x >= 144) {
            e.dataX = -1;
        } else if ((Math.floor(e.x) & 31) === 0 && Math.random() < 0.5) {
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

        if (this.cycleCounter & 1) {
            e.y += e.dataY;
            if (e.y <= 0) {
                e.dataY = 1;
            } else if (e.y >= 19) {
                e.dataY = -1;
            }
        } else {
            // Shooting (when not moving Y): every 32 frames
            if (e.width !== 34 && (this.cycleCounter & 31) === 0) {
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

        // Shooting
        if (idx & 1) {
            const roll = Math.floor(Math.random() * 64);
            if (roll === 0) {
                this._fireCannon(e, player, ws);
            }
        }

        // Y movement
        e.y += e.dataY;
        if (e.y >= 65) {
            e.dataY = -1;
        } else if (e.y <= 29) {
            e.dataY = 1;
        } else if (e.y === 47 && Math.random() < 0.5) {
            e.dataY = -1;
        }

        // X movement
        e.x += e.dataX;
        if (e.x <= 16) {
            e.dataX = 1;
        } else if (e.x >= 144) {
            e.dataX = -1;
        } else if ((Math.floor(e.x) & 31) === 0 && Math.random() < 0.5) {
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

        if ((this.cycleCounter & 255) === 0) {
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

        // Shoot approximately every 64 frames
        if ((this.cycleCounter & 63) === (Math.floor(e.x) % 26)) {
            if (this.difficulty === DIFF_EXPERT) {
                ws.fireEnemyAimed(e.x + 4, e.y + 4, player, 3, 2.0);
            } else {
                ws.fireEnemyBullet(e.x + 6, e.y + 4, player, "normal");
            }
        }

        // Movement
        const path = e.swoopPath;
        const [entryX, xv, slideY, exitX] = SWOOP_DATA[path];

        if (e.y === slideY) {
            e.x += xv;
            if ((xv > 0 && e.x >= exitX) || (xv < 0 && e.x <= exitX)) {
                e.y -= 1;
            }
        } else if (e.x === exitX || (xv > 0 && e.x > exitX) || (xv < 0 && e.x < exitX)) {
            e.y -= 1;
            if (e.y < -10) {
                e.alive = false;
                this.enemiesRemaining -= 1;
                this.flags &= ~(1 << path);
            }
        } else {
            e.y += 1;
        }
    }

    // ─── SUPERBOSS ─────────────────────────────────────────────

    _aiSuperbossL(e, idx, player, ws) {
        if (idx > 0 && idx - 1 < this.enemies.length) {
            const parent = this.enemies[idx - 1];
            e.x = parent.x;
            e.y = parent.y;
        }
        if (e.x + 5 > 0 && (this.cycleCounter & 63) === (idx & 63)) {
            ws.fireEnemyAimed(e.x + 5, e.y + 8, player);
        }
    }

    _aiSuperbossR(e, idx, player, ws) {
        if (idx >= 2 && idx - 2 < this.enemies.length) {
            const parent = this.enemies[idx - 2];
            e.x = parent.x + 17;
            e.y = parent.y;
        }
        if (e.x + 5 > 0 && (this.cycleCounter & 63) === (idx & 63)) {
            ws.fireEnemyAimed(e.x + 5, e.y + 8, player);
        }
    }

    // ─── MEGABOSS ──────────────────────────────────────────────

    _aiMegabossC(e, idx, player, ws) {
        if (e.y < 0) {
            e.y = 0;
            e.data = 1;
            e.x = 54;
            return;
        }

        if (e.y < 17) {
            e.y += 1;
            return;
        }

        // Sweeping
        if (this.cycleCounter & 1) {
            const shotType = this.cycleCounter & 7;
            if (shotType >= 6) {
                if ((this.cycleCounter & 0x1C) === 0) {
                    this._megabossFireBomb(e, idx, player, ws);
                }
            }
        } else {
            e.x += e.data;
            if (e.x <= 32) {
                e.data = 1;
                this._spawnMbw(idx, 3, e.x + 2, e.y, -1);
            } else if (e.x >= 94) {
                e.data = -1;
                this._spawnMbw(idx, 4, e.x + 2, e.y, 1);
            }
        }
    }

    _megabossFireBomb(e, idx, player, ws) {
        for (let i = 5; i < this.enemies.length; i++) {
            const candidate = this.enemies[i];
            if (!candidate.alive || candidate.etype === ETYPE_NONE) {
                candidate.alive = true;
                candidate.etype = ETYPE_BOMB;
                candidate.x = e.x + 5;
                candidate.y = e.y + 8;
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

    _aiMegabossL(e, idx) {
        if (idx >= 1) {
            const center = this.enemies[idx - 1];
            e.x = center.x - 17;
            e.y = center.y;
        }
    }

    _aiMegabossR(e, idx) {
        if (idx >= 2) {
            const center = this.enemies[idx - 2];
            e.x = center.x + 17;
            e.y = center.y;
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

    _mbwSpin(e) {
        e.animFrame = (e.animFrame + 1) % WHEEL_IMAGES.length;
        e.spriteName = WHEEL_IMAGES[e.animFrame];
    }

    _aiMbwAscend(e, ws) {
        this._mbwSpin(e);
        e.y -= 2;
        if (e.y <= 1) {
            e.etype = ETYPE_MBW_SLIDE;
        }
    }

    _aiMbwSlide(e, ws) {
        this._mbwSpin(e);
        e.x += e.data;
        if (e.x <= 1 || e.x >= 145) {
            e.etype = ETYPE_MBW_DESCEND;
        }
    }

    _aiMbwDescend(e, ws) {
        this._mbwSpin(e);
        e.y += 1;
        if (e.y >= 50) {
            e.etype = ETYPE_MBW_DEFEND;
        }
    }

    _aiMbwDefend(e, ws) {
        this._mbwSpin(e);
        if (((this.cycleCounter + 1) & 63) === 0) {
            const player = ws._getPlayerRef ? ws._getPlayerRef() : null;
            if (player) {
                ws.fireEnemyAimed(e.x + 4, 54, player);
            }
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

    _explosionFinished(e, ws) {
        // Small enemy cash drop: 1/10 chance for $10 (ASM original: 1/16 for $10)
        if (ws && Math.floor(Math.random() * 10) === 0) {
            ws.deployCash(e.x, e.y, 10);
        }
        e.alive = false;
        this.enemiesRemaining -= 1;
        this.killCount += 1;
    }

    _largeExplosionFinished(e, ws) {
        if (ws === null) {
            e.alive = false;
            this.enemiesRemaining -= 1;
            this.killCount += 1;
            return;
        }

        if (e.destruct === EDESTRUCT_BOSS || e.destruct === EDESTRUCT_MBC) {
            // Boss enemy: 2/3 chance to drop cash (matching ASM)
            if (Math.floor(Math.random() * 3) > 0) {
                let value = 100;
                if (this.difficulty <= DIFF_BEGINNER) {
                    // Beginner: 1/2 chance for $500 vs $100
                    if (Math.floor(Math.random() * 2) === 0) {
                        value = 500;
                    }
                } else if (this.difficulty <= DIFF_INTERMEDIATE) {
                    // Intermediate: 1/3 chance for $500
                    if (Math.floor(Math.random() * 3) === 0) {
                        value = 500;
                    }
                } else {
                    // Hard/Expert: 1/5 chance for $500
                    if (Math.floor(Math.random() * 5) === 0) {
                        value = 500;
                    }
                }
                ws.deployCash(e.x, e.y, value);
            }
        } else {
            // Non-boss large explosion: 1/6 chance for $50
            if (Math.floor(Math.random() * 6) === 0) {
                ws.deployCash(e.x, e.y, 50);
            }
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
