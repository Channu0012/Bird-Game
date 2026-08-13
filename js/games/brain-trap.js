// Game 3: Brain Trap (Rapid Trick Question Reflexes)

const QUESTIONS_BANK = [
    { text: 'Which number is LARGER?', optA: '14', optB: '9', correct: 'A' },
    { text: 'Is 9 + 4 = 13?', optA: 'YES', optB: 'NO', correct: 'A' },
    { text: 'Tap the GREEN box!', optA: 'RED', optB: 'GREEN', correct: 'B', colorA: '#ef4444', colorB: '#22c55e' },
    { text: 'Is Water Liquid at room temp?', optA: 'YES', optB: 'NO', correct: 'A' },
    { text: 'Which number is EVEN?', optA: '15', optB: '18', correct: 'B' },
    { text: 'Is 7 x 6 = 42?', optA: 'YES', optB: 'NO', correct: 'A' },
    { text: 'Tap TRUE: 100 > 99', optA: 'TRUE', optB: 'FALSE', correct: 'A' },
    { text: 'Which has MORE sides?', optA: 'Triangle', optB: 'Square', correct: 'B' },
];

export default class BrainTrapGame {
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
        this.timeLeft = 2.5;
        this.currentQ = null;
        this.lastTime = performance.now();

        this.boxA = { x: 0, y: 0, w: 0, h: 0 };
        this.boxB = { x: 0, y: 0, w: 0, h: 0 };

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

        this.nextQuestion();
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

        this.boxA = { x: this.width * 0.1, y: this.height * 0.55, w: this.width * 0.36, h: this.height * 0.28 };
        this.boxB = { x: this.width * 0.54, y: this.height * 0.55, w: this.width * 0.36, h: this.height * 0.28 };
    }

    nextQuestion() {
        const idx = Math.floor(Math.random() * QUESTIONS_BANK.length);
        this.currentQ = QUESTIONS_BANK[idx];
        this.timeLeft = Math.max(1.4, 2.6 - this.score * 0.08);
    }

    handlePointerDown(e) {
        if (!this.running || this.paused) return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        const touchY = e.clientY - rect.top;

        let selected = null;
        if (touchX >= this.boxA.x && touchX <= this.boxA.x + this.boxA.w && touchY >= this.boxA.y && touchY <= this.boxA.y + this.boxA.h) {
            selected = 'A';
        } else if (touchX >= this.boxB.x && touchX <= this.boxB.x + this.boxB.w && touchY >= this.boxB.y && touchY <= this.boxB.y + this.boxB.h) {
            selected = 'B';
        }

        if (selected) {
            if (selected === this.currentQ.correct) {
                this.score += 1;
                this.audio.play('score');
                this.nextQuestion();
            } else {
                this.gameOver();
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
        const { ctx, width, height, currentQ } = this;
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        if (!currentQ) return;

        // Timer Bar
        const timerPct = Math.max(0, this.timeLeft / 2.6);
        ctx.fillStyle = timerPct > 0.3 ? '#38bdf8' : '#ef4444';
        ctx.fillRect(0, 0, width * timerPct, 12);

        // Header
        ctx.font = '800 24px Outfit, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`SCORE: ${this.score}`, 30, 55);

        // Question Box
        ctx.font = '900 30px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(currentQ.text, width / 2, height * 0.32);

        // Box A
        ctx.fillStyle = currentQ.colorA || '#1e293b';
        ctx.beginPath();
        ctx.roundRect(this.boxA.x, this.boxA.y, this.boxA.w, this.boxA.h, 20);
        ctx.fill();

        ctx.font = '900 28px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(currentQ.optA, this.boxA.x + this.boxA.w / 2, this.boxA.y + this.boxA.h / 2 + 10);

        // Box B
        ctx.fillStyle = currentQ.colorB || '#1e293b';
        ctx.beginPath();
        ctx.roundRect(this.boxB.x, this.boxB.y, this.boxB.w, this.boxB.h, 20);
        ctx.fill();

        ctx.fillText(currentQ.optB, this.boxB.x + this.boxB.w / 2, this.boxB.y + this.boxB.h / 2 + 10);
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
