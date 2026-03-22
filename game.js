/**
 * Phoenix 89 - Main Game Class (Canvas Web Port)
 * Central orchestrator for game state, input, logic, and rendering
 */

const STATE_TITLE = "title";
const STATE_PLAYING = "playing";
const STATE_SHOP = "shop";
const STATE_GAME_OVER = "game_over";
const STATE_SCORE = "score";
const STATE_HIGH_SCORES = "high_scores";
const STATE_ABOUT = "about";
const STATE_INSTRUCTIONS = "instructions";
const STATE_FEEDBACK = "feedback";
const STATE_PAUSED = "paused";
const STATE_DEATH_ANIM = "death_anim";
const STATE_SECRET_HANGAR = "secret_hangar";

// ─── Star Field Background ─────────────────────────────────

class StarField {
    constructor() {
        this.stars = [];
        this.scrollY = 0;
        // Deterministic pattern matching original
        let seed = 7689;
        const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
        for (let i = 0; i < 60; i++) {
            const x = 2 + Math.floor(rng() * (ORIG_WIDTH - 5));
            const y = Math.floor(rng() * (ORIG_HEIGHT * 2));
            const style = ["cross", "dot", "plus"][Math.floor(rng() * 3)];
            this.stars.push([x, y, style]);
        }
    }

    update() {
        this.scrollY += 0.5;
        if (this.scrollY >= ORIG_HEIGHT * 2) this.scrollY -= ORIG_HEIGHT * 2;
    }

    draw(ctx, fgColor = COLOR_FG) {
        const [r, g, b] = fgColor;
        for (const [sx, sy, style] of this.stars) {
            const dy = (sy + this.scrollY) % (ORIG_HEIGHT * 2);
            if (dy >= ORIG_HEIGHT) continue;
            const px = Math.floor(sx * SCALE);
            const py = Math.floor(dy * SCALE);
            const fadeZone = ORIG_HEIGHT * 0.18;
            let alpha = dy < fadeZone ? dy / fadeZone : 1;
            if (alpha < 0.08) continue;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.lineWidth = 1;
            const cx = px + SCALE + Math.floor(SCALE / 2);
            const cy2 = py + SCALE + Math.floor(SCALE / 2);
            if (style === "cross") {
                // Diagonal cross (X shape) like original
                ctx.beginPath();
                ctx.moveTo(cx - SCALE, cy2 - SCALE);
                ctx.lineTo(cx + SCALE, cy2 + SCALE);
                ctx.moveTo(cx + SCALE, cy2 - SCALE);
                ctx.lineTo(cx - SCALE, cy2 + SCALE);
                ctx.stroke();
            } else if (style === "plus") {
                // Plus shape (+)
                ctx.beginPath();
                ctx.moveTo(cx, cy2 - SCALE);
                ctx.lineTo(cx, cy2 + SCALE);
                ctx.moveTo(cx - SCALE, cy2);
                ctx.lineTo(cx + SCALE, cy2);
                ctx.stroke();
            } else {
                // Simple dot
                ctx.fillRect(cx, cy2, SCALE, SCALE);
            }
        }
    }
}

// ─── Scrolling Borders ─────────────────────────────────────

class ScrollingBorders {
    constructor() {
        this.scrollY = 0;
        this.PATTERN_LEN = 128;

        // Extracted from original TI-89 edgetile.i / edgemap.i
        const LEFT_TILE_0 = [9,8,7,6,5,6,7,8,9,10,11,10,9,8,7,8];
        const LEFT_TILE_1 = [9,10,11,11,11,11,10,9,8,7,8,9,8,7,8,9];
        const LEFT_MAP = [0,1,0,0,0,1,0,0];
        const RIGHT_TILE_0 = [6,7,8,9,10,9,8,7,6,5,4,5,6,7,8,7];
        const RIGHT_TILE_1 = [6,5,4,4,4,4,5,6,7,8,7,6,7,8,7,6];
        const RIGHT_MAP = [1,1,0,1,0,0,0,0];

        const leftTiles = [LEFT_TILE_0, LEFT_TILE_1];
        const rightTiles = [RIGHT_TILE_0, RIGHT_TILE_1];

        this.leftEdge = new Array(this.PATTERN_LEN);
        this.rightEdge = new Array(this.PATTERN_LEN);
        for (let tile = 0; tile < 8; tile++) {
            const ltd = leftTiles[LEFT_MAP[tile]];
            const rtd = rightTiles[RIGHT_MAP[tile]];
            for (let row = 0; row < 16; row++) {
                this.leftEdge[tile * 16 + row] = ltd[row];
                this.rightEdge[tile * 16 + row] = ORIG_WIDTH - 1 - rtd[row];
            }
        }
        this._cachedColor = null;
        this._stripCanvas = null;
    }

    _rebuildStrip(borderColor) {
        const [br, bg, bb] = borderColor;
        const h = this.PATTERN_LEN * SCALE;
        const canvas = new OffscreenCanvas(SCREEN_WIDTH, h);
        const sctx = canvas.getContext('2d');
        // Clear transparent
        sctx.clearRect(0, 0, SCREEN_WIDTH, h);

        const edge = `rgb(${br},${bg},${bb})`;
        const hi = `rgb(${Math.max(0,br-30)},${Math.max(0,bg-30)},${Math.max(0,bb-30)})`;
        const ckA = `rgb(${Math.max(0,br-60)},${Math.max(0,bg-60)},${Math.max(0,bb-60)})`;
        const ckB = `rgb(${Math.max(0,br-90)},${Math.max(0,bg-90)},${Math.max(0,bb-90)})`;

        for (let row = 0; row < this.PATTERN_LEN; row++) {
            const lb = this.leftEdge[row];
            const rb = this.rightEdge[row];
            const py = row * SCALE;

            // Left border
            for (let x = 0; x <= lb; x++) {
                const dist = lb - x;
                const c = dist === 0 ? edge : dist === 1 ? hi : ((x + row) & 1) ? ckB : ckA;
                sctx.fillStyle = c;
                sctx.fillRect(x * SCALE, py, SCALE, SCALE);
            }

            // Right border
            for (let x = rb; x < ORIG_WIDTH; x++) {
                const dist = x - rb;
                const c = dist === 0 ? edge : dist === 1 ? hi : ((x + row) & 1) ? ckB : ckA;
                sctx.fillStyle = c;
                sctx.fillRect(x * SCALE, py, SCALE, SCALE);
            }
        }
        this._stripCanvas = canvas;
        this._cachedColor = borderColor;
    }

