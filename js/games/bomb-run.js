// Game 7: Bomb Run (Grid Safe vs Bomb Survival)

export default class BombRunGame {
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
        this.gridSize = 4;
        this.tiles = [];
        this.lastTime = performance.now();
        this.phase = 'PREVIEW'; // PREVIEW, PLAYING
        this.previewTimer = 1.0;

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
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();

        this.setupRound();
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

        this.gridWidth = Math.min(420, this.width * 0.85);
        this.gridX = (this.width - this.gridWidth) / 2;
        this.gridY = (this.height - this.gridWidth) / 2 + 20;
        this.tileSize = (this.gridWidth - 30) / 4;
    }

    setupRound() {
        this.phase = 'PREVIEW';
        this.previewTimer = Math.max(0.4, 1.0 - this.score * 0.05);

        this.tiles = [];
        const bombCount = Math.min(6, 2 + Math.floor(this.score / 4));
        const total = this.gridSize * this.gridSize;

        let bombsPlaced = 0;
        for (let i = 0; i < total; i++) {
            this.tiles.push({ id: i, isBomb: false, revealed: false });
        }

        while (bombsPlaced < bombCount) {
            const idx = Math.floor(Math.random() * total);
            if (!this.tiles[idx].isBomb) {
                this.tiles[idx].isBomb = true;
                bombsPlaced++;
            }
        }
    }

    handlePointerDown(e) {
        if (!this.running || this.paused || this.phase !== 'PLAYING') return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        const touchY = e.clientY - rect.top;

        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const tx = this.gridX + c * (this.tileSize + 10);
                const ty = this.gridY + r * (this.tileSize + 10);

                if (touchX >= tx && touchX <= tx + this.tileSize && touchY >= ty && touchY <= ty + this.tileSize) {
                    const tile = this.tiles[r * 4 + c];
                    if (tile.revealed) return;

                    tile.revealed = true;
                    if (tile.isBomb) {
                        this.running = false;
                        this.audio.play('hit');
                        if (this.onGameOver) this.onGameOver(this.score);
                    } else {
                        this.score += 1;
                        this.audio.play('tap');

                        // Check if all safe tiles cleared
                        const safeRemaining = this.tiles.some(t => !t.isBomb && !t.revealed);
                        if (!safeRemaining) {
                            this.audio.play('score');
                            this.setupRound();
                        }
                    }
                    return;
                }
            }
        }
    }

    update(dtSec) {
        if (!this.running || this.paused) return;

        if (this.phase === 'PREVIEW') {
            this.previewTimer -= dtSec;
            if (this.previewTimer <= 0) {
                this.phase = 'PLAYING';
            }
        }
    }

    draw() {
        const { ctx, width, height } = this;
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, width, height);

        // Header
        ctx.font = '900 32px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`SCORE: ${this.score}`, width / 2, 55);

        ctx.font = '700 18px Outfit, sans-serif';
        ctx.fillStyle = this.phase === 'PREVIEW' ? '#facc15' : '#38bdf8';
        ctx.fillText(this.phase === 'PREVIEW' ? 'MEMORIZE BOMBS!' : 'TAP SAFE TILES!', width / 2, 85);

        // Grid Render
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const tx = this.gridX + c * (this.tileSize + 10);
                const ty = this.gridY + r * (this.tileSize + 10);
                const tile = this.tiles[r * 4 + c];

                ctx.save();
                if (this.phase === 'PREVIEW') {
                    ctx.fillStyle = tile.isBomb ? '#ef4444' : '#22c55e';
                } else {
                    if (tile.revealed) {
                        ctx.fillStyle = tile.isBomb ? '#ef4444' : '#14b8a6';
                    } else {
                        ctx.fillStyle = '#1e293b';
                    }
                }

                ctx.beginPath();
                ctx.roundRect(tx, ty, this.tileSize, this.tileSize, 12);
                ctx.fill();

                if (this.phase === 'PREVIEW' && tile.isBomb) {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '24px sans-serif';
                    ctx.fillText('💣', tx + this.tileSize / 2, ty + this.tileSize / 2 + 8);
                }
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
