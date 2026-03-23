/**
 * Phoenix 89 - Mobile Touch Support
 * Virtual joystick (via Nipplejs) + on-screen buttons.
 * Only initializes on touch-capable devices — desktop keyboard play is unaffected.
 *
 * Controls:
 *   Left thumb  — Virtual joystick (movement)
 *   FIRE button — Tap/hold to shoot (Space). Double-tap for mega weapon (B key).
 *   BOMB button — Drop bomb (Shift)
 *   PAUSE icon  — Top-right, opens pause (Escape)
 *
 * Menu navigation on mobile:
 *   Canvas tap regions map to menu items, arrows, Enter, Escape.
 */

// ─── Touch Detection ──────────────────────────────────────

const IS_TOUCH_DEVICE = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ─── Responsive Canvas Scaling ────────────────────────────

function setupResponsiveCanvas(canvas) {
    const resize = () => {
        // Use visualViewport on iOS Safari to get real available space
        // (excludes Safari's toolbar/tab bar)
        const vv = window.visualViewport;
        const viewW = vv ? vv.width : window.innerWidth;
        const viewH = vv ? vv.height : window.innerHeight;

        // Game aspect ratio: 640/560 ≈ 1.143 (nearly square)
        const gameAspect = SCREEN_WIDTH / SCREEN_HEIGHT;
        const viewAspect = viewW / viewH;

        let displayW, displayH;
        if (viewAspect > gameAspect) {
            // Viewport is wider than game — fit to height, center horizontally
            displayH = viewH;
            displayW = viewH * gameAspect;
        } else {
            // Viewport is taller than game — fit to width
            displayW = viewW;
            displayH = viewW / gameAspect;
        }

        if (IS_TOUCH_DEVICE) {
            // Fill as much of the screen as possible
            canvas.style.width = `${Math.floor(displayW)}px`;
            canvas.style.height = `${Math.floor(displayH)}px`;

            // High-DPI: increase internal resolution for crisp pixels
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = SCREEN_WIDTH * dpr;
            canvas.height = SCREEN_HEIGHT * dpr;
            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        } else {
            // Desktop: cap at native 640x560, no DPR scaling
            displayW = Math.min(displayW, SCREEN_WIDTH);
            displayH = Math.min(displayH, SCREEN_HEIGHT);
            canvas.style.width = `${Math.floor(displayW)}px`;
            canvas.style.height = `${Math.floor(displayH)}px`;
        }
    };

    window.addEventListener('resize', resize);
    // visualViewport resize fires when Safari toolbar shows/hides
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', resize);
    }
    window.addEventListener('orientationchange', () => {
        // iOS needs a delay after orientation change
        setTimeout(resize, 50);
        setTimeout(resize, 200);
        setTimeout(resize, 500);
    });
    resize();
}

// ─── Fullscreen + Orientation ─────────────────────────────

function setupFullscreen(canvas) {
    if (!IS_TOUCH_DEVICE) return;

    // Request fullscreen on first user tap to hide Safari toolbar/tab bar
    let fullscreenRequested = false;
    const requestFS = () => {
        if (fullscreenRequested) return;
        fullscreenRequested = true;

        const el = document.documentElement;
        const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        if (rfs) {
            rfs.call(el).catch(() => {});
        }

        // iOS Safari doesn't support Fullscreen API, so also try scrolling to hide toolbar
        window.scrollTo(0, 1);
    };

    document.addEventListener('touchstart', requestFS, { once: true });
}

function setupOrientationHandling() {
    if (!IS_TOUCH_DEVICE) return;

    // Try to lock orientation
    try {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
        }
    } catch (e) {}

    // Create rotate prompt overlay
    const overlay = document.createElement('div');
    overlay.id = 'rotatePrompt';
    overlay.innerHTML = `
        <div style="
            position: fixed; inset: 0; z-index: 10000;
            background: rgba(0,0,0,0.92);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            color: #cad3b9; font-family: monospace;
            pointer-events: all;
        ">
            <div style="font-size: 48px; margin-bottom: 16px;">&#x1F4F1;&#x21BB;</div>
            <div style="font-size: 20px; margin-bottom: 8px;">Rotate Your Device</div>
            <div style="font-size: 14px; opacity: 0.7;">Phoenix 89 plays best in landscape</div>
        </div>
    `;
    overlay.style.display = 'none';
    document.body.appendChild(overlay);

    const checkOrientation = () => {
        const isPortrait = window.innerHeight > window.innerWidth * 1.2;
        overlay.style.display = isPortrait ? 'block' : 'none';
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 150));
    checkOrientation();
}

