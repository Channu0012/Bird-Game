const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const speedLabel = document.getElementById('speedLabel');
const overlay = document.getElementById('overlay');
const soundToggle = document.getElementById('soundToggle');
const pauseButton = document.getElementById('pauseButton');

const BASE_WIDTH = 900;
const BASE_HEIGHT = 620;
const DIFFICULTY_CONFIG = {
    easy: { label: 'Easy', gravity: 0.48, flapPower: -8.7, pipeSpeed: 3.6, pipeGap: 210, spawnDelay: 1550 },
    medium: { label: 'Medium', gravity: 0.52, flapPower: -9.1, pipeSpeed: 4.2, pipeGap: 188, spawnDelay: 1350 },
    hard: { label: 'Hard', gravity: 0.58, flapPower: -9.7, pipeSpeed: 4.8, pipeGap: 170, spawnDelay: 1180 },
};

let width = BASE_WIDTH;
let height = BASE_HEIGHT;
let groundY = 540;
let gravity = 0.48;
let flapPower = -8.7;
let pipeSpeed = 3.6;
let pipeWidth = 95;
let pipeGap = 210;
let spawnDelay = 1550;
let audioContext = null;
let musicLoop = null;
let splashTimer = null;

const clamp = (min, value, max) => Math.min(Math.max(value, min), max);

const state = {
    started: false,
    over: false,
    paused: false,
    score: 0,
    best: Number(localStorage.getItem('crazybird-best') || 0),
    combo: 0,
    lastScoreTime: 0,
    lastSpawn: 0,
    pipes: [],
    particles: [],
    floatingTexts: [],
    muted: false,
    difficulty: 'easy',
    bird: {
        x: 150,
        y: BASE_HEIGHT / 2,
        radius: 23,
        velocity: 0,
        wingPhase: 0,
        tilt: 0,
    },
};

function updateSpeedHud() {
    const multiplier = 1 + Math.min(3.5, state.score * 0.08);
    speedLabel.textContent = `${multiplier.toFixed(1)}x`;
}

function ensureAudio() {
    if (!audioContext) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return null;
        audioContext = new AudioCtor();
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    return audioContext;
}

function playTone({ frequency, duration, type = 'sine', volume = 0.04, slide = 0 }) {
    const context = ensureAudio();
    if (!context || state.muted) return;

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
}

function playSound(type) {
    if (state.muted) return;

    if (type === 'flap') {
        playTone({ frequency: 420, duration: 0.07, type: 'triangle', volume: 0.05, slide: 130 });
        return;
    }

    if (type === 'score') {
        playTone({ frequency: 780, duration: 0.08, type: 'square', volume: 0.04, slide: 220 });
        return;
    }

    if (type === 'hit') {
        playTone({ frequency: 180, duration: 0.16, type: 'sawtooth', volume: 0.06, slide: -140 });
        return;
    }

    if (type === 'start') {
        playTone({ frequency: 620, duration: 0.12, type: 'triangle', volume: 0.05, slide: 180 });
        playTone({ frequency: 900, duration: 0.1, type: 'triangle', volume: 0.04, slide: 250 });
    }
}

function stopBackgroundMusic() {
    if (musicLoop) {
        clearInterval(musicLoop);
        musicLoop = null;
    }
}

function startBackgroundMusic() {
    if (state.muted || state.paused || !state.started || state.over) return;
    stopBackgroundMusic();

    const melody = [220, 277, 330, 392, 330, 277, 220, 196];
    let index = 0;

    musicLoop = setInterval(() => {
        if (state.muted || state.paused || !state.started || state.over) return;
        const frequency = melody[index % melody.length];
        playTone({ frequency, duration: 0.18, type: 'triangle', volume: 0.018, slide: 60 });
        index += 1;
    }, 320);
}

