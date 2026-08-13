// Game 5: Perfect Hit (Precision Timing Bar & Streak Multipliers)

export default class PerfectHitGame {
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
        this.streak = 0;
        this.lastTime = performance.now();

        this.bar = { x: 0, y: 0, w: 0, h: 40 };
        this.indicatorX = 0;
        this.dir = 1;
        this.speed = 400;

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
        this.streak = 0;
        this.speed = 420;
        this.indicatorX = this.bar.x;
        this.dir = 1;
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();

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

        this.bar.w = Math.min(600, this.width * 0.85);
        this.bar.x = (this.width - this.bar.w) / 2;
        this.bar.y = this.height * 0.55;
    }

    handlePointerDown(e) {
        if (!this.running || this.paused) return;
        e.preventDefault();
        this.checkHit();
    }

    handleKeyDown(e) {
        if (!this.running || this.paused || e.repeat) return;
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            this.checkHit();
        }
    }

    checkHit() {
        const centerX = this.bar.x + this.bar.w / 2;
        const distFromCenter = Math.abs(this.indicatorX - centerX);
        const perfectZone = this.bar.w * 0.12;
        const goodZone = this.bar.w * 0.32;

        if (distFromCenter <= perfectZone) {
            this.streak += 1;
            const pts = 10 * this.streak;
            this.score += pts;
            this.speed = Math.min(950, this.speed + 25);
            this.audio.play('perfect');
        } else if (distFromCenter <= goodZone) {
            this.streak = 1;
            this.score += 5;
            this.speed = Math.min(950, this.speed + 15);
            this.audio.play('score');
        } else {
            this.running = false;
            this.audio.play('hit');
            if (this.onGameOver) this.onGameOver(this.score);
        }
    }

    update(dtSec) {
        if (!this.running || this.paused) return;

        this.indicatorX += this.dir * this.speed * dtSec;
        if (this.indicatorX >= this.bar.x + this.bar.w) {
            this.indicatorX = this.bar.x + this.bar.w;
            this.dir = -1;
        } else if (this.indicatorX <= this.bar.x) {
            this.indicatorX = this.bar.x;
            this.dir = 1;
        }
    }

    draw() {
        const { ctx, width, height, bar } = this;
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#061325';
        ctx.fillRect(0, 0, width, height);

        // Bar Track
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(bar.x, bar.y, bar.w, bar.h, 20);
        ctx.fill();

        // Good Zone
        const goodW = bar.w * 0.64;
        const goodX = bar.x + (bar.w - goodW) / 2;
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(goodX, bar.y, goodW, bar.h);

        // Perfect Zone (Center)
        const perfW = bar.w * 0.24;
        const perfX = bar.x + (bar.w - perfW) / 2;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(perfX, bar.y, perfW, bar.h);

        // Center line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bar.x + bar.w / 2, bar.y - 10);
        ctx.lineTo(bar.x + bar.w / 2, bar.y + bar.h + 10);
        ctx.stroke();

        // Moving Indicator
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 10;
        ctx.fillRect(this.indicatorX - 6, bar.y - 12, 12, bar.h + 24);
        ctx.shadowBlur = 0;

        // HUD
        ctx.font = '900 32px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`SCORE: ${this.score}`, width / 2, height * 0.25);

        if (this.streak > 1) {
            ctx.fillStyle = '#facc15';
            ctx.font = '800 24px Outfit, sans-serif';
            ctx.fillText(`🔥 STREAK x${this.streak}!`, width / 2, height * 0.35);
        }
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