    update() {
        this.scrollY += 1.0;
        if (this.scrollY >= this.PATTERN_LEN) this.scrollY -= this.PATTERN_LEN;
    }

    draw(ctx, borderColor, bgColor) {
        const colorKey = `${borderColor[0]},${borderColor[1]},${borderColor[2]}`;
        if (this._cachedColor !== colorKey || !this._stripCanvas) {
            this._rebuildStrip(borderColor);
            this._cachedColor = colorKey;
        }

        const scrollPx = Math.floor(this.scrollY) * SCALE;
        const stripH = this.PATTERN_LEN * SCALE;
        const gameH = (ORIG_HEIGHT - 15) * SCALE;

        // Blit strip with vertical scroll wrap
        const firstH = Math.min(stripH - scrollPx, gameH);
        ctx.drawImage(this._stripCanvas, 0, scrollPx, SCREEN_WIDTH, firstH, 0, 0, SCREEN_WIDTH, firstH);
        if (firstH < gameH) {
            const rem = gameH - firstH;
            ctx.drawImage(this._stripCanvas, 0, 0, SCREEN_WIDTH, rem, 0, firstH, SCREEN_WIDTH, rem);
        }
    }
}

// ─── Space Background ──────────────────────────────────────

class SpaceBackground {
    constructor() {
        this.stage = 0;
        this.elements = [];
        this._generate();
    }

    _generate() {
        this.elements = [];
        for (let i = 0; i < 3; i++) {
            this.elements.push({
                x: 20 + Math.random() * (ORIG_WIDTH - 40),
                y: Math.random() * ORIG_HEIGHT,
                size: 4 + Math.random() * 8,
                type: Math.random() < 0.5 ? 'nebula' : 'planet',
                color: [30 + Math.random() * 40, 20 + Math.random() * 40, 40 + Math.random() * 50],
                speed: 0.02 + Math.random() * 0.03,
            });
        }
    }

    setStage(stage) {
        this.stage = stage;
        this._generate();
    }

    update() {
        for (const el of this.elements) {
            el.y += el.speed;
            if (el.y > ORIG_HEIGHT + el.size) {
                el.y = -el.size;
                el.x = 20 + Math.random() * (ORIG_WIDTH - 40);
            }
        }
    }

