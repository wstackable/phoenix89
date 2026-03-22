/**
 * Phoenix 89 - UI System (Canvas)
 * HUD, Shop, Title Screen, High Scores, etc.
 * Constants are loaded from constants.js
 */

// ─── HUD Class ─────────────────────────────────────────────

class HUD {
    constructor() {}

    draw(ctx, player, levelMgr, fgColor = null, bgColor = null, killCount = 0) {
        const fg = fgColor || COLOR_FG;
        const bg = bgColor || COLOR_BG;

        // Status bar background - 9 original rows to fit bar + text
        const statusY = (ORIG_HEIGHT - 9) * SCALE;
        ctx.fillStyle = `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`;
        ctx.fillRect(0, statusY, SCREEN_WIDTH, 9 * SCALE);

        // Top border line
        ctx.strokeStyle = `rgb(${fg[0]}, ${fg[1]}, ${fg[2]})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, statusY);
        ctx.lineTo(SCREEN_WIDTH, statusY);
        ctx.stroke();

        // Heart icon and shield bar
        const barY = statusY + SCALE;
        const barH = Math.max(4, SCALE + 2);
        const heartSize = barH;
        const hx = 3 * SCALE;
        const hy = barY;
        const hs = Math.max(1, Math.floor(heartSize / 5));

        // Heart color based on shield level
        const frac = player.shield / MAX_SHIELD;
        let heartColor;
        if (frac > 0.5) {
            heartColor = [220, 40, 60];
        } else if (frac > 0.2) {
            heartColor = [180, 100, 50];
        } else {
            heartColor = [100, 50, 60];
        }

        // Draw heart pattern
        const heartPattern = [
            [1,0],[3,0],
            [0,1],[1,1],[2,1],[3,1],[4,1],
            [0,2],[1,2],[2,2],[3,2],[4,2],
            [1,3],[2,3],[3,3],
            [2,4],
        ];
        ctx.fillStyle = `rgb(${heartColor[0]}, ${heartColor[1]}, ${heartColor[2]})`;
        for (const [hpx, hpy] of heartPattern) {
            ctx.fillRect(hx + hpx * hs, hy + hpy * hs, hs, hs);
        }

        // Segmented shield bar
        const barX = hx + 6 * hs + 2;
        const barFullW = SCREEN_WIDTH - barX - 4;
        const numSegments = 10;
        const segGap = 1;
        const segW = Math.floor((barFullW - (numSegments - 1) * segGap) / numSegments);
        const filledSegments = Math.max(0, Math.round(frac * numSegments));

        const totalBarW = numSegments * segW + (numSegments - 1) * segGap;
        ctx.fillStyle = `rgb(30, 30, 40)`;
        ctx.fillRect(barX - 1, barY - 1, totalBarW + 2, barH + 2);

        for (let i = 0; i < numSegments; i++) {
            const sx = barX + i * (segW + segGap);
            if (i < filledSegments) {
                const segFrac = i / Math.max(1, numSegments - 1);
                let r, g, b;
                if (frac > 0.5) {
                    r = Math.floor(200 + 55 * (1 - segFrac));
                    g = Math.floor(40 + 20 * segFrac);
                    b = 50;
                } else if (frac > 0.2) {
                    r = Math.floor(200 + 55 * (1 - segFrac));
                    g = Math.floor(100 + 60 * segFrac);
                    b = 30;
                } else {
                    r = 200; g = 40; b = 40;
                }
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.fillRect(sx, barY, segW, barH);

                // Highlight
                ctx.fillStyle = `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 40)})`;
                ctx.fillRect(sx, barY, segW, Math.max(1, Math.floor(barH / 3)));
            } else {
                ctx.fillStyle = `rgb(45, 45, 55)`;
                ctx.fillRect(sx, barY, segW, barH);
                ctx.fillStyle = `rgb(35, 35, 45)`;
                ctx.fillRect(sx, barY, segW, Math.max(1, Math.floor(barH / 3)));
            }
        }

        // Status text - below health bar with padding
        const textY = barY + barH + 2 * SCALE;
        const levelNum = levelMgr.currentLevelGroup + 1;
        const waveNum = levelMgr.waveInLevel > 0 ? levelMgr.waveInLevel : 1;
        const score = levelMgr.getRunningScore(player);
        const status = `$${player.cash.toString().padStart(5, '0')}  HP:${player.shield.toString().padStart(2, '0')}  L${levelNum}-W${waveNum}  Gun:${player.weaponSelected + 1}  B:${player.bombs}  S:${score}`;

        ctx.fillStyle = `rgb(${fg[0]}, ${fg[1]}, ${fg[2]})`;
        ctx.font = `${Math.floor(13 * SCALE / 4)}px monospace`;
        ctx.fillText(status, 3 * SCALE, textY);
    }
}

// ─── Shop Class ────────────────────────────────────────────

class Shop {
    constructor() {
        this.selected = 0;
        this.active = false;
    }

    start() {
        this.active = true;
        this.selected = 0;
    }

    handleEvent(event, player) {
        if (event.type !== 'keydown') return false;

        if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
            this.selected = Math.max(0, this.selected - 1);
        } else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
            this.selected = Math.min(SHOP_ITEMS.length - 1, this.selected + 1);
        } else if (event.key === 'Enter' || event.key === ' ') {
            return this._purchase(player);
        } else if (event.key === 'Escape') {
            this.active = false;
            return true;
        }
        return false;
    }

    _purchase(player) {
        const [name, price] = SHOP_ITEMS[this.selected];

        if (this.selected === 0) {
            this.active = false;
            return true;
        }

        if (player.cash < price) {
            window.soundManager?.play("menu_move");
            return false;
        }

        if (this._applyPurchase(player, this.selected)) {
            player.cash -= price;
            window.soundManager?.play("menu_select");
        } else {
            window.soundManager?.play("menu_move");
        }
        return false;
    }

    _isOwned(player, idx) {
        switch (idx) {
            case 3: return !!(player.weaponsAvailable & (1 << WEAPON_DOUBLE));
            case 4: return !!(player.weaponsAvailable & (1 << WEAPON_TRIPLE));
            case 5: return !!(player.weaponsAvailable & (1 << WEAPON_QUAD));
            case 6: return player.fireDelay <= FIRE_DELAY_RAPID;
            case 7: return player.hasHomingMissiles;
            case 8: return !!(player.weaponsAvailable & (1 << WEAPON_DUAL_PLASMA));
            case 9: return player.shipType >= SHIP_HEAVY_DESTROYER;
            case 10: return !!(player.weaponsAvailable & (1 << WEAPON_GOLDEN_ARCHES));
            case 11: return player.shipType >= SHIP_PHOENIX;
            case 12: return !!(player.weaponsAvailable & (1 << WEAPON_TRIPLE_PLASMA));
            case 13: return !!(player.weaponsAvailable & (1 << WEAPON_DELUXE_PLASMA));
            default: return false;
        }
    }

    _applyPurchase(player, idx) {
        if (this._isOwned(player, idx) && idx > 2 && idx < 14) return false;

        switch (idx) {
            case 0: return true; // Exit
            case 1: // Shield recharge
                if (player.shield >= MAX_SHIELD) return false;
                player.shield = Math.min(player.shield + 1, MAX_SHIELD);
                return true;
            case 2: // Extra bullet
                if (player.numBullets >= MAX_BULLETS) return false;
                player.numBullets++;
                return true;
            case 3: // Double cannon
                player.weaponsAvailable |= (1 << WEAPON_DOUBLE);
                player.weaponSelected = WEAPON_DOUBLE;
                return true;
            case 4: // Triple cannon
                player.weaponsAvailable |= (1 << WEAPON_TRIPLE);
                player.weaponSelected = WEAPON_TRIPLE;
                return true;
            case 5: // Quad cannon
                player.weaponsAvailable |= (1 << WEAPON_QUAD);
                player.weaponSelected = WEAPON_QUAD;
                return true;
            case 6: // Rapid fire
                player.fireDelay = FIRE_DELAY_RAPID;
                return true;
            case 7: // Homing missiles
                player.hasHomingMissiles = true;
                return true;
            case 8: // Dual plasma
                player.weaponsAvailable |= (1 << WEAPON_DUAL_PLASMA);
                player.weaponSelected = WEAPON_DUAL_PLASMA;
                return true;
            case 9: // Heavy Destroyer
                if (player.shipType >= SHIP_HEAVY_DESTROYER) return false;
                player.shipType = SHIP_HEAVY_DESTROYER;
                player.loadShip();
                return true;
            case 10: // Golden Arches
                player.weaponsAvailable |= (1 << WEAPON_GOLDEN_ARCHES);
                player.weaponSelected = WEAPON_GOLDEN_ARCHES;
                return true;
            case 11: // Phoenix
                if (player.shipType >= SHIP_PHOENIX) return false;
                player.shipType = SHIP_PHOENIX;
                player.loadShip();
                return true;
            case 12: // Triple Plasma
                player.weaponsAvailable |= (1 << WEAPON_TRIPLE_PLASMA);
                player.weaponSelected = WEAPON_TRIPLE_PLASMA;
                return true;
            case 13: // Deluxe Plasma
                player.weaponsAvailable |= (1 << WEAPON_DELUXE_PLASMA);
                player.weaponSelected = WEAPON_DELUXE_PLASMA;
                return true;
            case 14: // Bombs
                if (player.bombs >= MAX_BOMBS) return false;
                player.bombs = Math.min(player.bombs + 3, MAX_BOMBS);
                return true;
            default: return false;
        }
    }

    draw(ctx, player = null) {
        ctx.fillStyle = `rgb(${COLOR_BG[0]}, ${COLOR_BG[1]}, ${COLOR_BG[2]})`;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        const shopFontSize = Math.floor(12 * SCALE / 4);
        ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
        ctx.font = `${shopFontSize}px monospace`;
        ctx.textBaseline = 'top';
        const title = `Phoenix Shop - Credits: $${player ? player.cash : 0}`;
        ctx.fillText(title, 2 * SCALE, 1 * SCALE);

        const lineH = 5 * SCALE;
        let y = 8 * SCALE;
        ctx.font = `${shopFontSize}px monospace`;

        for (let i = 0; i < SHOP_ITEMS.length; i++) {
            const [name, price] = SHOP_ITEMS[i];
            const owned = player && i > 0 && this._isOwned(player, i);

            if (i === this.selected) {
                // Draw arrow - centered vertically on font
                ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
                const arrowX = 2 * SCALE;
                const arrowY = y + Math.floor(shopFontSize / 2);
                ctx.beginPath();
                ctx.moveTo(arrowX, arrowY - Math.floor(1.5 * SCALE));
                ctx.lineTo(arrowX + Math.floor(1.5 * SCALE), arrowY);
                ctx.lineTo(arrowX, arrowY + Math.floor(1.5 * SCALE));
                ctx.closePath();
                ctx.fill();
            }

            ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
            ctx.fillText(` ${name}`, 5 * SCALE, y);

            if (price > 0) {
                if (owned) {
                    // Show OWNED or MAX instead of price
                    const label = (i === 1 || i === 2) ? "MAX" : "OWNED";
                    const labelW = ctx.measureText(label).width;
                    ctx.fillText(label, SCREEN_WIDTH - labelW - 3 * SCALE, y);
                } else {
                    const priceText = price.toString().padStart(5, ' ');
                    ctx.fillText(priceText, SCREEN_WIDTH - 40 * SCALE, y);
                }
            }

            y += lineH;
        }

        // Ship info at bottom
        if (player) {
            const shipNames = {
                [SHIP_SIGMA]: "Sigma", [SHIP_HEAVY_DESTROYER]: "Heavy Destroyer",
                [SHIP_PHOENIX]: "The Phoenix", [SHIP_PURPLE_DEVIL]: "Purple Devil",
                [SHIP_DOUBLE_BLASTERY]: "Double Blastery", [SHIP_RED_BOMBER]: "Red Bomber"
            };
            const shipInfo = `Ship: ${shipNames[player.shipType] || '?'} | Bullets: ${player.numBullets}/${MAX_BULLETS} | Shield: ${player.shield}/${MAX_SHIELD} | Bombs: ${player.bombs}/${MAX_BOMBS}`;
            ctx.font = `${Math.floor(9 * SCALE / 4)}px monospace`;
            ctx.fillText(shipInfo, 2 * SCALE, SCREEN_HEIGHT - 6 * SCALE);
        }
        ctx.textBaseline = 'alphabetic';
    }
}

// ─── Title Screen Class ─────────────────────────────────────

class TitleScreen {
    constructor() {
        this.selected = 0;
        this.difficulty = DIFF_BEGINNER;
        this.startLevel = 1;  // level to start at (1 = normal start)
        this.active = true;
    }

    _getDifficultyName(diff) {
        const names = {
            [DIFF_BEGINNER]: "Beginner",
            [DIFF_INTERMEDIATE]: "Intermediate",
            [DIFF_HARD]: "Hard",
            [DIFF_EXPERT]: "Expert"
        };
        return names[diff] || "Unknown";
    }

    handleEvent(event) {
        if (event.type !== 'keydown') return null;

        // Function keys for difficulty
        const keyMap = {
            'F1': DIFF_BEGINNER,
            'F2': DIFF_INTERMEDIATE,
            'F3': DIFF_HARD,
            'F4': DIFF_EXPERT,
        };
        if (keyMap[event.key]) {
            this.difficulty = keyMap[event.key];
            return null;
        }

        // Left/Right for difficulty change on New Game row
        if (this.selected === 0) {
            const difficulties = [DIFF_BEGINNER, DIFF_INTERMEDIATE, DIFF_HARD, DIFF_EXPERT];
            const idx = difficulties.indexOf(this.difficulty);
            if (event.key === 'ArrowLeft') {
                this.difficulty = difficulties[(idx - 1 + difficulties.length) % difficulties.length];
                return null;
            } else if (event.key === 'ArrowRight') {
                this.difficulty = difficulties[(idx + 1) % difficulties.length];
                return null;
            }
        }

        // Left/Right for level select on Level Select row
        if (this.selected === 1) {
            if (event.key === 'ArrowLeft') {
                this.startLevel = Math.max(1, this.startLevel - 1);
                return null;
            } else if (event.key === 'ArrowRight') {
                this.startLevel = Math.min(20, this.startLevel + 1);
                return null;
            }
        }

        // Menu navigation
        const numItems = 5;
        if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
            this.selected = (this.selected - 1 + numItems) % numItems;
        } else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
            this.selected = (this.selected + 1) % numItems;
        } else if (event.key === 'Enter' || event.key === ' ') {
            const actions = ["new_game", "level_select", "high_scores", "about", "quit"];
            return actions[this.selected] || null;
        }
        return null;
    }

    draw(ctx) {
        ctx.fillStyle = `rgb(${COLOR_BG[0]}, ${COLOR_BG[1]}, ${COLOR_BG[2]})`;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // Border
        ctx.strokeStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(3 * SCALE, 2 * SCALE, SCREEN_WIDTH - 6 * SCALE, SCREEN_HEIGHT - 4 * SCALE);

        // Title
        ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
        ctx.font = `bold ${Math.floor(28 * SCALE / 4)}px monospace`;
        const title = "PHOENIX 89";
        const titleMetrics = ctx.measureText(title);
        ctx.fillText(title, SCREEN_WIDTH / 2 - titleMetrics.width / 2, 7 * SCALE);

        // Subtitle
        ctx.font = `${Math.floor(10 * SCALE / 4)}px monospace`;
        const subtitle = "Claude Edition 1.1";
        const subMetrics = ctx.measureText(subtitle);
        ctx.fillText(subtitle, SCREEN_WIDTH / 2 - subMetrics.width / 2, 16 * SCALE);

        // Menu items
        const menuItems = ["New Game", "Level Select", "High Scores", "About", "Quit"];
        const menuFontSize = Math.floor(14 * SCALE / 4);
        ctx.font = `${menuFontSize}px monospace`;
        ctx.textBaseline = 'top';
        let y = 28 * SCALE;
        const lineH = 8 * SCALE;
        const leftMargin = 12 * SCALE;

        for (let i = 0; i < menuItems.length; i++) {
            if (i === this.selected) {
                // Selection arrow - vertically centered on font height
                ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
                const ax = leftMargin - 5 * SCALE;
                const ay = y + Math.floor(menuFontSize / 2);
                ctx.beginPath();
                ctx.moveTo(ax, ay - Math.floor(1.5 * SCALE));
                ctx.lineTo(ax + 3 * SCALE, ay);
                ctx.lineTo(ax, ay + Math.floor(1.5 * SCALE));
                ctx.closePath();
                ctx.fill();
            }

            let text = menuItems[i];
            if (i === 0) {
                const diffName = this._getDifficultyName(this.difficulty);
                text = `${text}  <${diffName}>`;
            } else if (i === 1) {
                text = `${text}  <Level ${this.startLevel}>`;
            }

            ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
            ctx.fillText(text, leftMargin, y);
            y += lineH;
        }
        ctx.textBaseline = 'alphabetic';

        // Controls section
        ctx.font = `${Math.floor(9 * SCALE / 4)}px monospace`;
        y = SCREEN_HEIGHT - 22 * SCALE;
        const controls = [
            "SPACE: Fire  R-Shift: Bomb  1-8: Weapons",
            "R: Radio  C: Theme  M: Mute",
            "Arrows: Move  ESC: Pause",
        ];
        for (const line of controls) {
            ctx.fillText(line, leftMargin, y);
            y += 4 * SCALE;
        }

        // Credit
        ctx.font = `${Math.floor(8 * SCALE / 4)}px monospace`;
        const credit = "Will Stackable, 2026";
        const creditMetrics = ctx.measureText(credit);
        ctx.fillText(credit, SCREEN_WIDTH - creditMetrics.width - 5 * SCALE, SCREEN_HEIGHT - 5 * SCALE);
    }
}

// ─── About Screen Class ─────────────────────────────────────

class AboutScreen {
    constructor() {
        this.active = false;
    }

    show() {
        this.active = true;
    }

    handleEvent(event) {
        if (event.type === 'keydown') {
            if (event.key === 'Enter' || event.key === 'Escape' || event.key === ' ') {
                this.active = false;
                return true;
            }
        }
        return false;
    }

    draw(ctx) {
        ctx.fillStyle = `rgb(${COLOR_BG[0]}, ${COLOR_BG[1]}, ${COLOR_BG[2]})`;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
        ctx.font = `${Math.floor(20 * SCALE / 4)}px monospace`;
        const title = "ABOUT";
        const titleMetrics = ctx.measureText(title);
        ctx.fillText(title, SCREEN_WIDTH / 2 - titleMetrics.width / 2, 4 * SCALE);

        ctx.font = `${Math.floor(12 * SCALE / 4)}px monospace`;
        const lines = [
            "CREATIVE DIRECTORS",
            "Brady, Elise & Caleb Stackable",
            "",
            "Inspired by Phoenix for TI-89",
            "by Patrick Davidson  (1998-2005)",
            "A legendary 30KB shoot-em-up in",
            "68000 assembly for a 160x100 LCD.",
            "",
            "CODEBASE: ~9000 lines of JS",
            "9 modules / procedural audio",
            "35+ enemy types / 11 weapons",
            "Built entirely with Claude Code",
            "",
            "Will Stackable, March 2026",
        ];

        let y = 16 * SCALE;
        for (const line of lines) {
            if (line === "") {
                y += 3 * SCALE;
            } else {
                const metrics = ctx.measureText(line);
                ctx.fillText(line, SCREEN_WIDTH / 2 - metrics.width / 2, y);
                y += 5 * SCALE;
            }
        }

        ctx.font = `${Math.floor(11 * SCALE / 4)}px monospace`;
        const prompt = "Press any key to return";
        const promptMetrics = ctx.measureText(prompt);
        ctx.fillText(prompt, SCREEN_WIDTH / 2 - promptMetrics.width / 2, SCREEN_HEIGHT - 6 * SCALE);
    }
}

// ─── High Score Screen Class ────────────────────────────────

class HighScoreScreen {
    constructor() {
        this.active = false;
        this.scores = [
            ["---", 0], ["---", 0], ["---", 0], ["---", 0],
            ["---", 0], ["---", 0], ["---", 0], ["---", 0],
        ];
        this.enteringName = false;
        this.newScore = 0;
        this.newRank = -1;
        this.initials = [0, 0, 0];
        this.cursorPos = 0;
        this.blinkTimer = 0;
        this.validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ";
        this._load();
    }

    _load() {
        try {
            const saved = localStorage.getItem('phoenixHighScores');
            if (saved) {
                this.scores = JSON.parse(saved);
            }
        } catch (e) {
            // Use defaults
        }
    }

    _save() {
        try {
            localStorage.setItem('phoenixHighScores', JSON.stringify(this.scores));
        } catch (e) {
            // Ignore save errors
        }
    }

    checkHighScore(score) {
        for (let i = 0; i < this.scores.length; i++) {
            if (score > this.scores[i][1]) {
                return i;
            }
        }
        return -1;
    }

    startEntry(score, rank) {
        this.active = true;
        this.enteringName = true;
        this.newScore = score;
        this.newRank = rank;
        this.initials = [0, 0, 0];
        this.cursorPos = 0;
        this.blinkTimer = 0;
    }

    show() {
        this.active = true;
        this.enteringName = false;
    }

    handleEvent(event) {
        if (event.type !== 'keydown') return false;

        if (this.enteringName) {
            if (event.key === 'Enter') {
                const name = this.initials.map(i => this.validChars[i]).join('');
                this.scores.splice(this.newRank, 0, [name, this.newScore]);
                this.scores = this.scores.slice(0, 8);
                this._save();
                this.enteringName = false;
                return true;
            } else if (event.key === 'ArrowUp') {
                this.initials[this.cursorPos] = (this.initials[this.cursorPos] + 1) % this.validChars.length;
            } else if (event.key === 'ArrowDown') {
                this.initials[this.cursorPos] = (this.initials[this.cursorPos] - 1 + this.validChars.length) % this.validChars.length;
            } else if (event.key === 'ArrowRight') {
                this.cursorPos = Math.min(this.cursorPos + 1, 2);
            } else if (event.key === 'ArrowLeft') {
                this.cursorPos = Math.max(this.cursorPos - 1, 0);
            } else if (event.key.length === 1) {
                const ch = event.key.toUpperCase();
                const idx = this.validChars.indexOf(ch);
                if (idx >= 0) {
                    this.initials[this.cursorPos] = idx;
                    if (this.cursorPos < 2) this.cursorPos++;
                }
            }
        } else {
            if (event.key === 'Enter' || event.key === 'Escape' || event.key === ' ') {
                this.active = false;
                return true;
            }
        }
        return false;
    }

    draw(ctx) {
        this.blinkTimer = (this.blinkTimer + 1) % 40;

        ctx.fillStyle = `rgb(${COLOR_BG[0]}, ${COLOR_BG[1]}, ${COLOR_BG[2]})`;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
        ctx.font = `${Math.floor(18 * SCALE / 4)}px monospace`;
        const title = "HIGH SCORES";
        const titleMetrics = ctx.measureText(title);
        ctx.fillText(title, SCREEN_WIDTH / 2 - titleMetrics.width / 2, 5 * SCALE);

        ctx.font = `${Math.floor(14 * SCALE / 4)}px monospace`;
        let y = 18 * SCALE;
        for (let i = 0; i < this.scores.length; i++) {
            const [name, score] = this.scores[i];
            const highlight = this.enteringName && i === this.newRank;

            if (highlight) {
                const nameDisplay = this.initials.map(idx => this.validChars[idx]).join('');
                const line = ` ${(i + 1).toString().padStart(3, ' ')} ${nameDisplay}  ${this.newScore.toString().padStart(8, ' ')}`;
                ctx.fillText(line, SCREEN_WIDTH / 4, y);
            } else {
                const line = ` ${(i + 1).toString().padStart(3, ' ')} ${name}  ${score.toString().padStart(8, ' ')}`;
                ctx.fillText(line, SCREEN_WIDTH / 4, y);
            }

            y += 8 * SCALE;
        }

        if (this.enteringName) {
            const entryY = SCREEN_HEIGHT - 20 * SCALE;
            ctx.font = `${Math.floor(24 * SCALE / 4)}px monospace`;
            const totalW = 30 * SCALE;
            const startX = SCREEN_WIDTH / 2 - totalW / 2;

            for (let i = 0; i < 3; i++) {
                const ch = this.validChars[this.initials[i]];
                const cx = startX + i * 10 * SCALE + 5 * SCALE;
                const chMetrics = ctx.measureText(ch);
                ctx.fillText(ch, cx - chMetrics.width / 2, entryY);

                if (i === this.cursorPos) {
                    // Up arrow - pushed further above the letter
                    const arrowGap = 2 * SCALE;
                    const arrowH = 3 * SCALE;
                    const upTip = entryY - arrowGap - arrowH;
                    const upBase = entryY - arrowGap;
                    ctx.beginPath();
                    ctx.moveTo(cx, upTip);
                    ctx.lineTo(cx - 2 * SCALE, upBase);
                    ctx.lineTo(cx + 2 * SCALE, upBase);
                    ctx.closePath();
                    ctx.fill();

                    // Down arrow - pushed further below the letter
                    const letterH = Math.floor(24 * SCALE / 4);
                    const downBase = entryY + letterH + arrowGap;
                    const downTip = downBase + arrowH;
                    ctx.beginPath();
                    ctx.moveTo(cx, downTip);
                    ctx.lineTo(cx - 2 * SCALE, downBase);
                    ctx.lineTo(cx + 2 * SCALE, downBase);
                    ctx.closePath();
                    ctx.fill();

                    // Blink underline
                    if (this.blinkTimer < 25) {
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(startX + i * 10 * SCALE + SCALE, entryY + Math.floor(24 * SCALE / 4) + SCALE);
                        ctx.lineTo(startX + i * 10 * SCALE + 9 * SCALE, entryY + Math.floor(24 * SCALE / 4) + SCALE);
                        ctx.stroke();
                    }
                }
            }

            ctx.font = `${Math.floor(14 * SCALE / 4)}px monospace`;
            const prompt = "UP/DOWN or type  LEFT/RIGHT  ENTER to save";
            const promptMetrics = ctx.measureText(prompt);
            ctx.fillText(prompt, SCREEN_WIDTH / 2 - promptMetrics.width / 2, SCREEN_HEIGHT - 5 * SCALE);
        }
    }
}

// ─── Score Screen Class ────────────────────────────────────

class ScoreScreen {
    constructor() {
        this.active = false;
        this.scoreData = {};
    }

    show(player, levelMgr) {
        this.active = true;
        const cheated = player.cheated || false;

        if (cheated) {
            this.scoreData = {
                difficultyBonus: 0,
                timeBonus: 0,
                shieldBonus: 0,
                cashBonus: 0,
                total: 0,
                cheated: true,
            };
        } else {
            const baseScore = levelMgr.getBaseScore();
            const timeLeft = Math.max(0, levelMgr.timeBonusCounter || 0);
            const shieldLevel = Math.floor(player.shield / 16);
            const extraCash = player.cash * 16;
            const total = baseScore + timeLeft + shieldLevel + extraCash;

            this.scoreData = {
                baseScore: baseScore,
                timeLeft: timeLeft,
                shieldLevel: shieldLevel,
                extraCash: extraCash,
                total: total,
                cheated: false,
            };
        }
        return this.scoreData.total;
    }

    handleEvent(event) {
        if (event.type === 'keydown') {
            if (event.key === 'Enter' || event.key === 'Escape' || event.key === ' ') {
                this.active = false;
                return true;
            }
        }
        return false;
    }

    draw(ctx) {
        ctx.fillStyle = `rgb(${COLOR_BG[0]}, ${COLOR_BG[1]}, ${COLOR_BG[2]})`;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
        ctx.font = `${Math.floor(18 * SCALE / 4)}px monospace`;
        const title = "GAME OVER";
        const titleMetrics = ctx.measureText(title);
        ctx.fillText(title, SCREEN_WIDTH / 2 - titleMetrics.width / 2, 8 * SCALE);

        if (this.scoreData.cheated) {
            ctx.font = `${Math.floor(14 * SCALE / 4)}px monospace`;
            const cheatText = "CHEATER - Score: 0";
            const cheatMetrics = ctx.measureText(cheatText);
            ctx.fillText(cheatText, SCREEN_WIDTH / 2 - cheatMetrics.width / 2, 40 * SCALE);
        } else {
            ctx.font = `${Math.floor(14 * SCALE / 4)}px monospace`;
            let y = 25 * SCALE;
            const items = [
                ["Base Score:", this.scoreData.baseScore],
                ["Time left:", this.scoreData.timeLeft],
                ["Shield level:", this.scoreData.shieldLevel],
                ["Extra cash:", this.scoreData.extraCash],
                ["Total score:", this.scoreData.total],
            ];

            for (const [label, value] of items) {
                const line = `${label.padEnd(20, ' ')} ${value.toString().padStart(8, ' ')}`;
                ctx.fillText(line, SCREEN_WIDTH / 4, y);
                y += 8 * SCALE;
            }
        }

        ctx.font = `${Math.floor(14 * SCALE / 4)}px monospace`;
        const prompt = "Press ENTER to continue";
        const promptMetrics = ctx.measureText(prompt);
        ctx.fillText(prompt, SCREEN_WIDTH / 2 - promptMetrics.width / 2, SCREEN_HEIGHT - 8 * SCALE);
    }
}

// ─── Secret Hangar Class ────────────────────────────────────

class SecretHangar {
    constructor() {
        this.active = false;
        this.selected = 0;
        this.animCounter = 0;
        this.ships = [
            {
                name: "Purple Devil",
                pilot: "Elise",
                shipType: SHIP_PURPLE_DEVIL,
                weapon: WEAPON_SNIPER_LASER,
                desc: "Quad star cannon + dragon protector",
                desc2: "Wings release swarm drones",
                color1: [180, 60, 220],
                color2: [80, 140, 255],
                color3: [255, 120, 200],
            },
            {
                name: "Double Blastery",
                pilot: "Brady",
                shipType: SHIP_DOUBLE_BLASTERY,
                weapon: WEAPON_BLASTERY,
                desc: "Fan lasers + homing rockets",
                desc2: "Mega laser bomb when fully charged",
                color1: [40, 80, 200],
                color2: [100, 180, 255],
                color3: [240, 240, 255],
            },
            {
                name: "Red Bomber",
                pilot: "Caleb",
                shipType: SHIP_RED_BOMBER,
                weapon: WEAPON_RED_CHARGE,
                desc: "Charge beam + drone companions",
                desc2: "Hold fire to charge, drones auto-target",
                color1: [220, 40, 40],
                color2: [255, 120, 60],
                color3: [255, 200, 100],
            },
        ];
    }

    show() {
        this.active = true;
        this.selected = 0;
        this.animCounter = 0;
    }

    handleEvent(event) {
        if (event.type !== 'keydown') return null;

        if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
            this.selected = (this.selected - 1 + this.ships.length) % this.ships.length;
        } else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
            this.selected = (this.selected + 1) % this.ships.length;
        } else if (event.key === 'Enter' || event.key === ' ') {
            return this.ships[this.selected];
        } else if (event.key === 'Escape') {
            this.active = false;
            return "back";
        }
        return null;
    }

    draw(ctx) {
        this.animCounter++;
        ctx.textBaseline = 'top';

        ctx.fillStyle = `rgb(5, 2, 15)`;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // Animated sparkle stars
        const seed = 42;
        for (let i = 0; i < 40; i++) {
            const sx = ((seed + i * 13) % 320) * 2;
            const sy = ((seed + i * 17) % 200) * 2;
            const bright = 80 + Math.floor(60 * Math.abs(Math.sin((this.animCounter + sx + sy) * 0.05)));
            const colorPick = (seed + i) % 3;
            let c;
            if (colorPick === 0) {
                c = [bright, Math.floor(bright / 3), bright];
            } else if (colorPick === 1) {
                c = [Math.floor(bright / 3), Math.floor(bright / 2), bright];
            } else {
                c = [bright, Math.floor(bright / 2), Math.floor(bright / 4)];
            }
            ctx.fillStyle = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
            ctx.fillRect(sx, sy, 2, 2);
        }

        // Glowing border
        const pulse = Math.abs(Math.sin(this.animCounter * 0.04));
        const borderC = [
            Math.floor(100 + 80 * pulse),
            Math.floor(40 + 40 * pulse),
            Math.floor(180 + 60 * pulse),
        ];
        ctx.strokeStyle = `rgb(${borderC[0]}, ${borderC[1]}, ${borderC[2]})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(2 * SCALE, SCALE, SCREEN_WIDTH - 4 * SCALE, SCREEN_HEIGHT - 2 * SCALE);

        // Title
        ctx.fillStyle = `rgb(${Math.floor(200 + 55 * pulse)}, ${Math.floor(150 + 60 * pulse)}, 255)`;
        ctx.font = `bold ${Math.floor(6 * SCALE)}px monospace`;
        const title = "SECRET HANGAR";
        const titleMetrics = ctx.measureText(title);
        ctx.fillText(title, SCREEN_WIDTH / 2 - titleMetrics.width / 2, 3 * SCALE);

        ctx.fillStyle = `rgb(150, 100, 200)`;
        ctx.font = `${Math.floor(10 * SCALE / 4)}px monospace`;
        const subtitle = "~ CLASSIFIED PROTOTYPES ~";
        const subMetrics = ctx.measureText(subtitle);
        ctx.fillText(subtitle, SCREEN_WIDTH / 2 - subMetrics.width / 2, 3 * SCALE + Math.floor(6 * SCALE) + 2);

        // Ship list
        let y = 20 * SCALE;
        const lineH = 18 * SCALE;
        for (let i = 0; i < this.ships.length; i++) {
            const ship = this.ships[i];
            const isSel = (i === this.selected);

            if (isSel) {
                // Selection highlight
                const selAlpha = Math.floor(60 + 30 * pulse) / 255;
                ctx.fillStyle = `rgba(${ship.color1[0]}, ${ship.color1[1]}, ${ship.color1[2]}, ${selAlpha})`;
                ctx.fillRect(5 * SCALE, y, SCREEN_WIDTH - 10 * SCALE, lineH - 2 * SCALE);

                // Arrow
                ctx.fillStyle = `rgb(${ship.color2[0]}, ${ship.color2[1]}, ${ship.color2[2]})`;
                const ax = 5 * SCALE;
                const ay = y + Math.floor(lineH / 2) - SCALE;
                ctx.beginPath();
                ctx.moveTo(ax, ay - Math.floor(1.5 * SCALE));
                ctx.lineTo(ax + 2 * SCALE, ay);
                ctx.lineTo(ax, ay + Math.floor(1.5 * SCALE));
                ctx.closePath();
                ctx.fill();
            }

            // Draw ship sprite
            const spriteNames = {
                [SHIP_PURPLE_DEVIL]: "player_purple_devil",
                [SHIP_DOUBLE_BLASTERY]: "player_double_blastery",
                [SHIP_RED_BOMBER]: "player_red_bomber",
            };
            const spriteName = spriteNames[ship.shipType];
            if (spriteName && typeof spriteManager !== 'undefined') {
                try {
                    const spriteCanvas = spriteManager.get(spriteName);
                    if (spriteCanvas) {
                        const spriteX = SCREEN_WIDTH - 16 * SCALE;
                        const spriteY = y + Math.floor((lineH - spriteCanvas.height) / 2);
                        // Gentle bob animation for selected ship
                        const bob = isSel ? Math.sin(this.animCounter * 0.08) * 3 : 0;
                        ctx.drawImage(spriteCanvas, spriteX, spriteY + bob);
                    }
                } catch(e) {}
            }

            // Ship name
            const nc = isSel ? ship.color3 : ship.color1;
            ctx.fillStyle = `rgb(${nc[0]}, ${nc[1]}, ${nc[2]})`;
            ctx.font = `bold ${Math.floor(14 * SCALE / 4)}px monospace`;
            ctx.fillText(ship.name, 9 * SCALE, y + SCALE);

            // Pilot name
            ctx.fillStyle = `rgb(${ship.color2[0]}, ${ship.color2[1]}, ${ship.color2[2]})`;
            ctx.font = `bold ${Math.floor(11 * SCALE / 4)}px monospace`;
            ctx.fillText(`Pilot: ${ship.pilot}`, 9 * SCALE, y + SCALE + Math.floor(18 * SCALE / 4));

            // Description
            const dc = isSel ? [220, 210, 240] : [180, 170, 200];
            ctx.fillStyle = `rgb(${dc[0]}, ${dc[1]}, ${dc[2]})`;
            ctx.font = `${Math.floor(10 * SCALE / 4)}px monospace`;
            ctx.fillText(ship.desc, 9 * SCALE, y + SCALE + Math.floor(36 * SCALE / 4));

            y += lineH;
        }

        // Footer
        ctx.fillStyle = `rgb(120, 100, 160)`;
        ctx.font = `${Math.floor(10 * SCALE / 4)}px monospace`;
        const footer = "ENTER: Launch    ESC: Back";
        const footerMetrics = ctx.measureText(footer);
        ctx.fillText(footer, SCREEN_WIDTH / 2 - footerMetrics.width / 2, SCREEN_HEIGHT - 5 * SCALE);
    }
}
