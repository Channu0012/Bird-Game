const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const speedLabel = document.getElementById('speedLabel');
const overlay = document.getElementById('overlay');
const soundToggle = document.getElementById('soundToggle');
const pauseButton = document.getElementById('pauseButton');
const toastEl = document.getElementById('toast');

const BASE_WIDTH = 900;
const BASE_HEIGHT = 620;
const FRAME_RATE = 60;
const FIXED_STEP = 1 / 60;

const GAME_PHASES = {
    LOADING: 'LOADING',
    READY: 'READY',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
};

const DIFFICULTY_CONFIG = {
    easy: { label: 'Easy', gravity: 0.46, flapPower: -8.6, pipeSpeed: 3.5, pipeGap: 210, spawnDelay: 1550 },
    medium: { label: 'Medium', gravity: 0.52, flapPower: -9.1, pipeSpeed: 4.1, pipeGap: 188, spawnDelay: 1350 },
    hard: { label: 'Hard', gravity: 0.58, flapPower: -9.7, pipeSpeed: 4.7, pipeGap: 168, spawnDelay: 1180 },
};

let width = BASE_WIDTH;
let height = BASE_HEIGHT;
let groundY = 540;
let gravity = 0.52;
let flapPower = -9.1;
let pipeSpeed = 4.1;
let pipeWidth = 92;
let pipeGap = 188;
let spawnDelay = 1350;
let audioContext = null;
let musicLoop = null;
let splashTimer = null;
let lastFrameTime = performance.now();
let physicsAccumulator = 0;
let lastPipeGapTop = null;

// Parallax scroll offsets
let cloudsX = 0;
let mountainsX = 0;
let groundX = 0;

const clamp = (min, value, max) => Math.min(Math.max(value, min), max);

function getBestScore() {
    try {
        const rawValue = localStorage.getItem('crazybird-best');
        const parsed = Number(rawValue);
        return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
    } catch (e) {
        return 0;
    }
}

function saveBestScore(score) {
    try {
        localStorage.setItem('crazybird-best', String(score));
    } catch (e) { }
}

const state = {
    phase: GAME_PHASES.LOADING,
    score: 0,
    best: getBestScore(),
    combo: 0,
    lastScoreTime: 0,
    lastSpawn: 0,
    pipes: [],
    particles: [],
    floatingTexts: [],
    muted: false,
    difficulty: 'medium',
    bird: {
        x: 150,
        y: BASE_HEIGHT / 2,
        radius: 22,
        hitRadius: 17,
        velocity: 0,
        wingPhase: 0,
        tilt: 0,
    },
};

const isPlaying = () => state.phase === GAME_PHASES.PLAYING;
const isPaused = () => state.phase === GAME_PHASES.PAUSED;
const isGameOver = () => state.phase === GAME_PHASES.GAME_OVER;
const isReady = () => state.phase === GAME_PHASES.READY;

function setPhase(newPhase) {
    state.phase = newPhase;
}

function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 2500);
}

function updateSpeedHud() {
    const multiplier = 1 + Math.min(2.5, state.score * 0.05);
    speedLabel.textContent = `${multiplier.toFixed(1)}x`;
}

function ensureAudio() {
    if (!audioContext) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return null;
        audioContext = new AudioCtor();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => { });
    }
    return audioContext;
}

function playTone({ frequency, duration, type = 'sine', volume = 0.04, slide = 0 }) {
    const context = ensureAudio();
    if (!context || state.muted) return;

    try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, context.currentTime);
        if (slide !== 0) {
            oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + slide), context.currentTime + duration);
        }

        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
    } catch (e) { }
}