    draw(ctx, theme) {
        for (const el of this.elements) {
            const px = Math.floor(el.x * SCALE);
            const py = Math.floor(el.y * SCALE);
            const sz = Math.floor(el.size * SCALE);
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = `rgb(${el.color[0]}, ${el.color[1]}, ${el.color[2]})`;
            if (el.type === 'nebula') {
                ctx.beginPath();
                ctx.arc(px, py, sz, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(px, py, sz / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        }
    }
}

// ─── Wave Transition ───────────────────────────────────────

class WaveTransition {
    /**
     * Hyperspace jump between waves - matches Python original.
     * Phases:
     * 1. Build-up (0-25%): Stars streak vertically, ship drifts up
     * 2. Lightspeed (25-55%): Full blur, ship rockets off top
     * 3. Arrival (55-80%): Ship reappears at bottom, stars decelerate
     * 4. Settle (80-100%): Everything returns to normal
     */
    constructor() {
        this.active = false;
        this.timer = 0;
        this.DURATION = 150; // frames at 60fps = 2.5 seconds (matches Python)
        this.levelGroup = 0;
        this.levelName = "";
        this.isLevel = false;
        this.playerRef = null;
        this.shipY = 0;
        this.shipX = 0;
        this.originalY = 0;
        this.streaks = [];
    }

    start(levelGroup, levelName, player = null, isLevel = false) {
        this.active = true;
        this.timer = 0;
        this.levelGroup = levelGroup;
        this.levelName = levelName;
        this.isLevel = isLevel;
        this.playerRef = player;

        if (player) {
            this.shipX = player.x;
            this.shipY = player.y;
            this.originalY = player.y;
        } else {
            this.shipX = ORIG_WIDTH / 2;
            this.shipY = PLAYER_MAX_Y - 4;
            this.originalY = this.shipY;
        }

        // Generate vertical star streaks
        this.streaks = [];
        for (let i = 0; i < 50; i++) {
            this.streaks.push({
                x: 12 + Math.floor(Math.random() * (ORIG_WIDTH - 24)),
                y: Math.random() * ORIG_HEIGHT,
                speed: 0.5 + Math.random(),
                length: 1 + Math.random() * 2,
                brightness: 0.4 + Math.random() * 0.6,
            });
        }
    }

    _getWarpSpeed(progress) {
        if (progress < 0.15) {
            return 1.0 + (progress / 0.15) * 4.0;
        } else if (progress < 0.55) {
            return 8.0 + Math.sin(progress * 10) * 2.0;
        } else if (progress < 0.80) {
            const decelP = (progress - 0.55) / 0.25;
            return 8.0 * (1.0 - decelP) + 1.0;
        }
        return 1.0;
    }

    update() {
        if (!this.active) return false;
        this.timer++;
        const progress = this.timer / this.DURATION;

        // Ship movement through phases
        if (progress < 0.25) {
            this.shipY = this.originalY - (progress / 0.25) * 10;
        } else if (progress < 0.45) {
            const warpP = (progress - 0.25) / 0.20;
            this.shipY = this.originalY - 10 - warpP * (ORIG_HEIGHT + 20);
        } else if (progress < 0.60) {
            this.shipY = -50;
        } else if (progress < 0.80) {
            const arrivalP = (progress - 0.60) / 0.20;
            this.shipY = ORIG_HEIGHT + 10 - arrivalP * (ORIG_HEIGHT + 10 - this.originalY);
        } else {
            this.shipY = this.originalY;
        }

        // Update player position during animation
        if (this.playerRef && this.playerRef.alive) {
            this.playerRef.y = this.shipY;
        }

        // Update streaks
        const warpSpeed = this._getWarpSpeed(progress);
        for (const s of this.streaks) {
            s.y += s.speed * warpSpeed;
            if (s.y > ORIG_HEIGHT + 5) {
                s.y = -1 - Math.random() * 4;
                s.x = 12 + Math.floor(Math.random() * (ORIG_WIDTH - 24));
            }
            s.length = Math.max(1, 2 + warpSpeed * 0.5);
        }

        if (this.timer >= this.DURATION) {
            this.active = false;
            if (this.playerRef && this.playerRef.alive) {
                this.playerRef.y = Math.max(PLAYER_MIN_Y,
                    Math.min(PLAYER_MAX_Y - this.playerRef.height + 1, this.originalY));
            }
            return true;
        }
        return false;
    }

    draw(ctx, fgColor = COLOR_FG) {
        if (!this.active) return;
        const progress = this.timer / this.DURATION;
        const warpSpeed = this._getWarpSpeed(progress);
        const [r, g, b] = fgColor;

        // Draw vertical star streaks
        for (const s of this.streaks) {
            const sx = Math.floor(s.x * SCALE);
            const sy = Math.floor(s.y * SCALE);
            const streakLen = Math.floor(s.length * SCALE * Math.min(8.0, warpSpeed));
            const bright = Math.max(30, Math.min(255,
                Math.floor(s.brightness * 255 * Math.min(1.0, warpSpeed / 3.0))));
            const endY = sy - streakLen;

            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${bright / 255})`;
            ctx.lineWidth = Math.max(1, Math.floor(SCALE / 2));
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx, endY);
            ctx.stroke();
        }

        // Edge blur during peak warp
        if (warpSpeed > 3.0) {
            const blurAlpha = Math.min(0.3, (warpSpeed - 3.0) * 0.08);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${blurAlpha})`;
            ctx.lineWidth = SCALE;
            for (let ly = 0; ly < SCREEN_HEIGHT; ly += SCALE * 2) {
                const bw = SCALE * 2 + Math.floor(Math.random() * SCALE * 6);
                ctx.beginPath();
                ctx.moveTo(0, ly);
                ctx.lineTo(bw, ly);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(SCREEN_WIDTH, ly);
                ctx.lineTo(SCREEN_WIDTH - bw, ly);
                ctx.stroke();
            }
        }

        // Text display during mid-section
        if (progress > 0.30 && progress < 0.75) {
            let textAlpha = 1.0;
            if (progress < 0.38) {
                textAlpha = (progress - 0.30) / 0.08;
            } else if (progress > 0.65) {
                textAlpha = (0.75 - progress) / 0.10;
            }
            textAlpha = Math.max(0, Math.min(1, textAlpha));
            ctx.globalAlpha = textAlpha;

            if (this.isLevel) {
                // Big "LEVEL X" text
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.font = `bold ${11 * SCALE}px monospace`;
                const levelText = `LEVEL ${this.levelGroup}`;
                const lw = ctx.measureText(levelText).width;
                ctx.fillText(levelText, SCREEN_WIDTH / 2 - lw / 2, SCREEN_HEIGHT / 2 - 3 * SCALE);

                if (this.levelName) {
                    ctx.font = `bold ${6 * SCALE}px monospace`;
                    const nw = ctx.measureText(this.levelName).width;
                    ctx.fillText(this.levelName, SCREEN_WIDTH / 2 - nw / 2, SCREEN_HEIGHT / 2 + 4 * SCALE);
                }
            } else {
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.font = `bold ${Math.floor(28 * SCALE / 4)}px monospace`;
                const waveText = `WAVE ${this.levelGroup}`;
                const ww = ctx.measureText(waveText).width;
                ctx.fillText(waveText, SCREEN_WIDTH / 2 - ww / 2, SCREEN_HEIGHT / 2);
            }

            ctx.globalAlpha = 1.0;
        }
    }
}

// ─── Game Class ────────────────────────────────────────────

class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;

        // Game state
        this.state = STATE_TITLE;
        this.running = true;
        this.logicCounter = 0;

        // Input tracking
        this.keys = {};

        // Sound system
        this.sound = window.soundManager;

        // Core systems
        this.spriteMgr = new SpriteManager();
        this.player = new Player();
        this.weaponSystem = new WeaponSystem();
        this.enemyMgr = new EnemyManager();
        this.levelMgr = new LevelManager(DIFF_BEGINNER);

        // UI systems
        this.hud = new HUD();
        this.shop = new Shop();
        this.titleScreen = new TitleScreen();
        this.highScoreScreen = new HighScoreScreen();
        this.scoreScreen = new ScoreScreen();
        this.aboutScreen = new AboutScreen();
        this.instructionsScreen = new InstructionsScreen();
        this.feedbackScreen = new FeedbackScreen();
        this.secretHangar = new SecretHangar();

        // Background systems
        this.starField = new StarField();
        this.borders = new ScrollingBorders();
        this.spaceBg = new SpaceBackground();
        this.waveTransition = new WaveTransition();

        // Track level groups for theme transitions
        this._lastLevelGroup = 0;
        this.levelCompleteTimer = 0;
        this._shopFromPause = false;

        // Death animation
        this.deathAnimTimer = 0;
        this.deathAnimDuration = 180;
        this.deathParticles = [];

        // Bomb wave effect
        this.bombWaveActive = false;
        this.bombWaveRadius = 0;
        this.bombWaveMaxRadius = 120;
        this.bombWaveSpeed = 3;
        this.bombWaveOrigin = [0, 0];
        this.calebBeamActive = false;
        this.calebBeamTimer = 0;
        this.calebBeamAngles = [];
        this.calebBeamDmgCooldown = 0;

        // Cheat code
        this.cheatBuffer = "";
        this.secretSCount = 0;
        this.secretSTimer = 0;

        this.finalScore = 0;
        this.radioPopupTimer = 0;

        // Setup event listeners
        window.addEventListener('keydown', (e) => this._onKeyDown(e));
        window.addEventListener('keyup', (e) => this._onKeyUp(e));
    }

    start() {
        this.sound.ensureAudioContext();
        this.sound.startMenuMusic();
        this._lastFrameTime = 0;
        requestAnimationFrame(this._gameLoop);
    }

    _gameLoop = (timestamp) => {
        // Cap to 60fps to match Python/Pygame version (clock.tick(60))
        const elapsed = timestamp - this._lastFrameTime;
        if (elapsed < 1000 / FPS - 0.5) {
            requestAnimationFrame(this._gameLoop);
            return;
        }
        this._lastFrameTime = timestamp;

        this._update();
        this._draw();
        requestAnimationFrame(this._gameLoop);
    }

    // ─── Input Handling ────────────────────────────────────

