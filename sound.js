/**
 * Phoenix 89 - Sound System (Web Audio API)
 * Procedurally generates 8-bit style sound effects
 */

class SoundManager {
    constructor() {
        this.enabled = true;
        this.musicEnabled = true;
        this.initialized = false;
        this.audioContext = null;
        this.sfx = {};
        this.trackNames = [];
        this.currentTrack = 0;
        this.music = null;
        this.musicGain = null;

        // Initialize will happen on first user interaction
        this.initAudioOnce = false;
    }

    /**
     * Initialize AudioContext on first user interaction (browser policy)
     */
    ensureAudioContext() {
        if (!this.audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = 0.4;
            this.musicGain.connect(this.audioContext.destination);

            this.initialized = true;
            this._generateSoundEffects();
        }

        // Retry any music that was blocked by autoplay policy
        // (must run even if audioContext already existed, since the
        // Audio element's .play() needs a direct user gesture)
        if (this._pendingMusicType) {
            const type = this._pendingMusicType;
            this._pendingMusicType = null;
            this._playMusicTrack(type);
        }
    }

    /**
     * Generate all procedural sound effects
     */
    _generateSoundEffects() {
        this.sfx = {
            "shoot": this._genShoot(),
            "shoot_plasma": this._genShootPlasma(),
            "shoot_homing": this._genShoot(), // reuse
            "explosion_small": this._genExplosionSmall(),
            "explosion_large": this._genExplosionLarge(),
            "hit": this._genPlayerHit(),
            "cash": this._genCashPickup(),
            "death": this._genPlayerDeath(),
            "buy": this._genShopBuy(),
            "denied": this._genShopDenied(),
            "wave_complete": this._genWaveComplete(),
            "game_over": this._genPlayerDeath(),
            "menu_move": this._genRadioClick(),
            "menu_select": this._genShopBuy(),
            "bomb": this._genExplosionLarge(),
            "radio": this._genRadioClick(),
        };
    }

    /**
     * Play a sound effect by name
     */
    play(name) {
        if (!this.enabled) return;
        if (!this.initialized) this.ensureAudioContext();

        // Resume AudioContext if iOS Safari suspended it
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
        }

        const sound = this.sfx[name];
        if (!sound) return;