function playSound(type) {
    if (state.muted) return;

    if (type === 'flap') {
        playTone({ frequency: 420, duration: 0.07, type: 'triangle', volume: 0.05, slide: 130 });
    } else if (type === 'score') {
        playTone({ frequency: 780, duration: 0.08, type: 'square', volume: 0.04, slide: 220 });
    } else if (type === 'hit') {
        playTone({ frequency: 180, duration: 0.16, type: 'sawtooth', volume: 0.06, slide: -140 });
    } else if (type === 'start') {
        playTone({ frequency: 620, duration: 0.12, type: 'triangle', volume: 0.05, slide: 180 });
        playTone({ frequency: 900, duration: 0.1, type: 'triangle', volume: 0.04, slide: 250 });
    } else if (type === 'milestone') {
        playTone({ frequency: 523.25, duration: 0.08, type: 'triangle', volume: 0.05, slide: 100 });
        setTimeout(() => playTone({ frequency: 659.25, duration: 0.08, type: 'triangle', volume: 0.05, slide: 100 }), 80);
        setTimeout(() => playTone({ frequency: 783.99, duration: 0.12, type: 'triangle', volume: 0.06, slide: 150 }), 160);
    }
}

function stopBackgroundMusic() {
    if (musicLoop) {
        clearInterval(musicLoop);
        musicLoop = null;
    }
}

function startBackgroundMusic() {
    if (state.muted || isPaused() || !isPlaying()) return;
    stopBackgroundMusic();

    const melody = [220, 277, 330, 392, 330, 277, 220, 196];
    let index = 0;

    musicLoop = setInterval(() => {
        if (state.muted || isPaused() || !isPlaying()) return;
        const frequency = melody[index % melody.length];
        playTone({ frequency, duration: 0.18, type: 'triangle', volume: 0.018, slide: 60 });
        index += 1;
    }, 340);
}

function resizeCanvas() {
    const card = document.querySelector('.game-card');
    if (!card) return;

    const bounds = card.getBoundingClientRect();
    width = Math.max(300, bounds.width);
    height = Math.max(300, bounds.height);

    groundY = height * 0.86;

    const config = DIFFICULTY_CONFIG[state.difficulty];
    gravity = config.gravity * (height / BASE_HEIGHT);
    flapPower = config.flapPower * (height / BASE_HEIGHT);
    pipeSpeed = config.pipeSpeed * (width / BASE_WIDTH);
    pipeWidth = Math.max(55, Math.min(100, width * 0.11));

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resetBird() {
    state.bird.x = width * 0.18;
    state.bird.y = height * 0.45;
    state.bird.radius = Math.max(16, Math.min(26, height * 0.036));
    state.bird.hitRadius = state.bird.radius * 0.78;
    state.bird.velocity = 0;
    state.bird.wingPhase = 0;
    state.bird.tilt = 0;
}

function spawnParticles(x, y, color = '#fff7c2', count = 12) {
    for (let i = 0; i < count; i += 1) {
        state.particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 4.2,
            vy: (Math.random() - 0.8) * 4.2,
            life: 24 + Math.random() * 16,
            maxLife: 40,
            size: Math.random() * 4 + 2,
            color,
        });
    }
}

function updateParticles() {
    state.particles = state.particles.filter((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.08;
        particle.life -= 1;
        return particle.life > 0;
    });
}

function spawnFloatingText(x, y, text, color = '#fff7c2') {
    state.floatingTexts.push({
        x,
        y,
        text,
        color,
        life: 50,
        maxLife: 50,
        vy: -0.9,
    });
}

function updateFloatingTexts() {
    state.floatingTexts = state.floatingTexts.filter((item) => {
        item.x += 0.1;
        item.y += item.vy;
        item.vy *= 0.98;
        item.life -= 1;
        return item.life > 0;
    });
}