    _onKeyDown(event) {
        const key = event.key;
        this.keys[key] = true;

        // Prevent Tab from changing browser focus when typing feedback
        if (this.state === STATE_FEEDBACK && key === 'Tab') {
            event.preventDefault();
        }

        // Initialize audio on first interaction
        this.sound.ensureAudioContext();

        // Global keys: R cycles radio, M toggles music, C cycles themes
        // (disabled during feedback text input and high score entry)
        const typingState = this.state === STATE_FEEDBACK || (this.state === STATE_HIGH_SCORES && this.highScoreScreen.enteringName);
        if (!typingState) {
            if (key === 'r' || key === 'R') {
                if (this.state !== STATE_HIGH_SCORES) {
                    this.sound.nextTrack();
                    this.radioPopupTimer = 90;
                }
            } else if (key === 'm' || key === 'M') {
                this.sound.toggleMusic();
            } else if (key === 'c' || key === 'C') {
                if (this.state !== STATE_HIGH_SCORES && this.state !== STATE_SHOP) {
                    this.spriteMgr.nextTheme();
                }
            }
        }

        // Secret hangar: S x3 on title
        if (this.state === STATE_TITLE && (key === 's' || key === 'S')) {
            this.secretSCount++;
            this.secretSTimer = 45;
            if (this.secretSCount >= 3) {
                this.secretSCount = 0;
                this.secretHangar.show();
                this.state = STATE_SECRET_HANGAR;
                return;
            }
        }

        // State-specific key handling
        if (this.state === STATE_TITLE) {
            const action = this.titleScreen.handleEvent(event);
            if (action === "new_game") {
                this._startNewGame();
            } else if (action === "level_select") {
                this._startNewGame(this.titleScreen.startLevel);
            } else if (action === "high_scores") {
                this.highScoreScreen.show();
                this.state = STATE_HIGH_SCORES;
            } else if (action === "instructions") {
                this.instructionsScreen.show();
                this.state = STATE_INSTRUCTIONS;
            } else if (action === "feedback") {
                this.feedbackScreen.show(undefined, undefined, false);
                this.state = STATE_FEEDBACK;
            } else if (action === "about") {
                this.aboutScreen.show();
                this.state = STATE_ABOUT;
            }
        } else if (this.state === STATE_SECRET_HANGAR) {
            const result = this.secretHangar.handleEvent(event);
            if (result === "back") {
                this._returnToTitle();
            } else if (result && result !== "back") {
                this._startSecretGame(result);
            }
        } else if (this.state === STATE_PLAYING) {
            this._handlePlayingKeyDown(event);
        } else if (this.state === STATE_SHOP) {
            const done = this.shop.handleEvent(event, this.player);
            if (done) {
                if (this._shopFromPause) {
                    // Opened mid-wave from pause menu — resume current wave
                    this._shopFromPause = false;
                    this.state = STATE_PLAYING;
                } else {
                    // Normal between-wave shop — advance to next level
                    this.state = STATE_PLAYING;
                    this._advanceToNextLevel();
                }
            }
        } else if (this.state === STATE_PAUSED) {
            if (key === 'Escape') {
                this.state = STATE_PLAYING;
            } else if (key === 's' || key === 'S') {
                this._shopFromPause = true;
                this.shop.start();
                this.state = STATE_SHOP;
            } else if (key === 'n' || key === 'N') {
                // Skip to next wave (testing shortcut)
                this.enemyMgr.clear();
                this.state = STATE_PLAYING;
                this._advanceToNextLevel();
                this.player.cheated = true;
            } else if (key === 'f' || key === 'F') {
                const levelNum = this.levelMgr.currentLevelGroup + 1;
                const waveNum = this.levelMgr.waveInLevel > 0 ? this.levelMgr.waveInLevel : 1;
                this.feedbackScreen.show(levelNum, waveNum, true);
                this.state = STATE_FEEDBACK;
            } else if (key === 'q' || key === 'Q') {
                this._returnToTitle();
            }
        } else if (this.state === STATE_FEEDBACK) {
            const result = this.feedbackScreen.handleEvent(event);
            if (result === "back_to_pause") {
                this.state = STATE_PAUSED;
            } else if (result === "back_to_title") {
                this._returnToTitle();
            }
        } else if (this.state === STATE_SCORE) {
            const done = this.scoreScreen.handleEvent(event);
            if (done) {
                const rank = this.highScoreScreen.checkHighScore(this.finalScore);
                if (rank >= 0) {
                    this.highScoreScreen.startEntry(this.finalScore, rank, this.levelMgr.difficulty);
                    this.state = STATE_HIGH_SCORES;
                } else {
                    this._returnToTitle();
                }
            }
        } else if (this.state === STATE_HIGH_SCORES) {
            const done = this.highScoreScreen.handleEvent(event);
            if (done) {
                this._returnToTitle();
            }
        } else if (this.state === STATE_ABOUT) {
            const done = this.aboutScreen.handleEvent(event);
            if (done) {
                this._returnToTitle();
            }
        } else if (this.state === STATE_INSTRUCTIONS) {
            const done = this.instructionsScreen.handleEvent(event);
            if (done) {
                this._returnToTitle();
            }
        } else if (this.state === STATE_DEATH_ANIM) {
            // Allow skipping after 1 second
            if (this.deathAnimTimer > 30) {
                this.finalScore = this.scoreScreen.show(this.player, this.levelMgr, this.enemyMgr);
                this.state = STATE_SCORE;
            }
        }
    }

    _handlePlayingKeyDown(event) {
        const key = event.key;

        if (key === 'Escape') {
            this.state = STATE_PAUSED;
        } else if (key === 'f' || key === 'F') {
            // Cheat code: "fff" gives $2,500
            this.cheatBuffer += "f";
            if (this.cheatBuffer.endsWith("fff")) {
                this.player.cash = Math.min(this.player.cash + 2500, MAX_CASH);
                this.player.cheated = true;
                this.cheatBuffer = "";
            }
        } else if (key === 'b' || key === 'B') {
            // B key: mega weapon ONLY for the three kids' secret ships
            if (this.player.shipType === SHIP_DOUBLE_BLASTERY && this.player.megaReady) {
                if (this.player.fireMegaBomb()) {
                    this._megaBombDamage();
                    this.sound.play("explosion_large");
                }
            } else if (this.player.shipType === SHIP_RED_BOMBER && this.player.megaReady) {
                this._fireCalebSplitBeam();
                this.player.megaReady = false;
                this.player.megaCharge = 0;
                this.sound.play("explosion_large");
            }
            // Elise's mega could go here in the future
        } else if (key === 'Shift' && event.location === 2) {
            // Right Shift: bomb for ALL ships
            if (this.player.bombs > 0 && !this.bombWaveActive) {
                this.player.bombs--;
                this.bombWaveActive = true;
                this.bombWaveRadius = 0;
                this.bombWaveHit = new Set();
                this.bombWaveOrigin = [
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height / 2
                ];
                this.sound.play("bomb");
            }
        } else if (key >= '1' && key <= '8') {
            // Weapon selection
            const weaponIdx = parseInt(key) - 1;
            if (this.player.weaponsAvailable & (1 << weaponIdx)) {
                this.player.weaponSelected = weaponIdx;
            }
        } else if (key === '9') {
            // Key 9: switch to secret weapon if player has one
            if (this.player.shipType === SHIP_PURPLE_DEVIL) {
                this.player.weaponSelected = WEAPON_SNIPER_LASER;
            } else if (this.player.shipType === SHIP_DOUBLE_BLASTERY) {
                this.player.weaponSelected = WEAPON_BLASTERY;
            } else if (this.player.shipType === SHIP_RED_BOMBER) {
                this.player.weaponSelected = WEAPON_RED_CHARGE;
            }
        }
    }

