// Game 4: Dodge It (Survival Hazard Dodging)

export default class DodgeItGame {
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
        this.survivalTime = 0;
        this.lastTime = performance.now();
        this.lastSpawn = 0;
        this.spawnDelay = 800;

        this.player = { x: 450, y: 520, size: 36, speed: 8 };
        this.hazards = [];
        this.stars = [];

        this.touching = false;
        this.targetX = 450;

        this.onPointerDown = this.handlePointerDown.bind(this);
        this.onPointerMove = this.handlePointerMove.bind(this);
        this.onPointerUp = this.handlePointerUp.bind(this);
        this.onKeyDown = this.handleKeyDown.bind(this);
        this.onResize = this.handleResize.bind(this);
    }

    init() {
        this.handleResize();
        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        this.canvas.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('resize', this.onResize);
    }

    start() {
        this.score = 0;
        this.survivalTime = 0;
        this.hazards = [];
        this.stars = [];
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();

        this.player.x = this.width / 2;
        this.player.y = this.height * 0.85;
        this.targetX = this.player.x;

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
        this.canvas.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
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

        this.player.size = Math.max(28, Math.min(42, this.width * 0.07));
        this.player.y = this.height * 0.85;
    }

    handlePointerDown(e) {
        if (!this.running || this.paused) return;
        this.touching = true;
        this.updateTargetX(e);
    }

    handlePointerMove(e) {
        if (!this.touching || !this.running || this.paused) return;
        this.updateTargetX(e);
    }

    handlePointerUp() {
        this.touching = false;
    }

    updateTargetX(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.targetX = e.clientX - rect.left;
    }

    handleKeyDown(e) {
        if (!this.running || this.paused) return;
        const moveDist = 45;
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            this.targetX = Math.max(this.player.size, this.player.x - moveDist);
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            this.targetX = Math.min(this.width - this.player.size, this.player.x + moveDist);
        }
    }

    spawnItems() {
        const hSize = 24 + Math.random() * 20;
        const hX = hSize + Math.random() * (this.width - hSize * 2);
        const speed = 3.5 + Math.random() * 3 + Math.min(4, this.survivalTime * 0.2);

        this.hazards.push({ x: hX, y: -hSize, size: hSize, speed });

        // Spawn Stars occasionally
        if (Math.random() < 0.35) {
            const sX = 30 + Math.random() * (this.width - 60);
            this.stars.push({ x: sX, y: -20, size: 16, speed: speed * 0.8 });
        }
    }

    update(dtSec) {
        if (!this.running || this.paused) return;

        this.survivalTime += dtSec;
        this.score = Math.floor(this.survivalTime * 10);

        // Smooth player move towards targetX
        this.player.x += (this.targetX - this.player.x) * 0.25;
        this.player.x = Math.min(Math.max(this.player.size, this.player.x), this.width - this.player.size);

        // Spawning
        const now = performance.now();
        const currentDelay = Math.max(300, 750 - this.survivalTime * 25);
        if (now - this.lastSpawn >= currentDelay) {
            this.spawnItems();
            this.lastSpawn = now;
        }

        // Update Hazards
        for (const h of this.hazards) {
            h.y += h.speed;

            // Collision check with player
            const distX = this.player.x - h.x;
            const distY = this.player.y - h.y;
            const dist = Math.sqrt(distX * distX + distY * distY);
            if (dist < (this.player.size * 0.8 + h.size * 0.8)) {
                this.running = false;
                this.audio.play('hit');
                if (this.onGameOver) this.onGameOver(this.score);
                return;
            }
        }

        // Update Stars
        for (const s of this.stars) {
            s.y += s.speed;

            const distX = this.player.x - s.x;
            const distY = this.player.y - s.y;
            const dist = Math.sqrt(distX * distX + distY * distY);
            if (dist < (this.player.size * 0.8 + s.size)) {
                s.collected = true;
                this.score += 25;
                this.audio.play('point');
            }
        }

        this.hazards = this.hazards.filter(h => h.y < this.height + 40);
        this.stars = this.stars.filter(s => !s.collected && s.y < this.height + 40);
    }

    draw() {
        const { ctx, width, height, player } = this;
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, width, height);

        // Hazards
        ctx.fillStyle = '#ef4444';
        for (const h of this.hazards) {
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Stars
        ctx.fillStyle = '#facc15';
        for (const s of this.stars) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Player Ship / Hero
        ctx.save();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(player.x, player.y - player.size * 0.3, player.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // HUD
        ctx.save();
        ctx.font = '900 28px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`SCORE: ${this.score}`, 25, 45);
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