        // Clone the buffer source for each play
        const source = this.audioContext.createBufferSource();
        source.buffer = sound;
        source.connect(this.audioContext.destination);
        source.start(0);
    }

    // ─── Waveform Generators ───────────────────────────────────

    /**
     * Generate a sine wave tone
     */
    _sine(freq, duration, volume = 0.3) {
        const sampleRate = this.audioContext.sampleRate;
        const len = Math.ceil(duration * sampleRate);
        const buffer = this.audioContext.createBuffer(1, len, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < len; i++) {
            const t = i / sampleRate;
            const env = Math.max(0, 1.0 - (i / len));
            data[i] = Math.sin(2 * Math.PI * freq * t) * volume * env;
        }
        return buffer;
    }

    /**
     * Generate a square wave tone
     */
    _square(freq, duration, volume = 0.2) {
        const sampleRate = this.audioContext.sampleRate;
        const len = Math.ceil(duration * sampleRate);
        const buffer = this.audioContext.createBuffer(1, len, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < len; i++) {
            const t = i / sampleRate;
            const env = Math.max(0, 1.0 - (i / len));
            const val = Math.sin(2 * Math.PI * freq * t) >= 0 ? 1.0 : -1.0;
            data[i] = val * volume * env;
        }
        return buffer;
    }

    /**
     * Generate white noise
     */
    _noise(duration, volume = 0.3) {
        const sampleRate = this.audioContext.sampleRate;
        const len = Math.ceil(duration * sampleRate);
        const buffer = this.audioContext.createBuffer(1, len, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < len; i++) {
            const env = Math.max(0, 1.0 - (i / len));
            data[i] = (Math.random() * 2 - 1) * volume * env;
        }
        return buffer;
    }

    /**
     * Frequency sweep (laser/shoot sounds)
     */
    _sweep(freqStart, freqEnd, duration, volume = 0.3, wave = "square") {
        const sampleRate = this.audioContext.sampleRate;
        const len = Math.ceil(duration * sampleRate);
        const buffer = this.audioContext.createBuffer(1, len, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < len; i++) {
            const t = i / sampleRate;
            const frac = i / len;
            const freq = freqStart + (freqEnd - freqStart) * frac;
            const env = Math.max(0, 1.0 - frac);

            let val;
            if (wave === "square") {
                val = Math.sin(2 * Math.PI * freq * t) >= 0 ? 1.0 : -1.0;
            } else {
                val = Math.sin(2 * Math.PI * freq * t);
            }
            data[i] = val * volume * env;
        }
        return buffer;
    }

    /**
     * Combine two audio buffers
     */
    _combineBuffers(buf1, buf2) {
        const sampleRate = this.audioContext.sampleRate;
        const len = Math.max(buf1.length, buf2.length);
        const buffer = this.audioContext.createBuffer(1, len, sampleRate);
        const data = buffer.getChannelData(0);
        const data1 = buf1.getChannelData(0);
        const data2 = buf2.getChannelData(0);

        for (let i = 0; i < len; i++) {
            const v1 = i < data1.length ? data1[i] : 0;
            const v2 = i < data2.length ? data2[i] : 0;
            data[i] = v1 + v2;
        }
        return buffer;
    }

    // ─── Sound Effect Generators ───────────────────────────────

    /**
     * Player weapon fire - quick high-pitched zap
     */
    _genShoot() {
        return this._sweep(1200, 400, 0.08, 0.15);
    }

    /**
     * Plasma weapon fire - deeper, beefier
     */
    _genShootPlasma() {
        const buf1 = this._sweep(600, 200, 0.12, 0.12);
        const buf2 = this._sweep(800, 300, 0.12, 0.08);
        return this._combineBuffers(buf1, buf2);
    }

    /**
     * Small enemy explosion
     */
    _genExplosionSmall() {
        const noise = this._noise(0.2, 0.25);
        const tone = this._sweep(200, 80, 0.2, 0.15);
        return this._combineBuffers(noise, tone);
    }

    /**
     * Large/boss explosion - longer, deeper
     */
    _genExplosionLarge() {
        const noise = this._noise(0.5, 0.3);
        const tone = this._sweep(150, 40, 0.5, 0.2);
        return this._combineBuffers(noise, tone);
    }

    /**
     * Cash/money pickup - cheerful ascending arpeggio
     */
    _genCashPickup() {
        const sampleRate = this.audioContext.sampleRate;
        const totalLen = Math.ceil(0.34 * sampleRate); // 4 notes
        const buffer = this.audioContext.createBuffer(1, totalLen, sampleRate);
        const data = buffer.getChannelData(0);

        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        const noteDuration = 0.06; // 60ms per note except last
        let pos = 0;

        for (let n = 0; n < notes.length; n++) {
            const freq = notes[n];
            const dur = (n < 3) ? noteDuration : 0.1;
            const noteLen = Math.ceil(dur * sampleRate);
            const isFadeOut = (n >= 3);

            for (let i = 0; i < noteLen && pos < totalLen; i++, pos++) {
                const t = i / sampleRate;
                const env = isFadeOut ? Math.max(0, 1.0 - (i / noteLen)) : 1.0;
                data[pos] = Math.sin(2 * Math.PI * freq * t) * 0.15 * env;
            }
        }
        return buffer;
    }

    /**
     * Player taking damage - harsh buzz
     */
    _genPlayerHit() {
        const buf1 = this._square(120, 0.15, 0.2);
        const buf2 = this._noise(0.15, 0.15);
        return this._combineBuffers(buf1, buf2);
    }

    /**
     * Player death - descending wail
     */
    _genPlayerDeath() {
        const buf1 = this._sweep(800, 100, 0.6, 0.25, "sine");
        const buf2 = this._noise(0.6, 0.15);
        return this._combineBuffers(buf1, buf2);
    }

    /**
     * Purchase confirmation - two-tone chime
     */
    _genShopBuy() {
        const sampleRate = this.audioContext.sampleRate;
        const len = Math.ceil(0.2 * sampleRate);
        const buffer = this.audioContext.createBuffer(1, len, sampleRate);
        const data = buffer.getChannelData(0);

        const firstNoteLen = Math.ceil(0.08 * sampleRate);
        for (let i = 0; i < firstNoteLen; i++) {
            const t = i / sampleRate;
            data[i] = Math.sin(2 * Math.PI * 880 * t) * 0.15;
        }

        for (let i = firstNoteLen; i < len; i++) {
            const t = i / sampleRate;
            const env = Math.max(0, 1.0 - ((i - firstNoteLen) / (len - firstNoteLen)));
            data[i] = Math.sin(2 * Math.PI * 1175 * t) * 0.15 * env;
        }
        return buffer;
    }

    /**
     * Wave cleared - triumphant flourish
     */
    _genWaveComplete() {
        const sampleRate = this.audioContext.sampleRate;
        const totalLen = Math.ceil(0.6 * sampleRate);
        const buffer = this.audioContext.createBuffer(1, totalLen, sampleRate);
        const data = buffer.getChannelData(0);

        const notes = [523, 659, 784, 1047, 1047]; // C5, E5, G5, C6, C6
        const noteDurations = [0.1, 0.1, 0.1, 0.1, 0.3];
        let pos = 0;

        for (let n = 0; n < notes.length; n++) {
            const freq = notes[n];
            const dur = noteDurations[n];
            const noteLen = Math.ceil(dur * sampleRate);
            const isFadeOut = (n >= 3);

            for (let i = 0; i < noteLen && pos < totalLen; i++, pos++) {
                const t = i / sampleRate;
                const env = isFadeOut ? Math.max(0, 1.0 - (i / noteLen)) : 1.0;
                data[pos] = Math.sin(2 * Math.PI * freq * t) * 0.2 * env;
            }
        }
        return buffer;
    }

    /**
     * Radio station change - quick click/static
     */
    _genRadioClick() {
        return this._noise(0.05, 0.2);
    }

    /**
     * Shop denied - low buzz
     */
    _genShopDenied() {
        return this._square(110, 0.2, 0.15);
    }

    // ─── Music System ────────────────────────────────────────

    /**
     * Start playing menu music (loops)
     */
    startMenuMusic() {
        if (!this.musicEnabled) return;
        this._pendingMusicType = null;  // Clear pending — this is an explicit request
        this._playMusicTrack('menu');
    }

    /**
     * Start playing gameplay music (shuffled tracks, loops)
     */
    startMusic(resetTrack = false) {
        if (!this.musicEnabled) return;
        this._pendingMusicType = null;  // Clear pending — this is an explicit request
        this.playingMenuMusic = false;
        if (resetTrack) this.currentTrack = 0;
        this._playMusicTrack('gameplay');
    }

    /**
     * Play a music track using HTML5 Audio
     */
    _playMusicTrack(type) {
        // Stop any current music
        this.stopMusic();

        if (!this.musicFiles || this.musicFiles.length === 0) return;

        let src;
        if (type === 'menu' && this.menuMusicFile) {
            src = this.menuMusicFile;
            this.playingMenuMusic = true;
        } else {
            if (this.gameplayTracks.length === 0) return;
            src = this.gameplayTracks[this.currentTrack % this.gameplayTracks.length];
            this.playingMenuMusic = false;
        }

        try {
            // Use preloaded blob URL if available (already in memory — instant)
            const blobUrl = this._blobUrls && this._blobUrls[src];
            this.musicAudio = new Audio(blobUrl || src);
            this.musicAudio.volume = 0.4;
            if (type === 'menu') {
                this.musicAudio.loop = true;
            } else {
                // Gameplay tracks: play through, then advance to next
                this.musicAudio.loop = false;
                this.musicAudio.onended = () => {
                    if (this.musicEnabled && !this.playingMenuMusic) {
                        this.currentTrack = (this.currentTrack + 1) % this.gameplayTracks.length;
                        this._playMusicTrack('gameplay');
                    }
                };
            }
            this.musicAudio.play().catch((err) => {
                // Only store pending for autoplay blocks (NotAllowedError).
                // Ignore AbortError — that fires when stopMusic() pauses an
                // Audio whose play() promise hasn't resolved yet (race condition
                // between menu→gameplay transitions).
                if (err && err.name === 'NotAllowedError') {
                    this._pendingMusicType = type;
                }
            });
        } catch(e) {
            // Music not available, that's OK
        }
    }

    /**
     * Stop music playback
     */
    stopMusic() {
        if (this.musicAudio) {
            this.musicAudio.pause();
            this.musicAudio.currentTime = 0;
            this.musicAudio = null;
        }
        this.playingMenuMusic = false;
    }

    /**
     * Cycle to next music track (R for radio)
     */
    nextTrack() {
        // Resume AudioContext if iOS Safari suspended it
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
        }
        this.play("radio");
        if (this.gameplayTracks.length === 0) return;
        this.currentTrack = (this.currentTrack + 1) % this.gameplayTracks.length;
        if (this.musicEnabled) {
            this.startMusic();
        }
    }

    /**
     * Toggle music on/off
     */
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            if (this.playingMenuMusic) {
                this.startMenuMusic();
            } else {
                this.startMusic();
            }
        } else {
            this.stopMusic();
        }
    }

    /**
     * Get current track name
     */
    getTrackName() {
        if (this.playingMenuMusic) return "Menu Music";
        if (this.gameplayTrackNames && this.gameplayTrackNames.length > 0) {
            return this.gameplayTrackNames[this.currentTrack % this.gameplayTrackNames.length];
        }
        return "No Music";
    }

    /**
     * Play a specific music file (used for victory/credits screen).
     * Loops by default. Stops any current music first.
     */
    playSpecificTrack(filePath, loop = true) {
        this.stopMusic();
        if (!this.musicEnabled) return;
        try {
            const blobUrl = this._blobUrls && this._blobUrls[filePath];
            this.musicAudio = new Audio(blobUrl || filePath);
            this.musicAudio.volume = 0.4;
            this.musicAudio.loop = loop;
            this.playingMenuMusic = false;
            this.musicAudio.play().catch(() => {});
        } catch(e) {}
    }

    /**
     * Configure music files. Call this after creating the SoundManager.
     * musicFiles: array of {name: "Track Name", file: "music/filename.mp3", isMenu: bool}
     */
    setMusicFiles(musicFiles) {
        this.musicFiles = musicFiles;
        this.menuMusicFile = null;
        this.gameplayTracks = [];
        this.gameplayTrackNames = [];

        for (const track of musicFiles) {
            if (track.isMenu) {
                this.menuMusicFile = track.file;
            } else {
                this.gameplayTracks.push(track.file);
                this.gameplayTrackNames.push(track.name);
            }
        }

        // Shuffle gameplay tracks
        for (let i = this.gameplayTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.gameplayTracks[i], this.gameplayTracks[j]] = [this.gameplayTracks[j], this.gameplayTracks[i]];
            [this.gameplayTrackNames[i], this.gameplayTrackNames[j]] = [this.gameplayTrackNames[j], this.gameplayTrackNames[i]];
        }

        // Blob URL cache — filled by preloadAllMusic()
        this._blobUrls = {};
    }

    /**
     * Preload menu music via fetch() so it plays instantly on first interaction.
     * fetch() isn't blocked by autoplay policy — downloads immediately on page load.
     * Returns a Promise that resolves when menu music is cached.
     */
    preloadMenuMusic() {
        if (!this.menuMusicFile) return Promise.resolve();

        return fetch(this.menuMusicFile)
            .then(r => r.blob())
            .then(blob => {
                this._blobUrls[this.menuMusicFile] = URL.createObjectURL(blob);
            })
            .catch(() => {
                // Network error or file:// protocol — Audio element will load normally
            });
    }

    /**
     * Background-preload gameplay tracks after the game starts.
     * Downloads one at a time to avoid saturating bandwidth during gameplay.
     */
    preloadGameplayTracks() {
        let i = 0;
        const next = () => {
            if (i >= this.gameplayTracks.length) return;
            const file = this.gameplayTracks[i++];
            if (this._blobUrls[file]) { next(); return; }  // already cached
            fetch(file)
                .then(r => r.blob())
                .then(blob => { this._blobUrls[file] = URL.createObjectURL(blob); })
                .catch(() => {})
                .finally(() => next());
        };
        next();
    }
}

