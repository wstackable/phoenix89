/**
 * Phoenix Web Port - Weapons and bullet system
 * Ported from weapons.py
 */

class Bullet {
    constructor(x, y, vx, vy, damage, spriteName, bulletType = 0) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.spriteName = spriteName;
        this.alive = true;
        this.bulletType = bulletType;  // 0=normal, 1=swinging, 2=arch, 3=smart_bomb, 4=homing, 5=beam_instant, 6=blastery_fan, 7=charge_beam, 9=star_bullet
        this.counter = 0;
        this.targetEnemyIdx = -1;  // for smart bombs and homing
        this.width = 3;
        this.height = 5;
    }

    update() {
        if (!this.alive) return;

        this.counter += 1;

        // Arch type: vy decreases (goes up then curves)
        if (this.bulletType === 2) {
            this.vy -= 0.5;
        }

        // Swinging x type
        if (this.bulletType === 1) {
            if (this.counter % 2 === 0) {
                this.x += this.vx;
            }
        } else {
            this.x += this.vx;
        }

        this.y += this.vy;

        // Kill if off screen
        if (this.y < -10 || this.y > 110 || this.x < -10 || this.x > 170) {
            this.alive = false;
        }
    }

    getRect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}

class EnemyBullet {
    constructor(x, y, vx, vy, damage, spriteName, ebType = "normal") {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.spriteName = spriteName;
        this.alive = true;
        this.ebType = ebType;  // "normal", "arrow", "aimed", "guided_left", "guided_right"
        this.width = 3;
        this.height = 5;
    }

    update(player) {
        if (!this.alive) return;

        if (this.ebType === "normal") {
            this.y += this.vy;
            this.x += this.vx;
        } else if (this.ebType === "arrow") {
            this.y += 2;
        } else if (this.ebType === "aimed") {
            this.x += this.vx;
            this.y += this.vy;
        } else if (this.ebType === "guided_left") {
            this.y += 1;
            this.x -= 1;
            if (this.x <= player.x - 6) {
                this.ebType = "normal";
                this.vx = 0;
                this.vy = 1;
                this.spriteName = "guided_down";
            }
        } else if (this.ebType === "guided_right") {
            this.y += 1;
            this.x += 1;
            if (this.x >= player.x + 6) {
                this.ebType = "normal";
                this.vx = 0;
                this.vy = 1;
                this.spriteName = "guided_down";
            }
        }

        // Kill if off screen
        if (this.y > 119 || this.y < -10 || this.x < -10 || this.x > 170) {
            this.alive = false;
        }
    }

    getRect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}

class WeaponSystem {
    static HOMING_COOLDOWN = 12;
    static HOMING_DAMAGE = 4;
    static HOMING_SPEED = 3.5;

    constructor() {
        this.playerBullets = [];
        this.enemyBullets = [];
        this.difficulty = DIFF_BEGINNER;
        this.homingCooldown = 0;
        this.homingSide = 0;  // 0 = left, 1 = right
        this.soundCallback = null;
        // Secret weapon state
        this.sniperBeam = null;
        this.blasteryRocketCooldown = 0;
        this.blasteryRocketSide = 0;
        this.chargeLevel = 0;
        this.chargeWasFiring = false;
        this.chargeBeam = null;
        this.drones = [];
    }