function drawParticles() {
    for (const particle of state.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawFloatingTexts() {
    ctx.save();
    for (const item of state.floatingTexts) {
        ctx.globalAlpha = Math.max(0, item.life / item.maxLife);
        ctx.font = '800 22px Outfit, sans-serif';
        ctx.fillStyle = item.color;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 6;
        ctx.fillText(item.text, item.x, item.y);
    }
    ctx.restore();
}

function applyDifficulty() {
    const config = DIFFICULTY_CONFIG[state.difficulty];
    const difficultyBoost = 1 + Math.min(2.5, state.score * 0.05);
    pipeSpeed = config.pipeSpeed * difficultyBoost * (width / BASE_WIDTH);
    pipeGap = clamp(140, config.pipeGap - state.score * 1.5, config.pipeGap + 10);
    spawnDelay = Math.max(850, config.spawnDelay - state.score * 18);
    updateSpeedHud();
}

function setDifficulty(level) {
    if (!DIFFICULTY_CONFIG[level]) return;
    state.difficulty = level;
    resizeCanvas();
    resetBird();
    applyDifficulty();
}

function showLoadingSplash() {
    if (splashTimer) {
        clearTimeout(splashTimer);
    }
    stopBackgroundMusic();
    setPhase(GAME_PHASES.LOADING);
    overlay.classList.add('visible');
    overlay.innerHTML = `
        <div class="panel splash-panel">
            <div class="panel-glow"></div>
            <div class="splash-logo">🐤</div>
            <h1>BirdMate</h1>
            <div class="loading-spinner" aria-hidden="true"></div>
            <p>Preparing sky flight...</p>
        </div>
    `;

    splashTimer = setTimeout(() => {
        showStartMenu();
    }, 1000);
}

function showStartMenu() {
    stopBackgroundMusic();
    resetBird();
    state.pipes = [];
    state.particles = [];
    state.floatingTexts = [];
    state.score = 0;
    state.combo = 0;
    state.lastScoreTime = 0;
    state.lastSpawn = 0;
    lastPipeGapTop = null;
    scoreEl.textContent = '0';
    bestEl.textContent = String(state.best);

    overlay.classList.add('visible');
    overlay.innerHTML = `
        <div class="panel">
            <div class="panel-glow"></div>
            <h1>BirdMate</h1>
            <p>Select flight difficulty</p>
            <div class="difficulty-row">
                ${Object.entries(DIFFICULTY_CONFIG)
            .map(([key, config]) => `<button class="difficulty-btn ${state.difficulty === key ? 'active' : ''}" data-difficulty="${key}" type="button">${config.label}</button>`)
            .join('')}
            </div>
            <button id="startButton" type="button">Play Game</button>
            <div class="menu-note">Tap, click, or press Space to flap</div>
        </div>
    `;

    setPhase(GAME_PHASES.READY);

    overlay.querySelectorAll('.difficulty-btn').forEach((button) => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            setDifficulty(button.dataset.difficulty);
            overlay.querySelectorAll('.difficulty-btn').forEach((b) => b.classList.remove('active'));
            button.classList.add('active');
        });
    });

    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', (e) => {
            e.stopPropagation();
            startGame(state.difficulty);
        });
    }
}

function startGame(selectedDifficulty = state.difficulty) {
    ensureAudio();
    state.score = 0;
    state.combo = 0;
    state.lastScoreTime = 0;
    state.lastSpawn = 0;
    state.pipes = [];
    state.particles = [];
    state.floatingTexts = [];
    lastPipeGapTop = null;

    setDifficulty(selectedDifficulty);
    scoreEl.textContent = '0';
    overlay.classList.remove('visible');
    overlay.innerHTML = '';
    resetBird();

    state.bird.velocity = flapPower;
    setPhase(GAME_PHASES.PLAYING);
    lastFrameTime = performance.now();
    physicsAccumulator = 0;

    playSound('start');
    startBackgroundMusic();
}

