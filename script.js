const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');

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

const clamp = (min, value, max) => Math.min(Math.max(value, min), max);

function resizeCanvas() {
    const maxWidth = Math.min(window.innerWidth - 32, BASE_WIDTH);
    const nextWidth = Math.max(280, maxWidth);
    const nextHeight = nextWidth * (BASE_HEIGHT / BASE_WIDTH);

    width = nextWidth;
    height = nextHeight;
    groundY = height * 0.87;
    gravity = 0.48 * (height / BASE_HEIGHT);
    flapPower = -8.7 * (height / BASE_HEIGHT);
    pipeSpeed = 3.9 * (height / BASE_HEIGHT);
    pipeWidth = Math.max(60, width * 0.105);
    pipeGap = clamp(160, height * 0.34, 220);
    spawnDelay = 1550;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const state = {
    started: false,
    over: false,
    score: 0,
    best: Number(localStorage.getItem('crazybird-best') || 0),
    lastSpawn: 0,
    pipes: [],
    bird: {
        x: 150,
        y: BASE_HEIGHT / 2,
        radius: 23,
        velocity: 0,
    },
};

function resetBird() {
    state.bird.x = width * 0.17;
    state.bird.y = height / 2;
    state.bird.radius = Math.max(18, height * 0.037);
    state.bird.velocity = 0;
}

function resetGame() {
    state.pipes = [];
    state.score = 0;
    state.lastSpawn = 0;
    state.over = false;
    state.started = false;
    resetBird();
    scoreEl.textContent = '0';
    bestEl.textContent = String(state.best);
    overlay.classList.add('visible');
    overlay.innerHTML = `
    <div class="panel">
      <h1>Crazy Bird</h1>
      <p>Press space or click to flap</p>
      <button id="startButton">Play</button>
    </div>
  `;
    document.getElementById('startButton').addEventListener('click', startGame);
}

function startGame() {
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
}

function flap() {
    if (!state.started) {
        startGame();
    } else if (state.over) {
        resetGame();
        startGame();
    } else {
        state.bird.velocity = flapPower;
    }
}

function createPipe() {
    const upperLimit = groundY - 100;
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
        }
    }

    state.pipes = state.pipes.filter((pipe) => pipe.x + pipe.width > -20);

    if (checkCollision()) {
        state.over = true;
        state.best = Math.max(state.best, state.score);
        localStorage.setItem('crazybird-best', String(state.best));
        bestEl.textContent = String(state.best);
        overlay.classList.add('visible');
        overlay.innerHTML = `
      <div class="panel">
        <h1>Game Over</h1>
        <p>Score: ${state.score}</p>
        <button id="startButton">Restart</button>
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
startButton.addEventListener('click', startGame);
resizeCanvas();
bestEl.textContent = String(state.best);
resetGame();
requestAnimationFrame(tick);
