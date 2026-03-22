/**
 * Phoenix Web Port - Player ship handling
 * Ported from player.py
 */

class Player {
    constructor() {
        this.shipType = SHIP_SIGMA;
        this.x = 80.0;
        this.y = 100.0;
        this.shield = MAX_SHIELD;
        this.armor = 0;
        this.speed = 2;
        this.width = 13;
        this.height = 8;
        this.weaponXOffset = 6;
        this.weaponSelected = WEAPON_NORMAL;
        this.weaponsAvailable = 0b00000001; // bit mask, bit 0 = normal
        this.fireDelay = FIRE_DELAY_NORMAL;
        this.fireDelayNormal = 4;  // frames between auto-fire shots
        this.fireDelayRapid = 1;   // ~10 shots/sec
        this.fireCooldown = 0;
        this.cash = 0;
        this.numBullets = INITIAL_BULLETS;
        this.specialWeaponDelay = 0;
        this.hasHomingMissiles = false;
        this.bombs = INITIAL_BOMBS;
        this.alive = true;
        this.spriteName = "player_sigma";
        this.drones = [];  // Red Bomber companion drones

        // Rainbow dragon protector (Purple Devil / Elise)
        this.dragonAlive = false;
        this.dragonHp = 0;
        this.dragonMaxHp = 0;
        this.dragonBob = 0;           // gentle hover bob counter
        this.dragonDeathTimer = 0;    // sparkle death animation frames
        this.dragonSparkles = [];     // death sparkle particles

        // Purple Devil wing-open ability
        this.wingsOpen = false;
        this.wingsOpenTimer = 0;
        this.wingsCooldown = 0;
        this.wingsSwarmFired = false;

        // Double Blastery mega laser bomb (Brady)
        this.megaCharge = 0;
        this.megaChargeMax = 600;     // ~20 seconds at 30fps to fully charge
        this.megaReady = false;
        this.megaActive = false;
        this.megaTimer = 0;
        this.megaOrigin = [0, 0];
        this.megaBeams = [];
        this.megaRings = [];
        this.megaFlash = 0;
        this.megaParticles = [];

        // Score tracking
        this.kills = 0;

        // Visual feedback
        this.hitParticles = [];
        this.blinkCounter = 0;
        this.cheated = false;
    }

    loadShip() {
        const defs = SHIP_DEFS[this.shipType];
        this.width = defs.width;
        this.height = defs.height;
        this.armor = defs.armor;
        this.weaponXOffset = defs.weapon_x;
        this.speed = defs.speed;

        const shipSprites = {
            [SHIP_SIGMA]: "player_sigma",
            [SHIP_HEAVY_DESTROYER]: "player_heavy_destroyer",
            [SHIP_PHOENIX]: "player_phoenix",
            [SHIP_PURPLE_DEVIL]: "player_purple_devil",
            [SHIP_DOUBLE_BLASTERY]: "player_double_blastery",
            [SHIP_RED_BOMBER]: "player_red_bomber",
        };
        this.spriteName = shipSprites[this.shipType] || "player_sigma";

        // Red Bomber: initialize companion drones
        if (this.shipType === SHIP_RED_BOMBER) {
            this.drones = [
                {
                    x: this.x - 6, y: this.y + 2,
                    offsetX: -6, offsetY: 2,
                    cooldown: 0, bob: 0
                },
                {
                    x: this.x + this.width + 3, y: this.y + 2,
                    offsetX: this.width + 3, offsetY: 2,
                    cooldown: 0, bob: 0
                },
            ];
        } else {
            this.drones = [];
        }
    }

    newShip() {
        this.shield = MAX_SHIELD;
        this.loadShip();
    }