function pauseGame() {
    if (!isPlaying() && !isPaused()) return;

    if (isPlaying()) {
        setPhase(GAME_PHASES.PAUSED);
    } else if (isPaused()) {
        setPhase(GAME_PHASES.PLAYING);
    }

    pauseButton.textContent = isPaused() ? 'Resume' : 'Pause';

    if (isPaused()) {
        stopBackgroundMusic();
        overlay.classList.add('visible');
        overlay.innerHTML = `
            <div class="panel">
                <div class="panel-glow"></div>
                <h1>Paused</h1>
                <p>Take a breather! Click Resume or press P to jump back in.</p>
                <div class="action-row">
                    <button id="resumeButton" class="action-btn" type="button">Resume</button>
                    <button id="menuButton" class="action-btn difficulty-btn" type="button">Menu</button>
                </div>
            </div>
        `;
        const resumeButton = document.getElementById('resumeButton');
        if (resumeButton) {
            resumeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                pauseGame();
            });
        }
        const menuButton = document.getElementById('menuButton');
        if (menuButton) {
            menuButton.addEventListener('click', (e) => {
                e.stopPropagation();
                showStartMenu();
            });
        }
    } else {
        overlay.classList.remove('visible');
        overlay.innerHTML = '';
        lastFrameTime = performance.now();
        physicsAccumulator = 0;
        startBackgroundMusic();
    }
}

function flap() {
    ensureAudio();

    if (isPaused()) {
        pauseGame();
        return;
    }

    if (isGameOver() || isReady()) {
        startGame(state.difficulty);
        return;
    }

    if (!isPlaying()) return;

    state.bird.velocity = flapPower;
    state.bird.wingPhase = 0;
    spawnParticles(state.bird.x - 8, state.bird.y + 6, '#ffe08a', 8);
    playSound('flap');
}

function getMedal(score) {
    if (score >= 50) return { icon: '💎', title: 'Platinum Medal' };
    if (score >= 35) return { icon: '🥇', title: 'Gold Medal' };
    if (score >= 20) return { icon: '🥈', title: 'Silver Medal' };
    if (score >= 10) return { icon: '🥉', title: 'Bronze Medal' };
    return null;
}

function shareScore() {
    const shareText = `🐤 I scored ${state.score} points in BirdMate! Can you beat my high score?\nPlay here: https://birdmate.netlify.app/`;

    if (navigator.share) {
        navigator.share({
            title: 'BirdMate Score',
            text: shareText,
            url: 'https://birdmate.netlify.app/',
        }).catch(() => { });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('Score link copied to clipboard!');
        }).catch(() => {
            showToast(`Score: ${state.score}!`);
        });
    }
}

function createPipe() {
    const upperLimit = groundY - 80;
    const isBossPipe = state.score > 4 && Math.random() < 0.18;
    const currentGap = isBossPipe ? Math.max(135, pipeGap * 0.78) : Math.max(140, pipeGap);
    const topMargin = 60;
    const available = Math.max(0, upperLimit - currentGap - topMargin);

    let gapTop = topMargin + Math.random() * available;

    // Smooth gap top transition to avoid impossible vertical walls
    if (lastPipeGapTop !== null) {
        const maxShift = 160;
        gapTop = clamp(Math.max(topMargin, lastPipeGapTop - maxShift), gapTop, Math.min(available + topMargin, lastPipeGapTop + maxShift));
    }
    lastPipeGapTop = gapTop;

    state.pipes.push({
        x: width + 50,
        width: isBossPipe ? pipeWidth * 1.35 : pipeWidth,
        gapTop,
        gapHeight: currentGap,
        scored: false,
        isBoss: isBossPipe,
    });
}

function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
    if (rh <= 0 || rw <= 0) return false;
    const closestX = clamp(rx, cx, rx + rw);
    const closestY = clamp(ry, cy, ry + rh);
    const distX = cx - closestX;
    const distY = cy - closestY;
    return (distX * distX + distY * distY) < (r * r);
}