function resizeCanvas() {
    const bounds = document.querySelector('.game-card').getBoundingClientRect();
    let nextWidth = Math.max(280, Math.min(bounds.width, 1100));
    let nextHeight = Math.min(bounds.height, 720);

    if (nextHeight <= 0) {
        nextHeight = window.innerHeight * 0.72;
    }

    const aspectRatio = BASE_WIDTH / BASE_HEIGHT;
    const fitByWidth = nextWidth / aspectRatio;
    if (fitByWidth <= nextHeight) {
        nextHeight = fitByWidth;
    } else {
        nextWidth = nextHeight * aspectRatio;
    }

    width = nextWidth;
    height = nextHeight;
    groundY = height * 0.87;
    gravity = (DIFFICULTY_CONFIG[state.difficulty].gravity || 0.48) * (height / BASE_HEIGHT);
    flapPower = (DIFFICULTY_CONFIG[state.difficulty].flapPower || -8.7) * (height / BASE_HEIGHT);
    pipeSpeed = (DIFFICULTY_CONFIG[state.difficulty].pipeSpeed || 3.6) * (height / BASE_HEIGHT);
    pipeWidth = Math.max(58, width * 0.105);
    pipeGap = clamp(150, (DIFFICULTY_CONFIG[state.difficulty].pipeGap || 210) - state.score * 1.5, 220);
    spawnDelay = DIFFICULTY_CONFIG[state.difficulty].spawnDelay || 1550;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resetBird() {
    state.bird.x = width * 0.17;
    state.bird.y = height * 0.48;
    state.bird.radius = Math.max(18, height * 0.037);
    state.bird.velocity = 0;
    state.bird.wingPhase = 0;
    state.bird.tilt = 0;
}

function spawnParticles(x, y, color = '#fff7c2', count = 12) {
    for (let i = 0; i < count; i += 1) {
        state.particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 3.6,
            vy: (Math.random() - 0.8) * 3.6,
            life: 26 + Math.random() * 18,
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
        life: 48,
        vy: -0.8,
    });
}

function updateFloatingTexts() {
    state.floatingTexts = state.floatingTexts.filter((item) => {
        item.x += 0.2;
        item.y += item.vy;
        item.vy *= 0.98;
        item.life -= 1;
        return item.life > 0;
    });
}

function drawParticles() {
    for (const particle of state.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, particle.life / 40);
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
        ctx.globalAlpha = Math.max(0, item.life / 48);
        ctx.font = 'bold 22px Segoe UI';
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.x, item.y);
    }
    ctx.restore();
}

function applyDifficulty() {
    const config = DIFFICULTY_CONFIG[state.difficulty];
    const difficultyBoost = 1 + Math.min(3.2, state.score * 0.08);
    pipeSpeed = config.pipeSpeed * difficultyBoost * (height / BASE_HEIGHT);
    pipeGap = clamp(148, config.pipeGap - state.score * 1.8, config.pipeGap + 10);
    spawnDelay = Math.max(720, config.spawnDelay - state.score * 25);
    updateSpeedHud();
}

function setDifficulty(level) {
    state.difficulty = level;
    resizeCanvas();
    resetBird();
    applyDifficulty();
}

function showLoadingSplash() {
    if (splashTimer) {
        clearTimeout(splashTimer);
    }

    state.started = false;
    state.over = false;
    state.paused = false;
    stopBackgroundMusic();
    overlay.classList.add('visible');
    overlay.innerHTML = `
        <div class="panel splash-panel">
            <div class="panel-glow"></div>
            <div class="splash-logo">CB</div>
            <h1>Crazy Bird</h1>
            <div class="loading-spinner" aria-hidden="true"></div>
            <p>Loading sky run...</p>
        </div>
    `;

    splashTimer = setTimeout(() => {
        showStartMenu();
    }, 1800);
}

function showStartMenu() {
    state.started = false;
    state.over = false;
    state.paused = false;
    stopBackgroundMusic();
    resetBird();
    state.pipes = [];
    state.score = 0;
    state.combo = 0;
    state.lastScoreTime = 0;
    state.floatingTexts = [];
    scoreEl.textContent = '0';
    bestEl.textContent = String(state.best);
    overlay.classList.add('visible');
    overlay.innerHTML = `
        <div class="panel">
            <div class="panel-glow"></div>
            <h1>Crazy Bird</h1>
            <p>Choose your challenge</p>
            <div class="difficulty-row">
                ${Object.entries(DIFFICULTY_CONFIG)
                    .map(([key, config]) => `<button class="difficulty-btn ${state.difficulty === key ? 'active' : ''}" data-difficulty="${key}" type="button">${config.label}</button>`)
                    .join('')}
            </div>
            <button id="startButton" type="button">Play</button>
            <div class="menu-note">Tap, click, or press space to flap</div>
        </div>
    `;

    document.querySelectorAll('.difficulty-btn').forEach((button) => {
        button.addEventListener('click', () => {
            setDifficulty(button.dataset.difficulty);
            startGame(button.dataset.difficulty);
        });
    });

    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', () => {
            startGame(state.difficulty);
        });
    }
}

