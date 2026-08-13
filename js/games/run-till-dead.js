// Game 9: Run Till Dead (Endless Runner Jump & Duck)

export default class RunTillDeadGame {
    constructor({ canvas, ctx, audio, storage, onGameOver }) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.audio = audio;
        this.storage = storage;
        this.onGameOver = onGameOver;

        this.animFrameId = null;
        this.running = false;
        this.paused = false;

        this.score = 0;
        this.distance = 0;
        this.speed = 320;
        this.lastTime = performance.now();
        this.lastSpawn = 0;

        this.groundY = 480;
        this.runner = { x: 120, y: 480, w: 32, h: 48, vy: 0, jumping: false, ducking: false };
        this.obstacles = [];

        this.onPointerDown = this.handlePointerDown.bind(this);
        this.onKeyDown = this.handleKeyDown.bind(this);
        this.onResize = this.handleResize.bind(this);
    }

    init() {
        this.handleResize();
        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('resize', this.onResize);
    }

    start() {
        this.score = 0;
        this.distance = 0;
        this.speed = 340;
        this.obstacles = [];
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();

        this.runner.y = this.groundY - 48;
        this.runner.vy = 0;
        this.runner.jumping = false;
        this.runner.ducking = false;

        this.audio.play('start');
        this.loop(performance.now());
    }

    pause() { this.paused = true; }
    resume() { this.paused = false; this.lastTime = performance.now(); }

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

    handleResize() {
        const bounds = this.canvas.getBoundingClientRect();
        this.width = Math.max(300, bounds.width);
        this.height = Math.max(300, bounds.height);

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(this.width * dpr);
        this.canvas.height = Math.round(this.height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.groundY = this.height * 0.82;
    }

    handlePointerDown(e) {
        if (!this.running || this.paused) return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const touchY = e.clientY - rect.top;

        if (touchY < this.height * 0.5) {
            this.jump();
        } else {
            this.duck();
        }
    }

    handleKeyDown(e) {
        if (!this.running || this.paused) return;
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            e.preventDefault();
            this.jump();
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            e.preventDefault();
            this.duck();
        }
    }

    jump() {
        if (!this.runner.jumping) {
            this.runner.vy = -12.5;
            this.runner.jumping = true;
            this.runner.ducking = false;
            this.audio.play('jump');
        }
    }

    duck() {
        if (!this.runner.jumping) {
            this.runner.ducking = true;
            setTimeout(() => { this.runner.ducking = false; }, 600);
        }
    }

    spawnObstacle() {
        const isHigh = Math.random() < 0.4;
        if (isHigh) {
            // High flying bird -> duck under
            this.obstacles.push({
                x: this.width + 40,
                y: this.groundY - 75,
                w: 36,
                h: 28,
                type: 'HIGH'
            });
        } else {
            // Low hurdle -> jump over
            this.obstacles.push({
                x: this.width + 40,
                y: this.groundY - 36,
                w: 28,
                h: 36,
                type: 'LOW'
            });
        }
    }

    update(dtSec) {
        if (!this.running || this.paused) return;

        this.speed = Math.min(650, 340 + this.distance * 2);
        this.distance += (this.speed * dtSec) / 10;
        this.score = Math.floor(this.distance);

        // Runner physics
        const r = this.runner;
        const currentH = r.ducking ? 26 : 48;
        const currentY = r.ducking ? this.groundY - 26 : r.y;

        if (r.jumping) {
            r.vy += 28 * dtSec;
            r.y += r.vy;
            if (r.y >= this.groundY - 48) {
                r.y = this.groundY - 48;
                r.vy = 0;
                r.jumping = false;
            }
        }

        // Spawning
        const now = performance.now();
        const currentDelay = Math.max(900, 1600 - this.distance * 8);
        if (now - this.lastSpawn >= currentDelay) {
            this.spawnObstacle();
            this.lastSpawn = now;
        }

        // Obstacles move & collision check
        for (const obs of this.obstacles) {
            obs.x -= this.speed * dtSec;

            // Collision check
            const rX = r.x;
            const rY = currentY;
            const rW = r.w;
            const rH = currentH;

            if (rX < obs.x + obs.w && rX + rW > obs.x && rY < obs.y + obs.h && rY + rH > obs.y) {
                this.running = false;
                this.audio.play('hit');
                if (this.onGameOver) this.onGameOver(this.score);
                return;
            }
        }

        this.obstacles = this.obstacles.filter(obs => obs.x + obs.w > -30);
    }

    draw() {
        const { ctx, width, height, groundY, runner } = this;
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#0a1128';
        ctx.fillRect(0, 0, width, height);

        // Ground
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, groundY, width, 8);
        ctx.fillStyle = '#331e14';
        ctx.fillRect(0, groundY + 8, width, height - groundY - 8);

        // Runner
        ctx.save();
        ctx.fillStyle = '#38bdf8';
        const rH = runner.ducking ? 26 : 48;
        const rY = runner.ducking ? groundY - 26 : runner.y;

        ctx.beginPath();
        ctx.roundRect(runner.x, rY, runner.w, rH, 8);
        ctx.fill();
        ctx.restore();

        // Obstacles
        for (const obs of this.obstacles) {
            ctx.fillStyle = obs.type === 'HIGH' ? '#facc15' : '#ef4444';
            ctx.beginPath();
            ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 6);
            ctx.fill();
        }

        // HUD
        ctx.font = '900 28px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`DIST: ${this.score}m`, 25, 45);
    }

    loop(timestamp) {
        if (!this.running) return;

        const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        this.update(dtSec);
        this.draw();
        this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}