    takeDamage(amount) {
        // Reset mega charge on any hit (Brady and Caleb)
        if (this.shipType === SHIP_DOUBLE_BLASTERY || this.shipType === SHIP_RED_BOMBER) {
            this.megaCharge = 0;
            this.megaReady = false;
        }

        // Spawn small debris particles from the ship
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const numParticles = Math.min(8, 3 + amount);
        for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const speed = Math.random() * (1.5 - 0.4) + 0.4;
            this.hitParticles.push({
                x: cx + (Math.random() * 4 - 2),
                y: cy + (Math.random() * 4 - 2),
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed - 0.3,
                life: Math.floor(Math.random() * 16 + 10),
                size: Math.random() < 0.75 ? 1 : 2,
            });
        }

        for (let i = 0; i < amount + 1; i++) {
            this.shield -= 1;
            if (this.shield < 0) {
                if (this.armor > 0) {
                    this.armor -= 1;
                    this.shield = 0;
                } else {
                    this.alive = false;
                    return true;
                }
            }
        }
        return false;
    }

    initDragon() {
        this.dragonAlive = true;
        this.dragonMaxHp = Math.max(2, Math.floor(this.shield / 4));
        this.dragonHp = this.dragonMaxHp;
        this.dragonBob = 0;
        this.dragonDeathTimer = 0;
        this.dragonSparkles = [];
    }

    getDragonPos() {
        if (!this.dragonAlive) {
            return [null, null];
        }
        const cx = this.x + this.width / 2;
        const bob = Math.sin(this.dragonBob * 0.06) * 1.5;
        const dx = cx - 6.5;
        const dy = this.y - 9 + bob;
        return [dx, dy];
    }

    getDragonRect() {
        const [dx, dy] = this.getDragonPos();
        if (dx === null) return null;
        return { x: dx, y: dy, width: 13, height: 7 };
    }

    dragonTakeDamage(amount) {
        if (!this.dragonAlive) return false;
        this.dragonHp -= amount;
        if (this.dragonHp <= 0) {
            this.dragonAlive = false;
            this.dragonDeathTimer = 40;
            // Spawn rainbow sparkle particles
            const [dx, dy] = this.getDragonPos();
            if (dx !== null) {
                const rainbow = [
                    [255, 80, 80], [255, 180, 50], [255, 255, 80],
                    [80, 255, 80], [80, 180, 255], [200, 120, 255], [255, 150, 200]
                ];
                for (let i = 0; i < 20; i++) {
                    const angle = Math.random() * 2 * Math.PI;
                    const speed = Math.random() * (2.0 - 0.5) + 0.5;
                    this.dragonSparkles.push({
                        x: dx + 6.5 + (Math.random() * 4 - 2),
                        y: dy + 3.5 + (Math.random() * 4 - 2),
                        dx: Math.cos(angle) * speed,
                        dy: Math.sin(angle) * speed,
                        color: rainbow[i % rainbow.length],
                        life: Math.floor(Math.random() * 21 + 15),
                    });
                }
            }
        }
        return true;
    }

    addCash(amount) {
        this.cash = Math.min(this.cash + amount, 25000);
    }

    update(keys) {
        if (!this.alive) return;

        let dx = 0, dy = 0;
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx = -this.speed;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) dx = this.speed;
        if (keys['ArrowUp'] || keys['w'] || keys['W']) dy = -this.speed;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) dy = this.speed;

        this.x += dx;
        this.y += dy;

        // Clamp to playable area
        this.x = Math.max(PLAYER_MIN_X, Math.min(PLAYER_MAX_X - this.width + 1, this.x));
        this.y = Math.max(PLAYER_MIN_Y, Math.min(PLAYER_MAX_Y - this.height + 1, this.y));

        // Fire cooldown
        if (this.fireCooldown > 0) this.fireCooldown -= 1;

        // Special weapon cooldown
        if (this.specialWeaponDelay > 0) this.specialWeaponDelay -= 1;

        // Purple Devil wing-open ability (random timer)
        if (this.shipType === SHIP_PURPLE_DEVIL) {
            if (this.wingsOpen) {
                this.wingsOpenTimer -= 1;
                if (this.wingsOpenTimer <= 0) {
                    this.wingsOpen = false;
                    this.wingsSwarmFired = false;
                    this.spriteName = "player_purple_devil";
                    this.wingsCooldown = Math.floor(Math.random() * 391 + 360);
                }
            } else if (this.wingsCooldown > 0) {
                this.wingsCooldown -= 1;
            } else {
                this.wingsOpen = true;
                this.wingsOpenTimer = 45;
                this.wingsSwarmFired = false;
                this.spriteName = "player_purple_devil_open";
            }
        }

        // Update dragon protector hover
        if (this.dragonAlive) this.dragonBob += 1;

        // Update dragon death sparkles
        if (this.dragonDeathTimer > 0) {
            this.dragonDeathTimer -= 1;
            for (let sp of this.dragonSparkles) {
                sp.x += sp.dx;
                sp.y += sp.dy;
                sp.life -= 1;
            }
            this.dragonSparkles = this.dragonSparkles.filter(s => s.life > 0);
        }

        // Mega weapon charge (Brady's laser bomb / Caleb's split beam)
        if ((this.shipType === SHIP_DOUBLE_BLASTERY || this.shipType === SHIP_RED_BOMBER) && !this.megaActive) {
            if (!this.megaReady) {
                this.megaCharge = Math.min(this.megaCharge + 1, this.megaChargeMax);
                if (this.megaCharge >= this.megaChargeMax) {
                    this.megaReady = true;
                }
            }
        }

        // Update mega explosion animation
        if (this.megaActive) {
            this.megaTimer += 1;
            this.megaFlash = Math.max(0, this.megaFlash - 8);

            // Expand rings
            for (let ring of this.megaRings) {
                ring.r += ring.speed;
                ring.alpha = Math.max(0, ring.alpha - 5);
            }
            this.megaRings = this.megaRings.filter(r => r.alpha > 0);

            // Beams grow and fade
            for (let beam of this.megaBeams) {
                beam.length += beam.grow;
                beam.alpha = Math.max(0, beam.alpha - 5);
            }
            this.megaBeams = this.megaBeams.filter(b => b.alpha > 0);

            // Update particles
            for (let p of this.megaParticles) {
                p.x += p.dx;
                p.y += p.dy;
                p.dy += 0.02;
                p.life -= 1;
            }
            this.megaParticles = this.megaParticles.filter(p => p.life > 0);

            // Rainbow rings every 4 frames for first 30 frames
            if (this.megaTimer <= 30 && this.megaTimer % 4 === 0) {
                const rainbow = [
                    [255, 40, 40], [255, 160, 40], [255, 255, 40], [40, 255, 40],
                    [40, 200, 255], [100, 80, 255], [255, 80, 200]
                ];
                const c = rainbow[(this.megaTimer / 4) % rainbow.length];
                this.megaRings.push({
                    r: 2.0,
                    speed: 3.0 + this.megaTimer * 0.02,
                    color: c,
                    alpha: 200,
                    width: 2,
                });
            }

            // Second burst of beams at frame 10
            if (this.megaTimer === 10) {
                const rainbow = [
                    [255, 120, 40], [255, 255, 100], [40, 255, 180],
                    [80, 140, 255], [200, 60, 255], [255, 60, 150]
                ];
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 12) + i * (Math.PI * 2 / 6);
                    const c = rainbow[i % rainbow.length];
                    this.megaBeams.push({
                        angle: angle,
                        length: 5,
                        grow: 4.0,
                        color: c,
                        alpha: 180,
                        width: 2,
                    });
                }
            }

            // Two bursts of particles — frame 1 and frame 12
            if (this.megaTimer === 1 || this.megaTimer === 12) {
                const rainbow = [
                    [255, 80, 80], [255, 180, 50], [255, 255, 80],
                    [80, 255, 80], [80, 180, 255], [200, 120, 255], [255, 150, 200]
                ];
                const [ox, oy] = this.megaOrigin;
                const count = this.megaTimer === 1 ? 16 : 10;
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * 2 * Math.PI;
                    const speed = Math.random() * (3.0 - 1.0) + 1.0;
                    this.megaParticles.push({
                        x: ox + (Math.random() * 4 - 2),
                        y: oy + (Math.random() * 4 - 2),
                        dx: Math.cos(angle) * speed,
                        dy: Math.sin(angle) * speed,
                        color: rainbow[i % rainbow.length],
                        life: Math.floor(Math.random() * 21 + 15),
                        size: [1, 2, 2, 3][Math.floor(Math.random() * 4)],
                    });
                }
            }

            // End when everything fades out
            if (this.megaTimer > 55 && this.megaRings.length === 0 &&
                this.megaBeams.length === 0 && this.megaParticles.length === 0) {
                this.megaActive = false;
            }
        }

        // Update companion drones (Red Bomber)
        for (let drone of this.drones) {
            drone.bob = (drone.bob + 1) % 60;
            const bobY = Math.sin(drone.bob * Math.PI / 30) * 1.5;
            const targetX = this.x + drone.offsetX;
            const targetY = this.y + drone.offsetY + bobY;
            drone.x += (targetX - drone.x) * 0.2;
            drone.y += (targetY - drone.y) * 0.2;
            if (drone.cooldown > 0) drone.cooldown -= 1;
        }
    }

    canFire() {
        return this.fireCooldown <= 0 && this.alive;
    }

    fire() {
        this.fireCooldown = Math.abs(this.fireDelay);
    }

    weaponGunPos() {
        return [this.x + this.weaponXOffset, this.y];
    }

    selectWeapon(weaponIdx) {
        if (weaponIdx < 8 && ((this.weaponsAvailable >> weaponIdx) & 1)) {
            this.weaponSelected = weaponIdx;
        }
    }

    fireMegaBomb() {
        if (!this.megaReady || this.megaActive) return false;
        this.megaReady = false;
        this.megaCharge = 0;
        this.megaActive = true;
        this.megaTimer = 0;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        this.megaOrigin = [cx, cy];
        this.megaFlash = 200;
        this.megaBeams = [];
        this.megaRings = [];
        this.megaParticles = [];

        // 12 laser beams radiating outward
        const rainbow = [
            [255, 40, 40], [255, 120, 40], [255, 255, 40], [40, 255, 40],
            [40, 255, 200], [40, 200, 255], [80, 80, 255], [200, 40, 255],
            [255, 40, 200], [255, 255, 255], [255, 200, 100], [100, 255, 100]
        ];
        for (let i = 0; i < 12; i++) {
            const angle = i * (Math.PI * 2 / 12);
            const c = rainbow[i % rainbow.length];
            this.megaBeams.push({
                angle: angle,
                length: 3,
                grow: 4.5,
                color: c,
                alpha: 220,
                width: 2,
            });
        }

        // Two initial rings
        this.megaRings.push({
            r: 1.0,
            speed: 3.5,
            color: [255, 255, 255],
            alpha: 220,
            width: 3,
        });
        this.megaRings.push({
            r: 1.0,
            speed: 2.0,
            color: [255, 80, 200],
            alpha: 200,
            width: 2,
        });
        return true;
    }

    getRect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    reset() {
        this.alive = true;
        this.shield = MAX_SHIELD;
        this.x = 80.0;
        this.y = 100.0;
        this.fireCooldown = 0;
        this.hitParticles = [];
        this.blinkCounter = 0;
        this.dragonAlive = false;
        this.dragonSparkles = [];
        this.dragonDeathTimer = 0;
        this.wingsOpen = false;
        this.wingsOpenTimer = 0;
        this.wingsCooldown = 0;
        this.wingsSwarmFired = false;
        this.megaCharge = 0;
        this.megaReady = false;
        this.megaActive = false;
        this.megaBeams = [];
        this.megaRings = [];
        this.megaParticles = [];
        this.megaFlash = 0;
    }

    draw(ctx, spriteMgr, scale = SCALE) {
        if (!this.alive) {
            this._drawHitParticles(ctx, spriteMgr, scale);
            return;
        }

        this.blinkCounter += 1;

        const sprite = spriteMgr.get(this.spriteName);
        const px = Math.floor(this.x * scale);
        const py = Math.floor(this.y * scale);

        // Low shield warning: ship blinks subtly when shields <= 5
        if (this.shield <= 5 && this.shield > 0) {
            const blinkRate = Math.max(4, this.shield * 3);
            if (Math.floor(this.blinkCounter / blinkRate) % 5 === 0) {
                this._drawHitParticles(ctx, spriteMgr, scale);
                return;
            }
        }

        if (sprite) ctx.drawImage(sprite, px, py);

        // Mega weapon charge shimmer (Brady and Caleb)
        if ((this.shipType === SHIP_DOUBLE_BLASTERY || this.shipType === SHIP_RED_BOMBER) && !this.megaActive) {
            this._drawMegaChargeEffect(ctx, px, py, sprite, scale);
        }

        // Draw rainbow dragon protector (Purple Devil / Elise)
        this._drawDragon(ctx, spriteMgr, scale);

        // Draw companion drones (Red Bomber)
        for (let drone of this.drones) {
            const droneSprite = spriteMgr.get("drone");
            if (droneSprite) {
                const dx = Math.floor(drone.x * scale);
                const dy = Math.floor(drone.y * scale);
                ctx.drawImage(droneSprite, dx, dy);
            }
        }

        // Draw hit debris particles on top
        this._drawHitParticles(ctx, spriteMgr, scale);

        // Draw mega explosion on top of everything
        if (this.megaActive) {
            this._drawMegaExplosion(ctx, scale);
        }
    }

    _drawMegaChargeEffect(ctx, px, py, sprite, scale) {
        if (!sprite) return;

        const sw = sprite.width;
        const sh = sprite.height;
        const cx = px + sw / 2;
        const cy = py + sh / 2;
        const frac = this.megaCharge / Math.max(1, this.megaChargeMax);

        // Charge bar (always visible)
        if (frac > 0 || this.megaReady) {
            const barW = sw;
            const barH = Math.max(2, Math.floor(scale / 2));
            const barX = px;
            const barY = py + sh + scale;

            // Background
            ctx.fillStyle = "rgb(20, 20, 30)";
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

            const curFrac = this.megaReady ? 1.0 : frac;
            const fillW = Math.max(0, Math.floor(barW * curFrac));

            if (this.megaReady) {
                // Rainbow cycling bar
                const phase = this.blinkCounter * 0.15;
                const rainbow = [
                    "rgb(255,40,40)", "rgb(255,160,40)", "rgb(255,255,40)", "rgb(40,255,40)",
                    "rgb(40,200,255)", "rgb(100,80,255)", "rgb(255,80,200)"
                ];
                ctx.fillStyle = rainbow[Math.floor(phase) % rainbow.length];
                ctx.fillRect(barX, barY, fillW, barH);
            } else {
                // Blue-to-white gradient
                const r = Math.floor(40 + 215 * frac);
                const g = Math.floor(80 + 175 * frac);
                ctx.fillStyle = `rgb(${r}, ${g}, 255)`;
                ctx.fillRect(barX, barY, fillW, barH);
            }
        }

        // Visual effects at higher charge levels
        if (this.megaReady) {
            const rainbow = [
                "rgb(255,40,40)", "rgb(255,160,40)", "rgb(255,255,40)", "rgb(40,255,40)",
                "rgb(40,200,255)", "rgb(100,80,255)", "rgb(255,80,200)"
            ];
            const phase = this.blinkCounter * 0.15;
            const idx = Math.floor(phase) % rainbow.length;
            const pulse = 0.5 + 0.5 * Math.abs(Math.sin(this.blinkCounter * 0.12));

            // Subtle color overlay on ship
            const alpha = Math.floor(60 * pulse);
            ctx.globalAlpha = alpha / 255;
            ctx.fillStyle = rainbow[idx];
            ctx.fillRect(px, py, sw, sh);
            ctx.globalAlpha = 1;

            // 4 orbiting sparks
            for (let i = 0; i < 4; i++) {
                const angle = phase * 0.8 + i * (Math.PI * 2 / 4);
                const orbitR = Math.max(sw, sh) / 2 + scale;
                const sx = cx + Math.floor(Math.cos(angle) * orbitR);
                const sy = cy + Math.floor(Math.sin(angle) * orbitR);
                const sc = rainbow[(i + Math.floor(phase)) % rainbow.length];
                const dotSz = Math.max(1, Math.floor(scale / 2));

                ctx.fillStyle = sc;
                ctx.fillRect(sx - dotSz / 2, sy - dotSz / 2, dotSz, dotSz);
            }
        } else if (frac > 0.7) {
            // High charge: a couple of sparks start appearing
            const pulse = Math.abs(Math.sin(this.blinkCounter * 0.08));
            for (let i = 0; i < 2; i++) {
                const angle = this.blinkCounter * 0.1 + i * Math.PI;
                const orbitR = Math.max(sw, sh) / 2 + scale;
                const sx = cx + Math.floor(Math.cos(angle) * orbitR);
                const sy = cy + Math.floor(Math.sin(angle) * orbitR);
                const sparkAlpha = Math.floor(60 * frac * pulse);
                const dotSz = Math.floor(scale / 2);

                ctx.globalAlpha = sparkAlpha / 255;
                ctx.fillStyle = "rgb(100, 180, 255)";
                ctx.fillRect(sx, sy, dotSz, dotSz);
                ctx.globalAlpha = 1;
            }
        }
    }

    _drawMegaExplosion(ctx, scale) {
        const [ox, oy] = this.megaOrigin;
        const sx = Math.floor(ox * scale);
        const sy = Math.floor(oy * scale);

        // Screen flash
        if (this.megaFlash > 0) {
            ctx.globalAlpha = Math.min(140, this.megaFlash) / 255;
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
            ctx.globalAlpha = 1;
        }

        // Radiating laser beams with glow
        for (let beam of this.megaBeams) {
            const angle = beam.angle;
            const length = beam.length * scale;
            const ex = sx + Math.floor(Math.cos(angle) * length);
            const ey = sy + Math.floor(Math.sin(angle) * length);
            const alpha = Math.min(220, beam.alpha);
            const w = Math.max(1, Math.floor(beam.width * scale * (alpha / 220)));

            // Outer glow (wider, dimmer)
            const glowW = w + Math.max(1, Math.floor(scale / 2));
            ctx.strokeStyle = `rgba(${beam.color[0]}, ${beam.color[1]}, ${beam.color[2]}, ${alpha / 3 / 255})`;
            ctx.lineWidth = glowW;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            // Core beam (bright)
            ctx.strokeStyle = `rgba(${beam.color[0]}, ${beam.color[1]}, ${beam.color[2]}, ${alpha / 255})`;
            ctx.lineWidth = Math.max(1, w);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }

        // Expanding rings
        for (let ring of this.megaRings) {
            const r = Math.floor(ring.r * scale);
            if (r < 1) continue;
            const alpha = Math.min(200, ring.alpha);
            const w = Math.max(1, Math.floor(ring.width * scale));

            ctx.strokeStyle = `rgba(${ring.color[0]}, ${ring.color[1]}, ${ring.color[2]}, ${alpha / 255})`;
            ctx.lineWidth = w;
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Explosion particles
        for (let p of this.megaParticles) {
            const ppx = Math.floor(p.x * scale);
            const ppy = Math.floor(p.y * scale);
            const sz = p.size * scale;
            const alpha = Math.min(220, Math.floor(220 * p.life / 30));
            if (alpha > 10) {
                ctx.globalAlpha = alpha / 255;
                ctx.fillStyle = `rgb(${p.color[0]}, ${p.color[1]}, ${p.color[2]})`;
                ctx.fillRect(ppx - sz / 2, ppy - sz / 2, sz, sz);
                ctx.globalAlpha = 1;
            }
        }
    }

    _drawDragon(ctx, spriteMgr, scale) {
        // Draw death sparkles even after dragon is gone
        if (this.dragonDeathTimer > 0 || this.dragonSparkles.length > 0) {
            for (let sp of this.dragonSparkles) {
                const spx = Math.floor(sp.x * scale);
                const spy = Math.floor(sp.y * scale);
                const sz = Math.max(1, Math.floor(scale / 2));
                const alpha = Math.min(255, Math.floor(255 * sp.life / 30));
                if (alpha > 20) {
                    ctx.globalAlpha = alpha / 255;
                    ctx.fillStyle = `rgb(${sp.color[0]}, ${sp.color[1]}, ${sp.color[2]})`;
                    ctx.fillRect(spx - sz, spy - sz, sz * 2, sz * 2);
                    ctx.globalAlpha = 1;
                }
            }
        }

        if (!this.dragonAlive) return;

        const [dx, dy] = this.getDragonPos();
        if (dx === null) return;

        const dragonSprite = spriteMgr.get("dragon");
        if (!dragonSprite) return;

        const dpx = Math.floor(dx * scale);
        const dpy = Math.floor(dy * scale);
        ctx.drawImage(dragonSprite, dpx, dpy);

        // Rainbow shimmer dots orbiting the dragon
        const shimmerPhase = this.blinkCounter * 0.08;
        const rainbow = [
            [255, 80, 80], [255, 180, 50], [255, 255, 80],
            [80, 255, 80], [80, 180, 255], [200, 120, 255]
        ];
        const sw = dragonSprite.width;
        const sh = dragonSprite.height;
        const cx = dpx + sw / 2;
        const cy = dpy + sh / 2;
        const ringR = Math.max(sw, sh) / 2 + scale;

        for (let i = 0; i < rainbow.length; i++) {
            const angle = shimmerPhase + i * (Math.PI * 2 / rainbow.length);
            const rx = cx + Math.floor(Math.cos(angle) * ringR);
            const ry = cy + Math.floor(Math.sin(angle) * ringR);
            const alpha = 120 + Math.floor(60 * Math.abs(Math.sin(shimmerPhase + i)));

            ctx.globalAlpha = alpha / 255;
            ctx.fillStyle = `rgb(${rainbow[i][0]}, ${rainbow[i][1]}, ${rainbow[i][2]})`;
            ctx.fillRect(rx, ry, scale, scale);
            ctx.globalAlpha = 1;
        }

        // Tiny HP bar under dragon
        const barW = sw;
        const barH = Math.max(1, Math.floor(scale / 2));
        const barX = dpx;
        const barY = dpy + sh + 1;
        const hpFrac = this.dragonHp / Math.max(1, this.dragonMaxHp);

        ctx.fillStyle = "rgb(40, 40, 40)";
        ctx.fillRect(barX, barY, barW, barH);

        const fillW = Math.max(1, Math.floor(barW * hpFrac));
        const barColor = rainbow[Math.floor(shimmerPhase) % rainbow.length];
        ctx.fillStyle = `rgb(${barColor[0]}, ${barColor[1]}, ${barColor[2]})`;
        ctx.fillRect(barX, barY, fillW, barH);
    }

    _drawHitParticles(ctx, spriteMgr, scale = SCALE) {
        const explosionColor = [43, 63, 29];  // COLOR_FG default
        const playerColor = [43, 63, 29];

        const aliveParticles = [];
        for (let p of this.hitParticles) {
            p.x += p.dx;
            p.y += p.dy;
            p.dy += 0.05;  // slight gravity
            p.life -= 1;
            if (p.life <= 0) continue;

            aliveParticles.push(p);

            const ppx = Math.floor(p.x * scale);
            const ppy = Math.floor(p.y * scale);
            const sz = p.size * scale;

            // Color fades from player color to explosion color
            const c = p.life > 15 ? playerColor : explosionColor;
            const alpha = Math.min(255, Math.floor(255 * p.life / 12));

            ctx.globalAlpha = Math.max(30, alpha) / 255;
            ctx.fillStyle = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
            ctx.fillRect(ppx, ppy, sz, sz);
            ctx.globalAlpha = 1;
        }

        this.hitParticles = aliveParticles;
    }
}