    firePlayerWeapon(player, enemies = null) {
        if (!player.canFire()) return;
        if (this.playerBullets.length >= player.numBullets) return;

        const [gx, gy] = player.weaponGunPos();
        const w = player.weaponSelected;
        const dmgMult = player.damageMult || 1.0;
        player.fire();

        // Helper: apply ship damage multiplier (Phoenix gets 1.25×)
        const d = (baseDmg) => Math.ceil(baseDmg * dmgMult);

        // Weapon fire patterns
        if (w === WEAPON_NORMAL) {
            this._addBullet(gx - 1, gy - 5, 0, -4, d(2), "bullet_standard", 0, 3, 10);
        } else if (w === WEAPON_DOUBLE) {
            this._addBullet(gx - 6, gy - 6, 0, -4, d(2), "bullet_standard", 0, 3, 10);
            this._addBullet(gx + 4, gy - 6, 0, -4, d(2), "bullet_standard", 0, 3, 10);
        } else if (w === WEAPON_TRIPLE) {
            this._addBullet(gx - 1, gy - 5, 0, -5, d(2), "bullet_triple", 0, 4, 4);
            this._addBullet(gx - 1, gy - 5, -1.5, -4, d(2), "bullet_triple", 0, 4, 4);
            this._addBullet(gx - 1, gy - 5, 1.5, -4, d(2), "bullet_triple", 0, 4, 4);
        } else if (w === WEAPON_QUAD) {
            this._addBullet(gx - 7, gy - 7, -2, -6, d(2), "bullet_quad", 1, 5, 7);
            this._addBullet(gx - 7, gy - 7, 2, -6, d(2), "bullet_quad", 1, 5, 7);
            this._addBullet(gx + 5, gy - 7, -2, -6, d(2), "bullet_quad", 1, 5, 7);
            this._addBullet(gx + 5, gy - 7, 2, -6, d(2), "bullet_quad", 1, 5, 7);
        } else if (w === WEAPON_DUAL_PLASMA) {
            this._addBullet(gx - 6, gy - 4, 0, -6, d(6), "bullet_plasma", 0, 5, 11);
            this._addBullet(gx + 2, gy - 4, 0, -6, d(6), "bullet_plasma", 0, 5, 11);
        } else if (w === WEAPON_GOLDEN_ARCHES) {
            this._addBullet(gx + 3, gy + 4, 0.5, 2.5, d(10), "bullet_blob", 2, 4, 6);
            this._addBullet(gx - 3, gy + 4, -0.5, 2.5, d(10), "bullet_blob", 2, 4, 6);
        } else if (w === WEAPON_TRIPLE_PLASMA) {
            this._addBullet(gx - 2, gy - 4, 0, -6, d(6), "bullet_plasma", 0, 5, 11);
            this._addBullet(gx - 6, gy - 4, 0, -6, d(6), "bullet_plasma", 0, 5, 11);
            this._addBullet(gx + 2, gy - 4, 0, -6, d(6), "bullet_plasma", 0, 5, 11);
        } else if (w === WEAPON_DELUXE_PLASMA) {
            this._addBullet(gx - 1, gy - 4, -0.5, -9, d(12), "bullet_ultimate", 0, 5, 10);
            this._addBullet(gx + 3, gy - 4, 0.5, -9, d(12), "bullet_ultimate", 0, 5, 10);
            this._addBullet(gx - 3, gy - 4, -2, -9, d(12), "bullet_ultimate", 0, 5, 10);
            this._addBullet(gx + 8, gy - 4, 2, -9, d(12), "bullet_ultimate", 0, 5, 10);
        } else if (w === WEAPON_SNIPER_LASER) {
            // Purple Devil: quad star cannon
            this._addBullet(gx - 7, gy - 7, -2, -6, 3, "bullet_quad", 9, 5, 5);
            this._addBullet(gx - 7, gy - 7, 2, -6, 3, "bullet_quad", 9, 5, 5);
            this._addBullet(gx + 5, gy - 7, -2, -6, 3, "bullet_quad", 9, 5, 5);
            this._addBullet(gx + 5, gy - 7, 2, -6, 3, "bullet_quad", 9, 5, 5);
        } else if (w === WEAPON_BLASTERY) {
            // Double Blastery: 3 fan lasers
            this._fireBlasteryFan(player);
        } else if (w === WEAPON_RED_CHARGE) {
            // Red Bomber: 3 red laser pulses in fan spread (same as Brady's)
            this._fireRedFan(player);
        }

        // Homing missiles: fire alongside any weapon if addon purchased
        if (player.hasHomingMissiles && this.homingCooldown <= 0) {
            this._fireHomingMissile(player, enemies);
        }

        // Double Blastery rockets fire on their own cooldown
        if (w === WEAPON_BLASTERY && this.blasteryRocketCooldown <= 0 && enemies) {
            this._fireBlasteryRocket(player, enemies);
        }
    }

    _fireHomingMissile(player, enemies) {
        if (!enemies || enemies.length === 0) return;

        // Find nearest alive enemy
        let bestDist = Infinity;
        let bestIdx = -1;
        const cx = player.x + player.width / 2;
        const cy = player.y + player.height / 2;

        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (!e.alive || e.y < 0 || e.hp <= 0) continue;
            if (["EXPLODE", "EXPLODE2", "NONE"].includes(e.etype)) continue;

            const dx = (e.x + e.width / 2) - cx;
            const dy = (e.y + e.height / 2) - cy;
            const dist = dx * dx + dy * dy;
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        }