    _onKeyUp(event) {
        this.keys[event.key] = false;
    }

    _returnToTitle() {
        this.state = STATE_TITLE;
        this.sound.startMenuMusic();
    }

    // ─── Game Start / Setup ────────────────────────────────

    _startNewGame(startLevel = 1) {
        this.player = new Player();
        this.weaponSystem = new WeaponSystem();
        this.weaponSystem.soundCallback = (name) => this.sound.play(name);
        this.enemyMgr = new EnemyManager();

        const diff = this.titleScreen.difficulty;
        this.levelMgr = new LevelManager(diff);
        this.enemyMgr.difficulty = diff;
        this.weaponSystem.difficulty = diff;
        this._lastLevelGroup = 0;
        this.levelCompleteTimer = 0;
        this.cheatBuffer = "";

        // ASM init_table: difficulty-scaled starting resources
        // Beginner: shield=48($30), cash=$200, Double Cannon
        // Intermediate: shield=32($20), cash=$50
        // Hard: shield=16($10), cash=0
        // Expert: shield=16($10), cash=0
        // (Scaled proportionally to our MAX_SHIELD=31)
        if (diff === DIFF_BEGINNER) {
            this.player.shield = MAX_SHIELD;           // full shield
            this.player.cash = 200;                     // starting cash
            this.player.weaponsAvailable = 0b00000011;  // normal + double cannon
            this.player.weaponSelected = WEAPON_DOUBLE;
        } else if (diff === DIFF_INTERMEDIATE) {
            this.player.shield = 21;                    // ~2/3 shield
            this.player.cash = 50;
        } else if (diff === DIFF_HARD) {
            this.player.shield = 10;                    // ~1/3 shield
            this.player.cash = 0;
        } else if (diff === DIFF_EXPERT) {
            this.player.shield = 10;                    // ~1/3 shield
            this.player.cash = 0;
        }

        // Skip ahead to requested level
        if (startLevel > 1) {
            this._skipToLevel(startLevel);
            this.player.cheated = true;  // mark as cheated for level skip
        }

        // Switch from menu music to gameplay music
        this.sound.startMusic(true);

        this.starField = new StarField();
        this.spaceBg = new SpaceBackground();

        this.state = STATE_PLAYING;
        this._advanceToNextLevel();
    }

    _skipToLevel(targetLevel) {
        // Fast-forward through the level sequence until we find the first wave
        // belonging to the target level group
        const seq = this.levelMgr.sequence;
        for (let i = 0; i < seq.length; i++) {
            const levelId = seq[i];
            if (levelId === LVL_SHOP || levelId === LVL_FREE_SHIP || levelId === LVL_RESTART) continue;
            const group = getLevelNumber(levelId);
            if (group >= targetLevel) {
                this.levelMgr.levelNumber = i;
                this.levelMgr.currentLevelGroup = group;
                return;
            }
        }
        // If target is beyond all levels, start at the end
        this.levelMgr.levelNumber = seq.length - 2;
    }

    _startSecretGame(shipInfo) {
        this.player = new Player();
        this.weaponSystem = new WeaponSystem();
        this.weaponSystem.soundCallback = (name) => this.sound.play(name);
        this.enemyMgr = new EnemyManager();

        const diff = this.titleScreen.difficulty;
        this.levelMgr = new LevelManager(diff);
        this.enemyMgr.difficulty = diff;
        this._lastLevelGroup = 0;
        this.levelCompleteTimer = 0;

        // Determine which secret ship
        let shipType;
        if (typeof shipInfo === 'number') {
            shipType = shipInfo;
        } else if (shipInfo && shipInfo.shipType !== undefined) {
            shipType = shipInfo.shipType;
        } else if (shipInfo && shipInfo.ship_type !== undefined) {
            shipType = shipInfo.ship_type;
        } else {
            shipType = SHIP_PURPLE_DEVIL;
        }

        this.player.shipType = shipType;
        this.player.loadShip();

        // Give all regular weapons + rapid fire (secret ships are powerful)
        this.player.weaponsAvailable = 0xFF;
        this.player.hasHomingMissiles = true;
        this.player.fireDelay = FIRE_DELAY_RAPID;

        // Set weapon and shield tiers
        const shieldTiers = {
            [SHIP_PURPLE_DEVIL]: MAX_SHIELD,      // Elise: full 31
            [SHIP_DOUBLE_BLASTERY]: MAX_SHIELD - 6, // Brady: 25
            [SHIP_RED_BOMBER]: MAX_SHIELD - 6,     // Caleb: 25
        };
        this.player.shield = shieldTiers[shipType] || MAX_SHIELD;

        if (shipInfo && shipInfo.weapon !== undefined) {
            this.player.weaponSelected = shipInfo.weapon;
        } else {
            const secretWeapons = {
                [SHIP_PURPLE_DEVIL]: WEAPON_SNIPER_LASER,
                [SHIP_DOUBLE_BLASTERY]: WEAPON_BLASTERY,
                [SHIP_RED_BOMBER]: WEAPON_RED_CHARGE,
            };
            this.player.weaponSelected = secretWeapons[shipType] || WEAPON_NORMAL;
        }

        // Purple Devil: init dragon and wing cooldown
        if (shipType === SHIP_PURPLE_DEVIL) {
            this.player.wingsCooldown = 300 + Math.floor(Math.random() * 300);
            this.player.initDragon();
        }

        // Switch to gameplay music
        this.sound.startMusic(true);

        this.starField = new StarField();
        this.spaceBg = new SpaceBackground();

        this.state = STATE_PLAYING;
        this._advanceToNextLevel();
    }

    // ─── Level Progression ─────────────────────────────────

