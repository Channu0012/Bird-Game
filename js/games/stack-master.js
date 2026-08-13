// Game 6: Stack Master (Block Drop Tower Stacker)

export default class StackMasterGame {
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
        this.lastTime = performance.now();

        this.blockHeight = 30;
        this.currentBlock = { x: 0, y: 0, w: 200, speed: 250, dir: 1 };
        this.stack = [];

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
        this.stack = [];
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();

        const baseWidth = Math.min(220, this.width * 0.45);
        const baseBlock = {
            x: (this.width - baseWidth) / 2,
            y: this.height - 60,
            w: baseWidth,
            color: '#38bdf8'
        };
        this.stack.push(baseBlock);

        this.spawnCurrentBlock(baseWidth, this.height - 90);
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
    }

    spawnCurrentBlock(width, y) {
        const speed = Math.min(600, 220 + this.score * 18);
        this.currentBlock = {
            x: 0,
            y: y,
            w: width,
            speed: speed,
            dir: 1,
            color: `hsl(${(this.score * 25) % 360}, 85%, 60%)`
        };
    }

    handlePointerDown(e) {
        if (!this.running || this.paused) return;
        e.preventDefault();
        this.dropBlock();
    }

    handleKeyDown(e) {
        if (!this.running || this.paused || e.repeat) return;
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            this.dropBlock();
        }
    }

    dropBlock() {
        const top = this.stack[this.stack.length - 1];
        const curr = this.currentBlock;

        const leftEdge = Math.max(top.x, curr.x);
        const rightEdge = Math.min(top.x + top.w, curr.x + curr.w);
        const overlapWidth = rightEdge - leftEdge;

        if (overlapWidth <= 0) {
            // Missed completely!
            this.running = false;
            this.audio.play('hit');
            if (this.onGameOver) this.onGameOver(this.score);
            return;
        }

        // Slice block to overlap width
        const newBlock = {
            x: leftEdge,
            y: curr.y,
            w: overlapWidth,
            color: curr.color
        };
        this.stack.push(newBlock);
        this.score += 1;
        this.audio.play('score');

        // Check if stack reaches upper screen limit -> scroll stack down
        let nextY = curr.y - this.blockHeight;
        if (nextY < 120) {
            for (const b of this.stack) {
                b.y += this.blockHeight;
            }
            nextY += this.blockHeight;
        }

        this.spawnCurrentBlock(overlapWidth, nextY);
    }

    update(dtSec) {
        if (!this.running || this.paused) return;

        const curr = this.currentBlock;
        curr.x += curr.dir * curr.speed * dtSec;

        if (curr.x + curr.w >= this.width) {
            curr.x = this.width - curr.w;
            curr.dir = -1;
        } else if (curr.x <= 0) {
            curr.x = 0;
            curr.dir = 1;
        }
    }

    draw() {
        const { ctx, width, height } = this;
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#060d1b';
        ctx.fillRect(0, 0, width, height);

        // Stacked Blocks
        for (const b of this.stack) {
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.w, this.blockHeight - 2);
        }

        // Current Sliding Block
        if (this.running) {
            const curr = this.currentBlock;
            ctx.fillStyle = curr.color;
            ctx.fillRect(curr.x, curr.y, curr.w, this.blockHeight - 2);
        }

        // HUD Score
        ctx.save();
        ctx.font = '900 36px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(String(this.score), width / 2, 50);
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
