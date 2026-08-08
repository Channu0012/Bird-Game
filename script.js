const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_Y = 540;
const GRAVITY = 0.48;
const FLAP_POWER = -8.7;
const PIPE_SPEED = 3.9;
const PIPE_WIDTH = 95;
const PIPE_GAP = 210;
const SPAWN_DELAY = 1550;

const state = {
  started: false,
  over: false,
  score: 0,
  best: Number(localStorage.getItem('crazybird-best') || 0),
  lastSpawn: 0,
  pipes: [],
  bird: {
    x: 150,
    y: HEIGHT / 2,
    radius: 23,
    velocity: 0,
  },
};

function resetBird() {
  state.bird.x = 150;
  state.bird.y = HEIGHT / 2;
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
  state.bird.velocity = FLAP_POWER;
}

function flap() {
  if (!state.started) {
    startGame();
  } else if (state.over) {
    resetGame();
    startGame();
  } else {
    state.bird.velocity = FLAP_POWER;
  }
}

function createPipe() {
  const gapTop = 140 + Math.random() * 120;
  state.pipes.push({
    x: WIDTH + 50,
    width: PIPE_WIDTH,
    gapTop,
    gapHeight: PIPE_GAP,
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

  return bird.y + bird.radius >= GROUND_Y || bird.y - bird.radius <= 0;
}

function updateGame() {
  if (!state.started || state.over) return;

  state.bird.velocity += GRAVITY;
  state.bird.y += state.bird.velocity;

  const now = performance.now();
  if (now - state.lastSpawn >= SPAWN_DELAY) {
    createPipe();
    state.lastSpawn = now;
  }

  for (const pipe of state.pipes) {
    pipe.x -= PIPE_SPEED;

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
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#0b1120';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(0, 0, WIDTH, 270);
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(0, 270, WIDTH, HEIGHT - 270);

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(0, 340);
  ctx.lineTo(120, 200);
  ctx.lineTo(260, 320);
  ctx.lineTo(420, 180);
  ctx.lineTo(560, 330);
  ctx.lineTo(700, 205);
  ctx.lineTo(840, 325);
  ctx.lineTo(900, 340);
  ctx.lineTo(900, 620);
  ctx.lineTo(0, 620);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(0, 365);
  ctx.lineTo(150, 240);
  ctx.lineTo(280, 335);
  ctx.lineTo(470, 220);
  ctx.lineTo(620, 340);
  ctx.lineTo(770, 240);
  ctx.lineTo(900, 365);
  ctx.lineTo(900, 620);
  ctx.lineTo(0, 620);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(720, 110, 70, 0, Math.PI * 2);
  ctx.fill();

  const cloudPositions = [[90, 110], [280, 135], [520, 118], [730, 150]];
  ctx.fillStyle = '#e2e8f0';
  for (const [x, y] of cloudPositions) {
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.arc(x + 24, y - 18, 24, 0, Math.PI * 2);
    ctx.arc(x + 60, y, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#5b3d2b';
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
  ctx.fillStyle = '#7c4b36';
  ctx.fillRect(0, GROUND_Y + 24, WIDTH, HEIGHT - GROUND_Y - 24);

  for (let x = -20; x < WIDTH + 40; x += 32) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 18);
    ctx.lineTo(x + 18, GROUND_Y + 18);
    ctx.stroke();

    ctx.strokeStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(x + 9, GROUND_Y + 36);
    ctx.lineTo(x + 28, GROUND_Y + 36);
    ctx.stroke();
  }
}

function drawPipes() {
  for (const pipe of state.pipes) {
    const { x, width, gapTop, gapHeight } = pipe;

    ctx.fillStyle = '#4ade80';
    ctx.fillRect(x, 0, width, gapTop);
    ctx.fillRect(x, gapTop + gapHeight, width, HEIGHT - (gapTop + gapHeight) - 40);

    ctx.fillStyle = '#70e2a3';
    ctx.fillRect(x - 8, gapTop - 18, width + 16, 18);
    ctx.fillRect(x - 8, gapTop + gapHeight, width + 16, 18);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x + 10, gapTop - 12, width - 20, 10);
    ctx.fillRect(x + 10, gapTop + gapHeight - 4, width - 20, 10);
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
  ctx.ellipse(x - 12, y + 3, 20, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff4c2';
  ctx.beginPath();
  ctx.ellipse(x - 1, y + 4, 10, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff8f1f';
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 2);
  ctx.lineTo(x + 34, y + 6);
  ctx.lineTo(x + 18, y + 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 9, y - 5, 8, 8);
  ctx.fillStyle = '#111827';
  ctx.fillRect(x + 11, y - 3, 4, 4);
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

canvas.addEventListener('pointerdown', flap);
startButton.addEventListener('click', startGame);
bestEl.textContent = String(state.best);
resetGame();
requestAnimationFrame(tick);