    _advanceToNextLevel() {
        while (true) {
            const result = this.levelMgr.loadNextLevel(this.enemyMgr);

            if (result === LVL_SHOP) {
                this._shopFromPause = false; // normal between-wave shop
                this.shop.start();
                this.state = STATE_SHOP;
                return;
            } else if (result === LVL_FREE_SHIP) {
                this.player.shield = MAX_SHIELD;
                continue; // load next level
            } else if (result === LVL_RESTART) {
                this._gameOver();
                return;
            } else {
                // Normal combat level - clear bullets for new wave
                this.weaponSystem.clear();
                this.state = STATE_PLAYING;
                this.enemyMgr.scorePoints += 5;  // +5 per wave cleared

                // Sync current level to enemy manager for economy scaling
                const curGroup = this.levelMgr.currentLevelGroup;
                this.enemyMgr.currentLevel = Math.max(1, curGroup);

                if (curGroup > 0 && curGroup !== this._lastLevelGroup) {
                    this._lastLevelGroup = curGroup;

                    // Apply level color theme
                    if (typeof getLevelTheme === 'function') {
                        const theme = getLevelTheme(curGroup);
                        if (theme) {
                            this.spriteMgr.setLevelTheme(theme);
                        }
                    }

                    // Update background stage
                    this.spaceBg.setStage(curGroup);

                    // Show warp transition with level name
                    if (typeof getLevelName === 'function') {
                        const levelName = getLevelName(curGroup);
                        this.waveTransition.start(curGroup, levelName, this.player, true);
                    }
                }
                return;
            }
        }
    }

    _onWaveComplete() {
        this.sound.play("wave_complete");
        this._advanceToNextLevel();
    }

    // ─── Caleb's 5-Split Beam (persistent for 5 seconds) ──────

    _fireCalebSplitBeam() {
        // 5 beams spread from hard-left to hard-right, persist for 5 seconds (150 frames at 30fps)
        this.calebBeamActive = true;
        this.calebBeamTimer = 150;  // 5 seconds at 30fps logic rate
        this.calebBeamAngles = [-0.6, -0.3, 0, 0.3, 0.6];
        this.calebBeamDmgCooldown = 0;  // damage tick cooldown
    }

    _updateCalebBeam() {
        if (!this.calebBeamActive) return;

        this.calebBeamTimer--;
        if (this.calebBeamTimer <= 0 || !this.player.alive) {
            this.calebBeamActive = false;
            return;
        }

        // Damage enemies that intersect any beam every few frames
        this.calebBeamDmgCooldown--;
        if (this.calebBeamDmgCooldown > 0) return;
        this.calebBeamDmgCooldown = 3;  // deal damage every 3 logic frames

        const px = this.player.x + this.player.width / 2;
        const py = this.player.y;
        const beamDmg = 8;  // damage per tick (high sustained DPS across 5 beams)
        const beamHalfW = 4;  // hit detection half-width in original coords

        for (const angle of this.calebBeamAngles) {
            const sinA = Math.sin(angle);
            const cosA = Math.cos(angle);

            for (const e of this.enemyMgr.enemies) {
                if (!e.alive || e.etype === ETYPE_EXPLODE || e.etype === ETYPE_EXPLODE2 || e.etype === ETYPE_NONE) continue;

                const ex = e.x + e.width / 2;
                const ey = e.y + e.height / 2;

                // Check if enemy center is close to the beam line
                // Project enemy position onto beam direction
                const dx = ex - px;
                const dy = ey - py;

                // Beam goes upward: direction is (sinA, -cosA)
                const along = dx * sinA + dy * (-cosA);
                if (along < 0) continue;  // enemy is behind the ship

                // Perpendicular distance from beam line
                const perp = Math.abs(dx * (-cosA) - dy * (-sinA));
                if (perp < beamHalfW + e.width / 2) {
                    e.takeDamage(beamDmg, this.weaponSystem);
                    if (e.alive && e.hp > 0) {
                        // Small sound for continuous hits
                    }
                }
            }
        }

        // Also destroy enemy bullets that intersect beams
        this.weaponSystem.enemyBullets = this.weaponSystem.enemyBullets.filter(b => {
            if (b.damage < 0) return true;  // keep cash drops
            const bx = b.x;
            const by = b.y;
            for (const angle of this.calebBeamAngles) {
                const sinA = Math.sin(angle);
                const cosA = Math.cos(angle);
                const dx = bx - px;
                const dy = by - py;
                const along = dx * sinA + dy * (-cosA);
                if (along < 0) continue;
                const perp = Math.abs(dx * (-cosA) - dy * (-sinA));
                if (perp < 6) return false;  // destroy this bullet
            }
            return true;
        });
    }

    // ─── Mega Bomb Damage ──────────────────────────────────

    _megaBombDamage() {
        for (const e of this.enemyMgr.enemies) {
            if (e.alive && e.hp > 0) {
                e.hp = 0;
                // Transition to explosion so enemiesRemaining is tracked properly
                e.etype = (e.destruct === EDESTRUCT_BOSS || e.width > 14) ? ETYPE_EXPLODE2 : ETYPE_EXPLODE;
                e.animFrame = 0;
                e.data = 0;              // Reset explosion timer
                e.height = -10000;       // Make unhittable during explosion
                this.sound.play("explosion_large");
            }
        }
        this.weaponSystem.enemyBullets = [];
    }

    // ─── Update Logic ──────────────────────────────────────

