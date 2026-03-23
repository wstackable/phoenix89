/**
 * Phoenix 89 - Mobile Touch Support
 * Virtual joystick (via Nipplejs) + on-screen buttons.
 * Only initializes on touch-capable devices — desktop keyboard play is unaffected.
 */

// ─── Touch Detection ──────────────────────────────────────

const IS_TOUCH_DEVICE = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ─── Responsive Canvas Scaling ────────────────────────────

function setupResponsiveCanvas(canvas) {
    const resize = () => {
        // Use visualViewport on iOS Safari to get real available space
        const vv = window.visualViewport;
        const viewW = vv ? vv.width : window.innerWidth;
        const viewH = vv ? vv.height : window.innerHeight;

        // Game aspect ratio: 640/560 ≈ 1.143 (nearly square)
        const gameAspect = SCREEN_WIDTH / SCREEN_HEIGHT;
        const viewAspect = viewW / viewH;

        let displayW, displayH;
        if (viewAspect > gameAspect) {
            // Viewport is wider than game — fit to height (common on phones)
            displayH = viewH;
            displayW = viewH * gameAspect;
        } else {
            // Viewport is taller than game — fit to width
            displayW = viewW;
            displayH = viewW / gameAspect;
        }

        if (IS_TOUCH_DEVICE) {
            canvas.style.width = `${Math.floor(displayW)}px`;
            canvas.style.height = `${Math.floor(displayH)}px`;

            // DO NOT scale canvas internal resolution for DPR.
            // iPhone DPR is 3x which creates a huge 1920x1680 canvas — very laggy.
            // The pixel art uses image-rendering: pixelated anyway, so 1x is fine.
            // Only reset if size changed (avoids clearing canvas every resize)
            if (canvas.width !== SCREEN_WIDTH || canvas.height !== SCREEN_HEIGHT) {
                canvas.width = SCREEN_WIDTH;
                canvas.height = SCREEN_HEIGHT;
                const ctx = canvas.getContext('2d');
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
        } else {
            // Desktop: cap at native 640x560
            displayW = Math.min(displayW, SCREEN_WIDTH);
            displayH = Math.min(displayH, SCREEN_HEIGHT);
            canvas.style.width = `${Math.floor(displayW)}px`;
            canvas.style.height = `${Math.floor(displayH)}px`;
        }
    };

    window.addEventListener('resize', resize);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', resize);
    }
    window.addEventListener('orientationchange', () => {
        setTimeout(resize, 50);
        setTimeout(resize, 200);
        setTimeout(resize, 500);
    });
    resize();
}