function checkCollision() {
    const { bird } = state;
    const { x: cx, y: cy, hitRadius: r } = bird;

    // Ground and Ceiling collision
    if (cy + r >= groundY || cy - r <= 0) {
        return true;
    }

    for (const pipe of state.pipes) {
        const pipeLength = pipe.width;
        const capHeight = 18;
        const capOverhang = 8;
        const gapTop = pipe.gapTop;
        const gapBottom = gapTop + pipe.gapHeight;

        // 1. Top pipe body
        if (circleRectCollision(cx, cy, r, pipe.x, 0, pipeLength, gapTop - capHeight)) return true;

        // 2. Top pipe cap (with 8px overhang)
        if (circleRectCollision(cx, cy, r, pipe.x - capOverhang, Math.max(0, gapTop - capHeight), pipeLength + capOverhang * 2, capHeight)) return true;

        // 3. Bottom pipe cap (with 8px overhang)
        if (circleRectCollision(cx, cy, r, pipe.x - capOverhang, gapBottom, pipeLength + capOverhang * 2, capHeight)) return true;

        // 4. Bottom pipe body
        if (circleRectCollision(cx, cy, r, pipe.x, gapBottom + capHeight, pipeLength, Math.max(0, groundY - (gapBottom + capHeight)))) return true;
    }

    return false;
}

function updateGame(dt) {
    if (!isPlaying()) return;

    applyDifficulty();

    // Scroll parallax background layers
    const currentPipeSpeed = pipeSpeed * dt;
    cloudsX = (cloudsX + currentPipeSpeed * 0.3) % width;
    mountainsX = (mountainsX + currentPipeSpeed * 0.6) % width;
    groundX = (groundX + currentPipeSpeed) % 32;

    state.bird.velocity += gravity * dt;
    state.bird.y += state.bird.velocity * dt;
    state.bird.wingPhase += 0.25 * dt;
    state.bird.tilt = clamp(-0.4, state.bird.velocity / 12, 1.1);

    const now = performance.now();
    if (now - state.lastSpawn >= spawnDelay) {
        createPipe();
        state.lastSpawn = now;
    }

    for (const pipe of state.pipes) {
        pipe.x -= currentPipeSpeed;

        if (!pipe.scored && pipe.x + pipe.width < state.bird.x) {
            pipe.scored = true;
            const scoreTime = performance.now();
            const comboValue = scoreTime - state.lastScoreTime < 1800 ? state.combo + 1 : 1;
            state.combo = comboValue;
            state.lastScoreTime = scoreTime;
            state.score += 1;
            scoreEl.textContent = String(state.score);

            spawnParticles(state.bird.x + 30, state.bird.y - 10, '#facc15', 12);

            if (comboValue > 1) {
                spawnFloatingText(state.bird.x + 20, state.bird.y - 20, `x${comboValue} Combo!`, '#facc15');
            } else {
                spawnFloatingText(state.bird.x + 10, state.bird.y - 20, '+1', '#fff7c2');
            }

            // Milestone sound & floating banner
            if (state.score > 0 && state.score % 10 === 0) {
                spawnFloatingText(state.bird.x, state.bird.y - 40, `🎯 ${state.score} PIPES!`, '#38bdf8');
                playSound('milestone');
            } else {
                playSound('score');
            }
        }
    }

    state.pipes = state.pipes.filter((pipe) => pipe.x + pipe.width > -40);
    updateParticles();
    updateFloatingTexts();

    if (checkCollision()) {
        setPhase(GAME_PHASES.GAME_OVER);
        const isNewBest = state.score > state.best;
        if (isNewBest) {
            state.best = state.score;
            saveBestScore(state.best);
            bestEl.textContent = String(state.best);
        }

        spawnParticles(state.bird.x, state.bird.y, '#f87171', 25);
        playSound('hit');
        stopBackgroundMusic();

        const medal = getMedal(state.score);

        overlay.classList.add('visible');
        overlay.innerHTML = `
            <div class="panel">
                <div class="panel-glow"></div>
                <h1>${isNewBest ? '🎉 New Record!' : 'Game Over'}</h1>
                ${medal ? `<div class="medal-box"><span class="medal-icon">${medal.icon}</span><strong>${medal.title}</strong></div>` : ''}
                <div class="score-summary">
                    <div class="score-card">
                        <label>Score</label>
                        <value>${state.score}</value>
                    </div>
                    <div class="score-card">
                        <label>Best</label>
                        <value>${state.best}</value>
                    </div>
                </div>
                <div class="action-row">
                    <button id="restartButton" class="action-btn" type="button">Play Again</button>
                    <button id="shareButton" class="action-btn share-btn" type="button">Share Score</button>
                </div>
            </div>
        `;

        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.addEventListener('click', (e) => {
                e.stopPropagation();
                showStartMenu();
            });
        }

        const shareBtn = document.getElementById('shareButton');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                shareScore();
            });
        }
    }
}