        if (bestIdx < 0) return;

        // Alternate launch side
        const launchX = this.homingSide === 0 ? player.x - 1 : player.x + player.width - 2;
        const launchY = player.y + 1;

        const b = new Bullet(launchX, launchY, 0, -WeaponSystem.HOMING_SPEED,
                             WeaponSystem.HOMING_DAMAGE, "homing_missile", 4);
        b.width = 3;
        b.height = 7;
        b.targetEnemyIdx = bestIdx;
        this.playerBullets.push(b);
        this.homingCooldown = WeaponSystem.HOMING_COOLDOWN;
        this.homingSide = 1 - this.homingSide;
    }

    _fireBlasteryFan(player) {
        const [gx, gy] = player.weaponGunPos();
        this._addBullet(gx - 1, gy - 5, 0, -5, 2, "bullet_standard", 6, 2, 8);
        this._addBullet(gx - 1, gy - 5, -1.5, -4.5, 2, "bullet_standard", 6, 2, 8);
        this._addBullet(gx - 1, gy - 5, 1.5, -4.5, 2, "bullet_standard", 6, 2, 8);
    }

    _fireBlasteryRocket(player, enemies) {
        if (!enemies || enemies.length === 0) return;

        // Find nearest enemy
        let bestDist = Infinity;
        let bestIdx = -1;
        const cx = player.x + player.width / 2;
        const cy = player.y + player.height / 2;

        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (!e.alive || e.y < 0 || e.hp <= 0) continue;
            if ([2, 3, 4].includes(e.etype)) continue;

            const dx = (e.x + e.width / 2) - cx;
            const dy = (e.y + e.height / 2) - cy;
            const dist = dx * dx + dy * dy;
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        }
        if (bestIdx < 0) return;

        // Fire from both sides simultaneously
        for (const sideX of [player.x - 2, player.x + player.width - 1]) {
            const b = new Bullet(sideX, player.y + 2, 0, -WeaponSystem.HOMING_SPEED,
                                 WeaponSystem.HOMING_DAMAGE, "homing_missile", 4);
            b.width = 3;
            b.height = 7;
            b.targetEnemyIdx = bestIdx;
            this.playerBullets.push(b);
        }
        this.blasteryRocketCooldown = 15;
    }

    _fireRedFan(player) {
        // Same damage (2) and angle spread as Brady's _fireBlasteryFan, red laser pulses
        const [gx, gy] = player.weaponGunPos();
        this._addBullet(gx - 1, gy - 5, 0, -5, 2, "bullet_red_pulse", 10, 2, 8);
        this._addBullet(gx - 1, gy - 5, -1.5, -4.5, 2, "bullet_red_pulse", 10, 2, 8);
        this._addBullet(gx - 1, gy - 5, 1.5, -4.5, 2, "bullet_red_pulse", 10, 2, 8);
    }

    _addBullet(x, y, vx, vy, damage, sprite, bulletType = 0, width = 3, height = 5) {
        const b = new Bullet(x, y, vx, vy, damage, sprite, bulletType);
        b.width = width;
        b.height = height;
        this.playerBullets.push(b);
    }

    fireDroneBullets(drones, enemies) {
        if (!enemies || enemies.length === 0) return;

        for (let drone of drones) {
            if ((drone.cooldown || 0) > 0) continue;

            // Find nearest enemy to drone
            let bestDist = Infinity;
            let bestIdx = -1;
            for (let i = 0; i < enemies.length; i++) {
                const e = enemies[i];
                if (!e.alive || e.y < 0 || e.hp <= 0) continue;
                if ([2, 3, 4].includes(e.etype)) continue;

                const dx = (e.x + e.width / 2) - drone.x;
                const dy = (e.y + e.height / 2) - drone.y;
                const d = dx * dx + dy * dy;
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = i;
                }
            }
            if (bestIdx >= 0) {
                const b = new Bullet(drone.x - 1, drone.y - 3, 0, -WeaponSystem.HOMING_SPEED,
                                     WeaponSystem.HOMING_DAMAGE, "homing_missile", 4);
                b.width = 3;
                b.height = 7;
                b.targetEnemyIdx = bestIdx;
                this.playerBullets.push(b);
                drone.cooldown = 20;
            }
        }
    }

    fireSwarmRelease(player, enemies) {
        if (!enemies || enemies.length === 0) return;

        const cx = player.x + player.width / 2;
        const cy = player.y + player.height / 2;

        // 6 swarm drones
        for (let i = 0; i < 6; i++) {
            const angle = -Math.PI / 2 + (i - 2.5) * (Math.PI / 8);
            const vx = Math.cos(angle) * 2.5;
            const vy = Math.sin(angle) * 2.5;

            // Find a target for each drone
            let bestDist = Infinity;
            let bestIdx = -1;
            for (let ei = 0; ei < enemies.length; ei++) {
                const e = enemies[ei];
                if (!e.alive || e.y < 0 || e.hp <= 0) continue;
                if ([2, 3, 4].includes(e.etype)) continue;

                const dx = (e.x + e.width / 2) - cx;
                const dy = (e.y + e.height / 2) - cy;
                const d = dx * dx + dy * dy;
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = ei;
                }
            }

            const b = new Bullet(cx + vx * 2, cy + vy, vx, vy, 8, "swarm_drone", 4);
            b.width = 3;
            b.height = 3;
            b.targetEnemyIdx = bestIdx;
            this.playerBullets.push(b);
        }

        // 4 slime globs
        for (let i = 0; i < 4; i++) {
            const angle = -Math.PI / 2 + (i - 1.5) * (Math.PI / 6);
            const vx = Math.cos(angle) * 1.8;
            const vy = Math.sin(angle) * 1.8 - 0.5;
            const b = new Bullet(cx + vx * 2, cy, vx, vy, 12, "slime_glob", 0);
            b.width = 4;
            b.height = 4;
            this.playerBullets.push(b);
        }

        this._sfx("explosion_large");
    }

    fireEnemyBullet(x, y, player, bulletType = "normal", damage = 1, sprite = "enemy_bullet") {
        if (this.enemyBullets.length >= 16) return;  // MAX_ENEMY_BULLETS

        let eb;
        if (bulletType === "normal") {
            eb = new EnemyBullet(x, y, 0, 1, damage, sprite, "normal");
        } else if (bulletType === "arrow") {
            eb = new EnemyBullet(x, y, 0, 2, damage, sprite, "arrow");
        } else if (bulletType === "aimed") {
            const dx = player.x - x;
            const dy = player.y - y;
            const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const speed = 2.0;
            eb = new EnemyBullet(x, y, speed * dx / dist, speed * dy / dist, damage, "bubble", "aimed");
        } else if (bulletType === "guided_left") {
            eb = new EnemyBullet(x, y, -1, 1, damage, "guided_left", "guided_left");
        } else if (bulletType === "guided_right") {
            eb = new EnemyBullet(x, y, 1, 1, damage, "guided_right", "guided_right");
        } else {
            eb = new EnemyBullet(x, y, 0, 1, damage, sprite, "normal");
        }

        this.enemyBullets.push(eb);
    }

    fireEnemyAimed(x, y, player, damage = 1, sprite = "bubble", speed = 2.0) {
        const dx = player.x + 4 - x;
        const dy = player.y + 3 - y;
        if (dy <= 0) return;

        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const vx = speed * dx / dist;
        const vy = speed * dy / dist;

        if (this.enemyBullets.length < 16) {
            const eb = new EnemyBullet(x, y, vx, vy, damage, sprite, "aimed");
            this.enemyBullets.push(eb);
        }
    }

    // ASM aim_bomb: On Expert, bombs/missiles track toward player (±1 vx if >5px away)
    _aimBomb(bx, player) {
        if (this.difficulty !== DIFF_EXPERT || !player) return 0;
        const dx = player.x - bx;
        if (dx > 5) return 1;
        if (dx < -5) return -1;
        return 0;
    }

    fireEnemyBomb(x, y, damage = 1, player = null) {
        if (this.enemyBullets.length < 16) {
            const bx = x + 3;
            const vx = this._aimBomb(bx, player);
            const eb = new EnemyBullet(bx, y + 8, vx, 1, damage, "enemy_bomb", "normal");
            this.enemyBullets.push(eb);
        }
    }

    fireEnemyMissile(x, y, player = null) {
        if (this.enemyBullets.length < 16) {
            const bx = x + 3;
            const vx = this._aimBomb(bx, player);
            const eb = new EnemyBullet(bx, y + 8, vx, 2, 1, "missile", "arrow");
            this.enemyBullets.push(eb);
        }
    }

    fireEnemyGuided(x, y, player) {
        if (player.x > x + 4) {
            this.fireEnemyBullet(x + 2, y + 3, player, "guided_right", 1, "guided_right");
        } else {
            this.fireEnemyBullet(x + 2, y + 3, player, "guided_left", 1, "guided_left");
        }
    }

    deployCash(x, y, value = 50) {
        if (this.enemyBullets.length >= 16) return;

        let sprite;
        if (value <= ECONOMY.cashSpriteSmallMax) sprite = "cash_small";
        else if (value <= ECONOMY.cashSpriteMediumMax) sprite = "cash_medium";
        else sprite = "cash_large";

        const eb = new EnemyBullet(x + 3, y + 8, 0, 1, -value, sprite, "normal");
        this.enemyBullets.push(eb);
    }

    update(player, enemies = null) {
        // Tick homing missile cooldown
        if (this.homingCooldown > 0) this.homingCooldown -= 1;

        // Secret weapon cooldowns
        if (this.blasteryRocketCooldown > 0) this.blasteryRocketCooldown -= 1;

        // Sniper beam lifetime
        if (this.sniperBeam) {
            this.sniperBeam.life -= 1;
            if (this.sniperBeam.life <= 0) this.sniperBeam = null;
        }

        // Charge beam lifetime
        if (this.chargeBeam) {
            this.chargeBeam.life -= 1;
            if (this.chargeBeam.life <= 0) this.chargeBeam = null;
        }

        // Red Bomber: no charge buildup - static beam weapon
        // (charge mechanic removed, beam is always consistent)

        // Beam bullets (type 5, 7) are instant-hit: kill them after 1 frame
        for (let b of this.playerBullets) {
            if (b.alive && (b.bulletType === 5 || b.bulletType === 7)) {
                b.alive = false;
            }
        }

        // Update smart bombs (bullet_type == 3)
        for (let b of this.playerBullets) {
            if (b.alive && b.bulletType === 3 && enemies) {
                const idx = b.targetEnemyIdx;
                if (idx >= 0 && idx < enemies.length && enemies[idx].alive) {
                    const target = enemies[idx];
                    const dx = target.x + target.width / 2 - b.x;
                    const dy = target.y + target.height / 2 - b.y;
                    if (dy >= 0) {
                        b.vy = -5;
                    } else {
                        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                        const speed = 5;
                        if (Math.abs(dx) * 3 > Math.abs(dy) * 4) {
                            b.vx = dx < 0 ? -4 : 4;
                            b.vy = -3;
                        } else {
                            b.vx = speed * dx / dist;
                            b.vy = speed * dy / dist;
                        }
                    }
                } else {
                    b.vy = -5;
                    b.vx = 0;
                }
            }
        }

        // Update homing missiles (bullet_type == 4)
        for (let b of this.playerBullets) {
            if (b.alive && b.bulletType === 4 && enemies) {
                let idx = b.targetEnemyIdx;
                const targetAlive = (idx >= 0 && idx < enemies.length &&
                                     enemies[idx].alive && enemies[idx].hp > 0);
                if (!targetAlive) {
                    // Retarget to nearest enemy
                    let bestDist = Infinity;
                    let bestIdx = -1;
                    for (let i = 0; i < enemies.length; i++) {
                        const e = enemies[i];
                        if (e.alive && e.hp > 0 && e.y >= 0 && ![2, 3, 4].includes(e.etype)) {
                            const dx = (e.x + e.width / 2) - b.x;
                            const dy = (e.y + e.height / 2) - b.y;
                            const d = dx * dx + dy * dy;
                            if (d < bestDist) {
                                bestDist = d;
                                bestIdx = i;
                            }
                        }
                    }
                    b.targetEnemyIdx = bestIdx;
                    idx = bestIdx;
                }

                if (idx >= 0 && idx < enemies.length && enemies[idx].alive) {
                    const target = enemies[idx];
                    const dx = (target.x + target.width / 2) - b.x;
                    const dy = (target.y + target.height / 2) - b.y;
                    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                    // Gradual turn toward target
                    const turnRate = 0.15;
                    const desiredVx = WeaponSystem.HOMING_SPEED * dx / dist;
                    const desiredVy = WeaponSystem.HOMING_SPEED * dy / dist;
                    b.vx += (desiredVx - b.vx) * turnRate;
                    b.vy += (desiredVy - b.vy) * turnRate;
                    // Normalize speed
                    const curSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                    if (curSpeed > 0) {
                        b.vx = b.vx / curSpeed * WeaponSystem.HOMING_SPEED;
                        b.vy = b.vy / curSpeed * WeaponSystem.HOMING_SPEED;
                    }
                }
            }
        }

        // Update all bullets
        for (let b of this.playerBullets) b.update();
        for (let eb of this.enemyBullets) eb.update(player);

        // Remove dead
        this.playerBullets = this.playerBullets.filter(b => b.alive);
        this.enemyBullets = this.enemyBullets.filter(eb => eb.alive);
    }

    _sfx(name) {
        if (this.soundCallback) {
            this.soundCallback(name);
        }
    }

    checkCollisions(player, enemies) {
        // Player bullets vs enemies
        for (let b of this.playerBullets) {
            if (!b.alive) continue;
            const bRect = b.getRect();
            for (let e of enemies) {
                if (!e.alive || e.y < 0) continue;
                const eRect = e.getRect();
                if (this._rectsCollide(bRect, eRect)) {
                    const wasAlive = e.hp > 0;
                    e.takeDamage(b.damage, this);
                    if (wasAlive && e.hp <= 0) {
                        if (e.width >= 15) {
                            this._sfx("explosion_large");
                        } else {
                            this._sfx("explosion_small");
                        }
                    }
                    if (b.bulletType !== 3) {  // smart bombs don't die on hit
                        b.alive = false;
                    }
                    break;
                }
            }
        }

        // Enemy bullets vs player (dragon intercepts first)
        if (player.alive) {
            const pRect = player.getRect();
            const dRect = player.getDragonRect();
            for (let eb of this.enemyBullets) {
                if (!eb.alive) continue;
                const ebRect = eb.getRect();

                // Dragon intercepts bullets before they reach the player
                if (dRect && eb.damage > 0 && this._rectsCollide(ebRect, dRect)) {
                    player.dragonTakeDamage(eb.damage);
                    eb.alive = false;
                    this._sfx("hit");
                    continue;
                }

                if (this._rectsCollide(ebRect, pRect)) {
                    if (eb.damage < 0) {
                        // Cash pickup
                        player.addCash(-eb.damage);
                        this._sfx("cash");
                    } else {
                        player.takeDamage(eb.damage);
                        if (player.alive) {
                            this._sfx("hit");
                        } else {
                            this._sfx("death");
                        }
                    }
                    eb.alive = false;
                }
            }
        }
    }

    _rectsCollide(r1, r2) {
        return r1.x < r2.x + r2.width &&
               r1.x + r1.width > r2.x &&
               r1.y < r2.y + r2.height &&
               r1.y + r1.height > r2.y;
    }

    draw(ctx, spriteMgr, scale = SCALE) {
        // Draw normal bullets (skip beam types which are invisible after 1 frame)
        for (let b of this.playerBullets) {
            if (b.alive && ![5, 7].includes(b.bulletType)) {
                if (b.bulletType === 6) {
                    // Blastery fan lasers (Brady — green/yellow)
                    this._drawBlasteryLaser(ctx, b, scale);
                } else if (b.bulletType === 10) {
                    // Red laser pulses (Caleb)
                    this._drawRedLaserPulse(ctx, b, scale);
                } else if (b.bulletType === 9) {
                    // Star bullets
                    this._drawStarBullet(ctx, b, scale);
                } else {
                    const sprite = spriteMgr.get(b.spriteName);
                    if (sprite) {
                        ctx.drawImage(sprite, Math.floor(b.x * scale), Math.floor(b.y * scale));
                    }
                }
            }
        }

        // Draw sniper beam (Purple Devil)
        if (this.sniperBeam) {
            this._drawSniperBeam(ctx, scale);
        }

        // Draw charge beam (Red Bomber)
        if (this.chargeBeam) {
            this._drawChargeBeam(ctx, scale);
        }

        // Draw enemy bullets
        for (let eb of this.enemyBullets) {
            if (eb.alive) {
                const sprite = spriteMgr.get(eb.spriteName);
                if (sprite) {
                    ctx.drawImage(sprite, Math.floor(eb.x * scale), Math.floor(eb.y * scale));
                }
            }
        }
    }

    _drawSniperBeam(ctx, scale) {
        const beam = this.sniperBeam;
        if (!beam) return;

        const x = Math.floor(beam.x * scale);
        const yBot = Math.floor(beam.y * scale);
        const lifeFrac = beam.life / 4.0;
        const alpha = Math.floor(220 * lifeFrac);

        if (beam.triple) {
            // Triple purple continuous laser streams
            const colors = beam.colors;
            const beamW = Math.max(2, scale);

            // Center beam
            ctx.globalAlpha = alpha / 255;
            ctx.fillStyle = `rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]})`;
            ctx.fillRect(x - Math.floor(beamW / 2), 0, beamW, yBot);

            // Bright core
            const coreW = Math.max(1, Math.floor(scale / 2));
            ctx.globalAlpha = Math.min(255, alpha + 40) / 255;
            ctx.fillStyle = `rgb(${colors[1][0]}, ${colors[1][1]}, ${colors[1][2]})`;
            ctx.fillRect(x - Math.floor(coreW / 2), 0, coreW, yBot);

            // Left and right beams (angled)
            const spread = Math.floor(5 * scale);
            ctx.globalAlpha = 0.8 * alpha / 255;
            for (let yy = 0; yy < yBot; yy += Math.max(1, scale)) {
                const fracY = yy / Math.max(1, yBot);
                const lx = x - Math.floor(spread * (1 - fracY));
                const rx = x + Math.floor(spread * (1 - fracY));
                ctx.fillStyle = `rgb(${colors[2][0]}, ${colors[2][1]}, ${colors[2][2]})`;
                ctx.fillRect(lx, yy, beamW, Math.max(1, scale));
                ctx.fillRect(rx, yy, beamW, Math.max(1, scale));
            }
            ctx.globalAlpha = 1;
        }
    }

    _drawBlasteryLaser(ctx, b, scale) {
        const bx = Math.floor(b.x * scale);
        const by = Math.floor(b.y * scale);
        const h = Math.floor(b.height * scale);
        const w = Math.max(scale, Math.floor(b.width * scale));

        // Outer glow (green)
        ctx.globalAlpha = 100 / 255;
        ctx.fillStyle = "rgb(80, 255, 80)";
        ctx.fillRect(bx - scale, by, w + scale * 2, h);

        // Inner core (yellow)
        ctx.globalAlpha = 200 / 255;
        ctx.fillStyle = "rgb(255, 255, 60)";
        ctx.fillRect(bx - Math.floor(scale / 2), by, w + scale, h);

        // Bright center (white-yellow)
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgb(255, 255, 200)";
        ctx.fillRect(bx, by, w, h);
    }

    _drawRedLaserPulse(ctx, b, scale) {
        const bx = Math.floor(b.x * scale);
        const by = Math.floor(b.y * scale);
        const h = Math.floor(b.height * scale);
        const w = Math.max(scale, Math.floor(b.width * scale));

        // Outer glow (dark red)
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = "rgb(255, 0, 0)";
        ctx.fillRect(bx - scale, by, w + scale * 2, h);

        // Inner body (bright red)
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "rgb(230, 20, 20)";
        ctx.fillRect(bx - Math.floor(scale / 2), by, w + scale, h);

        // Sharp bright center (pure red)
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgb(255, 50, 50)";
        ctx.fillRect(bx, by, w, h);
    }

    _drawStarBullet(ctx, b, scale) {
        const bx = Math.floor(b.x * scale) + Math.floor(b.width * scale / 2);
        const by = Math.floor(b.y * scale) + Math.floor(b.height * scale / 2);

        // Color cycles based on bullet's counter
        const phase = b.counter * 0.4;
        const colors = [
            [255, 100, 180],  // pink
            [200, 60, 220],   // purple
            [100, 80, 255],   // blue
        ];
        const idx = Math.floor(phase) % colors.length;
        const nextIdx = (idx + 1) % colors.length;
        const t = phase % 1.0;
        const c = colors[idx];
        const nc = colors[nextIdx];
        const r = Math.floor(c[0] + (nc[0] - c[0]) * t);
        const g = Math.floor(c[1] + (nc[1] - c[1]) * t);
        const bl = Math.floor(c[2] + (nc[2] - c[2]) * t);

        // Star radius
        const outerR = Math.max(3, Math.floor(2.5 * scale));
        const innerR = Math.max(1, Math.floor(outerR / 2));

        // Build star polygon (5-pointed)
        const points = [];
        const rot = -Math.PI / 2 + b.counter * 0.15;
        for (let i = 0; i < 10; i++) {
            const angle = rot + i * (Math.PI / 5);
            const rad = i % 2 === 0 ? outerR : innerR;
            points.push([
                bx + Math.floor(Math.cos(angle) * rad),
                by + Math.floor(Math.sin(angle) * rad)
            ]);
        }

        // Draw glow behind star
        ctx.globalAlpha = 60 / 255;
        ctx.fillStyle = `rgb(${r}, ${g}, ${bl})`;
        ctx.beginPath();
        ctx.arc(bx, by, outerR + Math.floor(scale / 2), 0, Math.PI * 2);
        ctx.fill();

        // Draw star
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgb(${r}, ${g}, ${bl})`;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.closePath();
        ctx.fill();

        // Bright center dot
        ctx.fillStyle = "rgb(255, 220, 255)";
        ctx.beginPath();
        ctx.arc(bx, by, Math.max(1, Math.floor(innerR / 2)), 0, Math.PI * 2);
        ctx.fill();
    }

    _drawChargeBeam(ctx, scale) {
        const beam = this.chargeBeam;
        if (!beam) return;

        // Track player's current position for smooth beam movement
        const x = beam.playerRef ? Math.floor((beam.playerRef.x + beam.playerRef.weaponXOffset) * scale) : Math.floor(beam.x * scale);
        const yBot = beam.playerRef ? Math.floor(beam.playerRef.y * scale) : Math.floor(beam.y * scale);
        const w = Math.floor(beam.w * scale);
        const lifeFrac = beam.life / 6.0;
        const alpha = Math.floor(255 * lifeFrac);

        // Outer glow (dark red)
        ctx.globalAlpha = Math.max(20, Math.floor(alpha / 3)) / 255;
        ctx.fillStyle = "rgb(255, 40, 20)";
        ctx.fillRect(x - w / 2 - scale * 2, 0, w + scale * 4, yBot);

        // Inner beam (bright red)
        ctx.globalAlpha = Math.max(40, alpha) / 255;
        ctx.fillStyle = "rgb(255, 80, 40)";
        ctx.fillRect(x - w / 2 - scale, 0, w + scale * 2, yBot);

        // Core (orange-white)
        ctx.globalAlpha = alpha / 255;
        ctx.fillStyle = "rgb(255, 200, 150)";
        ctx.fillRect(x - w / 2, 0, w, yBot);

        ctx.globalAlpha = 1;
    }

    detonateBomb(enemies) {
        let hitAny = false;

        // Damage all on-screen enemies
        for (let e of enemies) {
            if (e.alive && e.y >= 0 && !["EXPLODE", "EXPLODE2", "NONE"].includes(e.etype)) {
                e.takeDamage(30, this);  // BOMB_DAMAGE = 30
                hitAny = true;
            }
        }

        // Destroy all enemy bullets (except cash drops)
        for (let eb of this.enemyBullets) {
            if (eb.alive && eb.damage > 0) {
                eb.alive = false;
                hitAny = true;
            }
        }

        if (hitAny) {
            this._sfx("explosion_large");
        }
        return hitAny;
    }

    clear() {
        this.playerBullets = [];
        this.enemyBullets = [];
        this.homingCooldown = 0;
        this.homingSide = 0;
        this.sniperBeam = null;
        this.chargeBeam = null;
        this.blasteryRocketCooldown = 0;
        this.chargeLevel = 0;
    }
}
