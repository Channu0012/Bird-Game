const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const speedLabel = document.getElementById('speedLabel');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');
const soundToggle = document.getElementById('soundToggle');

const BASE_WIDTH = 900;
const BASE_HEIGHT = 620;

let width = BASE_WIDTH;
let height = BASE_HEIGHT;
let groundY = 540;
let gravity = 0.48;
let flapPower = -8.7;
let pipeSpeed = 3.9;
let pipeWidth = 95;
let pipeGap = 210;
let spawnDelay = 1550;
let audioContext = null;

const clamp = (min, value, max) => Math.min(Math.max(value, min), max);

const state = {
    started: false,
    over: false,
    score: 0,
    best: Number(localStorage.getItem('crazybird-best') || 0),
    lastSpawn: 0,
    pipes: [],
    muted: false,
    bird: {
        x: 150,
        y: BASE_HEIGHT / 2,
        radius: 23,
        velocity: 0,
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
    gravity = 0.48 * (height / BASE_HEIGHT);
    flapPower = -8.7 * (height / BASE_HEIGHT);
    pipeSpeed = (3.6 + state.score * 0.12) * (height / BASE_HEIGHT);
    pipeWidth = Math.max(58, width * 0.105);
    pipeGap = clamp(150, height * 0.34, 220);
    spawnDelay = 1550;

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
}

function applyDifficulty() {
    const difficulty = 1 + Math.min(3.2, state.score * 0.08);
    pipeSpeed = (3.6 * difficulty) * (height / BASE_HEIGHT);
    pipeGap = clamp(148, 210 - state.score * 1.8, 220);
    spawnDelay = Math.max(720, 1500 - state.score * 25);
    updateSpeedHud();
}

function resetGame() {
    state.pipes = [];
    state.score = 0;
    state.lastSpawn = 0;
    state.over = false;
    state.started = false;
    resetBird();
    applyDifficulty();
    scoreEl.textContent = '0';
    bestEl.textContent = String(state.best);
    overlay.classList.add('visible');
    overlay.innerHTML = `
        <div class="panel">
            <div class="panel-glow"></div>
            <h1>Crazy Bird</h1>
            <p>Tap, click, or press space to flap</p>
            <button id="startButton" type="button">Play</button>
        </div>
    `;
    document.getElementById('startButton').addEventListener('click', startGame);
}

function startGame() {
    ensureAudio();
    state.started = true;
    state.over = false;
    scoreEl.textContent = '0';
    overlay.classList.remove('visible');
    overlay.innerHTML = '';
    resetBird();
    state.pipes = [];
    state.score = 0;
    state.lastSpawn = 0;
    state.bird.velocity = flapPower;
    playSound('start');
    applyDifficulty();
}

function flap() {
    ensureAudio();

    if (!state.started) {
        startGame();
    } else if (state.over) {
        resetGame();
        startGame();
    } else {
        state.bird.velocity = flapPower;
        playSound('flap');
    }
}

function createPipe() {
    const upperLimit = groundY - 110;
    const gapTop = 70 + Math.random() * (upperLimit - pipeGap - 70);

    state.pipes.push({
        x: width + 50,
        width: pipeWidth,
        gapTop,
        gapHeight: pipeGap,
        scored: false,
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
    if (!state.started || state.over) return;

    applyDifficulty();
    state.bird.velocity += gravity;
    state.bird.y += state.bird.velocity;

    const now = performance.now();
    if (now - state.lastSpawn >= spawnDelay) {
        createPipe();
        state.lastSpawn = now;
    }

    for (const pipe of state.pipes) {
        pipe.x -= pipeSpeed;

        if (!pipe.scored && pipe.x + pipe.width < state.bird.x) {
            pipe.scored = true;
            state.score += 1;
            scoreEl.textContent = String(state.score);
            playSound('score');
        }
    }

    state.pipes = state.pipes.filter((pipe) => pipe.x + pipe.width > -20);

    if (checkCollision()) {
        state.over = true;
        state.best = Math.max(state.best, state.score);
        localStorage.setItem('crazybird-best', String(state.best));
        bestEl.textContent = String(state.best);
        playSound('hit');
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
            resetGame();
            startGame();
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

        ctx.fillStyle = '#4ade80';
        ctx.fillRect(x, 0, pipeLength, gapTop);
        ctx.fillRect(x, gapTop + gapHeight, pipeLength, height - (gapTop + gapHeight) - 40);

        ctx.fillStyle = '#70e2a3';
        ctx.fillRect(x - 8, gapTop - 18, pipeLength + 16, 18);
        ctx.fillRect(x - 8, gapTop + gapHeight, pipeLength + 16, 18);

        ctx.fillStyle = '#22c55e';
        ctx.fillRect(x + 10, gapTop - 12, pipeLength - 20, 10);
        ctx.fillRect(x + 10, gapTop + gapHeight - 4, pipeLength - 20, 10);
    }
}

function drawBird() {
    const { x, y, radius } = state.bird;

    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f4b942';
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.52, y + radius * 0.13, radius * 0.87, radius * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff4c2';
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.04, y + radius * 0.17, radius * 0.43, radius * 0.66, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff8f1f';
    ctx.beginPath();
    ctx.moveTo(x + radius * 0.78, y + radius * 0.09);
    ctx.lineTo(x + radius * 1.47, y + radius * 0.26);
    ctx.lineTo(x + radius * 0.78, y + radius * 0.52);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.fillRect(x + radius * 0.38, y - radius * 0.22, radius * 0.35, radius * 0.35);
    ctx.fillStyle = '#111827';
    ctx.fillRect(x + radius * 0.48, y - radius * 0.13, radius * 0.17, radius * 0.17);
}

function draw() {
    drawBackground();
    drawPipes();
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
    if (!state.muted) {
        ensureAudio();
    }
}

window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        flap();
    }
});

window.addEventListener('resize', () => {
    resizeCanvas();
    resetBird();
    if (!state.started || state.over) {
        scoreEl.textContent = String(state.score);
    }
});

canvas.addEventListener('pointerdown', flap);
soundToggle.addEventListener('click', toggleSound);
resizeCanvas();
updateSpeedHud();
bestEl.textContent = String(state.best);
resetGame();
requestAnimationFrame(tick);
