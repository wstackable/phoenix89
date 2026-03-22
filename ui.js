/**
 * Phoenix 89 - UI System (Canvas)
 * HUD, Shop, Title Screen, High Scores, etc.
 * Constants are loaded from constants.js
 */

// ─── HUD Class ─────────────────────────────────────────────

class HUD {
    constructor() {}

    draw(ctx, player, levelMgr, fgColor = null, bgColor = null, enemyMgr = null) {
        const fg = fgColor || COLOR_FG;
        const bg = bgColor || COLOR_BG;

        // ─── Radio song name display (top-right) ───
        if (window.soundManager && window.soundManager.musicEnabled) {
            const trackName = window.soundManager.getTrackName();
            if (trackName && trackName !== "No Music") {
                const radioText = `♪ ${trackName}`;
                const radioFontSize = Math.floor(11 * SCALE / 4);
                ctx.font = `${radioFontSize}px monospace`;
                const textWidth = ctx.measureText(radioText).width;
                const rx = SCREEN_WIDTH - textWidth - 4 * SCALE;
                const ry = 3 * SCALE;

                // Semi-transparent background pill
                ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                const pad = Math.floor(SCALE * 0.8);
                ctx.fillRect(rx - pad, ry - radioFontSize - pad + 2, textWidth + pad * 2, radioFontSize + pad * 2);

                // Text with subtle color
                ctx.fillStyle = 'rgba(180, 200, 255, 0.75)';
                ctx.fillText(radioText, rx, ry);
            }
        }

        // Status bar background - 15 original rows to fit bar + text comfortably
        const statusY = (ORIG_HEIGHT - 15) * SCALE;
        ctx.fillStyle = `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`;
        ctx.fillRect(0, statusY, SCREEN_WIDTH, 15 * SCALE);

        // Top border line
        ctx.strokeStyle = `rgb(${fg[0]}, ${fg[1]}, ${fg[2]})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, statusY);
        ctx.lineTo(SCREEN_WIDTH, statusY);
        ctx.stroke();

        // Heart icon and shield bar
        const barY = statusY + 2 * SCALE;
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

        // Status text - below health bar with generous padding
        const textY = barY + barH + 3 * SCALE;
        const levelNum = levelMgr.currentLevelGroup + 1;
        const waveNum = levelMgr.waveInLevel > 0 ? levelMgr.waveInLevel : 1;
        const score = levelMgr.getRunningScore(player, enemyMgr);
        const status = `$${player.cash.toString().padStart(5, '0')}  HP:${player.shield.toString().padStart(2, '0')}  L${levelNum}-W${waveNum}  Gun:${player.weaponSelected + 1}  B:${player.bombs}  Score:${score}`;

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
            case 2: return !!(player.weaponsAvailable & (1 << WEAPON_DOUBLE));
            case 3: return !!(player.weaponsAvailable & (1 << WEAPON_TRIPLE));
            case 4: return !!(player.weaponsAvailable & (1 << WEAPON_QUAD));
            case 5: return player.fireDelay <= FIRE_DELAY_RAPID;
            case 6: return player.hasHomingMissiles;
            case 7: return !!(player.weaponsAvailable & (1 << WEAPON_DUAL_PLASMA));
            case 8: return player.shipType >= SHIP_HEAVY_DESTROYER;
            case 9: return !!(player.weaponsAvailable & (1 << WEAPON_GOLDEN_ARCHES));
            case 10: return player.shipType >= SHIP_PHOENIX;
            case 11: return !!(player.weaponsAvailable & (1 << WEAPON_TRIPLE_PLASMA));
            case 12: return !!(player.weaponsAvailable & (1 << WEAPON_DELUXE_PLASMA));
            default: return false;
        }
    }

    _applyPurchase(player, idx) {
        // Ships: if already owned, pressing Enter switches to that ship (free)
        if (idx === 8 && this._isOwned(player, 8)) {
            player.shipType = SHIP_HEAVY_DESTROYER;
            player.loadShip();
            return true;  // play "buy" sound as confirmation
        }
        if (idx === 10 && this._isOwned(player, 10)) {
            player.shipType = SHIP_PHOENIX;
            player.loadShip();
            return true;
        }

        // Non-ship items: block if already owned
        if (this._isOwned(player, idx) && idx > 1 && idx < 13) return false;

        switch (idx) {
            case 0: return true; // Exit
            case 1: // Shield recharge
                if (player.shield >= MAX_SHIELD) return false;
                player.shield = Math.min(player.shield + 1, MAX_SHIELD);
                return true;
            case 2: // Double cannon
                player.weaponsAvailable |= (1 << WEAPON_DOUBLE);
                player.weaponSelected = WEAPON_DOUBLE;
                return true;
            case 3: // Triple cannon
                player.weaponsAvailable |= (1 << WEAPON_TRIPLE);
                player.weaponSelected = WEAPON_TRIPLE;
                return true;
            case 4: // Quad cannon
                player.weaponsAvailable |= (1 << WEAPON_QUAD);
                player.weaponSelected = WEAPON_QUAD;
                return true;
            case 5: // Rapid fire
                player.fireDelay = FIRE_DELAY_RAPID;
                return true;
            case 6: // Homing missiles
                player.hasHomingMissiles = true;
                return true;
            case 7: // Dual plasma
                player.weaponsAvailable |= (1 << WEAPON_DUAL_PLASMA);
                player.weaponSelected = WEAPON_DUAL_PLASMA;
                return true;
            case 8: // Heavy Destroyer (first purchase)
                player.shipType = SHIP_HEAVY_DESTROYER;
                player.loadShip();
                return true;
            case 9: // Golden Arches
                player.weaponsAvailable |= (1 << WEAPON_GOLDEN_ARCHES);
                player.weaponSelected = WEAPON_GOLDEN_ARCHES;
                return true;
            case 10: // Phoenix (first purchase)
                player.shipType = SHIP_PHOENIX;
                player.loadShip();
                return true;
            case 11: // Triple Plasma
                player.weaponsAvailable |= (1 << WEAPON_TRIPLE_PLASMA);
                player.weaponSelected = WEAPON_TRIPLE_PLASMA;
                return true;
            case 12: // Deluxe Plasma
                player.weaponsAvailable |= (1 << WEAPON_DELUXE_PLASMA);
                player.weaponSelected = WEAPON_DELUXE_PLASMA;
                return true;
            case 13: // Bombs
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
            const shipInfo = `Ship: ${shipNames[player.shipType] || '?'} | Shield: ${player.shield}/${MAX_SHIELD} | Bombs: ${player.bombs}/${MAX_BOMBS}`;
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
                this.startLevel = Math.min(13, this.startLevel + 1);
                return null;
            }
        }

        // Left/Right for level select on Level Select row (now index 1, unchanged)

        // Menu navigation
        const numItems = 7;
        if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
            this.selected = (this.selected - 1 + numItems) % numItems;
        } else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
            this.selected = (this.selected + 1) % numItems;
        } else if (event.key === 'Enter' || event.key === ' ') {
            const actions = ["new_game", "level_select", "instructions", "high_scores", "changelog", "feedback", "about"];
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
        ctx.fillText(title, SCREEN_WIDTH / 2 - titleMetrics.width / 2, 12 * SCALE);

        // Subtitle
        ctx.font = `${Math.floor(10 * SCALE / 4)}px monospace`;
        const subtitle = "Claude Edition 1.57";
        const subMetrics = ctx.measureText(subtitle);
        ctx.fillText(subtitle, SCREEN_WIDTH / 2 - subMetrics.width / 2, 16 * SCALE);

        // Menu items
        const menuItems = ["New Game", "Level Select", "Instructions", "High Scores", "Versions - What We Did", "Suggestions / Bugs", "About"];
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
            "Inspired by Phoenix for TI-89",
            "by Patrick Davidson (~1998)",
            "A legendary space shooter written",
            "in 68000 assembly for a 160x100",
            "LCD on a TI-89 calculator.",
            "All in > 16kb memory. Insane.",
            "My favorite game to play in AP Calc.",
            "",
            "OUR CODEBASE: ~9700 lines of JS",
            "11 modules / procedural audio",
            "35+ enemy types / 11 weapons",
            "Built with Claude Code",
            "",
            "Will Stackable, March 2026",
            "",
            "CREATIVE DIRECTORS",
            "Brady, Elise & Caleb Stackable",
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

// ─── Change Log Screen Class ────────────────────────────────

class ChangeLogScreen {
    constructor() {
        this.active = false;
        this.scrollY = 0;
        this.maxScroll = 0;
        this._lines = [];       // pre-built line objects for rendering
    }

    show() {
        this.active = true;
        this.scrollY = 0;
        this._buildLines();
    }

    /**
     * Pre-build all display lines from CHANGELOG data so draw() is simple.
     * Each line: { text, style, indent }
     *   style: "version" | "date" | "change" | "blank"
     */
    _buildLines() {
        this._lines = [];
        for (let i = 0; i < CHANGELOG.length; i++) {
            const entry = CHANGELOG[i];
            if (i > 0) this._lines.push({ text: "", style: "blank" });
            this._lines.push({ text: `v${entry.version}`, style: "version" });
            this._lines.push({ text: entry.date, style: "date" });
            for (const change of entry.changes) {
                this._lines.push({ text: `- ${change}`, style: "change" });
            }
        }
        // Calculate max scroll (total content height minus visible area)
        const lineH = 4.5 * SCALE;
        const blankH = 2.5 * SCALE;
        const versionH = 6 * SCALE;
        let totalH = 0;
        for (const line of this._lines) {
            if (line.style === "blank") totalH += blankH;
            else if (line.style === "version") totalH += versionH;
            else totalH += lineH;
        }
        const headerH = 14 * SCALE;   // space for title + scroll hint
        const footerH = 8 * SCALE;    // space for bottom prompt
        const viewH = SCREEN_HEIGHT - headerH - footerH;
        this.maxScroll = Math.max(0, totalH - viewH);
    }

    handleEvent(event) {
        if (event.type !== 'keydown') return false;

        if (event.key === 'Escape' || event.key === 'Enter') {
            this.active = false;
            return true;
        }

        const scrollStep = 5 * SCALE;
        const pageStep = 20 * SCALE;

        if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
            this.scrollY = Math.min(this.maxScroll, this.scrollY + scrollStep);
        } else if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
            this.scrollY = Math.max(0, this.scrollY - scrollStep);
        } else if (event.key === ' ') {
            // Space = page down
            this.scrollY = Math.min(this.maxScroll, this.scrollY + pageStep);
        }

        return false;
    }

    draw(ctx) {
        ctx.fillStyle = `rgb(${COLOR_BG[0]}, ${COLOR_BG[1]}, ${COLOR_BG[2]})`;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        const fg = COLOR_FG;

        // Title
        ctx.fillStyle = `rgb(${fg[0]}, ${fg[1]}, ${fg[2]})`;
        ctx.font = `${Math.floor(20 * SCALE / 4)}px monospace`;
        const title = "CHANGE LOG";
        const titleMetrics = ctx.measureText(title);
        ctx.fillText(title, SCREEN_WIDTH / 2 - titleMetrics.width / 2, 4 * SCALE);

        // Scroll hint
        ctx.font = `${Math.floor(9 * SCALE / 4)}px monospace`;
        ctx.fillStyle = 'rgba(180, 180, 200, 0.6)';
        const hint = "Arrow keys to scroll / Space to page down";
        const hintMetrics = ctx.measureText(hint);
        ctx.fillText(hint, SCREEN_WIDTH / 2 - hintMetrics.width / 2, 8 * SCALE);

        // Clipping region for scrollable content
        const clipTop = 11 * SCALE;
        const clipBottom = SCREEN_HEIGHT - 7 * SCALE;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, clipTop, SCREEN_WIDTH, clipBottom - clipTop);
        ctx.clip();

        // Draw changelog lines
        const lineH = 4.5 * SCALE;
        const blankH = 2.5 * SCALE;
        const versionH = 6 * SCALE;
        let y = clipTop + 2 * SCALE - this.scrollY;

        const versionFont = `bold ${Math.floor(14 * SCALE / 4)}px monospace`;
        const dateFont = `${Math.floor(9 * SCALE / 4)}px monospace`;
        const changeFont = `${Math.floor(10 * SCALE / 4)}px monospace`;

        for (const line of this._lines) {
            let h;
            if (line.style === "blank") {
                h = blankH;
            } else if (line.style === "version") {
                h = versionH;
                if (y + h > clipTop - h && y < clipBottom + h) {
                    ctx.font = versionFont;
                    ctx.fillStyle = `rgb(${fg[0]}, ${fg[1]}, ${fg[2]})`;
                    ctx.fillText(line.text, 5 * SCALE, y + versionH * 0.7);
                }
            } else if (line.style === "date") {
                h = lineH;
                if (y + h > clipTop - h && y < clipBottom + h) {
                    ctx.font = dateFont;
                    ctx.fillStyle = 'rgba(160, 170, 200, 0.7)';
                    ctx.fillText(line.text, 5 * SCALE, y + lineH * 0.7);
                }
            } else {
                h = lineH;
                if (y + h > clipTop - h && y < clipBottom + h) {
                    ctx.font = changeFont;
                    ctx.fillStyle = `rgb(${fg[0]}, ${fg[1]}, ${fg[2]})`;
                    ctx.fillText(line.text, 7 * SCALE, y + lineH * 0.7);
                }
            }
            y += h;
        }

        ctx.restore();

        // Scroll position indicator (thin bar on right edge)
        if (this.maxScroll > 0) {
            const trackTop = clipTop;
            const trackH = clipBottom - clipTop;
            const thumbH = Math.max(10, trackH * (trackH / (trackH + this.maxScroll)));
            const thumbY = trackTop + (this.scrollY / this.maxScroll) * (trackH - thumbH);

            ctx.fillStyle = 'rgba(100, 100, 130, 0.3)';
            ctx.fillRect(SCREEN_WIDTH - 3 * SCALE, trackTop, 2 * SCALE, trackH);
            ctx.fillStyle = 'rgba(180, 180, 220, 0.5)';
            ctx.fillRect(SCREEN_WIDTH - 3 * SCALE, thumbY, 2 * SCALE, thumbH);
        }

        // Bottom prompt
        ctx.fillStyle = `rgb(${fg[0]}, ${fg[1]}, ${fg[2]})`;
        ctx.font = `${Math.floor(11 * SCALE / 4)}px monospace`;
        const prompt = "Press ESC to return";
        const promptMetrics = ctx.measureText(prompt);
        ctx.fillText(prompt, SCREEN_WIDTH / 2 - promptMetrics.width / 2, SCREEN_HEIGHT - 4 * SCALE);
    }
}

// ─── Instructions Screen Class ──────────────────────────────

class InstructionsScreen {
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
        ctx.font = `${Math.floor(18 * SCALE / 4)}px monospace`;
        const title = "HOW TO PLAY";
        const titleMetrics = ctx.measureText(title);
        ctx.fillText(title, SCREEN_WIDTH / 2 - titleMetrics.width / 2, 5 * SCALE);

        ctx.font = `${Math.floor(11 * SCALE / 4)}px monospace`;
        const sections = [
            { heading: "OBJECTIVE", lines: [
                "Destroy all enemies in each wave.",
                "Earn cash to buy upgrades in the shop.",
                "Survive as long as you can!",
            ]},
            { heading: "CONTROLS", lines: [
                "Arrow Keys .... Move",
                "Space ......... Fire",
                "Right Shift ... Drop Bomb",
                "1-8 ........... Switch Weapon",
                "ESC ........... Pause",
            ]},
            { heading: "OTHER KEYS", lines: [
                "R: Radio   C: Color Theme   M: Mute",
            ]},
        ];

        let y = 16 * SCALE;
        const leftX = 8 * SCALE;

        for (const section of sections) {
            // Section heading
            ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
            ctx.font = `bold ${Math.floor(12 * SCALE / 4)}px monospace`;
            ctx.fillText(section.heading, leftX, y);
            y += 5 * SCALE;

            // Section lines
            ctx.font = `${Math.floor(10 * SCALE / 4)}px monospace`;
            for (const line of section.lines) {
                ctx.fillText(line, leftX + 2 * SCALE, y);
                y += 4 * SCALE;
            }
            y += 3 * SCALE;
        }

        ctx.font = `${Math.floor(11 * SCALE / 4)}px monospace`;
        const prompt = "Press any key to return";
        const promptMetrics = ctx.measureText(prompt);
        ctx.fillText(prompt, SCREEN_WIDTH / 2 - promptMetrics.width / 2, SCREEN_HEIGHT - 6 * SCALE);
    }
}

// ─── Feedback Screen Class ──────────────────────────────────

class FeedbackScreen {
    constructor() {
        this.active = false;
        this.type = 0;           // 0 = Bug, 1 = Suggestion
        this.message = "";
        this.maxLen = 200;
        this.phase = "compose";  // compose, sending, thankyou
        this.gameInfo = "";
        this.cameFromPause = false;
    }

    show(levelNum, waveNum, fromPause = false) {
        this.active = true;
        this.type = 0;
        this.message = "";
        this.phase = "compose";
        this.cameFromPause = fromPause;
        if (levelNum !== undefined && waveNum !== undefined) {
            this.gameInfo = `L${levelNum}-W${waveNum}`;
        } else {
            this.gameInfo = "Main Menu";
        }
    }

    handleEvent(event) {
        if (event.type !== 'keydown') return null;

        if (this.phase === "thankyou") {
            if (event.key === 'Enter' || event.key === 'Escape' || event.key === ' ') {
                this.active = false;
                return this.cameFromPause ? "back_to_pause" : "back_to_title";
            }
            return null;
        }

        if (this.phase === "sending") return null;

        // Compose phase
        if (event.key === 'Escape') {
            this.active = false;
            return this.cameFromPause ? "back_to_pause" : "back_to_title";
        }

        if (event.key === 'Tab') {
            this.type = (this.type + 1) % 2;
            event.preventDefault();
            return null;
        }

        if (event.key === 'Enter' && this.message.trim().length > 0) {
            this._submit();
            return null;
        }

        if (event.key === 'Backspace') {
            this.message = this.message.slice(0, -1);
            return null;
        }

        // Typing characters
        if (event.key.length === 1 && this.message.length < this.maxLen) {
            this.message += event.key;
        }

        return null;
    }

    _submit() {
        this.phase = "sending";
        const typeStr = this.type === 0 ? "Bug" : "Suggestion";
        const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScMVpjo84LdvChAqCYzLjzxVVmcKbwY3wRB1MyYQ8rTC3WPYA/formResponse";

        const params = new URLSearchParams();
        params.append("entry.519590514", typeStr);
        params.append("entry.1216245615", this.message.trim());
        params.append("entry.2127842826", this.gameInfo);

        fetch(formUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        }).then(() => {
            this.phase = "thankyou";
        }).catch(() => {
            // Even on CORS error, Google Forms usually receives it
            this.phase = "thankyou";
        });
    }

    draw(ctx) {
        ctx.fillStyle = `rgb(${COLOR_BG[0]}, ${COLOR_BG[1]}, ${COLOR_BG[2]})`;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;

        if (this.phase === "thankyou") {
            ctx.font = `${Math.floor(18 * SCALE / 4)}px monospace`;
            const ty = "THANK YOU!";
            const tw = ctx.measureText(ty).width;
            ctx.fillText(ty, SCREEN_WIDTH / 2 - tw / 2, 30 * SCALE);

            ctx.font = `${Math.floor(12 * SCALE / 4)}px monospace`;
            const msg1 = "Your feedback has been submitted.";
            const msg2 = "Will is going to take a look at it.";
            const m1w = ctx.measureText(msg1).width;
            const m2w = ctx.measureText(msg2).width;
            ctx.fillText(msg1, SCREEN_WIDTH / 2 - m1w / 2, 42 * SCALE);
            ctx.fillText(msg2, SCREEN_WIDTH / 2 - m2w / 2, 48 * SCALE);

            ctx.font = `${Math.floor(11 * SCALE / 4)}px monospace`;
            const prompt = "Press any key to return";
            const pw = ctx.measureText(prompt).width;
            ctx.fillText(prompt, SCREEN_WIDTH / 2 - pw / 2, SCREEN_HEIGHT - 6 * SCALE);
            return;
        }

        if (this.phase === "sending") {
            ctx.font = `${Math.floor(16 * SCALE / 4)}px monospace`;
            const st = "Sending...";
            const sw = ctx.measureText(st).width;
            ctx.fillText(st, SCREEN_WIDTH / 2 - sw / 2, SCREEN_HEIGHT / 2);
            return;
        }

        // Compose phase
        ctx.font = `${Math.floor(18 * SCALE / 4)}px monospace`;
        const title = "FEEDBACK";
        const titleW = ctx.measureText(title).width;
        ctx.fillText(title, SCREEN_WIDTH / 2 - titleW / 2, 6 * SCALE);

        const leftX = 6 * SCALE;
        let y = 18 * SCALE;

        // Type selector
        ctx.font = `bold ${Math.floor(12 * SCALE / 4)}px monospace`;
        ctx.fillText("Type:  (TAB to switch)", leftX, y);
        y += 5 * SCALE;

        ctx.font = `${Math.floor(12 * SCALE / 4)}px monospace`;
        const types = ["Bug Report", "Suggestion (how could we improve the game?)"];
        for (let i = 0; i < types.length; i++) {
            const label = (i === this.type ? "> " : "  ") + types[i];
            ctx.fillStyle = i === this.type
                ? `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`
                : `rgb(${Math.floor(COLOR_FG[0] * 0.5)}, ${Math.floor(COLOR_FG[1] * 0.5)}, ${Math.floor(COLOR_FG[2] * 0.5)})`;
            ctx.fillText(label, leftX + 2 * SCALE, y);
            y += 4 * SCALE;
        }

        y += 3 * SCALE;
        ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
        ctx.font = `bold ${Math.floor(12 * SCALE / 4)}px monospace`;
        ctx.fillText("Message:", leftX, y);
        y += 5 * SCALE;

        // Text input box
        const boxX = leftX;
        const boxY = y;
        const boxW = SCREEN_WIDTH - 12 * SCALE;
        const boxH = 28 * SCALE;
        ctx.strokeStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Word-wrap the message text inside the box
        ctx.font = `${Math.floor(10 * SCALE / 4)}px monospace`;
        const charW = ctx.measureText("M").width;
        const maxCharsPerLine = Math.floor((boxW - 2 * SCALE) / charW);
        const lines = [];
        let remaining = this.message + "_";  // cursor
        while (remaining.length > 0) {
            lines.push(remaining.slice(0, maxCharsPerLine));
            remaining = remaining.slice(maxCharsPerLine);
        }

        let ty = boxY + 3 * SCALE;
        for (const line of lines) {
            if (ty + 3 * SCALE > boxY + boxH) break;
            ctx.fillText(line, boxX + SCALE, ty);
            ty += 3 * SCALE;
        }

        // Game info tag
        ctx.font = `${Math.floor(9 * SCALE / 4)}px monospace`;
        ctx.fillStyle = `rgb(${Math.floor(COLOR_FG[0] * 0.5)}, ${Math.floor(COLOR_FG[1] * 0.5)}, ${Math.floor(COLOR_FG[2] * 0.5)})`;
        ctx.fillText(`Location: ${this.gameInfo}`, leftX, boxY + boxH + 4 * SCALE);

        // Bottom prompts
        ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
        ctx.font = `${Math.floor(11 * SCALE / 4)}px monospace`;
        const p1 = "ENTER: Submit   ESC: Cancel";
        const p1w = ctx.measureText(p1).width;
        ctx.fillText(p1, SCREEN_WIDTH / 2 - p1w / 2, SCREEN_HEIGHT - 6 * SCALE);
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
        this.globalScores = [];
        this.loadingGlobal = false;
        this.lastFetchTime = 0;
        this.difficulty = DIFF_BEGINNER;
        this.enteringName = false;
        this.newScore = 0;
        this.newRank = -1;
        this.nameInput = "";
        this.maxNameLen = 12;
        this.blinkTimer = 0;
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

    _getDiffName(diff) {
        return { 1: "Beginner", 2: "Intermediate", 3: "Hard", 4: "Expert" }[diff] || "Beginner";
    }

    _submitGlobalScore(name, score, difficulty) {
        const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSeAFpn0ZtcWkWY1BJumSuGxOcxbpcuvPsUoLGu_ppA3Flr7Ew/formResponse";
        const params = new URLSearchParams();
        params.append("entry.527207579", name);
        params.append("entry.903331487", score.toString());
        params.append("entry.173028998", this._getDiffName(difficulty));

        fetch(formUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        }).catch(() => {});
    }

    fetchGlobalScores() {
        // Don't fetch more than once every 30 seconds
        const now = Date.now();
        if (now - this.lastFetchTime < 30000 && this.globalScores.length > 0) return;

        this.loadingGlobal = true;
        this.lastFetchTime = now;
        const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTxGVgr1ZW6tjTrrmSy414-B_GIwjS3f7KGWuVRYW1RcS_Iq9pfrgAJ9RUp-gZLHEtx9kSuYye31EQ0/pub?output=csv&cachebust=" + now;

        fetch(sheetUrl)
            .then(r => r.text())
            .then(csv => {
                const rows = csv.trim().split('\n').slice(1); // skip header
                const parsed = [];
                for (const row of rows) {
                    // CSV: Timestamp, Name, Score, Difficulty
                    const cols = row.split(',');
                    if (cols.length >= 3) {
                        const name = (cols[1] || "???").replace(/"/g, '').trim();
                        const score = parseInt(cols[2], 10) || 0;
                        const diff = (cols[3] || "").replace(/"/g, '').trim();
                        parsed.push([name, score, diff]);
                    }
                }
                // Sort by score descending, keep top 8
                parsed.sort((a, b) => b[1] - a[1]);
                this.globalScores = parsed.slice(0, 8);
                this.loadingGlobal = false;
            })
            .catch(() => {
                this.loadingGlobal = false;
            });
    }

    checkHighScore(score) {
        for (let i = 0; i < this.scores.length; i++) {
            if (score > this.scores[i][1]) {
                return i;
            }
        }
        return -1;
    }

    startEntry(score, rank, difficulty) {
        this.active = true;
        this.enteringName = true;
        this.newScore = score;
        this.newRank = rank;
        this.difficulty = difficulty || DIFF_BEGINNER;
        this.nameInput = "";
        this.blinkTimer = 0;
    }

    show() {
        this.active = true;
        this.enteringName = false;
        this.fetchGlobalScores();
    }

    handleEvent(event) {
        if (event.type !== 'keydown') return false;

        if (this.enteringName) {
            if (event.key === 'Enter' && this.nameInput.trim().length > 0) {
                const name = this.nameInput.trim();
                this.scores.splice(this.newRank, 0, [name, this.newScore]);
                this.scores = this.scores.slice(0, 8);
                this._save();
                this._submitGlobalScore(name, this.newScore, this.difficulty);
                this.enteringName = false;
                this.fetchGlobalScores();
                return true;
            } else if (event.key === 'Backspace') {
                this.nameInput = this.nameInput.slice(0, -1);
            } else if (event.key.length === 1 && this.nameInput.length < this.maxNameLen) {
                // Allow letters, numbers, spaces
                const ch = event.key;
                if (/[a-zA-Z0-9 ]/.test(ch)) {
                    this.nameInput += ch;
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

        if (this.enteringName) {
            // Name entry mode: show local scores
            ctx.font = `${Math.floor(18 * SCALE / 4)}px monospace`;
            const title = "HIGH SCORES";
            const titleMetrics = ctx.measureText(title);
            ctx.fillText(title, SCREEN_WIDTH / 2 - titleMetrics.width / 2, 5 * SCALE);

            ctx.font = `${Math.floor(14 * SCALE / 4)}px monospace`;
            let y = 18 * SCALE;
            for (let i = 0; i < this.scores.length; i++) {
                const [name, score] = this.scores[i];
                const highlight = i === this.newRank;

                if (highlight) {
                    const nameDisplay = this.nameInput || "___";
                    const line = ` ${(i + 1).toString().padStart(3, ' ')} ${nameDisplay.padEnd(12, ' ')} ${this.newScore.toString().padStart(8, ' ')}`;
                    ctx.fillText(line, SCREEN_WIDTH / 4, y);
                } else {
                    const line = ` ${(i + 1).toString().padStart(3, ' ')} ${name}  ${score.toString().padStart(8, ' ')}`;
                    ctx.fillText(line, SCREEN_WIDTH / 4, y);
                }

                y += 8 * SCALE;
            }
        } else {
            // Viewing mode: show global leaderboard
            ctx.font = `${Math.floor(18 * SCALE / 4)}px monospace`;
            const title = "GLOBAL HIGH SCORES";
            const titleMetrics = ctx.measureText(title);
            ctx.fillText(title, SCREEN_WIDTH / 2 - titleMetrics.width / 2, 5 * SCALE);

            ctx.font = `${Math.floor(14 * SCALE / 4)}px monospace`;
            let y = 18 * SCALE;

            if (this.loadingGlobal && this.globalScores.length === 0) {
                const loadText = "Loading scores...";
                const lw = ctx.measureText(loadText).width;
                ctx.fillText(loadText, SCREEN_WIDTH / 2 - lw / 2, y);
            } else if (this.globalScores.length === 0) {
                const emptyText = "No scores yet. Be the first!";
                const ew = ctx.measureText(emptyText).width;
                ctx.fillText(emptyText, SCREEN_WIDTH / 2 - ew / 2, y);
            } else {
                for (let i = 0; i < this.globalScores.length; i++) {
                    const [name, score, diff] = this.globalScores[i];
                    const line = ` ${(i + 1).toString().padStart(2, ' ')}  ${name.padEnd(12, ' ')} ${score.toString().padStart(8, ' ')}  ${diff}`;
                    ctx.fillText(line, 6 * SCALE, y);
                    y += 6 * SCALE;
                }
            }
        }

        if (this.enteringName) {
            // Text input area
            const entryY = SCREEN_HEIGHT - 22 * SCALE;
            ctx.font = `${Math.floor(14 * SCALE / 4)}px monospace`;
            const label = "Enter your name:";
            const lw = ctx.measureText(label).width;
            ctx.fillText(label, SCREEN_WIDTH / 2 - lw / 2, entryY);

            // Input box
            const boxW = 52 * SCALE;
            const boxH = 6 * SCALE;
            const boxX = SCREEN_WIDTH / 2 - boxW / 2;
            const boxY = entryY + 3 * SCALE;
            ctx.strokeStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(boxX, boxY, boxW, boxH);

            // Name text with blinking cursor
            ctx.font = `${Math.floor(18 * SCALE / 4)}px monospace`;
            const cursor = this.blinkTimer < 25 ? "_" : " ";
            const display = this.nameInput + cursor;
            ctx.fillText(display, boxX + 2 * SCALE, boxY + Math.floor(4.5 * SCALE));

            ctx.font = `${Math.floor(11 * SCALE / 4)}px monospace`;
            const prompt = "Type your name, then press ENTER";
            const pw = ctx.measureText(prompt).width;
            ctx.fillText(prompt, SCREEN_WIDTH / 2 - pw / 2, SCREEN_HEIGHT - 5 * SCALE);
        }
    }
}

// ─── Score Screen Class ────────────────────────────────────

class ScoreScreen {
    constructor() {
        this.active = false;
        this.scoreData = {};
    }

    show(player, levelMgr, enemyMgr) {
        this.active = true;
        const cheated = player.cheated || false;

        if (cheated) {
            this.scoreData = {
                killCount: 0, killScore: 0, cashBonus: 0,
                subtotal: 0, multiplier: 1, diffName: "Cheater", total: 0, cheated: true,
            };
        } else {
            const result = levelMgr.calculateScore(player, enemyMgr);
            this.scoreData = { ...result, cheated: false };
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
            const d = this.scoreData;
            const fontSize = Math.floor(14 * SCALE / 4);
            ctx.font = `${fontSize}px monospace`;
            let y = 22 * SCALE;
            const lineH = 7 * SCALE;

            // Enemies Destroyed (display count + point value)
            const killLabel = `Enemies Destroyed:`;
            const killVal = `${d.killCount} (${d.killScore} pts)`;
            ctx.fillText(killLabel, SCREEN_WIDTH / 4, y);
            y += lineH;
            ctx.fillStyle = 'rgba(180, 220, 255, 0.85)';
            const killValMetrics = ctx.measureText(killVal);
            ctx.fillText(killVal, SCREEN_WIDTH / 2 - killValMetrics.width / 2, y);
            y += lineH + 2 * SCALE;

            // Cash Bonus
            ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
            ctx.fillText(`Cash Bonus:`, SCREEN_WIDTH / 4, y);
            y += lineH;
            ctx.fillStyle = 'rgba(255, 220, 100, 0.85)';
            const cashStr = `$${(d.cashBonus * 10).toLocaleString()} remaining = ${d.cashBonus} pts`;
            const cashMetrics = ctx.measureText(cashStr);
            ctx.fillText(cashStr, SCREEN_WIDTH / 2 - cashMetrics.width / 2, y);
            y += lineH + 4 * SCALE;

            // Divider
            ctx.fillStyle = 'rgba(120, 120, 150, 0.4)';
            ctx.fillRect(SCREEN_WIDTH / 4, y - 2 * SCALE, SCREEN_WIDTH / 2, 1);
            y += 2 * SCALE;

            // Subtotal
            ctx.fillStyle = `rgb(${COLOR_FG[0]}, ${COLOR_FG[1]}, ${COLOR_FG[2]})`;
            const subLine = `Subtotal: ${d.subtotal}`;
            ctx.fillText(subLine, SCREEN_WIDTH / 4, y);
            y += lineH;

            // Difficulty multiplier
            const diffLine = `${d.diffName} Multiplier: x${d.multiplier}`;
            ctx.fillText(diffLine, SCREEN_WIDTH / 4, y);
            y += lineH + 3 * SCALE;

            // Total (bigger, centered)
            ctx.font = `bold ${Math.floor(18 * SCALE / 4)}px monospace`;
            const totalStr = `TOTAL: ${d.total.toLocaleString()}`;
            const totalMetrics = ctx.measureText(totalStr);
            ctx.fillText(totalStr, SCREEN_WIDTH / 2 - totalMetrics.width / 2, y);
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