// Create global sound manager
window.soundManager = new SoundManager();

// Configure music files (matching Python version's sound.py MUSIC_FILES)
window.soundManager.setMusicFiles([
    { name: "Space Cat Area 51",        file: "music/Space Cat Area 51.mp3",                isMenu: true },
    { name: "Dragon Boss Battle",       file: "music/Amazing Dragon Boss Battle.mp3",       isMenu: false },
    { name: "Sherlock Holmes Anthem",   file: "music/Chiptune Sherlock Holmes Anthem.mp3",  isMenu: false },
    { name: "Darkstream Runner",        file: "music/Darkstream Runner Chiptune.mp3",       isMenu: false },
    { name: "Epic Space Battle",        file: "music/Epic Space Battle.mp3",                isMenu: false },
    { name: "Mountain Climbing",        file: "music/Mountain Climbing.mp3",                isMenu: false },
    { name: "Slimey Fox Arcade",        file: "music/Slimey Fox Arcade Games.mp3",          isMenu: false },
    { name: "Space after Dark",         file: "music/Space after Dark.mp3",                 isMenu: false },
]);

// Initialize audio on first user interaction
window.addEventListener('keydown', () => {
    if (!window.soundManager.initialized) {
        window.soundManager.ensureAudioContext();
    }
}, { once: true });

window.addEventListener('click', () => {
    if (!window.soundManager.initialized) {
        window.soundManager.ensureAudioContext();
    }
}, { once: true });
