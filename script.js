// ============================================================================
// BIRDMATE 2.0 — CRAZY MINI-GAME PLATFORM ENGINE
// Single-file modular platform compatible with file:// and http:// protocols
// ============================================================================

// ----------------------------------------------------------------------------
// 1. STORAGE MANAGER
// ----------------------------------------------------------------------------
const STORAGE_PREFIX = 'birdmate_';

const StorageManager = {
    getBestScore(gameId) {
        try {
            const raw = localStorage.getItem(`${STORAGE_PREFIX}best_${gameId}`);
            const val = Number(raw);
            return Number.isFinite(val) && val >= 0 ? Math.floor(val) : 0;
        } catch (e) {
            return 0;
        }
    },

    saveBestScore(gameId, score) {
        try {
            const current = this.getBestScore(gameId);
            if (score > current) {
                localStorage.setItem(`${STORAGE_PREFIX}best_${gameId}`, String(score));
                this.addPlayStat(gameId, score, true);
                return true;
            }
            this.addPlayStat(gameId, score, false);
            return false;
        } catch (e) {
            return false;
        }
    },

    getRecentGames() {
        try {
            const raw = localStorage.getItem(`${STORAGE_PREFIX}recent_games`);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    addPlayStat(gameId, lastScore, isNewBest) {
        try {
            let recents = this.getRecentGames().filter(item => item.id !== gameId);
            recents.unshift({
                id: gameId,
                lastScore,
                bestScore: this.getBestScore(gameId),
                timestamp: Date.now()
            });
            recents = recents.slice(0, 6);
            localStorage.setItem(`${STORAGE_PREFIX}recent_games`, JSON.stringify(recents));

            const totalPlays = this.getTotalPlays() + 1;
            localStorage.setItem(`${STORAGE_PREFIX}total_plays`, String(totalPlays));
        } catch (e) { }
    },

    getTotalPlays() {
        try {
            const raw = localStorage.getItem(`${STORAGE_PREFIX}total_plays`);
            const val = Number(raw);
            return Number.isFinite(val) ? val : 0;
        } catch (e) {
            return 0;
        }
    },

    getMuteState() {
        try {
            return localStorage.getItem(`${STORAGE_PREFIX}muted`) === 'true';
        } catch (e) {
            return false;
        }
    },

    setMuteState(muted) {
        try {
            localStorage.setItem(`${STORAGE_PREFIX}muted`, String(muted));
        } catch (e) { }
    }
};

// ----------------------------------------------------------------------------
// 2. AUDIO MANAGER
// ----------------------------------------------------------------------------
class AudioManager {
    constructor() {
        this.ctx = null;
        this.muted = StorageManager.getMuteState();
        this.musicInterval = null;
    }

    ensureContext() {
        if (!this.ctx) {
            const AudioCtor = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtor) return null;
            this.ctx = new AudioCtor();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => { });
        }
        return this.ctx;
    }

    setMuted(muted) {
        this.muted = muted;
        StorageManager.setMuteState(muted);
        if (muted) this.stopMusic();
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    isMuted() {
        return this.muted;
    }

    playTone({ frequency = 440, duration = 0.1, type = 'sine', volume = 0.05, slide = 0 }) {
        if (this.muted) return;
        const ctx = this.ensureContext();
        if (!ctx) return;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(frequency, ctx.currentTime);
            if (slide !== 0) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + slide), ctx.currentTime + duration);
            }

            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) { }
    }

    play(soundType) {
        if (this.muted) return;

        switch (soundType) {
            case 'flap':
            case 'jump':
                this.playTone({ frequency: 420, duration: 0.07, type: 'triangle', volume: 0.05, slide: 140 });
                break;
            case 'tap':
            case 'click':
                this.playTone({ frequency: 580, duration: 0.05, type: 'sine', volume: 0.04, slide: 80 });
                break;
            case 'score':
            case 'point':
                this.playTone({ frequency: 780, duration: 0.08, type: 'square', volume: 0.04, slide: 220 });
                break;
            case 'perfect':
                this.playTone({ frequency: 880, duration: 0.12, type: 'triangle', volume: 0.06, slide: 300 });
                break;
            case 'hit':
            case 'fail':
            case 'crash':
                this.playTone({ frequency: 160, duration: 0.18, type: 'sawtooth', volume: 0.06, slide: -120 });
                break;
            case 'win':
            case 'record':
                this.playTone({ frequency: 523.25, duration: 0.08, type: 'triangle', volume: 0.05, slide: 100 });
                setTimeout(() => this.playTone({ frequency: 659.25, duration: 0.08, type: 'triangle', volume: 0.05, slide: 100 }), 80);
                setTimeout(() => this.playTone({ frequency: 783.99, duration: 0.14, type: 'triangle', volume: 0.06, slide: 150 }), 160);
                break;
        }
    }

    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }
}

const globalAudio = new AudioManager();

// ----------------------------------------------------------------------------
// 3. GAME CATALOG REGISTRY
// ----------------------------------------------------------------------------
const GAME_CATEGORIES = [
    { id: 'all', label: 'All Games', icon: '🎮' },
    { id: 'arcade', label: 'Arcade', icon: '🕹️' },
    { id: 'reflex', label: 'Reflex', icon: '⚡' },
    { id: 'timing', label: 'Timing', icon: '🎯' },
    { id: 'brain', label: 'Brain', icon: '🧠' },
    { id: 'action', label: 'Action', icon: '🛡️' },
    { id: 'memory', label: 'Memory', icon: '🧩' },
    { id: 'casual', label: 'Casual', icon: '☕' },
];

const GAMES_CATALOG = [
    {
        id: 'crazy-bird',
        name: 'Crazy Bird',
        tagline: 'Fly through obstacles & chase high scores!',
        description: 'The legendary flappy flying flight challenge. Pass through narrow pipe gaps without crashing!',
        category: 'arcade',
        difficulty: 'Medium',
        icon: '🐤',
        tags: ['bird', 'flappy', 'arcade', 'flying', 'sky', 'crazy'],
        controls: 'Tap / Click / Space to Flap',
        trending: true,
    },
    {
        id: 'tap-rush',
        name: 'Tap Rush',
        tagline: '10 seconds of rapid-fire tapping!',
        description: 'Tap appearing targets as fast as possible before the 10-second timer runs out. Build combo multipliers!',
        category: 'reflex',
        difficulty: 'Easy',
        icon: '⚡',
        tags: ['tap', 'speed', 'reflex', 'fast', 'timer', 'rush'],
        controls: 'Tap / Click targets fast',
        trending: true,
    },
    {
        id: 'brain-trap',
        name: 'Brain Trap',
        tagline: 'Trick questions & split-second choices!',
        description: 'Fast-fire brain teasers testing attention and reaction speed under extreme 2-second time pressure!',
        category: 'brain',
        difficulty: 'Hard',
        icon: '🧠',
        tags: ['brain', 'mind', 'quiz', 'trick', 'fast', 'logic'],
        controls: 'Tap the correct answer fast',
        trending: true,
    },
    {
        id: 'dodge-it',
        name: 'Dodge It',
        tagline: 'Dodge falling hazards & collect stars!',
        description: 'Control your hero and survive a storm of falling spikes and meteors. Collect glowing power stars!',
        category: 'action',
        difficulty: 'Medium',
        icon: '🛡️',
        tags: ['dodge', 'hazard', 'survival', 'action', 'ship', 'stars'],
        controls: 'Drag / Touch / Arrow Keys to move',
        trending: true,
    },
    {
        id: 'perfect-hit',
        name: 'Perfect Hit',
        tagline: 'Precision timing bar sweet-spot hits!',
        description: 'Stop the oscillating marker in the central PERFECT zone. Build streak multipliers for massive points!',
        category: 'timing',
        difficulty: 'Medium',
        icon: '🎯',
        tags: ['timing', 'hit', 'precision', 'bar', 'perfect', 'streak'],
        controls: 'Tap / Click / Space at the right moment',
        trending: true,
    },
    {
        id: 'stack-master',
        name: 'Stack Master',
        tagline: 'Build the tallest block tower!',
        description: 'Drop sliding blocks onto the stack. Overhanging edges get chopped off! Stack as high as you can!',
        category: 'arcade',
        difficulty: 'Medium',
        icon: '🏗️',
        tags: ['stack', 'tower', 'blocks', 'drop', 'arcade', 'build'],
        controls: 'Tap / Click to drop block',
        trending: false,
    },
    {
        id: 'bomb-run',
        name: 'Bomb Run',
        tagline: 'Safe tile grid survival!',
        description: 'A 4x4 grid flashes safe vs bomb tiles. Tap safe tiles quickly to advance rounds without hitting a bomb!',
        category: 'reflex',
        difficulty: 'Hard',
        icon: '💣',
        tags: ['bomb', 'grid', 'safe', 'tiles', 'reflex', 'survival'],
        controls: 'Tap safe tiles',
        trending: false,
    },
    {
        id: 'color-chaos',
        name: 'Color Chaos',
        tagline: 'Stroop effect color reaction test!',
        description: 'Does the word match the text color? Pick the correct swatch under 2-second round pressure!',
        category: 'brain',
        difficulty: 'Medium',
        icon: '🎨',
        tags: ['color', 'stroop', 'brain', 'reaction', 'match', 'speed'],
        controls: 'Tap the correct color swatch',
        trending: false,
    },
    {
        id: 'run-till-dead',
        name: 'Run Till Dead',
        tagline: 'Endless runner jump & duck action!',
        description: 'Auto-running obstacle course! Jump over low hurdles, duck under flying hazards, and dodge pits!',
        category: 'action',
        difficulty: 'Hard',
        icon: '🏃',
        tags: ['run', 'runner', 'endless', 'jump', 'duck', 'action'],
        controls: 'Tap Top / Up to Jump, Tap Bottom / Down to Duck',
        trending: false,
    },
    {
        id: 'memory-blitz',
        name: 'Memory Blitz',
        tagline: 'Grid pattern sequence recall!',
        description: 'Watch the grid tiles light up in sequence, then reproduce the pattern from memory. Grid expands!',
        category: 'memory',
        difficulty: 'Medium',
        icon: '🧩',
        tags: ['memory', 'blitz', 'pattern', 'grid', 'sequence', 'recall'],
        controls: 'Tap grid tiles in order',
        trending: false,
    },
];