function drawBackground() {
    ctx.clearRect(0, 0, width, height);

    // Dynamic Gradient Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, '#040915');
    skyGradient.addColorStop(0.3, '#0f2b66');
    skyGradient.addColorStop(0.7, '#1e40af');
    skyGradient.addColorStop(1, '#38bdf8');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);

    // Sun / Moon Glow
    ctx.fillStyle = 'rgba(253, 224, 71, 0.85)';
    ctx.beginPath();
    ctx.arc(width * 0.82, height * 0.16, Math.max(30, height * 0.08), 0, Math.PI * 2);
    ctx.fill();

    // Parallax Layer 1: Distant Mountains
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    const mStep = width / 4;
    ctx.moveTo(0 - mountainsX, height * 0.65);
    for (let i = 0; i <= 6; i += 1) {
        const mx = i * mStep - mountainsX;
        const my = (i % 2 === 0 ? 0.45 : 0.58) * height;
        ctx.lineTo(mx, my);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Parallax Layer 2: Scrolling Clouds
    ctx.fillStyle = 'rgba(241, 245, 249, 0.75)';
    const cloudBases = [
        { x: width * 0.1, y: height * 0.18 },
        { x: width * 0.45, y: height * 0.22 },
        { x: width * 0.8, y: height * 0.16 },
        { x: width * 1.15, y: height * 0.24 }
    ];

    for (const cb of cloudBases) {
        const cx = (cb.x - cloudsX + width * 2) % (width * 1.3) - width * 0.15;
        const cy = cb.y;
        const cr = Math.max(16, height * 0.035);
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.arc(cx + cr * 1.2, cy - cr * 0.4, cr * 1.3, 0, Math.PI * 2);
        ctx.arc(cx + cr * 2.5, cy, cr * 1.1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Personal Best Line Indicator during Flight
    if (state.best > 0 && isPlaying()) {
        ctx.save();
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(0, height * 0.1);
        ctx.lineTo(width, height * 0.1);
        ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 12px Outfit, sans-serif';
        ctx.fillText(`BEST: ${state.best}`, 16, height * 0.09);
        ctx.restore();
    }

    // Ground Base
    ctx.fillStyle = '#331e14';
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.fillStyle = '#5c3826';
    ctx.fillRect(0, groundY, width, 14);

    // Parallax Layer 3: Moving Ground Grass Stripe
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, groundY - 8, width, 10);

    for (let x = -groundX; x < width + 40; x += 32) {
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, groundY - 8);
        ctx.lineTo(x + 12, groundY + 2);
        ctx.stroke();
    }
}

