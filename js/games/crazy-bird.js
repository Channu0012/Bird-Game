// Game 1: Crazy Bird (Flappy Arcade Flying)

const BASE_WIDTH = 900;
const BASE_HEIGHT = 620;
const FIXED_STEP = 1 / 60;

export default class CrazyBirdGame {
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

        this.width = BASE_WIDTH;
        this.height = BASE_HEIGHT;
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
        this.combo = 0;
        this.lastScoreTime = 0;
        this.pipes = [];
        this.particles = [];
        this.floatingTexts = [];

        this.cloudsX = 0;
        this.mountainsX = 0;
        this.groundX = 0;

        this.bird = {
            x: 150,
            y: BASE_HEIGHT / 2,
            radius: 22,
            hitRadius: 17,
            velocity: 0,
            wingPhase: 0,
            tilt: 0,
        };

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
        this.combo = 0;
        this.pipes = [];
        this.particles = [];
        this.floatingTexts = [];
        this.lastPipeGapTop = null;
        this.resetBird();

        this.bird.velocity = this.flapPower;
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        this.accumulator = 0;

        this.audio.play('flap');
        this.loop(performance.now());
    }

    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
        this.lastTime = performance.now();
    }

    destroy() {
        this.running = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('resize', this.onResize);
    }

    handlePointerDown(e) {
        e.preventDefault();
        this.flap();
    }

    handleKeyDown(e) {
        if (e.repeat) return;
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            this.flap();
        }
    }

    handleResize() {
        const bounds = this.canvas.getBoundingClientRect();
        this.width = Math.max(300, bounds.width);
        this.height = Math.max(300, bounds.height);
        this.groundY = this.height * 0.86;

        this.gravity = 0.52 * (this.height / BASE_HEIGHT);
        this.flapPower = -9.1 * (this.height / BASE_HEIGHT);
        this.pipeSpeed = 4.1 * (this.width / BASE_WIDTH);
        this.pipeWidth = Math.max(55, Math.min(100, this.width * 0.11));

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(this.width * dpr);
        this.canvas.height = Math.round(this.height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    flap() {
        if (!this.running || this.paused) return;
        this.bird.velocity = this.flapPower;
        this.bird.wingPhase = 0;
        this.spawnParticles(this.bird.x - 8, this.bird.y + 6, '#ffe08a', 8);
        this.audio.play('flap');
    }

    spawnParticles(x, y, color = '#fff7c2', count = 10) {
        for (let i = 0; i < count; i += 1) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4.2,
                vy: (Math.random() - 0.8) * 4.2,
                life: 24 + Math.random() * 16,
                maxLife: 40,
                size: Math.random() * 4 + 2,
                color,
            });
        }
    }

    spawnFloatingText(x, y, text, color = '#fff7c2') {
        this.floatingTexts.push({ x, y, text, color, life: 48, maxLife: 48, vy: -0.9 });
    }

    createPipe() {
        const upperLimit = this.groundY - 80;
        const currentGap = Math.max(140, this.pipeGap - this.score * 1.5);
        const topMargin = 60;
        const available = Math.max(0, upperLimit - currentGap - topMargin);

        let gapTop = topMargin + Math.random() * available;
        if (this.lastPipeGapTop !== null) {
            const maxShift = 160;
            gapTop = Math.min(Math.max(topMargin, this.lastPipeGapTop - maxShift), Math.min(available + topMargin, this.lastPipeGapTop + maxShift));
        }
        this.lastPipeGapTop = gapTop;

        this.pipes.push({
            x: this.width + 50,
            width: this.pipeWidth,
            gapTop,
            gapHeight: currentGap,
            scored: false,
        });
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

        if (cy + r >= this.groundY || cy - r <= 0) {
            return true;
        }

        for (const pipe of this.pipes) {
            const pipeLength = pipe.width;
            const capHeight = 18;
            const capOverhang = 8;
            const gapTop = pipe.gapTop;
            const gapBottom = gapTop + pipe.gapHeight;

            if (this.circleRectCollision(cx, cy, r, pipe.x, 0, pipeLength, gapTop - capHeight)) return true;
            if (this.circleRectCollision(cx, cy, r, pipe.x - capOverhang, Math.max(0, gapTop - capHeight), pipeLength + capOverhang * 2, capHeight)) return true;
            if (this.circleRectCollision(cx, cy, r, pipe.x - capOverhang, gapBottom, pipeLength + capOverhang * 2, capHeight)) return true;
            if (this.circleRectCollision(cx, cy, r, pipe.x, gapBottom + capHeight, pipeLength, Math.max(0, this.groundY - (gapBottom + capHeight)))) return true;
        }

        return false;
    }

    update(dt) {
        if (!this.running || this.paused) return;

        const currentSpeed = this.pipeSpeed * dt;
        this.cloudsX = (this.cloudsX + currentSpeed * 0.3) % this.width;
        this.mountainsX = (this.mountainsX + currentSpeed * 0.6) % this.width;
        this.groundX = (this.groundX + currentSpeed) % 32;

        this.bird.velocity += this.gravity * dt;
        this.bird.y += this.bird.velocity * dt;
        this.bird.wingPhase += 0.25 * dt;
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
                this.spawnParticles(this.bird.x + 30, this.bird.y - 10, '#facc15', 12);
                this.spawnFloatingText(this.bird.x + 10, this.bird.y - 20, '+1', '#fff7c2');
                this.audio.play('score');
            }
        }

        this.pipes = this.pipes.filter(p => p.x + p.width > -40);

        this.particles = this.particles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 1;
            return p.life > 0;
        });

        this.floatingTexts = this.floatingTexts.filter(item => {
            item.x += 0.1; item.y += item.vy; item.vy *= 0.98; item.life -= 1;
            return item.life > 0;
        });

        if (this.checkCollision()) {
            this.running = false;
            this.audio.play('hit');
            if (this.onGameOver) {
                this.onGameOver(this.score);
            }
        }
    }

    draw() {
        const { ctx, width, height, groundY } = this;
        ctx.clearRect(0, 0, width, height);

        // Sky
        const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
        skyGradient.addColorStop(0, '#040915');
        skyGradient.addColorStop(0.3, '#0f2b66');
        skyGradient.addColorStop(0.7, '#1e40af');
        skyGradient.addColorStop(1, '#38bdf8');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, width, height);

        // Ground
        ctx.fillStyle = '#331e14';
        ctx.fillRect(0, groundY, width, height - groundY);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, groundY - 8, width, 10);

        // Pipes
        for (const pipe of this.pipes) {
            const { x, width: pWidth, gapTop, gapHeight } = pipe;
            const bottomY = gapTop + gapHeight;
            const capHeight = 18;
            const capOverhang = 8;

            ctx.fillStyle = '#4ade80';
            ctx.fillRect(x, 0, pWidth, Math.max(0, gapTop - capHeight));
            ctx.fillRect(x - capOverhang, Math.max(0, gapTop - capHeight), pWidth + capOverhang * 2, capHeight);
            ctx.fillRect(x - capOverhang, bottomY, pWidth + capOverhang * 2, capHeight);
            ctx.fillRect(x, bottomY + capHeight, pWidth, Math.max(0, groundY - (bottomY + capHeight)));
        }

        // Floating texts
        for (const item of this.floatingTexts) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, item.life / item.maxLife);
            ctx.font = '800 22px Outfit, sans-serif';
            ctx.fillStyle = item.color;
            ctx.fillText(item.text, item.x, item.y);
            ctx.restore();
        }

        // Particles
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Bird
        const { x: bx, y: by, radius, wingPhase, tilt } = this.bird;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(tilt);

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius * 0.82, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(radius * 0.78, -radius * 0.05);
        ctx.lineTo(radius * 1.45, radius * 0.12);
        ctx.lineTo(radius * 0.82, radius * 0.36);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Live HUD Score overlay on Canvas
        ctx.save();
        ctx.font = '900 36px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.fillText(String(this.score), width / 2, 50);
        ctx.restore();
    }

    loop(timestamp) {
        if (!this.running) return;

        let deltaSec = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        if (deltaSec > 0.1) deltaSec = 0.1;

        this.accumulator += deltaSec;
        while (this.accumulator >= FIXED_STEP) {
            this.update(FIXED_STEP * 60);
            this.accumulator -= FIXED_STEP;
        }

        this.draw();
        this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}
