// Game 8: Color Chaos (Stroop Effect Speed Color Matching)

const COLOR_DECK = [
    { name: 'RED', hex: '#ef4444' },
    { name: 'BLUE', hex: '#38bdf8' },
    { name: 'GREEN', hex: '#22c55e' },
    { name: 'YELLOW', hex: '#facc15' },
    { name: 'PURPLE', hex: '#a855f7' },
];

export default class ColorChaosGame {
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
        this.timeLeft = 2.0;
        this.lastTime = performance.now();

        this.wordItem = null;
        this.inkItem = null;
        this.swatches = [];

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

        this.swatchWidth = Math.min(120, this.width * 0.22);
        this.swatchY = this.height * 0.65;
    }

    nextRound() {
        this.timeLeft = Math.max(1.1, 2.2 - this.score * 0.05);

        const wordIdx = Math.floor(Math.random() * COLOR_DECK.length);
        let inkIdx = Math.floor(Math.random() * COLOR_DECK.length);
        while (inkIdx === wordIdx) {
            inkIdx = Math.floor(Math.random() * COLOR_DECK.length);
        }

        this.wordItem = COLOR_DECK[wordIdx];
        this.inkItem = COLOR_DECK[inkIdx];

        // Player must match the TEXT INK COLOR
        this.targetItem = this.inkItem;

        // Swatches (4 choices)
        const choices = [this.targetItem];
        while (choices.length < 4) {
            const rItem = COLOR_DECK[Math.floor(Math.random() * COLOR_DECK.length)];
            if (!choices.some(c => c.name === rItem.name)) {
                choices.push(rItem);
            }
        }
        choices.sort(() => Math.random() - 0.5);

        const startX = (this.width - (4 * this.swatchWidth + 3 * 15)) / 2;
        this.swatches = choices.map((c, i) => ({
            item: c,
            x: startX + i * (this.swatchWidth + 15),
            y: this.swatchY,
            w: this.swatchWidth,
            h: 80
        }));
    }

    handlePointerDown(e) {
        if (!this.running || this.paused) return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        const touchY = e.clientY - rect.top;

        for (const sw of this.swatches) {
            if (touchX >= sw.x && touchX <= sw.x + sw.w && touchY >= sw.y && touchY <= sw.y + sw.h) {
                if (sw.item.name === this.targetItem.name) {
                    this.score += 1;
                    this.audio.play('score');
                    this.nextRound();
                } else {
                    this.gameOver();
                }
                return;
            }
        }
    }

    gameOver() {
        this.running = false;
        this.audio.play('hit');
        if (this.onGameOver) this.onGameOver(this.score);
    }

    update(dtSec) {
        if (!this.running || this.paused) return;

        this.timeLeft -= dtSec;
        if (this.timeLeft <= 0) {
            this.gameOver();
        }
    }

    draw() {
        const { ctx, width, height, wordItem, inkItem } = this;
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#080d18';
        ctx.fillRect(0, 0, width, height);

        if (!wordItem) return;

        // Timer Bar
        const pct = Math.max(0, this.timeLeft / 2.2);
        ctx.fillStyle = pct > 0.3 ? '#38bdf8' : '#ef4444';
        ctx.fillRect(0, 0, width * pct, 12);

        // Header
        ctx.font = '900 26px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`SCORE: ${this.score}`, 25, 55);

        ctx.font = '700 18px Outfit, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText('Tap the TEXT COLOR (Not the word!)', width / 2, height * 0.22);

        // Stroop Word
        ctx.font = '900 52px Outfit, sans-serif';
        ctx.fillStyle = inkItem.hex;
        ctx.shadowColor = inkItem.hex;
        ctx.shadowBlur = 15;
        ctx.fillText(wordItem.name, width / 2, height * 0.42);
        ctx.shadowBlur = 0;

        // Color Swatches
        for (const sw of this.swatches) {
            ctx.fillStyle = sw.item.hex;
            ctx.beginPath();
            ctx.roundRect(sw.x, sw.y, sw.w, sw.h, 16);
            ctx.fill();
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