// ─── Orientation Handling ─────────────────────────────────

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
        this._lastFireTap = 0;

        if (!IS_TOUCH_DEVICE) return;
        this._createUI();
        this._createSidebarUI();
        this._initJoystick();
        this._initButtons();
        this._initMenuTouch();
    }

    _createUI() {
        const container = document.createElement('div');
        container.id = 'mobileControls';
        container.style.cssText = `
            position: fixed; inset: 0; z-index: 100;
            pointer-events: none;
            display: none;
        `;
        document.body.appendChild(container);
        this.container = container;

        // Joystick zone (left half of screen)
        const joyZone = document.createElement('div');
        joyZone.id = 'joystickZone';
        joyZone.style.cssText = `
            position: absolute;
            left: 0; top: 0;
            width: 50%; height: 100%;
            pointer-events: auto;
        `;
        container.appendChild(joyZone);
        this.joyZone = joyZone;

        // Fire button — BIG, bottom-right
        const fireBtn = document.createElement('div');
        fireBtn.id = 'fireBtn';
        fireBtn.innerHTML = 'FIRE';
        fireBtn.style.cssText = `
            position: absolute;
            right: 16px; bottom: 24px;
            width: 90px; height: 90px;
            border-radius: 50%;
            background: rgba(202, 211, 185, 0.25);
            border: 3px solid rgba(202, 211, 185, 0.5);
            color: rgba(202, 211, 185, 0.85);
            font-family: monospace; font-size: 15px; font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            pointer-events: auto;
            user-select: none; -webkit-user-select: none;
            touch-action: none;
        `;
        container.appendChild(fireBtn);
        this.fireBtn = fireBtn;

        // Bomb button
        const bombBtn = document.createElement('div');
        bombBtn.id = 'bombBtn';
        bombBtn.innerHTML = 'BOMB';
        bombBtn.style.cssText = `
            position: absolute;
            right: 120px; bottom: 50px;
            width: 60px; height: 60px;
            border-radius: 50%;
            background: rgba(220, 80, 60, 0.2);
            border: 2px solid rgba(220, 80, 60, 0.5);
            color: rgba(220, 80, 60, 0.85);
            font-family: monospace; font-size: 11px; font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            pointer-events: auto;
            user-select: none; -webkit-user-select: none;
            touch-action: none;
        `;
        container.appendChild(bombBtn);
        this.bombBtn = bombBtn;

        // Mega / Special button (Brady & Caleb ships only)
        const megaBtn = document.createElement('div');
        megaBtn.id = 'megaBtn';
        megaBtn.innerHTML = 'MEGA';
        megaBtn.style.cssText = `
            position: absolute;
            right: 120px; bottom: 120px;
            width: 60px; height: 60px;
            border-radius: 50%;
            background: rgba(255, 210, 50, 0.2);
            border: 2px solid rgba(255, 210, 50, 0.4);
            color: rgba(255, 210, 50, 0.85);
            font-family: monospace; font-size: 11px; font-weight: bold;
            display: none; align-items: center; justify-content: center;
            pointer-events: auto;
            user-select: none; -webkit-user-select: none;
            touch-action: none;
        `;
        container.appendChild(megaBtn);
        this.megaBtn = megaBtn;

        // Pause button (top-right corner)
        const pauseBtn = document.createElement('div');
        pauseBtn.id = 'pauseBtn';
        pauseBtn.innerHTML = '&#10074;&#10074;';
        pauseBtn.style.cssText = `
            position: absolute;
            right: 8px; top: 8px;
            width: 44px; height: 44px;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(202, 211, 185, 0.35);
            color: rgba(202, 211, 185, 0.75);
            font-family: monospace; font-size: 16px;
            display: flex; align-items: center; justify-content: center;
            pointer-events: auto;
            user-select: none; -webkit-user-select: none;
            touch-action: none;
        `;
        container.appendChild(pauseBtn);
        this.pauseBtn = pauseBtn;
    }

    _createSidebarUI() {
        // Thumbstick visual cue — in the left black bar area
        // Shows a translucent thumb/circle imprint to guide the player
        const thumbCue = document.createElement('div');
        thumbCue.id = 'thumbCue';
        thumbCue.innerHTML = `
            <div style="
                width: 54px; height: 54px; border-radius: 50%;
                border: 2px dashed rgba(202, 211, 185, 0.55);
                display: flex; align-items: center; justify-content: center;
                position: relative;
            ">
                <div style="
                    width: 22px; height: 22px; border-radius: 50%;
                    background: rgba(202, 211, 185, 0.2);
                    border: 1.5px solid rgba(202, 211, 185, 0.4);
                "></div>
            </div>
            <div style="
                font-family: monospace; font-size: 10px;
                color: rgba(202, 211, 185, 0.6);
                margin-top: 4px; text-align: center;
                white-space: nowrap;
            ">MOVE</div>
        `;
        thumbCue.style.cssText = `
            position: fixed;
            left: 8px;
            bottom: 30%;
            z-index: 50;
            pointer-events: none;
            display: flex; flex-direction: column; align-items: center;
            opacity: 1;
        `;
        document.body.appendChild(thumbCue);
        this.thumbCue = thumbCue;

        // Radio button — in the right black bar area
        const radioBtn = document.createElement('div');
        radioBtn.id = 'radioBtn';
        radioBtn.innerHTML = '♪';
        radioBtn.style.cssText = `
            position: fixed;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 150;
            width: 46px; height: 46px;
            border-radius: 50%;
            background: rgba(202, 211, 185, 0.12);
            border: 2px solid rgba(202, 211, 185, 0.45);
            color: rgba(202, 211, 185, 0.8);
            font-family: monospace; font-size: 22px;
            display: flex; align-items: center; justify-content: center;
            pointer-events: auto;
            user-select: none; -webkit-user-select: none;
            touch-action: none;
            cursor: pointer;
        `;
        document.body.appendChild(radioBtn);
        this.radioBtn = radioBtn;

        // Radio button tap handler — cycle music track
        radioBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.soundManager) {
                // Ensure AudioContext is alive (iOS Safari suspends it aggressively)
                window.soundManager.ensureAudioContext();
                window.soundManager.nextTrack();
                // Flash the button
                radioBtn.style.background = 'rgba(202, 211, 185, 0.4)';
                radioBtn.style.color = 'rgba(202, 211, 185, 1.0)';
                setTimeout(() => {
                    radioBtn.style.background = 'rgba(202, 211, 185, 0.12)';
                    radioBtn.style.color = 'rgba(202, 211, 185, 0.8)';
                }, 200);
            }
            // Trigger radio popup in game
            if (this.game) this.game.radioPopupTimer = 90;
        }, { passive: false });

        // Position sidebar elements relative to the canvas
        this._updateSidebarPositions();
        window.addEventListener('resize', () => this._updateSidebarPositions());
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => this._updateSidebarPositions());
        }
    }

    _updateSidebarPositions() {
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();

        // Left black bar: 0 to rect.left
        const leftBarW = rect.left;
        // Right black bar: rect.right to window width
        const rightBarStart = rect.right;
        const rightBarW = window.innerWidth - rightBarStart;

        // Thumb cue: centered horizontally in left bar
        if (this.thumbCue) {
            if (leftBarW > 30) {
                this.thumbCue.style.display = 'flex';
                // Center the 54px-wide element in the left bar
                const thumbLeft = Math.max(2, Math.floor((leftBarW - 54) / 2));
                this.thumbCue.style.left = `${thumbLeft}px`;
                this.thumbCue.style.bottom = '30%';
            } else {
                this.thumbCue.style.display = 'none';
            }
        }

        // Radio button: centered horizontally in right bar
        if (this.radioBtn) {
            if (rightBarW > 30) {
                this.radioBtn.style.display = 'flex';
                // Center the 46px-wide element in the right bar
                const radioRight = Math.max(2, Math.floor((rightBarW - 46) / 2));
                this.radioBtn.style.right = `${radioRight}px`;
            } else {
                this.radioBtn.style.display = 'none';
            }
        }
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
            color: 'rgba(202, 211, 185, 0.3)',
            size: 110,
            threshold: 0.1,
            fadeTime: 150,
            restOpacity: 0.3,
            multitouch: true,
        });

        this.joystick.on('move', (evt, data) => {
            if (!data.vector) return;
            // Snappy response: clamp force to 1 quickly so full speed kicks in fast
            const force = Math.min(data.force, 1.5) / 1.0;
            const clampedForce = Math.min(force, 1.0);
            this.joystickDir.x = data.vector.x * clampedForce;
            this.joystickDir.y = -data.vector.y * clampedForce;  // nipplejs y is inverted
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
            this.fireBtn.style.background = 'rgba(202, 211, 185, 0.5)';
        }, { passive: false });

        this.fireBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.game.keys[' '] = false;
            this.fireBtn.style.background = 'rgba(202, 211, 185, 0.25)';
        }, { passive: false });

        this.fireBtn.addEventListener('touchcancel', () => {
            this.game.keys[' '] = false;
            this.fireBtn.style.background = 'rgba(202, 211, 185, 0.25)';
        });

        // Bomb button
        this.bombBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this._triggerKey('Shift');
            this.bombBtn.style.background = 'rgba(220, 80, 60, 0.5)';
        }, { passive: false });

        this.bombBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.bombBtn.style.background = 'rgba(220, 80, 60, 0.2)';
        }, { passive: false });

        this.bombBtn.addEventListener('touchcancel', () => {
            this.bombBtn.style.background = 'rgba(220, 80, 60, 0.2)';
        });

        // Mega button
        this.megaBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this._triggerKey('b');
            this.megaBtn.style.background = 'rgba(255, 210, 50, 0.5)';
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
        setTimeout(() => {
            const upEvent = new KeyboardEvent('keyup', { key, bubbles: true });
            window.dispatchEvent(upEvent);
        }, 50);
    }

    // ─── Menu Touch Support ──────────────────────────────────

    _initMenuTouch() {
        const canvas = this.game.canvas;

        // Track touch start position for drag scrolling
        this._touchStartY = 0;
        this._touchDragging = false;

        canvas.addEventListener('touchstart', (e) => {
            if (this.game.state === STATE_PLAYING) return;
            e.preventDefault();

            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const scaleX = SCREEN_WIDTH / rect.width;
            const scaleY = SCREEN_HEIGHT / rect.height;
            const x = (touch.clientX - rect.left) * scaleX;
            const y = (touch.clientY - rect.top) * scaleY;

            this._touchStartY = touch.clientY;
            this._touchStartX = x;
            this._touchStartGameY = y;
            this._touchDragging = false;

            // For non-scrollable states, handle tap immediately
            if (this.game.state !== STATE_CHANGELOG) {
                this._handleMenuTap(x, y);
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            if (this.game.state !== STATE_CHANGELOG) return;
            e.preventDefault();

            const touch = e.touches[0];
            const deltaY = this._touchStartY - touch.clientY;

            // If moved more than 8px, it's a drag
            if (Math.abs(deltaY) > 8) {
                this._touchDragging = true;
                const cl = this.game.changeLogScreen;
                if (cl) {
                    // Scale the drag distance to game coordinates
                    const rect = canvas.getBoundingClientRect();
                    const scaleY = SCREEN_HEIGHT / rect.height;
                    const scrollDelta = deltaY * scaleY;
                    cl.scrollY = Math.max(0, Math.min(cl.maxScroll, cl.scrollY + scrollDelta));
                }
                this._touchStartY = touch.clientY;
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            if (this.game.state === STATE_CHANGELOG) {
                // If it wasn't a drag, treat as a tap
                if (!this._touchDragging) {
                    this._handleMenuTap(this._touchStartX, this._touchStartGameY);
                }
            }
            this._touchDragging = false;
        }, { passive: false });
    }

    _handleMenuTap(x, y) {
        const state = this.game.state;

        if (state === STATE_LOADING) {
            this._triggerKey('Enter');
        } else if (state === STATE_TITLE) {
            this._handleTitleTap(x, y);
        } else if (state === STATE_SHOP) {
            this._handleShopTap(x, y);
        } else if (state === STATE_SECRET_HANGAR) {
            this._handleSecretHangarTap(x, y);
        } else if (state === STATE_PAUSED) {
            this._handlePauseTap(x, y);
        } else if (state === STATE_HIGH_SCORES) {
            this._handleHighScoreTap(x, y);
        } else if (state === STATE_CHANGELOG) {
            this._handleChangelogTap(x, y);
        } else if (state === STATE_FEEDBACK) {
            this._handleFeedbackTap(x, y);
        } else if (state === STATE_SCORE || state === STATE_ABOUT ||
                   state === STATE_INSTRUCTIONS || state === STATE_DEATH_ANIM ||
                   state === STATE_VICTORY) {
            this._triggerKey('Enter');
        }
    }

    _handleTitleTap(x, y) {
        const ts = this.game.titleScreen;
        // Menu items: y starts at 28*SCALE, lineH = 8*SCALE, 7 items
        // Use generous hit zones — extend each item's tap area
        const menuTop = 24 * SCALE;
        const lineH = 8 * SCALE;

        for (let i = 0; i < 7; i++) {
            const itemTop = menuTop + i * lineH;
            const itemBot = itemTop + lineH;
            if (y >= itemTop && y < itemBot) {
                if (i === ts.selected) {
                    // For New Game (0) and Level Select (1): left/right taps change difficulty/level
                    if ((i === 0 || i === 1) && x > SCREEN_WIDTH * 0.55) {
                        this._triggerKey('ArrowRight');
                        return;
                    }
                    if ((i === 0 || i === 1) && x < SCREEN_WIDTH * 0.35) {
                        this._triggerKey('ArrowLeft');
                        return;
                    }
                    // Center tap = activate
                    this._triggerKey('Enter');
                } else {
                    ts.selected = i;
                    window.soundManager?.play("menu_move");
                }
                return;
            }
        }
    }

    _handleShopTap(x, y) {
        // Match the mobile-aware layout in Shop.draw()
        const lineH = Math.floor(7.5 * SCALE);  // mobile lineH
        const menuTop = 6 * SCALE;               // mobile startY

        for (let i = 0; i < SHOP_ITEMS.length; i++) {
            const itemTop = menuTop + i * lineH;
            const itemBot = itemTop + lineH;
            if (y >= itemTop && y < itemBot) {
                if (i === this.game.shop.selected) {
                    this._triggerKey('Enter');
                } else {
                    this.game.shop.selected = i;
                    window.soundManager?.play("menu_move");
                }
                return;
            }
        }

        // Bottom area = exit shop
        if (y > SCREEN_HEIGHT - 15 * SCALE) {
            this._triggerKey('Escape');
        }
    }

    _handleSecretHangarTap(x, y) {
        const sh = this.game.secretHangar;

        if (sh.phase === 0) {
            const menuTop = 16 * SCALE;
            const lineH = 20 * SCALE;
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
            if (y < 16 * SCALE) {
                this._triggerKey('Escape');
            }
        } else {
            // Difficulty select phase
            const centerY = SCREEN_HEIGHT / 2;
            const diffLineH = 9 * SCALE;
            const startY = centerY - 2 * diffLineH;
            for (let i = 0; i < 4; i++) {
                const itemTop = startY + i * diffLineH;
                const itemBot = itemTop + diffLineH;
                if (y >= itemTop && y < itemBot) {
                    if (sh._diffList) sh.difficulty = sh._diffList[i];
                    return;
                }
            }
            if (y > centerY + 3 * diffLineH) {
                this._triggerKey('Enter');
            }
            if (y < startY - diffLineH) {
                this._triggerKey('Escape');
            }
        }
    }

    _handlePauseTap(x, y) {
        // The pause screen renders tappable button regions — see _drawPauseOverlay
        // Buttons are drawn at specific y positions; match them here
        const btnH = 10 * SCALE;
        const startY = SCREEN_HEIGHT / 2 - 4 * SCALE;
        const gap = 2 * SCALE;

        // Button 0: RESUME (startY to startY+btnH)
        // Button 1: SHOP   (startY+btnH+gap to ...)
        // Button 2: QUIT   (startY+2*(btnH+gap) to ...)
        const btnLeft = SCREEN_WIDTH / 2 - 25 * SCALE;
        const btnRight = SCREEN_WIDTH / 2 + 25 * SCALE;

        if (x < btnLeft || x > btnRight) return;

        for (let i = 0; i < 3; i++) {
            const top = startY + i * (btnH + gap);
            const bot = top + btnH;
            if (y >= top && y < bot) {
                if (i === 0) this._triggerKey('Escape');      // Resume
                else if (i === 1) this._triggerKey('s');       // Shop
                else if (i === 2) this._triggerKey('q');       // Quit
                return;
            }
        }
    }

    _handleHighScoreTap(x, y) {
        const hs = this.game.highScoreScreen;

        if (hs.enteringName) {
            // Submit button area (check FIRST so it's easy to tap)
            const btnW = 30 * SCALE;
            const btnH2 = 7 * SCALE;
            const btnX = SCREEN_WIDTH / 2 - btnW / 2;
            const btnY = SCREEN_HEIGHT - 14 * SCALE;
            if (y >= btnY && y <= btnY + btnH2 &&
                x >= btnX && x <= btnX + btnW &&
                hs.nameInput.trim().length > 0) {
                // Submit
                const name = hs.nameInput.trim();
                hs._submitGlobalScore(name, hs.newScore, hs.difficulty);
                hs.enteringName = false;
                hs.scrollOffset = 0;
                hs._cleanupMobileInput();
                return;
            }

            // Anywhere else on screen during name entry — focus the hidden input
            // to bring up virtual keyboard. This MUST run synchronously inside
            // the touchstart handler (not in a setTimeout) for iOS Safari to
            // actually show the keyboard.
            const input = document.getElementById('mobileNameInput');
            if (input) {
                input.value = hs.nameInput;
                input.focus();
            }
            return;
        }

        if (y < 20 * SCALE) {
            // Tab area
            if (x < SCREEN_WIDTH / 2) this._triggerKey('ArrowLeft');
            else this._triggerKey('ArrowRight');
        } else if (y < SCREEN_HEIGHT - 12 * SCALE) {
            // Score area: scroll
            if (y < SCREEN_HEIGHT / 2) this._triggerKey('ArrowUp');
            else this._triggerKey('ArrowDown');
        } else {
            this._triggerKey('Enter');  // back
        }
    }

    _handleFeedbackTap(x, y) {
        const fb = this.game.feedbackScreen;
        if (!fb) return;

        // Thank you phase — tap anywhere to exit
        if (fb.phase === "thankyou") {
            this._triggerKey('Enter');
            return;
        }

        if (fb.phase === "sending") return;

        // Compose phase
        // Type selector area (y ~ 18*SCALE to 30*SCALE)
        const typeAreaTop = 18 * SCALE;
        const typeAreaBot = 30 * SCALE;
        if (y >= typeAreaTop && y < typeAreaBot) {
            // Toggle type (same as Tab)
            fb.type = (fb.type + 1) % 2;
            return;
        }

        // Text box area — focus the hidden textarea
        const boxY = 40 * SCALE;
        const boxBot = boxY + 28 * SCALE;
        if (y >= boxY - 4 * SCALE && y < boxBot + 4 * SCALE) {
            const input = document.getElementById('mobileFeedbackInput');
            if (input) {
                input.value = fb.message;
                input.focus();
                input.click();
            }
            return;
        }

        // Bottom buttons area
        const btnH = 8 * SCALE;
        const btnW = 22 * SCALE;
        const gap = 4 * SCALE;
        const btnY = SCREEN_HEIGHT - 12 * SCALE;
        const cancelX = SCREEN_WIDTH / 2 - btnW - gap / 2;
        const submitX = SCREEN_WIDTH / 2 + gap / 2;

        if (y >= btnY && y <= btnY + btnH) {
            // CANCEL button
            if (x >= cancelX && x <= cancelX + btnW) {
                fb._cleanupMobileFeedbackInput();
                this._triggerKey('Escape');
                return;
            }
            // SUBMIT button
            if (x >= submitX && x <= submitX + btnW && fb.message.trim().length > 0) {
                fb._submit();
                return;
            }
        }
    }

    _handleChangelogTap(x, y) {
        // Bottom 20% = exit, otherwise use drag scrolling (handled by _initChangelogDrag)
        if (y > SCREEN_HEIGHT * 0.85) {
            this._triggerKey('Escape');
        }
        // Taps in the scroll area are handled by drag — no single-tap scroll
    }

    // ─── Per-Frame Update ─────────────────────────────────────

    update() {
        if (!IS_TOUCH_DEVICE) return;

        // Map joystick to game keys — use low threshold for responsive feel
        const THRESHOLD = 0.18;
        const keys = this.game.keys;
        keys['ArrowLeft'] = this.joystickDir.x < -THRESHOLD;
        keys['ArrowRight'] = this.joystickDir.x > THRESHOLD;
        keys['ArrowUp'] = this.joystickDir.y < -THRESHOLD;
        keys['ArrowDown'] = this.joystickDir.y > THRESHOLD;

        // Show/hide controls based on game state
        const playing = this.game.state === STATE_PLAYING;
        this.container.style.display = 'block';
        this.fireBtn.style.display = playing ? 'flex' : 'none';
        this.bombBtn.style.display = playing ? 'flex' : 'none';
        this.pauseBtn.style.display = playing ? 'flex' : 'none';
        this.joyZone.style.pointerEvents = playing ? 'auto' : 'none';

        // Sidebar elements: show thumb cue only during gameplay, radio always visible
        if (this.thumbCue) {
            const showThumb = playing;
            this.thumbCue.style.opacity = showThumb ? '1' : '0.3';
            this.thumbCue.style.transition = 'opacity 0.3s';
        }
        if (this.radioBtn) {
            // Radio button always visible (can change music from menu too)
            this._updateSidebarPositions();
        }

        // Mega button: only for Brady/Caleb
        const showMega = playing && this.game.player &&
            (this.game.player.shipType === SHIP_DOUBLE_BLASTERY ||
             this.game.player.shipType === SHIP_RED_BOMBER);
        this.megaBtn.style.display = showMega ? 'flex' : 'none';

        if (showMega && this.game.player.megaReady) {
            this.megaBtn.style.borderColor = 'rgba(255, 210, 50, 0.9)';
            this.megaBtn.style.background = 'rgba(255, 210, 50, 0.4)';
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
        e.preventDefault();
    }, { passive: false });

    // Prevent double-tap zoom
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

    const controls = new MobileControls(game);
    return controls;
}
