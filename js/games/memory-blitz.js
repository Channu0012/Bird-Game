// Game 10: Memory Blitz (Grid Pattern Sequence Recall)

export default class MemoryBlitzGame {
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
        this.sequence = [];
        this.playerInput = [];
        this.phase = 'PREVIEW'; // PREVIEW, PLAYING
        this.activeTile = null;
        this.lastTime = performance.now();

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
        this.sequence = [];
        this.playerInput = [];
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();

        this.nextRound();
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

        this.gridWidth = Math.min(380, this.width * 0.85);
        this.gridX = (this.width - this.gridWidth) / 2;
        this.gridY = (this.height - this.gridWidth) / 2 + 30;
        this.tileSize = (this.gridWidth - 20) / 3;
    }

    async nextRound() {
        this.phase = 'PREVIEW';
        this.playerInput = [];

        // Add next random tile to sequence (0 to 8)
        this.sequence.push(Math.floor(Math.random() * 9));

        // Playback sequence
        for (let i = 0; i < this.sequence.length; i++) {
            if (!this.running) return;
            await new Promise(res => setTimeout(res, 350));
            this.activeTile = this.sequence[i];
            this.audio.play('tap');
            await new Promise(res => setTimeout(res, 450));
            this.activeTile = null;
        }

        this.phase = 'PLAYING';
    }

    handlePointerDown(e) {
        if (!this.running || this.paused || this.phase !== 'PLAYING') return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        const touchY = e.clientY - rect.top;

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const tx = this.gridX + c * (this.tileSize + 10);
                const ty = this.gridY + r * (this.tileSize + 10);

                if (touchX >= tx && touchX <= tx + this.tileSize && touchY >= ty && touchY <= ty + this.tileSize) {
                    const tileId = r * 3 + c;
                    this.playerInput.push(tileId);
                    const currStep = this.playerInput.length - 1;

                    if (this.playerInput[currStep] !== this.sequence[currStep]) {
                        // Wrong sequence!
                        this.running = false;
                        this.audio.play('hit');
                        if (this.onGameOver) this.onGameOver(this.score);
                        return;
                    }

                    this.audio.play('tap');

                    // Check if complete sequence matched
                    if (this.playerInput.length === this.sequence.length) {
                        this.score += 1;
                        this.audio.play('score');
                        setTimeout(() => this.nextRound(), 600);
                    }
                    return;
                }
            }
        }
    }

    update(dtSec) { }

    draw() {
        const { ctx, width, height } = this;
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, width, height);

        // Header
        ctx.font = '900 32px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`SCORE: ${this.score}`, width / 2, 55);

        ctx.font = '700 18px Outfit, sans-serif';
        ctx.fillStyle = this.phase === 'PREVIEW' ? '#facc15' : '#38bdf8';
        ctx.fillText(this.phase === 'PREVIEW' ? 'WATCH PATTERN...' : 'REPEAT PATTERN!', width / 2, 85);

        // 3x3 Grid Render
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const tx = this.gridX + c * (this.tileSize + 10);
                const ty = this.gridY + r * (this.tileSize + 10);
                const tileId = r * 3 + c;

                const isActive = this.activeTile === tileId;

                ctx.save();
                ctx.fillStyle = isActive ? '#38bdf8' : '#1e293b';
                if (isActive) {
                    ctx.shadowColor = '#38bdf8';
                    ctx.shadowBlur = 15;
                }
                ctx.beginPath();
                ctx.roundRect(tx, ty, this.tileSize, this.tileSize, 16);
                ctx.fill();
                ctx.restore();
            }
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