function startGame(selectedDifficulty = state.difficulty) {
    ensureAudio();
    state.started = true;
    state.over = false;
    state.paused = false;
    state.score = 0;
    state.combo = 0;
    state.lastScoreTime = 0;
    state.lastSpawn = 0;
    state.pipes = [];
    state.particles = [];
    state.floatingTexts = [];
    setDifficulty(selectedDifficulty);
    scoreEl.textContent = '0';
    overlay.classList.remove('visible');
    overlay.innerHTML = '';
    resetBird();
    state.bird.velocity = flapPower;
    playSound('start');
    startBackgroundMusic();
}

function pauseGame() {
    if (!state.started || state.over) return;

    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? 'Resume' : 'Pause';

    if (state.paused) {
        stopBackgroundMusic();
        overlay.classList.add('visible');
        overlay.innerHTML = `
            <div class="panel">
                <div class="panel-glow"></div>
                <h1>Paused</h1>
                <p>Take a breath, then jump back in.</p>
                <button id="resumeButton" type="button">Resume</button>
            </div>
        `;
        document.getElementById('resumeButton').addEventListener('click', pauseGame);
    } else {
        overlay.classList.remove('visible');
        overlay.innerHTML = '';
        startBackgroundMusic();
    }
}

function flap() {
    ensureAudio();

    if (!state.started && !state.over) {
        showStartMenu();
        return;
    }

    if (state.paused) {
        pauseGame();
        return;
    }

    if (state.over) {
        showStartMenu();
        return;
    }

    state.bird.velocity = flapPower;
    state.bird.wingPhase = 0;
    spawnParticles(state.bird.x - 8, state.bird.y + 8, '#ffe08a', 9);
    playSound('flap');
}

function createPipe() {
    const upperLimit = groundY - 110;
    const isBossPipe = state.score > 4 && Math.random() < 0.18;
    const gapHeight = isBossPipe ? Math.max(128, pipeGap * 0.75) : pipeGap;
    const gapTop = 70 + Math.random() * (upperLimit - gapHeight - 70);

    state.pipes.push({
        x: width + 50,
        width: isBossPipe ? pipeWidth * 1.45 : pipeWidth,
        gapTop,
        gapHeight,
        scored: false,
        isBoss: isBossPipe,
    });
}

function checkCollision() {
    const { bird } = state;

    for (const pipe of state.pipes) {
        const withinX = bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + pipe.width;
        if (!withinX) continue;

        const verticalHit = bird.y - bird.radius < pipe.gapTop || bird.y + bird.radius > pipe.gapTop + pipe.gapHeight;
        if (verticalHit) {
            return true;
        }
    }

    return bird.y + bird.radius >= groundY || bird.y - bird.radius <= 0;
}

function updateGame() {
    if (!state.started || state.over || state.paused) return;

    applyDifficulty();
    state.bird.velocity += gravity;
    state.bird.y += state.bird.velocity;
    state.bird.wingPhase += 0.24;
    state.bird.tilt = clamp(state.bird.velocity / 12, -1.2, 1.2);

    const now = performance.now();
    if (now - state.lastSpawn >= spawnDelay) {
        createPipe();
        state.lastSpawn = now;
    }

    for (const pipe of state.pipes) {
        pipe.x -= pipeSpeed;

        if (!pipe.scored && pipe.x + pipe.width < state.bird.x) {
            pipe.scored = true;
            const now = performance.now();
            const comboValue = now - state.lastScoreTime < 1800 ? state.combo + 1 : 1;
            state.combo = comboValue;
            state.lastScoreTime = now;
            state.score += 1;
            scoreEl.textContent = String(state.score);
            spawnParticles(state.bird.x + 40, state.bird.y - 10, '#facc15', 12);
            if (comboValue > 1) {
                spawnFloatingText(state.bird.x + 30, state.bird.y - 20, `x${comboValue} combo`, '#facc15');
            } else {
                spawnFloatingText(state.bird.x + 20, state.bird.y - 20, '+1', '#fff7c2');
            }
            playSound('score');
        }
    }

    state.pipes = state.pipes.filter((pipe) => pipe.x + pipe.width > -20);
    updateParticles();
    updateFloatingTexts();

    if (checkCollision()) {
        state.over = true;
        state.best = Math.max(state.best, state.score);
        localStorage.setItem('crazybird-best', String(state.best));
        bestEl.textContent = String(state.best);
        spawnParticles(state.bird.x, state.bird.y, '#f87171', 20);
        playSound('hit');
        stopBackgroundMusic();
        overlay.classList.add('visible');
        overlay.innerHTML = `
            <div class="panel">
                <div class="panel-glow"></div>
                <h1>Game Over</h1>
                <p>Score: ${state.score}</p>
                <button id="startButton" type="button">Restart</button>
            </div>
        `;
        document.getElementById('startButton').addEventListener('click', () => {
            showStartMenu();
        });
    }
}