function drawPipes() {
    for (const pipe of state.pipes) {
        const { x, width: pipeLength, gapTop, gapHeight, isBoss } = pipe;
        const bottomY = gapTop + gapHeight;
        const bottomHeight = Math.max(0, groundY - bottomY);
        const capHeight = 18;
        const capOverhang = 8;

        const bodyGradient = ctx.createLinearGradient(x, 0, x + pipeLength, 0);
        if (isBoss) {
            bodyGradient.addColorStop(0, '#1f2937');
            bodyGradient.addColorStop(0.5, '#4b5563');
            bodyGradient.addColorStop(1, '#111827');
        } else {
            bodyGradient.addColorStop(0, '#15803d');
            bodyGradient.addColorStop(0.5, '#4ade80');
            bodyGradient.addColorStop(1, '#166534');
        }

        ctx.fillStyle = bodyGradient;

        // Top Pipe Body
        ctx.fillRect(x, 0, pipeLength, Math.max(0, gapTop - capHeight));

        // Top Pipe Cap
        ctx.fillRect(x - capOverhang, Math.max(0, gapTop - capHeight), pipeLength + capOverhang * 2, capHeight);

        // Bottom Pipe Cap
        ctx.fillRect(x - capOverhang, bottomY, pipeLength + capOverhang * 2, capHeight);

        // Bottom Pipe Body
        ctx.fillRect(x, bottomY + capHeight, pipeLength, bottomHeight);

        // Cap Highlights
        ctx.fillStyle = isBoss ? '#9ca3af' : '#86efac';
        ctx.fillRect(x - capOverhang + 4, Math.max(0, gapTop - capHeight) + 3, pipeLength + capOverhang * 2 - 8, 3);
        ctx.fillRect(x - capOverhang + 4, bottomY + 3, pipeLength + capOverhang * 2 - 8, 3);
    }
}

function drawBird() {
    const { x, y, radius, wingPhase, tilt } = state.bird;
    const wingLift = Math.sin(wingPhase) * (radius * 0.9);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    // Body Gradient
    const birdGradient = ctx.createRadialGradient(-2, -2, 2, 0, 0, radius);
    birdGradient.addColorStop(0, '#ffffff');
    birdGradient.addColorStop(0.5, '#facc15');
    birdGradient.addColorStop(1, '#eab308');

    ctx.fillStyle = birdGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(-radius * 0.2, radius * 0.1, radius * 0.65, radius * 0.35, 0.4 + wingLift * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(radius * 0.42, -radius * 0.18, radius * 0.32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(radius * 0.55, -radius * 0.18, radius * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(radius * 0.78, -radius * 0.05);
    ctx.lineTo(radius * 1.45, radius * 0.12);
    ctx.lineTo(radius * 0.82, radius * 0.36);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function draw() {
    drawBackground();
    drawParticles();
    drawPipes();
    drawFloatingTexts();
    drawBird();
}

function tick(timestamp) {
    const now = timestamp || performance.now();
    let deltaSec = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // Clamp huge frame spikes (e.g., after tab un-minimize)
    if (deltaSec > 0.1) deltaSec = 0.1;

    physicsAccumulator += deltaSec;
    while (physicsAccumulator >= FIXED_STEP) {
        updateGame(FIXED_STEP * FRAME_RATE);
        physicsAccumulator -= FIXED_STEP;
    }

    draw();
    requestAnimationFrame(tick);
}

function toggleSound() {
    state.muted = !state.muted;
    soundToggle.textContent = state.muted ? '🔇' : '🔊';
    soundToggle.setAttribute('aria-pressed', String(state.muted));

    if (state.muted) {
        stopBackgroundMusic();
    } else if (isPlaying()) {
        startBackgroundMusic();
    }
}

// Window Event Listeners & Shortcuts
window.addEventListener('keydown', (event) => {
    if (event.repeat) return;

    if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        flap();
    } else if (event.code === 'KeyP') {
        event.preventDefault();
        pauseGame();
    } else if (event.code === 'KeyR') {
        event.preventDefault();
        showStartMenu();
    } else if (event.code === 'KeyM') {
        event.preventDefault();
        toggleSound();
    }
});

// Single Pointerdown Listener on Canvas only (Prevents dual-firing)
canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    flap();
});

// Auto Pause on Tab Blur / Visibility Change
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isPlaying()) {
        pauseGame();
    }
});

window.addEventListener('resize', () => {
    resizeCanvas();
    resetBird();
    if (!isPlaying()) {
        scoreEl.textContent = String(state.score);
    }
});

pauseButton.addEventListener('click', (e) => {
    e.stopPropagation();
    pauseGame();
});

soundToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSound();
});

// Initialization
resizeCanvas();
updateSpeedHud();
bestEl.textContent = String(state.best);
showLoadingSplash();
requestAnimationFrame(tick);
