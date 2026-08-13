// Game 2: Tap Rush (10-Second Speed Tapping)

export default class TapRushGame {
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
        this.combo = 0;
        this.timeLeft = 10.0;
        this.lastTime = performance.now();
        this.target = { x: 450, y: 300, radius: 45 };

        this.onPointerDown = this.handlePointerDown.bind(this);
        this.onResize = this.handleResize.bind(this);
    }

    init() {
        this.handleResize();
        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('resize', this.onResize);
    }

    start() {
        this.score = 0;
        this.combo = 0;
        this.timeLeft = 10.0;
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();

        this.relocateTarget();
        this.audio.play('start');
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
    }

    relocateTarget() {
        const margin = 80;
        this.target.radius = Math.max(32, Math.min(55, this.width * 0.08));
        this.target.x = margin + Math.random() * (this.width - margin * 2);
        this.target.y = margin + Math.random() * (this.height - margin * 2);
    }

    handlePointerDown(e) {
        if (!this.running || this.paused) return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        const touchY = e.clientY - rect.top;

        const distX = touchX - this.target.x;
        const distY = touchY - this.target.y;
        const hit = (distX * distX + distY * distY) <= (this.target.radius * this.target.radius * 1.4);

        if (hit) {
            this.combo += 1;
            const points = 1 + Math.floor(this.combo / 5);
            this.score += points;
            this.relocateTarget();
            this.audio.play('tap');
        } else {
            this.combo = 0;
            this.audio.play('hit');
        }
    }

    update(dtSec) {
        if (!this.running || this.paused) return;

        this.timeLeft -= dtSec;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.running = false;
            this.audio.play('win');
            if (this.onGameOver) {
                this.onGameOver(this.score);
            }
        }
    }

    draw() {
        const { ctx, width, height } = this;
        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#0b1329';
        ctx.fillRect(0, 0, width, height);

        // Target Pulse Ring
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.target.x, this.target.y, this.target.radius + 10, 0, Math.PI * 2);
        ctx.stroke();

        // Target Body
        const gradient = ctx.createRadialGradient(this.target.x, this.target.y, 5, this.target.x, this.target.y, this.target.radius);
        gradient.addColorStop(0, '#38bdf8');
        gradient.addColorStop(1, '#0284c7');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.target.x, this.target.y, this.target.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.target.x, this.target.y, this.target.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // HUD Overlay
        ctx.save();
        ctx.font = '900 28px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`TIME: ${this.timeLeft.toFixed(1)}s`, 20, 45);
        ctx.fillText(`TAPS: ${this.score}`, width - 150, 45);
        if (this.combo > 2) {
            ctx.fillStyle = '#facc15';
            ctx.font = '800 20px Outfit, sans-serif';
            ctx.fillText(`${this.combo}x COMBO!`, 20, 80);
        }
        ctx.restore();
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