// ─── Virtual Joystick + Buttons ───────────────────────────

class MobileControls {
    constructor(game) {
        this.game = game;
        this.joystick = null;
        this.joystickDir = { x: 0, y: 0 };
        this._doubleTapTimer = 0;
        this._lastFireTap = 0;

        // Track active button touches
        this._activeTouches = {};

        if (!IS_TOUCH_DEVICE) return;
        this._createUI();
        this._initJoystick();
        this._initButtons();
        this._initMenuTouch();
    }

    _createUI() {
        // Container for all mobile UI overlays
        const container = document.createElement('div');
        container.id = 'mobileControls';
        container.style.cssText = `
            position: fixed; inset: 0; z-index: 100;
            pointer-events: none;
            display: none;
        `;
        document.body.appendChild(container);
        this.container = container;

        // Joystick zone (left 40% of screen)
        const joyZone = document.createElement('div');
        joyZone.id = 'joystickZone';
        joyZone.style.cssText = `
            position: absolute;
            left: 0; top: 0;
            width: 45%; height: 100%;
            pointer-events: auto;
        `;
        container.appendChild(joyZone);
        this.joyZone = joyZone;

        // Fire button (bottom-right)
        const fireBtn = document.createElement('div');
        fireBtn.id = 'fireBtn';
        fireBtn.innerHTML = 'FIRE';
        fireBtn.style.cssText = `
            position: absolute;
            right: 20px; bottom: 60px;
            width: 80px; height: 80px;
            border-radius: 50%;
            background: rgba(202, 211, 185, 0.25);
            border: 2px solid rgba(202, 211, 185, 0.5);
            color: rgba(202, 211, 185, 0.8);
            font-family: monospace; font-size: 14px; font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            pointer-events: auto;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
        `;
        container.appendChild(fireBtn);
        this.fireBtn = fireBtn;

        // Bomb button (above fire button)
        const bombBtn = document.createElement('div');
        bombBtn.id = 'bombBtn';
        bombBtn.innerHTML = 'BOMB';
        bombBtn.style.cssText = `
            position: absolute;
            right: 110px; bottom: 90px;
            width: 56px; height: 56px;
            border-radius: 50%;
            background: rgba(220, 80, 60, 0.2);
            border: 2px solid rgba(220, 80, 60, 0.45);
            color: rgba(220, 80, 60, 0.8);
            font-family: monospace; font-size: 11px; font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            pointer-events: auto;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
        `;
        container.appendChild(bombBtn);
        this.bombBtn = bombBtn;

        // Mega / Special button (only shows for Brady & Caleb ships, above bomb)
        const megaBtn = document.createElement('div');
        megaBtn.id = 'megaBtn';
        megaBtn.innerHTML = 'MEGA';
        megaBtn.style.cssText = `
            position: absolute;
            right: 110px; bottom: 155px;
            width: 56px; height: 56px;
            border-radius: 50%;
            background: rgba(255, 210, 50, 0.2);
            border: 2px solid rgba(255, 210, 50, 0.4);
            color: rgba(255, 210, 50, 0.8);
            font-family: monospace; font-size: 11px; font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            pointer-events: auto;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
            display: none;
        `;
        container.appendChild(megaBtn);
        this.megaBtn = megaBtn;

        // Pause button (top-right)
        const pauseBtn = document.createElement('div');
        pauseBtn.id = 'pauseBtn';
        pauseBtn.innerHTML = '&#10074;&#10074;';
        pauseBtn.style.cssText = `
            position: absolute;
            right: 8px; top: 8px;
            width: 40px; height: 40px;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid rgba(202, 211, 185, 0.3);
            color: rgba(202, 211, 185, 0.7);
            font-family: monospace; font-size: 16px;
            display: flex; align-items: center; justify-content: center;
            pointer-events: auto;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
        `;
        container.appendChild(pauseBtn);
        this.pauseBtn = pauseBtn;
    }