    _update() {
        // Tick secret S-key timer
        if (this.secretSTimer > 0) {
            this.secretSTimer--;
            if (this.secretSTimer === 0) this.secretSCount = 0;
        }

        // Wave transition plays above normal update
        if (this.waveTransition.active) {
            const done = this.waveTransition.update();
            // Accelerate borders and stars during warp (matches Python: extra_ticks based on warp speed)
            const progress = this.waveTransition.timer / this.waveTransition.DURATION;
            const warpSpeed = this.waveTransition._getWarpSpeed(progress);
            const extraTicks = Math.floor(warpSpeed - 1);
            for (let i = 0; i < extraTicks; i++) {
                this.borders.update();
                this.starField.update();
            }
            if (done) {
                this.state = STATE_PLAYING;
            }
            return;
        }

        // Death animation update
        if (this.state === STATE_DEATH_ANIM) {
            this.deathAnimTimer++;
            for (const p of this.deathParticles) {
                p.x += p.dx;
                p.y += p.dy;
                p.dy += 0.02;
                p.life--;
            }
            this.deathParticles = this.deathParticles.filter(p => p.life > 0);
            this.starField.update();
            this.borders.update();
            if (this.deathAnimTimer >= this.deathAnimDuration) {
                this.finalScore = this.scoreScreen.show(this.player, this.levelMgr, this.enemyMgr);
                this.state = STATE_SCORE;
            }
            return;
        }

        if (this.state !== STATE_PLAYING) return;

        this.logicCounter++;
        if (this.logicCounter < LOGIC_FRAMES) return;
        this.logicCounter = 0;

        // ─── One logic tick at ~30fps ─────────────────

        // Update player movement
        this.player.update(this.keys);

        // Auto-fire when Space/Z held
        if (this.keys[' '] || this.keys['z'] || this.keys['Z']) {
            const prevCount = this.weaponSystem.playerBullets.length;
            this.weaponSystem.firePlayerWeapon(this.player, this.enemyMgr.enemies);
            if (this.weaponSystem.playerBullets.length > prevCount) {
                if (this.player.weaponSelected >= WEAPON_DUAL_PLASMA) {
                    this.sound.play("shoot_plasma");
                } else {
                    this.sound.play("shoot");
                }
            }
        }

        // Red Bomber companion drones fire automatically
        if (this.player.drones.length > 0 && this.enemyMgr.enemies.length > 0) {
            this.weaponSystem.fireDroneBullets(this.player.drones, this.enemyMgr.enemies);
        }

        // Purple Devil wing-open swarm release
        if (this.player.wingsOpen && !this.player.wingsSwarmFired
                && this.player.wingsOpenTimer < 40) {
            this.player.wingsSwarmFired = true;
            this.weaponSystem.fireSwarmRelease(this.player, this.enemyMgr.enemies);
        }

        // Update enemies
        this.enemyMgr.update(this.player, this.weaponSystem);

        // Update all bullets
        this.weaponSystem.update(this.player, this.enemyMgr.enemies);

        // Check collisions
        this.weaponSystem.checkCollisions(this.player, this.enemyMgr.enemies);

        // Update bomb wave
        if (this.bombWaveActive) {
            this._updateBombWave();
        }

        // Update Caleb's persistent split beam
        if (this.calebBeamActive) {
            this._updateCalebBeam();
        }

        // Scroll backgrounds
        this.starField.update();
        this.borders.update();
        this.spaceBg.update();

        // Tick time bonus
        this.levelMgr.tickTimeBonus();

        // Check player death
        if (!this.player.alive) {
            this._gameOver();
            return;
        }

        // Check level complete
        if (this.enemyMgr.levelComplete()) {
            this.levelCompleteTimer++;
            if (this.levelCompleteTimer === 1) {
                this.sound.play("wave_complete");
            }
            if (this.levelCompleteTimer >= 120) { // ~4 seconds at 30 logic fps
                this.levelCompleteTimer = 0;
                this._advanceToNextLevel();
            }
        } else {
            this.levelCompleteTimer = 0;
        }
    }

    _updateBombWave() {
        this.bombWaveRadius += this.bombWaveSpeed;
        if (this.bombWaveRadius > this.bombWaveMaxRadius) {
            this.bombWaveActive = false;
            return;
        }

        const [ox, oy] = this.bombWaveOrigin;
        const ringInner = Math.max(0, this.bombWaveRadius - 6);
        const ringOuter = this.bombWaveRadius + 2;

        const enemies = this.enemyMgr.enemies;
        for (let i = 0; i < enemies.length; i++) {
            // Skip already-hit enemies (matches Python's bomb_wave_hit set)
            if (this.bombWaveHit.has(i)) continue;
            const e = enemies[i];
            // Skip dead/exploding enemies (matches Python's etype check)
            if (!e.alive || e.etype === ETYPE_EXPLODE || e.etype === ETYPE_EXPLODE2 || e.etype === ETYPE_NONE) continue;
            const ex = e.x + e.width / 2;
            const ey = e.y + e.height / 2;
            const dist = Math.sqrt((ex - ox) ** 2 + (ey - oy) ** 2);
            if (dist >= ringInner && dist <= ringOuter) {
                // Use takeDamage to go through proper destroy chain (cash drops, etc.)
                e.takeDamage(BOMB_DAMAGE, this.weaponSystem);
                this.bombWaveHit.add(i);
            }
        }

        // Also clear enemy bullets in radius
        this.weaponSystem.enemyBullets = this.weaponSystem.enemyBullets.filter(b => {
            const dist = Math.sqrt((b.x - ox) ** 2 + (b.y - oy) ** 2);
            return dist > ringOuter;
        });
    }