function drawBackground() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, width, height);

    const skyHeight = height * 0.45;
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, width, skyHeight);
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(0, skyHeight, width, height - skyHeight);

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.55);
    ctx.lineTo(width * 0.14, height * 0.30);
    ctx.lineTo(width * 0.30, height * 0.52);
    ctx.lineTo(width * 0.46, height * 0.29);
    ctx.lineTo(width * 0.62, height * 0.54);
    ctx.lineTo(width * 0.78, height * 0.33);
    ctx.lineTo(width, height * 0.55);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.60);
    ctx.lineTo(width * 0.17, height * 0.39);
    ctx.lineTo(width * 0.32, height * 0.55);
    ctx.lineTo(width * 0.52, height * 0.36);
    ctx.lineTo(width * 0.69, height * 0.56);
    ctx.lineTo(width * 0.86, height * 0.39);
    ctx.lineTo(width, height * 0.60);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(width * 0.8, height * 0.18, Math.max(42, height * 0.11), 0, Math.PI * 2);
    ctx.fill();

    const cloudPositions = [[width * 0.10, height * 0.18], [width * 0.31, height * 0.22], [width * 0.58, height * 0.19], [width * 0.81, height * 0.24]];
    ctx.fillStyle = '#e2e8f0';
    for (const [x, y] of cloudPositions) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(18, height * 0.035), 0, Math.PI * 2);
        ctx.arc(x + width * 0.03, y - height * 0.03, Math.max(20, height * 0.04), 0, Math.PI * 2);
        ctx.arc(x + width * 0.07, y, Math.max(17, height * 0.032), 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#5b3d2b';
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.fillStyle = '#7c4b36';
    ctx.fillRect(0, groundY + height * 0.04, width, height - groundY - height * 0.04);

    for (let x = -20; x < width + 40; x += 32) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = Math.max(3, height * 0.008);
        ctx.beginPath();
        ctx.moveTo(x, groundY + height * 0.03);
        ctx.lineTo(x + 18, groundY + height * 0.03);
        ctx.stroke();

        ctx.strokeStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(x + 9, groundY + height * 0.06);
        ctx.lineTo(x + 28, groundY + height * 0.06);
        ctx.stroke();
    }
}

function drawPipes() {
    for (const pipe of state.pipes) {
        const { x, width: pipeLength, gapTop, gapHeight } = pipe;

        const topHeight = gapTop;
        const bottomY = gapTop + gapHeight;
        const bottomHeight = height - bottomY - 40;

        const pipeBody = pipe.isBoss ? '#3b3d47' : '#7c8b9b';
        const pipeBodyDark = pipe.isBoss ? '#1f2330' : '#5d6979';
        const pipeCap = pipe.isBoss ? '#cfcfce' : '#b5c0cc';

        ctx.fillStyle = pipeBodyDark;
        ctx.fillRect(x, 0, pipeLength, topHeight);
        ctx.fillRect(x, bottomY, pipeLength, bottomHeight);

        ctx.fillStyle = pipeBody;
        ctx.fillRect(x, 0, pipeLength, topHeight);
        ctx.fillRect(x, bottomY, pipeLength, bottomHeight);

        ctx.fillStyle = pipeCap;
        ctx.fillRect(x - 8, topHeight - 18, pipeLength + 16, 18);
        ctx.fillRect(x - 8, bottomY, pipeLength + 16, 18);

        ctx.fillStyle = '#4a5565';
        ctx.fillRect(x + 10, topHeight - 12, pipeLength - 20, 10);
        ctx.fillRect(x + 10, bottomY + 4, pipeLength - 20, 10);

        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fillRect(x + 8, 0, 5, topHeight);
        ctx.fillRect(x + pipeLength - 13, bottomY, 5, bottomHeight);

        if (pipe.isBoss) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x + 14, topHeight - 8, 18, 8);
            ctx.fillRect(x + pipeLength - 32, topHeight - 8, 18, 8);
            ctx.fillRect(x + 14, bottomY + 10, 18, 8);
            ctx.fillRect(x + pipeLength - 32, bottomY + 10, 18, 8);
        }
    }
}