    _initJoystick() {
        if (typeof nipplejs === 'undefined') {
            console.warn('Nipplejs not loaded — joystick disabled');
            return;
        }

        this.joystick = nipplejs.create({
            zone: this.joyZone,
            mode: 'dynamic',
            position: { left: '50%', top: '50%' },
            color: 'rgba(202, 211, 185, 0.35)',
            size: 120,
            threshold: 0.15,
            fadeTime: 200,
            restOpacity: 0.4,
            multitouch: true,
        });

        this.joystick.on('move', (evt, data) => {
            if (!data.vector) return;
            // Normalize to -1..1 with dead zone
            const force = Math.min(data.force, 2) / 2;
            this.joystickDir.x = data.vector.x * force;
            this.joystickDir.y = -data.vector.y * force;  // nipplejs y is inverted
        });

        this.joystick.on('end', () => {
            this.joystickDir.x = 0;
            this.joystickDir.y = 0;
        });
    }

    _initButtons() {
        // Fire button: hold to auto-fire
        this.fireBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.game.keys[' '] = true;
            this.fireBtn.style.background = 'rgba(202, 211, 185, 0.45)';

            // Double-tap detection for mega weapon
            const now = Date.now();
            if (now - this._lastFireTap < 350) {
                // Double-tap — fire mega weapon
                this._triggerKey('b');
                this._lastFireTap = 0;
            } else {
                this._lastFireTap = now;
            }
        }, { passive: false });

        this.fireBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.game.keys[' '] = false;
            this.fireBtn.style.background = 'rgba(202, 211, 185, 0.25)';
        }, { passive: false });

        this.fireBtn.addEventListener('touchcancel', (e) => {
            this.game.keys[' '] = false;
            this.fireBtn.style.background = 'rgba(202, 211, 185, 0.25)';
        });

        // Bomb button
        this.bombBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this._triggerKey('Shift');
            this.bombBtn.style.background = 'rgba(220, 80, 60, 0.45)';
        }, { passive: false });

        this.bombBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.bombBtn.style.background = 'rgba(220, 80, 60, 0.2)';
        }, { passive: false });

        this.bombBtn.addEventListener('touchcancel', () => {
            this.bombBtn.style.background = 'rgba(220, 80, 60, 0.2)';
        });

        // Mega button (for Brady/Caleb special ships only)
        this.megaBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this._triggerKey('b');
            this.megaBtn.style.background = 'rgba(255, 210, 50, 0.45)';
        }, { passive: false });

        this.megaBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.megaBtn.style.background = 'rgba(255, 210, 50, 0.2)';
        }, { passive: false });

        this.megaBtn.addEventListener('touchcancel', () => {
            this.megaBtn.style.background = 'rgba(255, 210, 50, 0.2)';
        });

        // Pause button
        this.pauseBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this._triggerKey('Escape');
        }, { passive: false });
    }

    /**
     * Simulate a key press event through the game's existing handler.
     */
    _triggerKey(key) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true });
        window.dispatchEvent(event);
        // Release after a frame for one-shot keys
        setTimeout(() => {
            const upEvent = new KeyboardEvent('keyup', { key, bubbles: true });
            window.dispatchEvent(upEvent);
        }, 50);
    }

    // ─── Menu Touch Support ──────────────────────────────────

    _initMenuTouch() {
        const canvas = this.game.canvas;

        canvas.addEventListener('touchstart', (e) => {
            if (this.game.state === STATE_PLAYING) return;  // gameplay uses joystick+buttons
            e.preventDefault();

            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            // Convert touch coords to game canvas coords
            const scaleX = SCREEN_WIDTH / rect.width;
            const scaleY = SCREEN_HEIGHT / rect.height;
            const x = (touch.clientX - rect.left) * scaleX;
            const y = (touch.clientY - rect.top) * scaleY;

            this._handleMenuTap(x, y);
        }, { passive: false });
    }

    _handleMenuTap(x, y) {
        const state = this.game.state;

        if (state === STATE_LOADING) {
            this._triggerKey('Enter');
            return;
        }

        if (state === STATE_TITLE) {
            this._handleTitleTap(x, y);
            return;
        }

        if (state === STATE_SHOP) {
            this._handleShopTap(x, y);
            return;
        }

        if (state === STATE_SECRET_HANGAR) {
            this._handleSecretHangarTap(x, y);
            return;
        }

        if (state === STATE_PAUSED) {
            this._handlePauseTap(x, y);
            return;
        }

        if (state === STATE_HIGH_SCORES) {
            this._handleHighScoreTap(x, y);
            return;
        }

        if (state === STATE_SCORE || state === STATE_ABOUT ||
            state === STATE_INSTRUCTIONS || state === STATE_DEATH_ANIM ||
            state === STATE_VICTORY) {
            // Generic: tap anywhere to continue
            this._triggerKey('Enter');
            return;
        }

        if (state === STATE_CHANGELOG) {
            this._handleChangelogTap(x, y);
            return;
        }
    }

    _handleTitleTap(x, y) {
        const ts = this.game.titleScreen;
        // Menu items start at y = 28*SCALE with lineH = 8*SCALE, 7 items
        const menuTop = 28 * SCALE;
        const lineH = 8 * SCALE;
        const leftMargin = 7 * SCALE;

        // Check if tapping on a menu item
        for (let i = 0; i < 7; i++) {
            const itemTop = menuTop + i * lineH;
            const itemBot = itemTop + lineH;
            if (y >= itemTop && y < itemBot && x >= leftMargin) {
                if (i === ts.selected) {
                    // Already selected — activate it
                    this._triggerKey('Enter');
                } else {
                    // Select this item
                    ts.selected = i;
                    window.soundManager?.play("menu_move");
                }
                return;
            }
        }

        // Difficulty arrows on "New Game" row (left/right of difficulty text)
        if (ts.selected === 0) {
            if (x < SCREEN_WIDTH / 2) {
                this._triggerKey('ArrowLeft');
            } else {
                this._triggerKey('ArrowRight');
            }
        }

        // Level arrows on "Level Select" row
        if (ts.selected === 1) {
            if (x < SCREEN_WIDTH / 2) {
                this._triggerKey('ArrowLeft');
            } else {
                this._triggerKey('ArrowRight');
            }
        }
    }

    _handleShopTap(x, y) {
        // Shop items start at y = 8*SCALE, lineH = 5*SCALE
        const menuTop = 8 * SCALE;
        const lineH = 5 * SCALE;

        for (let i = 0; i < SHOP_ITEMS.length; i++) {
            const itemTop = menuTop + i * lineH;
            const itemBot = itemTop + lineH;
            if (y >= itemTop && y < itemBot) {
                if (i === this.game.shop.selected) {
                    this._triggerKey('Enter');
                } else {
                    this.game.shop.selected = i;
                }
                return;
            }
        }

        // Tap bottom area = exit shop
        if (y > SCREEN_HEIGHT - 15 * SCALE) {
            this._triggerKey('Escape');
        }
    }

    _handleSecretHangarTap(x, y) {
        const sh = this.game.secretHangar;

        if (sh.phase === 0) {
            // Ship selection: 3 ships starting at y=20*SCALE, lineH=18*SCALE
            const menuTop = 20 * SCALE;
            const lineH = 18 * SCALE;
            for (let i = 0; i < sh.ships.length; i++) {
                const itemTop = menuTop + i * lineH;
                const itemBot = itemTop + lineH;
                if (y >= itemTop && y < itemBot) {
                    if (i === sh.selected) {
                        this._triggerKey('Enter');
                    } else {
                        sh.selected = i;
                    }
                    return;
                }
            }
            // Top area = back
            if (y < 20 * SCALE) {
                this._triggerKey('Escape');
            }
        } else {
            // Difficulty select phase: 4 difficulty options
            // They're arranged as a vertical list in the overlay
            const centerY = SCREEN_HEIGHT / 2;
            const diffLineH = 8 * SCALE;
            const startY = centerY - 2 * diffLineH;
            for (let i = 0; i < 4; i++) {
                const itemTop = startY + i * diffLineH;
                const itemBot = itemTop + diffLineH;
                if (y >= itemTop && y < itemBot) {
                    sh.difficulty = sh._diffList[i];
                    return;
                }
            }
            // Bottom area = launch
            if (y > centerY + 3 * diffLineH) {
                this._triggerKey('Enter');
            }
            // Top area = back
            if (y < startY) {
                this._triggerKey('Escape');
            }
        }
    }

    _handlePauseTap(x, y) {
        // Pause menu: Resume, Shop, Skip Wave, Feedback, Quit
        const centerX = SCREEN_WIDTH / 2;
        const third = SCREEN_HEIGHT / 3;

        if (y < third) {
            // Resume
            this._triggerKey('Escape');
        } else if (y < third * 2) {
            // Shop
            this._triggerKey('s');
        } else {
            // Quit
            this._triggerKey('q');
        }
    }

    _handleHighScoreTap(x, y) {
        const hs = this.game.highScoreScreen;

        if (hs.enteringName) {
            // Tapping while entering name — don't interfere with keyboard
            return;
        }

        // Tab area: top section. Left half = previous tab, right half = next tab
        if (y < 20 * SCALE) {
            if (x < SCREEN_WIDTH / 2) {
                this._triggerKey('ArrowLeft');
            } else {
                this._triggerKey('ArrowRight');
            }
            return;
        }

        // Score area: scroll up/down
        if (y >= 20 * SCALE && y < SCREEN_HEIGHT - 10 * SCALE) {
            if (y < SCREEN_HEIGHT / 2) {
                this._triggerKey('ArrowUp');
            } else {
                this._triggerKey('ArrowDown');
            }
            return;
        }

        // Bottom area: back
        this._triggerKey('Enter');
    }

    _handleChangelogTap(x, y) {
        // Top/bottom third: scroll up/down. Middle: exit
        if (y < SCREEN_HEIGHT * 0.33) {
            this._triggerKey('ArrowUp');
        } else if (y > SCREEN_HEIGHT * 0.66) {
            this._triggerKey('ArrowDown');
        } else {
            this._triggerKey('Escape');
        }
    }

    // ─── Per-Frame Update ─────────────────────────────────────

    update() {
        if (!IS_TOUCH_DEVICE) return;

        // Map joystick to game keys
        const THRESHOLD = 0.25;
        const keys = this.game.keys;
        keys['ArrowLeft'] = this.joystickDir.x < -THRESHOLD;
        keys['ArrowRight'] = this.joystickDir.x > THRESHOLD;
        keys['ArrowUp'] = this.joystickDir.y < -THRESHOLD;
        keys['ArrowDown'] = this.joystickDir.y > THRESHOLD;

        // Show/hide controls based on game state
        const playing = this.game.state === STATE_PLAYING;
        this.container.style.display = 'block';  // always show on mobile
        this.fireBtn.style.display = playing ? 'flex' : 'none';
        this.bombBtn.style.display = playing ? 'flex' : 'none';
        this.pauseBtn.style.display = playing ? 'flex' : 'none';
        this.joyZone.style.pointerEvents = playing ? 'auto' : 'none';

        // Show mega button only for Brady/Caleb ships during gameplay
        const showMega = playing && this.game.player &&
            (this.game.player.shipType === SHIP_DOUBLE_BLASTERY ||
             this.game.player.shipType === SHIP_RED_BOMBER);
        this.megaBtn.style.display = showMega ? 'flex' : 'none';

        // Update mega button glow when charged
        if (showMega && this.game.player.megaReady) {
            this.megaBtn.style.borderColor = 'rgba(255, 210, 50, 0.9)';
            this.megaBtn.style.background = 'rgba(255, 210, 50, 0.35)';
        } else if (showMega) {
            this.megaBtn.style.borderColor = 'rgba(255, 210, 50, 0.4)';
            this.megaBtn.style.background = 'rgba(255, 210, 50, 0.2)';
        }
    }
}

// ─── Initialization ───────────────────────────────────────

function initMobile(game) {
    if (!IS_TOUCH_DEVICE) return null;

    // Prevent bounce/zoom on mobile
    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('#mobileControls') || e.target === game.canvas) {
            e.preventDefault();
        }
    }, { passive: false });

    // Prevent double-tap zoom on game canvas and controls (but not form inputs)
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd < 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });

    setupResponsiveCanvas(game.canvas);
    setupOrientationHandling();
    setupFullscreen(game.canvas);

    const controls = new MobileControls(game);
    return controls;
}