    _gameOver() {
        if (!this.player.alive && this.state !== STATE_DEATH_ANIM) {
            const deathX = this.player.x + this.player.width / 2;
            const deathY = this.player.y + this.player.height / 2;
            this.deathAnimTimer = 0;
            this.deathParticles = [];

            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.3 + Math.random() * 2.2;
                this.deathParticles.push({
                    x: deathX, y: deathY,
                    dx: Math.cos(angle) * speed,
                    dy: Math.sin(angle) * speed,
                    life: 40 + Math.floor(Math.random() * 80),
                    size: 1 + Math.random() * 2,
                });
            }

            this.state = STATE_DEATH_ANIM;
            this.sound.play("explosion_large");
        } else if (this.player.alive) {
            // Game completed (all levels done)
            this.finalScore = this.scoreScreen.show(this.player, this.levelMgr, this.enemyMgr);
            this.state = STATE_SCORE;
        }
    }

    // ─── Draw / Render ─────────────────────────────────────

    _draw() {
        const ctx = this.ctx;
        const theme = this.spriteMgr.theme;

        if (this.state === STATE_TITLE) {
            this.titleScreen.draw(ctx);

        } else if (this.state === STATE_PLAYING) {
            const bg = theme.bg || COLOR_BG;
            ctx.fillStyle = `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`;
            ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

            // Background layers
            this.spaceBg.draw(ctx, theme);
            this.starField.draw(ctx, theme.stars || COLOR_FG);
            this.borders.draw(ctx, theme.border || [100, 100, 100], bg);

            // Enemies
            this.enemyMgr.draw(ctx, this.spriteMgr);

            // Player
            this.player.draw(ctx, this.spriteMgr);

            // Bullets
            this.weaponSystem.draw(ctx, this.spriteMgr);

            // HUD
            this.hud.draw(ctx, this.player, this.levelMgr, theme.hud || COLOR_FG, bg, this.enemyMgr);

            // Bomb wave effect
            if (this.bombWaveActive) {
                this._drawBombWave(ctx);
            }

            // Caleb's split beam effect
            if (this.calebBeamActive) {
                this._drawCalebBeams(ctx);
            }

            // Wave transition overlay
            if (this.waveTransition.active) {
                this.waveTransition.draw(ctx, theme.stars || COLOR_FG);
            }

        } else if (this.state === STATE_SHOP) {
            this.shop.draw(ctx, this.player);

        } else if (this.state === STATE_DEATH_ANIM) {
            const bg = theme.bg || COLOR_BG;
            ctx.fillStyle = `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`;
            ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

            this.spaceBg.draw(ctx, theme);
            this.starField.draw(ctx, theme.stars || COLOR_FG);
            this.borders.draw(ctx, theme.border || [100, 100, 100], bg);

            // Draw remaining enemies (frozen)
            this.enemyMgr.draw(ctx, this.spriteMgr);
            this.weaponSystem.draw(ctx, this.spriteMgr);

            // Draw explosion particles
            const ec = theme.explosion || [255, 150, 50];
            for (const p of this.deathParticles) {
                const px = Math.floor(p.x * SCALE);
                const py = Math.floor(p.y * SCALE);
                const sz = Math.max(1, Math.floor(p.size * SCALE));
                const alpha = Math.min(1, Math.max(0, p.life / 60));

                let r, g, b;
                if (p.life > 40) {
                    r = 255; g = 200; b = 50;
                } else if (p.life > 20) {
                    r = ec[0]; g = Math.max(0, ec[1] - 20); b = 0;
                } else {
                    r = ec[0] >> 1; g = Math.floor(ec[1] / 3); b = Math.floor(ec[2] / 3);
                }

                ctx.globalAlpha = alpha;
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.beginPath();
                ctx.arc(px, py, sz, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;

            // GAME OVER text
            const progress = this.deathAnimTimer / this.deathAnimDuration;
            if (progress > 0.4) {
                const goAlpha = Math.min(1, (progress - 0.4) / 0.2);
                ctx.globalAlpha = goAlpha;
                ctx.fillStyle = `rgb(${ec[0]}, ${ec[1]}, ${ec[2]})`;
                ctx.font = `bold ${Math.floor(30 * SCALE / 4)}px monospace`;
                const text = "GAME OVER";
                const w = ctx.measureText(text).width;
                ctx.fillText(text, SCREEN_WIDTH / 2 - w / 2, SCREEN_HEIGHT / 2);
                ctx.globalAlpha = 1.0;
            }

            this.hud.draw(ctx, this.player, this.levelMgr, theme.hud || COLOR_FG, theme.bg || COLOR_BG, this.enemyMgr);

        } else if (this.state === STATE_PAUSED) {
            const bg = theme.bg || COLOR_BG;
            ctx.fillStyle = `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`;
            ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
            this.starField.draw(ctx, theme.stars || COLOR_FG);
            this.hud.draw(ctx, this.player, this.levelMgr, theme.hud || COLOR_FG, bg, this.enemyMgr);

            ctx.fillStyle = `rgba(0, 0, 0, 0.5)`;
            ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

            ctx.fillStyle = 'rgb(255, 255, 255)';
            ctx.font = `bold ${Math.floor(24 * SCALE / 4)}px monospace`;
            const pausedText = "PAUSED";
            const pw = ctx.measureText(pausedText).width;
            ctx.fillText(pausedText, SCREEN_WIDTH / 2 - pw / 2, SCREEN_HEIGHT / 2 - 20);

            ctx.font = `${Math.floor(14 * SCALE / 4)}px monospace`;
            const infoText = "ESC: Resume | S: Store | F: Feedback / Bugs";
            const iw = ctx.measureText(infoText).width;
            ctx.fillText(infoText, SCREEN_WIDTH / 2 - iw / 2, SCREEN_HEIGHT / 2 + 20);

            const infoText2 = "N: Next Wave | Q: Quit";
            const iw2 = ctx.measureText(infoText2).width;
            ctx.fillText(infoText2, SCREEN_WIDTH / 2 - iw2 / 2, SCREEN_HEIGHT / 2 + 40);

        } else if (this.state === STATE_ABOUT) {
            this.aboutScreen.draw(ctx);
        } else if (this.state === STATE_INSTRUCTIONS) {
            this.instructionsScreen.draw(ctx);
        } else if (this.state === STATE_FEEDBACK) {
            this.feedbackScreen.draw(ctx);
        } else if (this.state === STATE_SCORE) {
            this.scoreScreen.draw(ctx);
        } else if (this.state === STATE_HIGH_SCORES) {
            this.highScoreScreen.draw(ctx);
        } else if (this.state === STATE_SECRET_HANGAR) {
            this.secretHangar.draw(ctx);
        }
    }

    _drawCalebBeams(ctx) {
        if (!this.calebBeamAngles || !this.player.alive) return;
        const scale = SCALE;
        const px = Math.floor((this.player.x + this.player.width / 2) * scale);
        const py = Math.floor(this.player.y * scale);
        const len = 500 * scale;

        // Flicker intensity for energy feel
        const flicker = 0.8 + 0.2 * Math.sin(this.calebBeamTimer * 0.5);
        // Fade out in last second (30 frames)
        const fadeFrac = Math.min(1, this.calebBeamTimer / 30);

        for (const angle of this.calebBeamAngles) {
            const endX = px + Math.sin(angle) * len;
            const endY = py - Math.cos(angle) * len;
            const alpha = flicker * fadeFrac;

            // Glow effect - wide dim beam
            ctx.strokeStyle = `rgba(255, 60, 30, ${alpha * 0.3})`;
            ctx.lineWidth = 8 * scale;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Core beam - bright narrow
            ctx.strokeStyle = `rgba(255, 150, 100, ${alpha * 0.7})`;
            ctx.lineWidth = 3 * scale;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Hot center
            ctx.strokeStyle = `rgba(255, 240, 200, ${alpha})`;
            ctx.lineWidth = 1 * scale;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }

    _drawBombWave(ctx) {
        const [ox, oy] = this.bombWaveOrigin;
        const r = this.bombWaveRadius;
        const sx = Math.floor(ox * SCALE);
        const sy = Math.floor(oy * SCALE);
        const sr = Math.floor(r * SCALE);

        const alpha = Math.max(0.1, 1 - r / this.bombWaveMaxRadius);
        ctx.strokeStyle = `rgba(255, 100, 100, ${alpha})`;
        ctx.lineWidth = Math.max(2, Math.floor(6 * SCALE * (1 - r / this.bombWaveMaxRadius)));

        if (sr > 0) {
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

// ─── Initialization ────────────────────────────────────────

window.addEventListener('load', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;

    window.game = new Game(canvas, ctx);
    window.game.start();
});