function drawBird() {
    const { x, y, radius, wingPhase, tilt } = state.bird;
    const wingLift = Math.sin(wingPhase) * (radius * 1.1);
    const bodyTilt = tilt;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bodyTilt * 0.42);

    ctx.fillStyle = '#f3f5f7';
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.95, radius * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dde5ef';
    ctx.beginPath();
    ctx.ellipse(-radius * 0.15, radius * 0.2, radius * 0.75, radius * 0.34, 0.55 + wingLift * 0.04, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#eef3f8';
    ctx.beginPath();
    ctx.moveTo(-radius * 0.15, -radius * 0.1);
    ctx.quadraticCurveTo(-radius * 1.4, -radius * 0.85, -radius * 0.3, -radius * 0.35);
    ctx.quadraticCurveTo(radius * 0.2, -radius * 0.8, radius * 1.0, -radius * 0.1);
    ctx.quadraticCurveTo(radius * 0.65, -radius * 1.15, -radius * 0.15, -radius * 0.1);
    ctx.fill();

    ctx.fillStyle = '#d9e2ee';
    ctx.beginPath();
    ctx.moveTo(-radius * 0.85, 0.1);
    ctx.lineTo(-radius * 1.8, radius * 0.55);
    ctx.lineTo(-radius * 0.9, radius * 0.75);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f8fbff';
    ctx.beginPath();
    ctx.arc(radius * 0.42, -radius * 0.12, radius * 0.32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1d2430';
    ctx.beginPath();
    ctx.arc(radius * 0.55, -radius * 0.1, radius * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f3a833';
    ctx.beginPath();
    ctx.moveTo(radius * 0.82, 0.05);
    ctx.lineTo(radius * 1.6, radius * 0.16);
    ctx.lineTo(radius * 0.9, radius * 0.42);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#9ca9ba';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.7, 0.1);
    ctx.quadraticCurveTo(radius * 0.05, -radius * 0.18, radius * 0.42, 0.12);
    ctx.stroke();

    ctx.restore();
}

function draw() {
    drawBackground();
    drawParticles();
    drawPipes();
    drawFloatingTexts();
    drawBird();
}

function tick() {
    updateGame();
    draw();
    requestAnimationFrame(tick);
}

function toggleSound() {
    state.muted = !state.muted;
    soundToggle.textContent = state.muted ? '🔇' : '🔊';
    soundToggle.setAttribute('aria-pressed', String(state.muted));

    if (state.muted) {
        stopBackgroundMusic();
    } else if (state.started && !state.paused && !state.over) {
        startBackgroundMusic();
    }
}

window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        if (state.started && !state.over) {
            flap();
        } else {
            showStartMenu();
        }
    }

    if (event.code === 'KeyP') {
        event.preventDefault();
        pauseGame();
    }
});

window.addEventListener('resize', () => {
    resizeCanvas();
    resetBird();
    if (!state.started || state.over) {
        scoreEl.textContent = String(state.score);
    }
});

function handleGameTap(event) {
    if (event && event.target && event.target.closest && event.target.closest('button')) {
        return;
    }

    event.preventDefault();
    if (state.started && !state.over) {
        flap();
    } else {
        showStartMenu();
    }
}

canvas.addEventListener('pointerdown', handleGameTap);
document.addEventListener('pointerdown', (event) => {
    if (event.target === document.body || event.target === document.documentElement || event.target === canvas) {
        handleGameTap(event);
    }
});
pauseButton.addEventListener('click', pauseGame);
soundToggle.addEventListener('click', toggleSound);
resizeCanvas();
updateSpeedHud();
bestEl.textContent = String(state.best);
showLoadingSplash();
requestAnimationFrame(tick);