function getGameById(id) {
    return GAMES_CATALOG.find(game => game.id === id) || GAMES_CATALOG[0];
}

function searchGames(query = '', category = 'all') {
    const q = query.trim().toLowerCase();
    return GAMES_CATALOG.filter(game => {
        const matchesCategory = category === 'all' || game.category === category;
        if (!matchesCategory) return false;
        if (!q) return true;
        return (
            game.name.toLowerCase().includes(q) ||
            game.tagline.toLowerCase().includes(q) ||
            game.description.toLowerCase().includes(q) ||
            game.tags.some(t => t.toLowerCase().includes(q))
        );
    });
}

// ----------------------------------------------------------------------------
// 4. MINI-GAME ENGINES (10 GAMES)
// ----------------------------------------------------------------------------

// GAME 1: CRAZY BIRD
class CrazyBirdGame {
    constructor({ canvas, ctx, audio, storage, onGameOver }) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.audio = audio;
        this.storage = storage;
        this.onGameOver = onGameOver;
        this.animFrameId = null;
        this.running = false;
        this.paused = false;
        this.lastTime = performance.now();
        this.accumulator = 0;
        this.width = 900;
        this.height = 620;
        this.groundY = 540;
        this.gravity = 0.52;
        this.flapPower = -9.1;
        this.pipeSpeed = 4.1;
        this.pipeWidth = 92;
        this.pipeGap = 188;
        this.spawnDelay = 1350;
        this.lastSpawn = 0;
        this.lastPipeGapTop = null;
        this.score = 0;
        this.pipes = [];
        this.particles = [];
        this.bird = { x: 150, y: 310, radius: 22, hitRadius: 17, velocity: 0, wingPhase: 0, tilt: 0 };
        this.onPointerDown = this.handlePointerDown.bind(this);
        this.onKeyDown = this.handleKeyDown.bind(this);
        this.onResize = this.handleResize.bind(this);
    }
    init() {
        this.handleResize();
        this.resetBird();
        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('resize', this.onResize);
    }
    resetBird() {
        this.bird.x = this.width * 0.18;
        this.bird.y = this.height * 0.45;
        this.bird.radius = Math.max(16, Math.min(26, this.height * 0.036));
        this.bird.hitRadius = this.bird.radius * 0.78;
        this.bird.velocity = 0;
        this.bird.wingPhase = 0;
        this.bird.tilt = 0;
    }
    start() {
        this.score = 0;
        this.pipes = [];
        this.particles = [];
        this.lastPipeGapTop = null;
        this.resetBird();
        this.bird.velocity = this.flapPower;
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        this.audio.play('flap');
        this.loop(performance.now());
    }
    pause() { this.paused = true; }
    resume() { this.paused = false; this.lastTime = performance.now(); }
    destroy() {
        this.running = false;
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('resize', this.onResize);
    }
    handlePointerDown(e) { e.preventDefault(); this.flap(); }
    handleKeyDown(e) {
        if (e.repeat) return;
        if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); this.flap(); }
    }
    handleResize() {
        const bounds = this.canvas.getBoundingClientRect();
        this.width = Math.max(300, bounds.width);
        this.height = Math.max(300, bounds.height);
        this.groundY = this.height * 0.86;
        this.gravity = 0.52 * (this.height / 620);
        this.flapPower = -9.1 * (this.height / 620);
        this.pipeSpeed = 4.1 * (this.width / 900);
        this.pipeWidth = Math.max(55, Math.min(100, this.width * 0.11));
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(this.width * dpr);
        this.canvas.height = Math.round(this.height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    flap() {
        if (!this.running || this.paused) return;
        this.bird.velocity = this.flapPower;
        this.audio.play('flap');
    }
    createPipe() {
        const upperLimit = this.groundY - 80;
        const currentGap = Math.max(140, this.pipeGap - this.score * 1.5);
        const topMargin = 60;
        const available = Math.max(0, upperLimit - currentGap - topMargin);
        let gapTop = topMargin + Math.random() * available;
        if (this.lastPipeGapTop !== null) {
            gapTop = Math.min(Math.max(topMargin, this.lastPipeGapTop - 160), Math.min(available + topMargin, this.lastPipeGapTop + 160));
        }
        this.lastPipeGapTop = gapTop;
        this.pipes.push({ x: this.width + 50, width: this.pipeWidth, gapTop, gapHeight: currentGap, scored: false });
    }
    circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
        if (rh <= 0 || rw <= 0) return false;
        const closestX = Math.min(Math.max(rx, cx), rx + rw);
        const closestY = Math.min(Math.max(ry, cy), ry + rh);
        const distX = cx - closestX;
        const distY = cy - closestY;
        return (distX * distX + distY * distY) < (r * r);
    }
    checkCollision() {
        const { x: cx, y: cy, hitRadius: r } = this.bird;
        if (cy + r >= this.groundY || cy - r <= 0) return true;
        for (const pipe of this.pipes) {
            const pLength = pipe.width;
            const gapTop = pipe.gapTop;
            const gapBottom = gapTop + pipe.gapHeight;
            if (this.circleRectCollision(cx, cy, r, pipe.x, 0, pLength, gapTop - 18)) return true;
            if (this.circleRectCollision(cx, cy, r, pipe.x - 8, Math.max(0, gapTop - 18), pLength + 16, 18)) return true;
            if (this.circleRectCollision(cx, cy, r, pipe.x - 8, gapBottom, pLength + 16, 18)) return true;
            if (this.circleRectCollision(cx, cy, r, pipe.x, gapBottom + 18, pLength, Math.max(0, this.groundY - (gapBottom + 18)))) return true;
        }
        return false;
    }
    update(dt) {
        if (!this.running || this.paused) return;
        const currentSpeed = this.pipeSpeed * dt;
        this.bird.velocity += this.gravity * dt;
        this.bird.y += this.bird.velocity * dt;
        this.bird.tilt = Math.min(Math.max(-0.4, this.bird.velocity / 12), 1.1);
        const now = performance.now();
        if (now - this.lastSpawn >= this.spawnDelay) {
            this.createPipe();
            this.lastSpawn = now;
        }
        for (const pipe of this.pipes) {
            pipe.x -= currentSpeed;
            if (!pipe.scored && pipe.x + pipe.width < this.bird.x) {
                pipe.scored = true;
                this.score += 1;
                this.audio.play('score');
            }
        }
        this.pipes = this.pipes.filter(p => p.x + p.width > -40);
        if (this.checkCollision()) {
            this.running = false;
            this.audio.play('hit');
            if (this.onGameOver) this.onGameOver(this.score);
        }
    }
    draw() {
        const { ctx, width, height, groundY } = this;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#0b1730'; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#331e14'; ctx.fillRect(0, groundY, width, height - groundY);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(0, groundY - 8, width, 10);
        for (const pipe of this.pipes) {
            const { x, width: pW, gapTop, gapHeight } = pipe;
            const bottomY = gapTop + gapHeight;
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(x, 0, pW, Math.max(0, gapTop - 18));
            ctx.fillRect(x - 8, Math.max(0, gapTop - 18), pW + 16, 18);
            ctx.fillRect(x - 8, bottomY, pW + 16, 18);
            ctx.fillRect(x, bottomY + 18, pW, Math.max(0, groundY - (bottomY + 18)));
        }
        const { x: bx, y: by, radius, tilt } = this.bird;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(tilt);
        ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.ellipse(0, 0, radius, radius * 0.82, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(radius * 0.78, -radius * 0.05); ctx.lineTo(radius * 1.45, radius * 0.12); ctx.lineTo(radius * 0.82, radius * 0.36); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.font = '900 36px Outfit, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(String(this.score), width / 2, 50);
    }
    loop(timestamp) {
        if (!this.running) return;
        let deltaSec = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        if (deltaSec > 0.1) deltaSec = 0.1;
        this.accumulator += deltaSec;
        while (this.accumulator >= 1 / 60) {
            this.update(1);
            this.accumulator -= 1 / 60;
        }
        this.draw();
        this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 2: TAP RUSH
class TapRushGame {
    constructor({ canvas, ctx, audio, storage, onGameOver }) {
        this.canvas = canvas; this.ctx = ctx; this.audio = audio; this.storage = storage; this.onGameOver = onGameOver;
        this.running = false; this.paused = false; this.score = 0; this.combo = 0; this.timeLeft = 10.0;
        this.lastTime = performance.now(); this.target = { x: 450, y: 300, radius: 45 };
        this.onPointerDown = this.handlePointerDown.bind(this);
        this.onResize = this.handleResize.bind(this);
    }
    init() { this.handleResize(); this.canvas.addEventListener('pointerdown', this.onPointerDown); window.addEventListener('resize', this.onResize); }
    start() { this.score = 0; this.combo = 0; this.timeLeft = 10.0; this.running = true; this.paused = false; this.lastTime = performance.now(); this.relocateTarget(); this.audio.play('start'); this.loop(performance.now()); }
    pause() { this.paused = true; }
    resume() { this.paused = false; this.lastTime = performance.now(); }
    destroy() { this.running = false; if (this.animFrameId) cancelAnimationFrame(this.animFrameId); this.canvas.removeEventListener('pointerdown', this.onPointerDown); window.removeEventListener('resize', this.onResize); }
    handleResize() {
        const bounds = this.canvas.getBoundingClientRect(); this.width = Math.max(300, bounds.width); this.height = Math.max(300, bounds.height);
        const dpr = window.devicePixelRatio || 1; this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    relocateTarget() {
        const margin = 80; this.target.radius = Math.max(32, Math.min(55, this.width * 0.08));
        this.target.x = margin + Math.random() * (this.width - margin * 2); this.target.y = margin + Math.random() * (this.height - margin * 2);
    }
    handlePointerDown(e) {
        if (!this.running || this.paused) return; e.preventDefault();
        const rect = this.canvas.getBoundingClientRect(); const touchX = e.clientX - rect.left; const touchY = e.clientY - rect.top;
        const distX = touchX - this.target.x; const distY = touchY - this.target.y;
        if ((distX * distX + distY * distY) <= (this.target.radius * this.target.radius * 1.4)) {
            this.combo += 1; this.score += (1 + Math.floor(this.combo / 5)); this.relocateTarget(); this.audio.play('tap');
        } else { this.combo = 0; this.audio.play('hit'); }
    }
    update(dtSec) {
        if (!this.running || this.paused) return;
        this.timeLeft -= dtSec;
        if (this.timeLeft <= 0) { this.timeLeft = 0; this.running = false; this.audio.play('win'); if (this.onGameOver) this.onGameOver(this.score); }
    }
    draw() {
        const { ctx, width, height } = this; ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#0b1329'; ctx.fillRect(0, 0, width, height);
        ctx.save(); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(this.target.x, this.target.y, this.target.radius + 10, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(this.target.x, this.target.y, this.target.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(this.target.x, this.target.y, this.target.radius * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.font = '900 28px Outfit, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.fillText(`TIME: ${this.timeLeft.toFixed(1)}s`, 20, 45); ctx.fillText(`TAPS: ${this.score}`, width - 150, 45);
    }
    loop(timestamp) {
        if (!this.running) return;
        const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000); this.lastTime = timestamp;
        this.update(dtSec); this.draw(); this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 3: BRAIN TRAP
const BRAIN_QUESTIONS = [
    { text: 'Which number is LARGER?', optA: '14', optB: '9', correct: 'A' },
    { text: 'Is 9 + 4 = 13?', optA: 'YES', optB: 'NO', correct: 'A' },
    { text: 'Tap GREEN box!', optA: 'RED', optB: 'GREEN', correct: 'B', colorA: '#ef4444', colorB: '#22c55e' },
    { text: 'Is Water Liquid at room temp?', optA: 'YES', optB: 'NO', correct: 'A' },
    { text: 'Which number is EVEN?', optA: '15', optB: '18', correct: 'B' },
];
class BrainTrapGame {
    constructor({ canvas, ctx, audio, storage, onGameOver }) {
        this.canvas = canvas; this.ctx = ctx; this.audio = audio; this.storage = storage; this.onGameOver = onGameOver;
        this.running = false; this.score = 0; this.timeLeft = 2.5; this.currentQ = null; this.lastTime = performance.now();
        this.onPointerDown = this.handlePointerDown.bind(this); this.onResize = this.handleResize.bind(this);
    }
    init() { this.handleResize(); this.canvas.addEventListener('pointerdown', this.onPointerDown); window.addEventListener('resize', this.onResize); }
    start() { this.score = 0; this.running = true; this.paused = false; this.lastTime = performance.now(); this.nextQuestion(); this.audio.play('start'); this.loop(performance.now()); }
    pause() { this.paused = true; } resume() { this.paused = false; this.lastTime = performance.now(); }
    destroy() { this.running = false; if (this.animFrameId) cancelAnimationFrame(this.animFrameId); this.canvas.removeEventListener('pointerdown', this.onPointerDown); window.removeEventListener('resize', this.onResize); }
    handleResize() {
        const bounds = this.canvas.getBoundingClientRect(); this.width = Math.max(300, bounds.width); this.height = Math.max(300, bounds.height);
        const dpr = window.devicePixelRatio || 1; this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.boxA = { x: this.width * 0.1, y: this.height * 0.55, w: this.width * 0.36, h: this.height * 0.28 };
        this.boxB = { x: this.width * 0.54, y: this.height * 0.55, w: this.width * 0.36, h: this.height * 0.28 };
    }
    nextQuestion() { this.currentQ = BRAIN_QUESTIONS[Math.floor(Math.random() * BRAIN_QUESTIONS.length)]; this.timeLeft = Math.max(1.4, 2.6 - this.score * 0.08); }
    handlePointerDown(e) {
        if (!this.running || this.paused) return; e.preventDefault();
        const rect = this.canvas.getBoundingClientRect(); const touchX = e.clientX - rect.left; const touchY = e.clientY - rect.top;
        let selected = null;
        if (touchX >= this.boxA.x && touchX <= this.boxA.x + this.boxA.w && touchY >= this.boxA.y && touchY <= this.boxA.y + this.boxA.h) selected = 'A';
        else if (touchX >= this.boxB.x && touchX <= this.boxB.x + this.boxB.w && touchY >= this.boxB.y && touchY <= this.boxB.y + this.boxB.h) selected = 'B';
        if (selected) {
            if (selected === this.currentQ.correct) { this.score += 1; this.audio.play('score'); this.nextQuestion(); }
            else { this.gameOver(); }
        }
    }
    gameOver() { this.running = false; this.audio.play('hit'); if (this.onGameOver) this.onGameOver(this.score); }
    update(dtSec) { if (!this.running || this.paused) return; this.timeLeft -= dtSec; if (this.timeLeft <= 0) this.gameOver(); }
    draw() {
        const { ctx, width, height, currentQ } = this; ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, width, height);
        if (!currentQ) return;
        const timerPct = Math.max(0, this.timeLeft / 2.6); ctx.fillStyle = timerPct > 0.3 ? '#38bdf8' : '#ef4444'; ctx.fillRect(0, 0, width * timerPct, 12);
        ctx.font = '800 24px Outfit, sans-serif'; ctx.fillStyle = '#94a3b8'; ctx.fillText(`SCORE: ${this.score}`, 30, 55);
        ctx.font = '900 30px Outfit, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(currentQ.text, width / 2, height * 0.32);
        ctx.fillStyle = currentQ.colorA || '#1e293b'; ctx.beginPath(); ctx.roundRect(this.boxA.x, this.boxA.y, this.boxA.w, this.boxA.h, 20); ctx.fill();
        ctx.font = '900 28px Outfit, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.fillText(currentQ.optA, this.boxA.x + this.boxA.w / 2, this.boxA.y + this.boxA.h / 2 + 10);
        ctx.fillStyle = currentQ.colorB || '#1e293b'; ctx.beginPath(); ctx.roundRect(this.boxB.x, this.boxB.y, this.boxB.w, this.boxB.h, 20); ctx.fill();
        ctx.fillText(currentQ.optB, this.boxB.x + this.boxB.w / 2, this.boxB.y + this.boxB.h / 2 + 10);
    }
    loop(timestamp) {
        if (!this.running) return; const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000); this.lastTime = timestamp;
        this.update(dtSec); this.draw(); this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 4: DODGE IT
class DodgeItGame {
    constructor({ canvas, ctx, audio, storage, onGameOver }) {
        this.canvas = canvas; this.ctx = ctx; this.audio = audio; this.storage = storage; this.onGameOver = onGameOver;
        this.running = false; this.score = 0; this.survivalTime = 0; this.lastTime = performance.now(); this.lastSpawn = 0;
        this.player = { x: 450, y: 520, size: 36 }; this.hazards = []; this.stars = []; this.targetX = 450;
        this.onPointerDown = this.handlePointerDown.bind(this); this.onPointerMove = this.handlePointerMove.bind(this);
        this.onResize = this.handleResize.bind(this);
    }
    init() { this.handleResize(); this.canvas.addEventListener('pointerdown', this.onPointerDown); this.canvas.addEventListener('pointermove', this.onPointerMove); window.addEventListener('resize', this.onResize); }
    start() { this.score = 0; this.survivalTime = 0; this.hazards = []; this.stars = []; this.running = true; this.paused = false; this.lastTime = performance.now(); this.player.x = this.width / 2; this.targetX = this.player.x; this.audio.play('start'); this.loop(performance.now()); }
    pause() { this.paused = true; } resume() { this.paused = false; this.lastTime = performance.now(); }
    destroy() { this.running = false; if (this.animFrameId) cancelAnimationFrame(this.animFrameId); this.canvas.removeEventListener('pointerdown', this.onPointerDown); this.canvas.removeEventListener('pointermove', this.onPointerMove); window.removeEventListener('resize', this.onResize); }
    handleResize() {
        const bounds = this.canvas.getBoundingClientRect(); this.width = Math.max(300, bounds.width); this.height = Math.max(300, bounds.height);
        const dpr = window.devicePixelRatio || 1; this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.player.size = Math.max(28, Math.min(42, this.width * 0.07)); this.player.y = this.height * 0.85;
    }
    handlePointerDown(e) { if (!this.running || this.paused) return; this.updateTargetX(e); }
    handlePointerMove(e) { if (!this.running || this.paused) return; this.updateTargetX(e); }
    updateTargetX(e) { const rect = this.canvas.getBoundingClientRect(); this.targetX = e.clientX - rect.left; }
    spawnItems() {
        const hSize = 24 + Math.random() * 20; const hX = hSize + Math.random() * (this.width - hSize * 2);
        const speed = 3.5 + Math.random() * 3 + Math.min(4, this.survivalTime * 0.2);
        this.hazards.push({ x: hX, y: -hSize, size: hSize, speed });
        if (Math.random() < 0.35) { this.stars.push({ x: 30 + Math.random() * (this.width - 60), y: -20, size: 16, speed: speed * 0.8 }); }
    }
    update(dtSec) {
        if (!this.running || this.paused) return;
        this.survivalTime += dtSec; this.score = Math.floor(this.survivalTime * 10);
        this.player.x += (this.targetX - this.player.x) * 0.25;
        this.player.x = Math.min(Math.max(this.player.size, this.player.x), this.width - this.player.size);
        const now = performance.now();
        if (now - this.lastSpawn >= Math.max(300, 750 - this.survivalTime * 25)) { this.spawnItems(); this.lastSpawn = now; }
        for (const h of this.hazards) {
            h.y += h.speed;
            const distX = this.player.x - h.x; const distY = this.player.y - h.y;
            if (Math.sqrt(distX * distX + distY * distY) < (this.player.size * 0.8 + h.size * 0.8)) {
                this.running = false; this.audio.play('hit'); if (this.onGameOver) this.onGameOver(this.score); return;
            }
        }
        for (const s of this.stars) {
            s.y += s.speed;
            const distX = this.player.x - s.x; const distY = this.player.y - s.y;
            if (Math.sqrt(distX * distX + distY * distY) < (this.player.size * 0.8 + s.size)) { s.collected = true; this.score += 25; this.audio.play('point'); }
        }
        this.hazards = this.hazards.filter(h => h.y < this.height + 40);
        this.stars = this.stars.filter(s => !s.collected && s.y < this.height + 40);
    }
    draw() {
        const { ctx, width, height, player } = this; ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#090d16'; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ef4444'; for (const h of this.hazards) { ctx.beginPath(); ctx.arc(h.x, h.y, h.size, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#facc15'; for (const s of this.stars) { ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2); ctx.fill();
        ctx.font = '900 28px Outfit, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.fillText(`SCORE: ${this.score}`, 25, 45);
    }
    loop(timestamp) {
        if (!this.running) return; const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000); this.lastTime = timestamp;
        this.update(dtSec); this.draw(); this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 5: PERFECT HIT
class PerfectHitGame {
    constructor({ canvas, ctx, audio, storage, onGameOver }) {
        this.canvas = canvas; this.ctx = ctx; this.audio = audio; this.storage = storage; this.onGameOver = onGameOver;
        this.running = false; this.score = 0; this.streak = 0; this.bar = { x: 0, y: 0, w: 0, h: 40 }; this.indicatorX = 0; this.dir = 1; this.speed = 400;
        this.onPointerDown = this.handlePointerDown.bind(this); this.onResize = this.handleResize.bind(this);
    }
    init() { this.handleResize(); this.canvas.addEventListener('pointerdown', this.onPointerDown); window.addEventListener('resize', this.onResize); }
    start() { this.score = 0; this.streak = 0; this.speed = 420; this.indicatorX = this.bar.x; this.dir = 1; this.running = true; this.paused = false; this.lastTime = performance.now(); this.audio.play('start'); this.loop(performance.now()); }
    pause() { this.paused = true; } resume() { this.paused = false; this.lastTime = performance.now(); }
    destroy() { this.running = false; if (this.animFrameId) cancelAnimationFrame(this.animFrameId); this.canvas.removeEventListener('pointerdown', this.onPointerDown); window.removeEventListener('resize', this.onResize); }
    handleResize() {
        const bounds = this.canvas.getBoundingClientRect(); this.width = Math.max(300, bounds.width); this.height = Math.max(300, bounds.height);
        const dpr = window.devicePixelRatio || 1; this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.bar.w = Math.min(600, this.width * 0.85); this.bar.x = (this.width - this.bar.w) / 2; this.bar.y = this.height * 0.55;
    }
    handlePointerDown(e) { if (!this.running || this.paused) return; e.preventDefault(); this.checkHit(); }
    checkHit() {
        const centerX = this.bar.x + this.bar.w / 2; const dist = Math.abs(this.indicatorX - centerX);
        if (dist <= this.bar.w * 0.12) { this.streak += 1; this.score += 10 * this.streak; this.speed = Math.min(950, this.speed + 25); this.audio.play('perfect'); }
        else if (dist <= this.bar.w * 0.32) { this.streak = 1; this.score += 5; this.speed = Math.min(950, this.speed + 15); this.audio.play('score'); }
        else { this.running = false; this.audio.play('hit'); if (this.onGameOver) this.onGameOver(this.score); }
    }
    update(dtSec) {
        if (!this.running || this.paused) return;
        this.indicatorX += this.dir * this.speed * dtSec;
        if (this.indicatorX >= this.bar.x + this.bar.w) { this.indicatorX = this.bar.x + this.bar.w; this.dir = -1; }
        else if (this.indicatorX <= this.bar.x) { this.indicatorX = this.bar.x; this.dir = 1; }
    }
    draw() {
        const { ctx, width, height, bar } = this; ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#061325'; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.roundRect(bar.x, bar.y, bar.w, bar.h, 20); ctx.fill();
        ctx.fillStyle = '#0284c7'; ctx.fillRect(bar.x + (bar.w - bar.w * 0.64) / 2, bar.y, bar.w * 0.64, bar.h);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(bar.x + (bar.w - bar.w * 0.24) / 2, bar.y, bar.w * 0.24, bar.h);
        ctx.fillStyle = '#facc15'; ctx.fillRect(this.indicatorX - 6, bar.y - 12, 12, bar.h + 24);
        ctx.font = '900 32px Outfit, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(`SCORE: ${this.score}`, width / 2, height * 0.25);
    }
    loop(timestamp) {
        if (!this.running) return; const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000); this.lastTime = timestamp;
        this.update(dtSec); this.draw(); this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 6: STACK MASTER
class StackMasterGame {
    constructor({ canvas, ctx, audio, storage, onGameOver }) {
        this.canvas = canvas; this.ctx = ctx; this.audio = audio; this.storage = storage; this.onGameOver = onGameOver;
        this.running = false; this.score = 0; this.blockHeight = 30; this.stack = [];
        this.onPointerDown = this.handlePointerDown.bind(this); this.onResize = this.handleResize.bind(this);
    }
    init() { this.handleResize(); this.canvas.addEventListener('pointerdown', this.onPointerDown); window.addEventListener('resize', this.onResize); }
    start() {
        this.score = 0; this.stack = []; this.running = true; this.paused = false; this.lastTime = performance.now();
        const bW = Math.min(220, this.width * 0.45); this.stack.push({ x: (this.width - bW) / 2, y: this.height - 60, w: bW, color: '#38bdf8' });
        this.spawnCurrentBlock(bW, this.height - 90); this.audio.play('start'); this.loop(performance.now());
    }
    pause() { this.paused = true; } resume() { this.paused = false; this.lastTime = performance.now(); }
    destroy() { this.running = false; if (this.animFrameId) cancelAnimationFrame(this.animFrameId); this.canvas.removeEventListener('pointerdown', this.onPointerDown); window.removeEventListener('resize', this.onResize); }
    handleResize() {
        const bounds = this.canvas.getBoundingClientRect(); this.width = Math.max(300, bounds.width); this.height = Math.max(300, bounds.height);
        const dpr = window.devicePixelRatio || 1; this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    spawnCurrentBlock(w, y) { this.currentBlock = { x: 0, y, w, speed: Math.min(600, 220 + this.score * 18), dir: 1, color: `hsl(${(this.score * 25) % 360}, 85%, 60%)` }; }
    handlePointerDown(e) { if (!this.running || this.paused) return; e.preventDefault(); this.dropBlock(); }
    dropBlock() {
        const top = this.stack[this.stack.length - 1]; const curr = this.currentBlock;
        const left = Math.max(top.x, curr.x); const right = Math.min(top.x + top.w, curr.x + curr.w); const overlap = right - left;
        if (overlap <= 0) { this.running = false; this.audio.play('hit'); if (this.onGameOver) this.onGameOver(this.score); return; }
        this.stack.push({ x: left, y: curr.y, w: overlap, color: curr.color }); this.score += 1; this.audio.play('score');
        let nextY = curr.y - this.blockHeight;
        if (nextY < 120) { for (const b of this.stack) b.y += this.blockHeight; nextY += this.blockHeight; }
        this.spawnCurrentBlock(overlap, nextY);
    }
    update(dtSec) {
        if (!this.running || this.paused) return;
        const curr = this.currentBlock; curr.x += curr.dir * curr.speed * dtSec;
        if (curr.x + curr.w >= this.width) { curr.x = this.width - curr.w; curr.dir = -1; }
        else if (curr.x <= 0) { curr.x = 0; curr.dir = 1; }
    }
    draw() {
        const { ctx, width, height } = this; ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#060d1b'; ctx.fillRect(0, 0, width, height);
        for (const b of this.stack) { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, this.blockHeight - 2); }
        if (this.running) { ctx.fillStyle = this.currentBlock.color; ctx.fillRect(this.currentBlock.x, this.currentBlock.y, this.currentBlock.w, this.blockHeight - 2); }
        ctx.font = '900 36px Outfit, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(String(this.score), width / 2, 50);
    }
    loop(timestamp) {
        if (!this.running) return; const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000); this.lastTime = timestamp;
        this.update(dtSec); this.draw(); this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 7: BOMB RUN
class BombRunGame {
    constructor({ canvas, ctx, audio, storage, onGameOver }) {
        this.canvas = canvas; this.ctx = ctx; this.audio = audio; this.storage = storage; this.onGameOver = onGameOver;
        this.running = false; this.score = 0; this.tiles = []; this.phase = 'PREVIEW'; this.previewTimer = 1.0;
        this.onPointerDown = this.handlePointerDown.bind(this); this.onResize = this.handleResize.bind(this);
    }
    init() { this.handleResize(); this.canvas.addEventListener('pointerdown', this.onPointerDown); window.addEventListener('resize', this.onResize); }
    start() { this.score = 0; this.running = true; this.paused = false; this.lastTime = performance.now(); this.setupRound(); this.audio.play('start'); this.loop(performance.now()); }
    pause() { this.paused = true; } resume() { this.paused = false; this.lastTime = performance.now(); }
    destroy() { this.running = false; if (this.animFrameId) cancelAnimationFrame(this.animFrameId); this.canvas.removeEventListener('pointerdown', this.onPointerDown); window.removeEventListener('resize', this.onResize); }
    handleResize() {
        const bounds = this.canvas.getBoundingClientRect(); this.width = Math.max(300, bounds.width); this.height = Math.max(300, bounds.height);
        const dpr = window.devicePixelRatio || 1; this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.gridWidth = Math.min(420, this.width * 0.85); this.gridX = (this.width - this.gridWidth) / 2; this.gridY = (this.height - this.gridWidth) / 2 + 20; this.tileSize = (this.gridWidth - 30) / 4;
    }
    setupRound() {
        this.phase = 'PREVIEW'; this.previewTimer = Math.max(0.4, 1.0 - this.score * 0.05); this.tiles = [];
        const bombCount = Math.min(6, 2 + Math.floor(this.score / 4));
        for (let i = 0; i < 16; i++) this.tiles.push({ id: i, isBomb: false, revealed: false });
        let bombs = 0; while (bombs < bombCount) { const idx = Math.floor(Math.random() * 16); if (!this.tiles[idx].isBomb) { this.tiles[idx].isBomb = true; bombs++; } }
    }
    handlePointerDown(e) {
        if (!this.running || this.paused || this.phase !== 'PLAYING') return; e.preventDefault();
        const rect = this.canvas.getBoundingClientRect(); const touchX = e.clientX - rect.left; const touchY = e.clientY - rect.top;
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const tx = this.gridX + c * (this.tileSize + 10); const ty = this.gridY + r * (this.tileSize + 10);
                if (touchX >= tx && touchX <= tx + this.tileSize && touchY >= ty && touchY <= ty + this.tileSize) {
                    const tile = this.tiles[r * 4 + c]; if (tile.revealed) return;
                    tile.revealed = true;
                    if (tile.isBomb) { this.running = false; this.audio.play('hit'); if (this.onGameOver) this.onGameOver(this.score); }
                    else {
                        this.score += 1; this.audio.play('tap');
                        if (!this.tiles.some(t => !t.isBomb && !t.revealed)) { this.audio.play('score'); this.setupRound(); }
                    }
                    return;
                }
            }
        }
    }
    update(dtSec) { if (!this.running || this.paused) return; if (this.phase === 'PREVIEW') { this.previewTimer -= dtSec; if (this.previewTimer <= 0) this.phase = 'PLAYING'; } }
    draw() {
        const { ctx, width, height } = this; ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#0b0f19'; ctx.fillRect(0, 0, width, height);
        ctx.font = '900 32px Outfit, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(`SCORE: ${this.score}`, width / 2, 55);
        ctx.font = '700 18px Outfit, sans-serif'; ctx.fillStyle = this.phase === 'PREVIEW' ? '#facc15' : '#38bdf8'; ctx.fillText(this.phase === 'PREVIEW' ? 'MEMORIZE BOMBS!' : 'TAP SAFE TILES!', width / 2, 85);
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const tx = this.gridX + c * (this.tileSize + 10); const ty = this.gridY + r * (this.tileSize + 10); const tile = this.tiles[r * 4 + c];
                ctx.fillStyle = this.phase === 'PREVIEW' ? (tile.isBomb ? '#ef4444' : '#22c55e') : (tile.revealed ? (tile.isBomb ? '#ef4444' : '#14b8a6') : '#1e293b');
                ctx.beginPath(); ctx.roundRect(tx, ty, this.tileSize, this.tileSize, 12); ctx.fill();
            }
        }
    }
    loop(timestamp) {
        if (!this.running) return; const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000); this.lastTime = timestamp;
        this.update(dtSec); this.draw(); this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 8: COLOR CHAOS
const STROOP_DECK = [{ name: 'RED', hex: '#ef4444' }, { name: 'BLUE', hex: '#38bdf8' }, { name: 'GREEN', hex: '#22c55e' }, { name: 'YELLOW', hex: '#facc15' }, { name: 'PURPLE', hex: '#a855f7' }];
class ColorChaosGame {
    constructor({ canvas, ctx, audio, storage, onGameOver }) {
        this.canvas = canvas; this.ctx = ctx; this.audio = audio; this.storage = storage; this.onGameOver = onGameOver;
        this.running = false; this.score = 0; this.timeLeft = 2.0; this.swatches = [];
        this.onPointerDown = this.handlePointerDown.bind(this); this.onResize = this.handleResize.bind(this);
    }
    init() { this.handleResize(); this.canvas.addEventListener('pointerdown', this.onPointerDown); window.addEventListener('resize', this.onResize); }
    start() { this.score = 0; this.running = true; this.paused = false; this.lastTime = performance.now(); this.nextRound(); this.audio.play('start'); this.loop(performance.now()); }
    pause() { this.paused = true; } resume() { this.paused = false; this.lastTime = performance.now(); }
    destroy() { this.running = false; if (this.animFrameId) cancelAnimationFrame(this.animFrameId); this.canvas.removeEventListener('pointerdown', this.onPointerDown); window.removeEventListener('resize', this.onResize); }
    handleResize() {
        const bounds = this.canvas.getBoundingClientRect(); this.width = Math.max(300, bounds.width); this.height = Math.max(300, bounds.height);
        const dpr = window.devicePixelRatio || 1; this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.swatchWidth = Math.min(120, this.width * 0.22); this.swatchY = this.height * 0.65;
    }
    nextRound() {
        this.timeLeft = Math.max(1.1, 2.2 - this.score * 0.05);
        const wIdx = Math.floor(Math.random() * STROOP_DECK.length); let iIdx = Math.floor(Math.random() * STROOP_DECK.length);
        while (iIdx === wIdx) iIdx = Math.floor(Math.random() * STROOP_DECK.length);
        this.wordItem = STROOP_DECK[wIdx]; this.inkItem = STROOP_DECK[iIdx]; this.targetItem = this.inkItem;
        const choices = [this.targetItem];
        while (choices.length < 4) { const r = STROOP_DECK[Math.floor(Math.random() * STROOP_DECK.length)]; if (!choices.some(c => c.name === r.name)) choices.push(r); }
        choices.sort(() => Math.random() - 0.5);
        const startX = (this.width - (4 * this.swatchWidth + 3 * 15)) / 2;
        this.swatches = choices.map((c, i) => ({ item: c, x: startX + i * (this.swatchWidth + 15), y: this.swatchY, w: this.swatchWidth, h: 80 }));
    }
    handlePointerDown(e) {
        if (!this.running || this.paused) return; e.preventDefault();
        const rect = this.canvas.getBoundingClientRect(); const touchX = e.clientX - rect.left; const touchY = e.clientY - rect.top;
        for (const sw of this.swatches) {
            if (touchX >= sw.x && touchX <= sw.x + sw.w && touchY >= sw.y && touchY <= sw.y + sw.h) {
                if (sw.item.name === this.targetItem.name) { this.score += 1; this.audio.play('score'); this.nextRound(); }
                else { this.gameOver(); }
                return;
            }
        }
    }
    gameOver() { this.running = false; this.audio.play('hit'); if (this.onGameOver) this.onGameOver(this.score); }
    update(dtSec) { if (!this.running || this.paused) return; this.timeLeft -= dtSec; if (this.timeLeft <= 0) this.gameOver(); }
    draw() {
        const { ctx, width, height, wordItem, inkItem } = this; ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#080d18'; ctx.fillRect(0, 0, width, height);
        if (!wordItem) return;
        const pct = Math.max(0, this.timeLeft / 2.2); ctx.fillStyle = pct > 0.3 ? '#38bdf8' : '#ef4444'; ctx.fillRect(0, 0, width * pct, 12);
        ctx.font = '900 26px Outfit, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.fillText(`SCORE: ${this.score}`, 25, 55);
        ctx.font = '700 18px Outfit, sans-serif'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center'; ctx.fillText('Tap the TEXT COLOR (Not the word!)', width / 2, height * 0.22);
        ctx.font = '900 52px Outfit, sans-serif'; ctx.fillStyle = inkItem.hex; ctx.fillText(wordItem.name, width / 2, height * 0.42);
        for (const sw of this.swatches) { ctx.fillStyle = sw.item.hex; ctx.beginPath(); ctx.roundRect(sw.x, sw.y, sw.w, sw.h, 16); ctx.fill(); }
    }
    loop(timestamp) {
        if (!this.running) return; const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000); this.lastTime = timestamp;
        this.update(dtSec); this.draw(); this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 9: RUN TILL DEAD
class RunTillDeadGame {
    constructor({ canvas, ctx, audio, storage, onGameOver }) {
        this.canvas = canvas; this.ctx = ctx; this.audio = audio; this.storage = storage; this.onGameOver = onGameOver;
        this.running = false; this.score = 0; this.distance = 0; this.speed = 340; this.groundY = 480;
        this.runner = { x: 120, y: 480, w: 32, h: 48, vy: 0, jumping: false, ducking: false }; this.obstacles = [];
        this.onPointerDown = this.handlePointerDown.bind(this); this.onResize = this.handleResize.bind(this);
    }
    init() { this.handleResize(); this.canvas.addEventListener('pointerdown', this.onPointerDown); window.addEventListener('resize', this.onResize); }
    start() {
        this.score = 0; this.distance = 0; this.obstacles = []; this.running = true; this.paused = false; this.lastTime = performance.now();
        this.runner.y = this.groundY - 48; this.runner.vy = 0; this.runner.jumping = false; this.runner.ducking = false;
        this.audio.play('start'); this.loop(performance.now());
    }
    pause() { this.paused = true; } resume() { this.paused = false; this.lastTime = performance.now(); }
    destroy() { this.running = false; if (this.animFrameId) cancelAnimationFrame(this.animFrameId); this.canvas.removeEventListener('pointerdown', this.onPointerDown); window.removeEventListener('resize', this.onResize); }
    handleResize() {
        const bounds = this.canvas.getBoundingClientRect(); this.width = Math.max(300, bounds.width); this.height = Math.max(300, bounds.height);
        const dpr = window.devicePixelRatio || 1; this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.groundY = this.height * 0.82;
    }
    handlePointerDown(e) { if (!this.running || this.paused) return; e.preventDefault(); this.jump(); }
    jump() { if (!this.runner.jumping) { this.runner.vy = -12.5; this.runner.jumping = true; this.audio.play('jump'); } }
    spawnObstacle() { this.obstacles.push({ x: this.width + 40, y: this.groundY - 36, w: 28, h: 36 }); }
    update(dtSec) {
        if (!this.running || this.paused) return;
        this.speed = Math.min(650, 340 + this.distance * 2); this.distance += (this.speed * dtSec) / 10; this.score = Math.floor(this.distance);
        const r = this.runner;
        if (r.jumping) { r.vy += 28 * dtSec; r.y += r.vy; if (r.y >= this.groundY - 48) { r.y = this.groundY - 48; r.vy = 0; r.jumping = false; } }
        const now = performance.now();
        if (now - this.lastSpawn >= Math.max(900, 1600 - this.distance * 8)) { this.spawnObstacle(); this.lastSpawn = now; }
        for (const obs of this.obstacles) {
            obs.x -= this.speed * dtSec;
            if (r.x < obs.x + obs.w && r.x + r.w > obs.x && r.y < obs.y + obs.h && r.y + r.h > obs.y) {
                this.running = false; this.audio.play('hit'); if (this.onGameOver) this.onGameOver(this.score); return;
            }
        }
        this.obstacles = this.obstacles.filter(obs => obs.x + obs.w > -30);
    }
    draw() {
        const { ctx, width, height, groundY, runner } = this; ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#0a1128'; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(0, groundY, width, 8); ctx.fillStyle = '#331e14'; ctx.fillRect(0, groundY + 8, width, height - groundY - 8);
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.roundRect(runner.x, runner.y, runner.w, runner.h, 8); ctx.fill();
        for (const obs of this.obstacles) { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 6); ctx.fill(); }
        ctx.font = '900 28px Outfit, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.fillText(`DIST: ${this.score}m`, 25, 45);
    }
    loop(timestamp) {
        if (!this.running) return; const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000); this.lastTime = timestamp;
        this.update(dtSec); this.draw(); this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 10: MEMORY BLITZ
class MemoryBlitzGame {
    constructor({ canvas, ctx, audio, storage, onGameOver }) {
        this.canvas = canvas; this.ctx = ctx; this.audio = audio; this.storage = storage; this.onGameOver = onGameOver;
        this.running = false; this.score = 0; this.sequence = []; this.playerInput = []; this.phase = 'PREVIEW'; this.activeTile = null;
        this.onPointerDown = this.handlePointerDown.bind(this); this.onResize = this.handleResize.bind(this);
    }
    init() { this.handleResize(); this.canvas.addEventListener('pointerdown', this.onPointerDown); window.addEventListener('resize', this.onResize); }
    start() { this.score = 0; this.sequence = []; this.playerInput = []; this.running = true; this.paused = false; this.lastTime = performance.now(); this.nextRound(); this.audio.play('start'); this.loop(performance.now()); }
    pause() { this.paused = true; } resume() { this.paused = false; this.lastTime = performance.now(); }
    destroy() { this.running = false; if (this.animFrameId) cancelAnimationFrame(this.animFrameId); this.canvas.removeEventListener('pointerdown', this.onPointerDown); window.removeEventListener('resize', this.onResize); }
    handleResize() {
        const bounds = this.canvas.getBoundingClientRect(); this.width = Math.max(300, bounds.width); this.height = Math.max(300, bounds.height);
        const dpr = window.devicePixelRatio || 1; this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.gridWidth = Math.min(380, this.width * 0.85); this.gridX = (this.width - this.gridWidth) / 2; this.gridY = (this.height - this.gridWidth) / 2 + 30; this.tileSize = (this.gridWidth - 20) / 3;
    }
    async nextRound() {
        this.phase = 'PREVIEW'; this.playerInput = []; this.sequence.push(Math.floor(Math.random() * 9));
        for (let i = 0; i < this.sequence.length; i++) {
            if (!this.running) return;
            await new Promise(r => setTimeout(r, 350));
            this.activeTile = this.sequence[i]; this.audio.play('tap');
            await new Promise(r => setTimeout(r, 450));
            this.activeTile = null;
        }
        this.phase = 'PLAYING';
    }
    handlePointerDown(e) {
        if (!this.running || this.paused || this.phase !== 'PLAYING') return; e.preventDefault();
        const rect = this.canvas.getBoundingClientRect(); const touchX = e.clientX - rect.left; const touchY = e.clientY - rect.top;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const tx = this.gridX + c * (this.tileSize + 10); const ty = this.gridY + r * (this.tileSize + 10);
                if (touchX >= tx && touchX <= tx + this.tileSize && touchY >= ty && touchY <= ty + this.tileSize) {
                    const tileId = r * 3 + c; this.playerInput.push(tileId); const curr = this.playerInput.length - 1;
                    if (this.playerInput[curr] !== this.sequence[curr]) {
                        this.running = false; this.audio.play('hit'); if (this.onGameOver) this.onGameOver(this.score); return;
                    }
                    this.audio.play('tap');
                    if (this.playerInput.length === this.sequence.length) { this.score += 1; this.audio.play('score'); setTimeout(() => this.nextRound(), 600); }
                    return;
                }
            }
        }
    }
    update() { }
    draw() {
        const { ctx, width, height } = this; ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#0a0e1a'; ctx.fillRect(0, 0, width, height);
        ctx.font = '900 32px Outfit, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(`SCORE: ${this.score}`, width / 2, 55);
        ctx.font = '700 18px Outfit, sans-serif'; ctx.fillStyle = this.phase === 'PREVIEW' ? '#facc15' : '#38bdf8'; ctx.fillText(this.phase === 'PREVIEW' ? 'WATCH PATTERN...' : 'REPEAT PATTERN!', width / 2, 85);
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const tx = this.gridX + c * (this.tileSize + 10); const ty = this.gridY + r * (this.tileSize + 10); const tileId = r * 3 + c; const isActive = this.activeTile === tileId;
                ctx.fillStyle = isActive ? '#38bdf8' : '#1e293b'; ctx.beginPath(); ctx.roundRect(tx, ty, this.tileSize, this.tileSize, 16); ctx.fill();
            }
        }
    }
    loop(timestamp) {
        if (!this.running) return; const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000); this.lastTime = timestamp;
        this.update(dtSec); this.draw(); this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// ----------------------------------------------------------------------------
// 5. GAME LIFECYCLE MANAGER
// ----------------------------------------------------------------------------
class GameManager {
    constructor({ canvas, ctx, onGameOver, onPauseChange }) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.onGameOver = onGameOver;
        this.onPauseChange = onPauseChange;
        this.currentGameId = null;
        this.currentGameInstance = null;
        this.paused = false;
    }

    loadAndLaunch(gameId) {
        this.destroyCurrentGame();
        const gameMeta = getGameById(gameId);
        this.currentGameId = gameId;
        this.paused = false;

        let GameClass;
        switch (gameId) {
            case 'crazy-bird': GameClass = CrazyBirdGame; break;
            case 'tap-rush': GameClass = TapRushGame; break;
            case 'brain-trap': GameClass = BrainTrapGame; break;
            case 'dodge-it': GameClass = DodgeItGame; break;
            case 'perfect-hit': GameClass = PerfectHitGame; break;
            case 'stack-master': GameClass = StackMasterGame; break;
            case 'bomb-run': GameClass = BombRunGame; break;
            case 'color-chaos': GameClass = ColorChaosGame; break;
            case 'run-till-dead': GameClass = RunTillDeadGame; break;
            case 'memory-blitz': GameClass = MemoryBlitzGame; break;
            default: GameClass = CrazyBirdGame; break;
        }

        this.currentGameInstance = new GameClass({
            canvas: this.canvas,
            ctx: this.ctx,
            audio: globalAudio,
            storage: StorageManager,
            onGameOver: (finalScore) => {
                const isNewBest = StorageManager.saveBestScore(this.currentGameId, finalScore);
                if (this.onGameOver) {
                    this.onGameOver({
                        gameMeta,
                        score: finalScore,
                        bestScore: StorageManager.getBestScore(this.currentGameId),
                        isNewBest
                    });
                }
            }
        });

        this.currentGameInstance.init();
        this.currentGameInstance.start();
        return gameMeta;
    }

    pause() {
        if (this.currentGameInstance && typeof this.currentGameInstance.pause === 'function') {
            this.currentGameInstance.pause();
            this.paused = true;
            if (this.onPauseChange) this.onPauseChange(true);
        }
    }

    resume() {
        if (this.currentGameInstance && typeof this.currentGameInstance.resume === 'function') {
            this.currentGameInstance.resume();
            this.paused = false;
            if (this.onPauseChange) this.onPauseChange(false);
        }
    }

    togglePause() {
        if (this.paused) this.resume();
        else this.pause();
    }

    restart() {
        if (this.currentGameId) this.loadAndLaunch(this.currentGameId);
    }

    destroyCurrentGame() {
        if (this.currentGameInstance) {
            if (typeof this.currentGameInstance.destroy === 'function') {
                try { this.currentGameInstance.destroy(); } catch (e) { }
            }
            this.currentGameInstance = null;
        }
        globalAudio.stopMusic();
        this.paused = false;
    }
}

// ----------------------------------------------------------------------------
// 6. UI RENDERERS
// ----------------------------------------------------------------------------

// HOME UI
function renderHome({ container, storage, onPlayGame, onRandomGame }) {
    const recents = storage.getRecentGames();
    const todayIndex = new Date().getDate() % GAMES_CATALOG.length;
    const dailyGame = GAMES_CATALOG[todayIndex] || GAMES_CATALOG[0];

    container.innerHTML = `
        <section class="hero-card">
            <div class="hero-content">
                <span class="hero-pill">⚡ FAST • ADDICTIVE • FUN</span>
                <h1 class="hero-title">PLAY. COMPETE. REPEAT.</h1>
                <p class="hero-sub">Quick mini-games. Instant fun. Big scores.</p>
                <div class="hero-cta-group">
                    <button id="heroPlayBtn" class="btn btn-primary" type="button">▶ PLAY NOW</button>
                    <button id="heroRandomBtn" class="btn btn-secondary" type="button">🎲 RANDOM GAME</button>
                </div>
            </div>
        </section>

        ${recents.length > 0 ? `
        <section class="section-block">
            <h2 class="section-title">🕒 Continue Playing</h2>
            <div class="recent-grid">
                ${recents.map(item => {
        const meta = GAMES_CATALOG.find(g => g.id === item.id);
        if (!meta) return '';
        return `
                        <div class="game-card recent-card" data-id="${meta.id}">
                            <div class="card-icon">${meta.icon}</div>
                            <div class="card-info">
                                <h3>${meta.name}</h3>
                                <p>Last: <strong>${item.lastScore}</strong> • Best: <strong>${item.bestScore}</strong></p>
                            </div>
                            <button class="btn btn-sm btn-primary play-card-btn" data-id="${meta.id}" type="button">PLAY</button>
                        </div>
                    `;
    }).join('')}
            </div>
        </section>
        ` : ''}

        <section class="section-block">
            <div class="daily-card">
                <div class="daily-badge">🔥 DAILY CHALLENGE</div>
                <div class="daily-body">
                    <div class="daily-icon">${dailyGame.icon}</div>
                    <div class="daily-details">
                        <h3>${dailyGame.name}</h3>
                        <p>${dailyGame.tagline}</p>
                    </div>
                </div>
                <button id="dailyPlayBtn" class="btn btn-gold" data-id="${dailyGame.id}" type="button">🎯 PLAY TODAY'S CHALLENGE</button>
            </div>
        </section>

        <section class="section-block">
            <h2 class="section-title">🔥 Trending Mini-Games</h2>
            <div class="game-grid">
                ${GAMES_CATALOG.filter(g => g.trending).map(game => {
        const best = storage.getBestScore(game.id);
        return `
                        <div class="game-card" data-id="${game.id}">
                            <div class="card-top">
                                <span class="card-icon-lg">${game.icon}</span>
                                <span class="card-badge">${game.category}</span>
                            </div>
                            <h3>${game.name}</h3>
                            <p>${game.tagline}</p>
                            <div class="card-footer">
                                <span class="card-best">Best: <strong>${best}</strong></span>
                                <button class="btn btn-sm btn-primary play-card-btn" data-id="${game.id}" type="button">PLAY →</button>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </section>
    `;

    container.querySelector('#heroPlayBtn')?.addEventListener('click', () => onPlayGame('crazy-bird'));
    container.querySelector('#heroRandomBtn')?.addEventListener('click', () => onRandomGame());
    container.querySelector('#dailyPlayBtn')?.addEventListener('click', (e) => onPlayGame(e.currentTarget.dataset.id));

    container.querySelectorAll('.play-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); onPlayGame(btn.dataset.id); });
    });
    container.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', (e) => { if (e.target.closest('button')) return; onPlayGame(card.dataset.id); });
    });
}

// CATALOG UI
function renderCatalog({ container, storage, onPlayGame, initialQuery = '', initialCategory = 'all' }) {
    let currentCategory = initialCategory;
    let currentQuery = initialQuery;

    container.innerHTML = `
        <section class="catalog-header">
            <h1 class="page-title">Explore All Mini-Games</h1>
            <p class="page-sub">Select a game to start playing instantly</p>

            <div class="search-box">
                <span class="search-icon">🔍</span>
                <input id="searchInput" type="text" placeholder="Search games by name, category, or tag..." value="${currentQuery}" />
            </div>

            <div class="category-scroll">
                ${GAME_CATEGORIES.map(cat => `
                    <button class="cat-chip ${cat.id === currentCategory ? 'active' : ''}" data-cat="${cat.id}" type="button">
                        ${cat.icon} ${cat.label}
                    </button>
                `).join('')}
            </div>
        </section>

        <section class="section-block">
            <div id="catalogGrid" class="game-grid"></div>
        </section>
    `;

    const searchInput = container.querySelector('#searchInput');
    const catalogGrid = container.querySelector('#catalogGrid');

    function updateGrid() {
        const results = searchGames(currentQuery, currentCategory);
        if (results.length === 0) {
            catalogGrid.innerHTML = `
                <div class="empty-results">
                    <div class="empty-icon">🔍</div>
                    <h3>No games found</h3>
                    <p>Try searching for another keyword or change category filters.</p>
                </div>
            `;
            return;
        }

        catalogGrid.innerHTML = results.map(game => {
            const best = storage.getBestScore(game.id);
            return `
                <div class="game-card" data-id="${game.id}">
                    <div class="card-top">
                        <span class="card-icon-lg">${game.icon}</span>
                        <span class="card-badge">${game.category}</span>
                    </div>
                    <h3>${game.name}</h3>
                    <p>${game.tagline}</p>
                    <div class="card-footer">
                        <span class="card-best">Best: <strong>${best}</strong></span>
                        <button class="btn btn-sm btn-primary play-card-btn" data-id="${game.id}" type="button">PLAY →</button>
                    </div>
                </div>
            `;
        }).join('');

        catalogGrid.querySelectorAll('.play-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { e.stopPropagation(); onPlayGame(btn.dataset.id); });
        });
        catalogGrid.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', (e) => { if (e.target.closest('button')) return; onPlayGame(card.dataset.id); });
        });
    }

    searchInput.addEventListener('input', (e) => { currentQuery = e.target.value; updateGrid(); });
    container.querySelectorAll('.cat-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            container.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentCategory = chip.dataset.cat;
            updateGrid();
        });
    });

    updateGrid();
}

// PROFILE UI
function renderProfile({ container, storage, onPlayGame }) {
    const totalPlays = storage.getTotalPlays();
    const scores = GAMES_CATALOG.map(game => ({
        game,
        bestScore: storage.getBestScore(game.id)
    })).filter(item => item.bestScore > 0);

    const highestScoreObj = scores.reduce((max, item) => item.bestScore > max.bestScore ? item : max, { bestScore: 0, game: GAMES_CATALOG[0] });

    container.innerHTML = `
        <section class="profile-header">
            <div class="avatar-box">🐤</div>
            <h1 class="page-title">Player Profile</h1>
            <p class="page-sub">Your personal bests and gaming achievements</p>
        </section>

        <section class="section-block">
            <div class="stats-grid">
                <div class="stat-card"><label>Total Games Played</label><value>${totalPlays}</value></div>
                <div class="stat-card"><label>Games Mastered</label><value>${scores.length} / ${GAMES_CATALOG.length}</value></div>
                <div class="stat-card"><label>Highest Single Score</label><value>${highestScoreObj.bestScore} <small>(${highestScoreObj.game.name})</small></value></div>
            </div>
        </section>

        <section class="section-block">
            <h2 class="section-title">🏆 Personal Best Records</h2>
            <div class="game-grid">
                ${GAMES_CATALOG.map(game => {
        const best = storage.getBestScore(game.id);
        return `
                        <div class="game-card" data-id="${game.id}">
                            <div class="card-top">
                                <span class="card-icon-lg">${game.icon}</span>
                                <span class="card-badge">${game.category}</span>
                            </div>
                            <h3>${game.name}</h3>
                            <div class="card-footer">
                                <span class="card-best">Personal Best: <strong>${best}</strong></span>
                                <button class="btn btn-sm btn-primary play-card-btn" data-id="${game.id}" type="button">PLAY →</button>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </section>
    `;

    container.querySelectorAll('.play-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); onPlayGame(btn.dataset.id); });
    });
    container.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', (e) => { if (e.target.closest('button')) return; onPlayGame(card.dataset.id); });
    });
}

// RESULT MODAL
function getMedal(score) {
    if (score >= 50) return { icon: '💎', title: 'Platinum Medal' };
    if (score >= 35) return { icon: '🥇', title: 'Gold Medal' };
    if (score >= 20) return { icon: '🥈', title: 'Silver Medal' };
    if (score >= 10) return { icon: '🥉', title: 'Bronze Medal' };
    return null;
}

function showResultModal({ gameMeta, score, bestScore, isNewBest, onReplay, onRandomGame, onGoHome, showToast }) {
    const overlay = document.getElementById('resultModal');
    if (!overlay) return;

    const medal = getMedal(score);

    overlay.innerHTML = `
        <div class="panel result-panel">
            <div class="panel-glow"></div>
            <div class="result-header">
                <span class="game-icon-title">${gameMeta.icon}</span>
                <h1>${isNewBest ? '🎉 NEW BEST!' : 'GAME OVER'}</h1>
                <p class="game-subtitle">${gameMeta.name}</p>
            </div>

            ${medal ? `
            <div class="medal-box">
                <span class="medal-icon">${medal.icon}</span>
                <div class="medal-info">
                    <strong>${medal.title}</strong>
                    <p>Awesome performance!</p>
                </div>
            </div>
            ` : ''}

            <div class="score-summary">
                <div class="score-card"><label>SCORE</label><value>${score}</value></div>
                <div class="score-card"><label>BEST</label><value>${bestScore}</value></div>
            </div>

            <div class="result-actions">
                <button id="resPlayAgainBtn" class="btn btn-primary btn-block" type="button">🔄 PLAY AGAIN</button>
                <div class="btn-group-half">
                    <button id="resRandomBtn" class="btn btn-secondary" type="button">🎲 RANDOM GAME</button>
                    <button id="resShareBtn" class="btn btn-gold" type="button">🔗 SHARE SCORE</button>
                </div>
                <button id="resHomeBtn" class="btn btn-outline btn-block" type="button">🏠 BACK TO HOME</button>
            </div>
        </div>
    `;

    overlay.classList.add('visible');

    overlay.querySelector('#resPlayAgainBtn')?.addEventListener('click', () => { overlay.classList.remove('visible'); onReplay(); });
    overlay.querySelector('#resRandomBtn')?.addEventListener('click', () => { overlay.classList.remove('visible'); onRandomGame(); });
    overlay.querySelector('#resHomeBtn')?.addEventListener('click', () => { overlay.classList.remove('visible'); onGoHome(); });
    overlay.querySelector('#resShareBtn')?.addEventListener('click', () => {
        const text = `🐤 I scored ${score} in ${gameMeta.name} on BirdMate! Can you beat me?\nPlay here: https://birdmate.netlify.app/`;
        if (navigator.share) { navigator.share({ title: 'BirdMate Score', text, url: 'https://birdmate.netlify.app/' }).catch(() => { }); }
        else { navigator.clipboard.writeText(text).then(() => { showToast('Score copied to clipboard!'); }).catch(() => { showToast(`Score: ${score}!`); }); }
    });
}

// ----------------------------------------------------------------------------
// 7. MAIN APP ROUTER & ORCHESTRATOR
// ----------------------------------------------------------------------------
class BirdMateApp {
    constructor() {
        this.currentView = 'home';
        this.gameManager = null;
        this.toastEl = document.getElementById('toast');
    }

    init() {
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        this.gameManager = new GameManager({
            canvas,
            ctx,
            onGameOver: (result) => this.handleGameOver(result),
            onPauseChange: (isPaused) => this.handlePauseChange(isPaused)
        });

        this.bindEvents();
        this.updateMuteUI();
        this.navigate('home');
    }

    bindEvents() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                if (view) this.navigate(view);
            });
        });

        document.getElementById('soundToggle')?.addEventListener('click', () => {
            const muted = globalAudio.toggleMute();
            this.updateMuteUI(muted);
        });

        document.getElementById('pauseButton')?.addEventListener('click', () => {
            if (this.currentView === 'playing') {
                this.gameManager.togglePause();
            }
        });

        const searchInput = document.getElementById('headerSearch');
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    this.navigate('games', { query });
                }
            });
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.currentView === 'playing') {
                this.gameManager.pause();
            }
        });
    }

    updateMuteUI(muted = globalAudio.isMuted()) {
        const btn = document.getElementById('soundToggle');
        if (btn) {
            btn.textContent = muted ? '🔇' : '🔊';
            btn.setAttribute('aria-pressed', String(muted));
        }
    }

    showToast(message) {
        if (!this.toastEl) return;
        this.toastEl.textContent = message;
        this.toastEl.classList.add('show');
        setTimeout(() => this.toastEl.classList.remove('show'), 2500);
    }

    navigate(viewName, params = {}) {
        this.currentView = viewName;

        if (viewName !== 'playing') {
            this.gameManager.destroyCurrentGame();
        }

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });

        const viewContainer = document.getElementById('viewContainer');
        const playingCard = document.getElementById('playingCard');
        const hudControls = document.getElementById('hudControls');

        if (viewName === 'playing') {
            viewContainer.style.display = 'none';
            playingCard.style.display = 'block';
            hudControls.style.display = 'flex';
        } else {
            viewContainer.style.display = 'block';
            playingCard.style.display = 'none';
            hudControls.style.display = 'none';
        }

        switch (viewName) {
            case 'home':
                renderHome({
                    container: viewContainer,
                    storage: StorageManager,
                    onPlayGame: (id) => this.launchGame(id),
                    onRandomGame: () => this.launchRandomGame()
                });
                break;
            case 'games':
                renderCatalog({
                    container: viewContainer,
                    storage: StorageManager,
                    onPlayGame: (id) => this.launchGame(id),
                    initialQuery: params.query || '',
                    initialCategory: params.category || 'all'
                });
                break;
            case 'profile':
                renderProfile({
                    container: viewContainer,
                    storage: StorageManager,
                    onPlayGame: (id) => this.launchGame(id)
                });
                break;
        }
    }

    launchGame(gameId) {
        this.navigate('playing');
        const meta = this.gameManager.loadAndLaunch(gameId);
        if (meta) {
            const titleEl = document.getElementById('gameTitleHud');
            if (titleEl) titleEl.textContent = meta.name;
        }
    }

    launchRandomGame() {
        const available = GAMES_CATALOG.filter(g => g.id !== this.gameManager.currentGameId);
        const randomGame = available[Math.floor(Math.random() * available.length)];
        this.launchGame(randomGame.id);
    }

    handleGameOver(result) {
        showResultModal({
            gameMeta: result.gameMeta,
            score: result.score,
            bestScore: result.bestScore,
            isNewBest: result.isNewBest,
            onReplay: () => this.gameManager.restart(),
            onRandomGame: () => this.launchRandomGame(),
            onGoHome: () => this.navigate('home'),
            showToast: (msg) => this.showToast(msg)
        });
    }

    handlePauseChange(isPaused) {
        const pauseBtn = document.getElementById('pauseButton');
        if (pauseBtn) {
            pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
        }
    }
}

// ----------------------------------------------------------------------------
// INITIALIZATION ON DOM CONTENT LOADED
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const app = new BirdMateApp();
    app.init();
});
