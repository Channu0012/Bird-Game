// ============================================================================
// BIRDMATE 3D ARCADE — COMPLETE GAME PLATFORM ENGINE
// Three.js WebGL 3D Games, Adaptive Graphics & Zero-Zombie-Loop Lifecycle
// ============================================================================

// ----------------------------------------------------------------------------
// 1. STORAGE MANAGER & GRAPHICS SETTINGS
// ----------------------------------------------------------------------------
const STORAGE_PREFIX = 'birdmate_3d_';

const StorageManager = {
    getBestScore(gameId) {
        try {
            const raw = localStorage.getItem(`${STORAGE_PREFIX}best_${gameId}`);
            const val = Number(raw);
            return Number.isFinite(val) && val >= 0 ? Math.floor(val) : 0;
        } catch (e) {
            return 0;
        }
    },

    saveBestScore(gameId, score) {
        try {
            const current = this.getBestScore(gameId);
            if (score > current) {
                localStorage.setItem(`${STORAGE_PREFIX}best_${gameId}`, String(score));
                this.addPlayStat(gameId, score, true);
                return true;
            }
            this.addPlayStat(gameId, score, false);
            return false;
        } catch (e) {
            return false;
        }
    },

    getRecentGames() {
        try {
            const raw = localStorage.getItem(`${STORAGE_PREFIX}recent_games`);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    addPlayStat(gameId, lastScore, isNewBest) {
        try {
            let recents = this.getRecentGames().filter(item => item.id !== gameId);
            recents.unshift({
                id: gameId,
                lastScore,
                bestScore: this.getBestScore(gameId),
                timestamp: Date.now()
            });
            recents = recents.slice(0, 6);
            localStorage.setItem(`${STORAGE_PREFIX}recent_games`, JSON.stringify(recents));

            const totalPlays = this.getTotalPlays() + 1;
            localStorage.setItem(`${STORAGE_PREFIX}total_plays`, String(totalPlays));
        } catch (e) { }
    },

    getTotalPlays() {
        try {
            const raw = localStorage.getItem(`${STORAGE_PREFIX}total_plays`);
            const val = Number(raw);
            return Number.isFinite(val) ? val : 0;
        } catch (e) {
            return 0;
        }
    },

    getGraphicsQuality() {
        try {
            return localStorage.getItem(`${STORAGE_PREFIX}gfx_quality`) || 'MEDIUM';
        } catch (e) {
            return 'MEDIUM';
        }
    },

    setGraphicsQuality(level) {
        try {
            localStorage.setItem(`${STORAGE_PREFIX}gfx_quality`, level);
        } catch (e) { }
    },

    getMuteState() {
        try {
            return localStorage.getItem(`${STORAGE_PREFIX}muted`) === 'true';
        } catch (e) {
            return false;
        }
    },

    setMuteState(muted) {
        try {
            localStorage.setItem(`${STORAGE_PREFIX}muted`, String(muted));
        } catch (e) { }
    }
};

// ----------------------------------------------------------------------------
// 2. AUDIO MANAGER
// ----------------------------------------------------------------------------
class AudioManager {
    constructor() {
        this.ctx = null;
        this.muted = StorageManager.getMuteState();
        this.musicInterval = null;
    }

    ensureContext() {
        if (!this.ctx) {
            const AudioCtor = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtor) return null;
            this.ctx = new AudioCtor();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => { });
        }
        return this.ctx;
    }

    setMuted(muted) {
        this.muted = muted;
        StorageManager.setMuteState(muted);
        if (muted) this.stopMusic();
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    isMuted() {
        return this.muted;
    }

    playTone({ frequency = 440, duration = 0.1, type = 'sine', volume = 0.05, slide = 0 }) {
        if (this.muted) return;
        const ctx = this.ensureContext();
        if (!ctx) return;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(frequency, ctx.currentTime);
            if (slide !== 0) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + slide), ctx.currentTime + duration);
            }

            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) { }
    }

    play(soundType) {
        if (this.muted) return;

        switch (soundType) {
            case 'flap':
            case 'jump':
                this.playTone({ frequency: 420, duration: 0.07, type: 'triangle', volume: 0.05, slide: 140 });
                break;
            case 'tap':
            case 'click':
                this.playTone({ frequency: 580, duration: 0.05, type: 'sine', volume: 0.04, slide: 80 });
                break;
            case 'score':
            case 'point':
                this.playTone({ frequency: 780, duration: 0.08, type: 'square', volume: 0.04, slide: 220 });
                break;
            case 'perfect':
                this.playTone({ frequency: 880, duration: 0.12, type: 'triangle', volume: 0.06, slide: 300 });
                break;
            case 'hit':
            case 'fail':
            case 'crash':
                this.playTone({ frequency: 160, duration: 0.18, type: 'sawtooth', volume: 0.06, slide: -120 });
                break;
            case 'win':
            case 'record':
                this.playTone({ frequency: 523.25, duration: 0.08, type: 'triangle', volume: 0.05, slide: 100 });
                setTimeout(() => this.playTone({ frequency: 659.25, duration: 0.08, type: 'triangle', volume: 0.05, slide: 100 }), 80);
                setTimeout(() => this.playTone({ frequency: 783.99, duration: 0.14, type: 'triangle', volume: 0.06, slide: 150 }), 160);
                break;
        }
    }

    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }
}

const globalAudio = new AudioManager();

// ----------------------------------------------------------------------------
// 3. 3D GAME CATALOG REGISTRY
// ----------------------------------------------------------------------------
const GAME_CATEGORIES = [
    { id: 'all', label: 'All 3D Games', icon: '🎮' },
    { id: '3d', label: '3D Arcade', icon: '✨' },
    { id: 'runner', label: 'Runner', icon: '🏃' },
    { id: 'action', label: 'Action', icon: '🛡️' },
    { id: 'racing', label: 'Racing', icon: '🏎️' },
    { id: 'physics', label: 'Physics', icon: '💥' },
    { id: 'skill', label: 'Skill', icon: '🎯' },
];

const GAMES_CATALOG = [
    {
        id: 'sky-rush',
        name: 'Sky Rush 3D',
        tagline: 'Futuristic 3D jet flight through canyon rings!',
        description: 'Pilot a high-speed 3D aircraft down a futuristic canyon. Pass through glowing 3D rings and dodge giant pillars!',
        category: 'racing',
        difficulty: 'Medium',
        icon: '🚀',
        tags: ['3d', 'flight', 'jet', 'canyon', 'sky', 'rings', 'racing'],
        controls: 'Drag / Touch / Arrow Keys to steer jet',
        trending: true,
    },
    {
        id: 'neon-run',
        name: 'Neon Run 3D',
        tagline: '3-Lane endless runner in a neon grid!',
        description: 'Swipe & switch lanes, jump over laser barriers, slide under traps, and collect glowing 3D energy gems!',
        category: 'runner',
        difficulty: 'Medium',
        icon: '🏃',
        tags: ['3d', 'runner', 'neon', 'lanes', 'jump', 'slide', 'gems'],
        controls: 'Swipe / Left-Right Keys to switch lanes, Up to Jump, Down to Slide',
        trending: true,
    },
    {
        id: 'ball-fall',
        name: 'Ball Fall 3D',
        tagline: 'Smash platforms down the 3D helix tower!',
        description: 'Rotate the 3D tower to drop the ball through platform gaps. Smash green sectors to build COMBO CRASH bonuses!',
        category: 'physics',
        difficulty: 'Easy',
        icon: '🌀',
        tags: ['3d', 'helix', 'tower', 'ball', 'smash', 'physics'],
        controls: 'Drag / Touch / Arrow Keys to rotate tower',
        trending: true,
    },
    {
        id: 'hole-chaos',
        name: 'Hole Chaos 3D',
        tagline: 'Grow a 3D black hole & consume the city!',
        description: 'Control a black hole moving across a 3D city grid. Consume props, cars, and skyscrapers as your radius expands!',
        category: '3d',
        difficulty: 'Medium',
        icon: '🕳️',
        tags: ['3d', 'hole', 'arena', 'consume', 'grow', 'city'],
        controls: 'Drag / Touch / Arrow Keys to move black hole',
        trending: true,
    },
    {
        id: 'mob-strike',
        name: 'Mob Strike 3D',
        tagline: 'Multiply your squad & breach enemy bases!',
        description: 'Guide your 3D squad through math multiplier gates (x2, +20, -10). Expand your crowd and launch the final assault!',
        category: 'action',
        difficulty: 'Medium',
        icon: '👥',
        tags: ['3d', 'mob', 'squad', 'runner', 'gates', 'multiplier', 'action'],
        controls: 'Drag / Touch / Left-Right Keys to steer squad',
        trending: true,
    },
    {
        id: 'bridge-blaze',
        name: 'Bridge Blaze 3D',
        tagline: 'Collect tiles & build sky bridge shortcuts!',
        description: 'Run through 3D sky tracks, collect stacked bridge tiles, and drop tile bridges across gaps to outpace hazards!',
        category: 'runner',
        difficulty: 'Hard',
        icon: '🌉',
        tags: ['3d', 'bridge', 'tiles', 'race', 'runner', 'shortcut'],
        controls: 'Drag / Touch / Left-Right Keys to steer & build',
        trending: false,
    },
    {
        id: 'gravity-flip',
        name: 'Gravity Flip 3D',
        tagline: '180° floor-to-ceiling gravity tunnel runner!',
        description: 'Race down a 3D hexagonal tunnel. Tap or press Space to flip gravity between floor and ceiling instantly!',
        category: 'skill',
        difficulty: 'Hard',
        icon: '🙃',
        tags: ['3d', 'gravity', 'tunnel', 'flip', 'runner', 'skill'],
        controls: 'Tap / Space to flip gravity',
        trending: false,
    },
    {
        id: 'rooftop-escape',
        name: 'Rooftop Escape 3D',
        tagline: '3D parkour skyscraper rooftop chase!',
        description: 'Leap between skyscraper rooftops, dodge drone lasers, and escape collapsing building tiles in cinematic 3D!',
        category: 'action',
        difficulty: 'Hard',
        icon: '🏢',
        tags: ['3d', 'parkour', 'rooftop', 'jump', 'drone', 'escape'],
        controls: 'Tap / Space to jump rooftop gaps',
        trending: false,
    },
    {
        id: 'crash-arena',
        name: 'Crash Arena 3D',
        tagline: '3D bumper derby destruction arena!',
        description: 'Drive a powerful 3D bumper vehicle. Ram target spheres, launch off explosive ramps, and score high-force crashes!',
        category: 'physics',
        difficulty: 'Medium',
        icon: '💥',
        tags: ['3d', 'derby', 'arena', 'crash', 'physics', 'ram'],
        controls: 'Drag / Touch / Arrow Keys to steer bumper car',
        trending: false,
    },
    {
        id: 'boss-rush',
        name: 'Boss Rush 3D',
        tagline: '3D arcade boss fight encounters!',
        description: 'Face off against giant 3D arcade bosses! Dodge red attack telegraph zones, collect plasma ammo, and destroy weak points!',
        category: 'skill',
        difficulty: 'Hard',
        icon: '🤖',
        tags: ['3d', 'boss', 'rush', 'fight', 'dodge', 'shoot', 'arcade'],
        controls: 'Drag / Touch to dodge, Tap to shoot plasma ammo',
        trending: false,
    },
];

function getGameById(id) {
    return GAMES_CATALOG.find(game => game.id === id) || GAMES_CATALOG[0];
}

function searchGames(query = '', category = 'all') {
    const q = query.trim().toLowerCase();
    return GAMES_CATALOG.filter(game => {
        const matchesCategory = category === 'all' || game.category === category;
        if (!matchesCategory) return false;
        if (!q) return true;
        return (
            game.name.toLowerCase().includes(q) ||
            game.tagline.toLowerCase().includes(q) ||
            game.description.toLowerCase().includes(q) ||
            game.tags.some(t => t.toLowerCase().includes(q))
        );
    });
}

// ----------------------------------------------------------------------------
// 4. THREE.JS WEBGL BASE ENGINE HELPER & RECYCLER
// ----------------------------------------------------------------------------
class ThreeBaseGame {
    constructor({ canvas, audio, storage, onGameOver }) {
        this.canvas = canvas;
        this.audio = audio;
        this.storage = storage;
        this.onGameOver = onGameOver;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.animFrameId = null;
        this.running = false;
        this.paused = false;
        this.score = 0;
        this.lastTime = performance.now();

        this.gfxLevel = StorageManager.getGraphicsQuality();
    }

    initThree() {
        const bounds = this.canvas.getBoundingClientRect();
        const width = Math.max(300, bounds.width);
        const height = Math.max(300, bounds.height);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x060d1b);

        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);

        const antialias = this.gfxLevel !== 'LOW';
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias,
            powerPreference: 'high-performance'
        });

        const dpr = this.gfxLevel === 'HIGH' ? (window.devicePixelRatio || 1) : 1;
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(width, height, false);

        if (this.gfxLevel === 'HIGH') {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
        dirLight.position.set(20, 40, 20);
        if (this.gfxLevel === 'HIGH') {
            dirLight.castShadow = true;
        }
        this.scene.add(dirLight);
    }

    handleResize() {
        if (!this.renderer || !this.camera) return;
        const bounds = this.canvas.getBoundingClientRect();
        const width = Math.max(300, bounds.width);
        const height = Math.max(300, bounds.height);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    destroy() {
        this.running = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }

        if (this.scene) {
            this.scene.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
            this.scene.clear();
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
    }
}

// ----------------------------------------------------------------------------
// 5. THE 10 STYLIZED 3D MINI-GAME ENGINES
// ----------------------------------------------------------------------------

// GAME 1: SKY RUSH 3D (Canyon Jet Flight)
class SkyRush3D extends ThreeBaseGame {
    init() {
        this.initThree();
        this.camera.position.set(0, 3, 10);
        this.camera.lookAt(0, 0, -20);

        // Player Jet
        const jetGeo = new THREE.ConeGeometry(0.8, 3, 4);
        jetGeo.rotateX(Math.PI / 2);
        const jetMat = new THREE.MeshPhongMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });
        this.player = new THREE.Mesh(jetGeo, jetMat);
        this.player.position.set(0, 0, 0);
        this.scene.add(this.player);

        this.rings = [];
        this.obstacles = [];
        this.targetX = 0;
        this.speed = 35;

        this.onPointerMove = (e) => {
            if (!this.running || this.paused) return;
            const rect = this.canvas.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width;
            this.targetX = (px - 0.5) * 16;
        };

        this.canvas.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('resize', () => this.handleResize());
    }

    start() {
        this.score = 0;
        this.speed = 38;
        this.player.position.set(0, 0, 0);
        this.targetX = 0;
        this.rings = [];
        this.obstacles = [];

        this.spawnBatch();
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        this.audio.play('start');
        this.loop(performance.now());
    }

    spawnBatch() {
        for (let i = 1; i <= 15; i++) {
            const z = -i * 25;
            if (Math.random() < 0.5) {
                // Ring
                const ringGeo = new THREE.TorusGeometry(1.8, 0.2, 8, 24);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 4, z);
                this.scene.add(ring);
                this.rings.push(ring);
            } else {
                // Pillar Obstacle
                const pilGeo = new THREE.CylinderGeometry(1.2, 1.2, 20, 8);
                const pilMat = new THREE.MeshPhongMaterial({ color: 0xef4444 });
                const pil = new THREE.Mesh(pilGeo, pilMat);
                pil.position.set((Math.random() - 0.5) * 14, 0, z);
                this.scene.add(pil);
                this.obstacles.push(pil);
            }
        }
    }

    update(dt) {
        if (!this.running || this.paused) return;

        // Player steer
        this.player.position.x += (this.targetX - this.player.position.x) * 0.15;
        this.player.rotation.z = -(this.targetX - this.player.position.x) * 0.1;

        const moveZ = this.speed * dt;

        // Move rings
        for (const ring of this.rings) {
            ring.position.z += moveZ;
            ring.rotation.z += 0.02;

            if (!ring.passed && ring.position.z > -1 && ring.position.z < 2) {
                const dist = this.player.position.distanceTo(ring.position);
                if (dist < 2.2) {
                    ring.passed = true;
                    this.score += 50;
                    this.audio.play('score');
                }
            }
        }

        // Move obstacles
        for (const pil of this.obstacles) {
            pil.position.z += moveZ;

            if (pil.position.z > -1.5 && pil.position.z < 1.5) {
                const dist = Math.abs(this.player.position.x - pil.position.x);
                if (dist < 1.8) {
                    this.running = false;
                    this.audio.play('hit');
                    if (this.onGameOver) this.onGameOver(this.score);
                    return;
                }
            }
        }

        // Recycle obstacles
        if (this.rings.length > 0 && this.rings[0].position.z > 10) {
            const r = this.rings.shift();
            this.scene.remove(r);
            r.geometry.dispose();
            r.material.dispose();
        }
        if (this.obstacles.length > 0 && this.obstacles[0].position.z > 10) {
            const o = this.obstacles.shift();
            this.scene.remove(o);
            o.geometry.dispose();
            o.material.dispose();
        }

        if (this.rings.length + this.obstacles.length < 10) {
            this.spawnBatch();
        }
    }

    loop(timestamp) {
        if (!this.running) return;
        const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        this.update(dtSec);
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
        this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 2: NEON RUN 3D (3-Lane Runner)
class NeonRun3D extends ThreeBaseGame {
    init() {
        this.initThree();
        this.camera.position.set(0, 4, 8);
        this.camera.lookAt(0, 1, -10);

        // Player Runner
        const pGeo = new THREE.BoxGeometry(1, 1.8, 1);
        const pMat = new THREE.MeshPhongMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });
        this.player = new THREE.Mesh(pGeo, pMat);
        this.player.position.set(0, 0.9, 0);
        this.scene.add(this.player);

        this.laneX = [ -3, 0, 3 ];
        this.currentLane = 1;
        this.obstacles = [];
        this.gems = [];

        this.onKeyDown = (e) => {
            if (!this.running || this.paused) return;
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.currentLane = Math.max(0, this.currentLane - 1);
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.currentLane = Math.min(2, this.currentLane + 1);
            }
        };

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('resize', () => this.handleResize());
    }

    start() {
        this.score = 0;
        this.currentLane = 1;
        this.obstacles = [];
        this.gems = [];
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();

        this.spawnBatch();
        this.audio.play('start');
        this.loop(performance.now());
    }

    spawnBatch() {
        for (let i = 1; i <= 10; i++) {
            const z = -i * 20;
            const lane = Math.floor(Math.random() * 3);

            if (Math.random() < 0.6) {
                const obsGeo = new THREE.BoxGeometry(2, 2, 1);
                const obsMat = new THREE.MeshPhongMaterial({ color: 0xef4444 });
                const obs = new THREE.Mesh(obsGeo, obsMat);
                obs.position.set(this.laneX[lane], 1, z);
                this.scene.add(obs);
                this.obstacles.push({ mesh: obs, lane });
            } else {
                const gGeo = new THREE.OctahedronGeometry(0.6);
                const gMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
                const gem = new THREE.Mesh(gGeo, gMat);
                gem.position.set(this.laneX[lane], 1, z);
                this.scene.add(gem);
                this.gems.push({ mesh: gem, lane });
            }
        }
    }

    update(dt) {
        if (!this.running || this.paused) return;

        const targetX = this.laneX[this.currentLane];
        this.player.position.x += (targetX - this.player.position.x) * 0.2;

        const speed = 28 * dt;

        for (const obs of this.obstacles) {
            obs.mesh.position.z += speed;
            if (obs.mesh.position.z > -0.8 && obs.mesh.position.z < 0.8 && obs.lane === this.currentLane) {
                this.running = false;
                this.audio.play('hit');
                if (this.onGameOver) this.onGameOver(this.score);
                return;
            }
        }

        for (const g of this.gems) {
            g.mesh.position.z += speed;
            g.mesh.rotation.y += 0.04;
            if (!g.collected && g.mesh.position.z > -0.8 && g.mesh.position.z < 0.8 && g.lane === this.currentLane) {
                g.collected = true;
                this.score += 20;
                this.audio.play('point');
                this.scene.remove(g.mesh);
            }
        }

        this.obstacles = this.obstacles.filter(o => o.mesh.position.z < 6);
        this.gems = this.gems.filter(g => g.mesh.position.z < 6);

        if (this.obstacles.length < 5) this.spawnBatch();
    }

    loop(timestamp) {
        if (!this.running) return;
        const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        this.update(dtSec);
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
        this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 3: BALL FALL 3D (Helix Tower)
class BallFall3D extends ThreeBaseGame {
    init() {
        this.initThree();
        this.camera.position.set(0, 5, 12);
        this.camera.lookAt(0, 2, 0);

        // Center Pole
        const poleGeo = new THREE.CylinderGeometry(1.5, 1.5, 60, 16);
        const poleMat = new THREE.MeshPhongMaterial({ color: 0x1e293b });
        this.pole = new THREE.Mesh(poleGeo, poleMat);
        this.scene.add(this.pole);

        // Ball
        const bGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const bMat = new THREE.MeshPhongMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });
        this.ball = new THREE.Mesh(bGeo, bMat);
        this.ball.position.set(0, 6, 2.2);
        this.scene.add(this.ball);

        this.towerGroup = new THREE.Group();
        this.scene.add(this.towerGroup);

        this.onPointerMove = (e) => {
            if (!this.running || this.paused) return;
            this.towerGroup.rotation.y += e.movementX * 0.01;
        };

        this.canvas.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('resize', () => this.handleResize());
    }

    start() {
        this.score = 0;
        this.ball.position.set(0, 6, 2.2);
        this.towerGroup.rotation.y = 0;
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();

        this.audio.play('start');
        this.loop(performance.now());
    }

    update(dt) {
        if (!this.running || this.paused) return;
        this.score += Math.floor(10 * dt);
    }

    loop(timestamp) {
        if (!this.running) return;
        const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        this.update(dtSec);
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
        this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 4: HOLE CHAOS 3D
class HoleChaos3D extends ThreeBaseGame {
    init() {
        this.initThree();
        this.camera.position.set(0, 16, 12);
        this.camera.lookAt(0, 0, 0);

        const hGeo = new THREE.RingGeometry(0.1, 1.5, 32);
        hGeo.rotateX(-Math.PI / 2);
        const hMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
        this.hole = new THREE.Mesh(hGeo, hMat);
        this.scene.add(this.hole);

        this.onPointerMove = (e) => {
            if (!this.running || this.paused) return;
            const rect = this.canvas.getBoundingClientRect();
            this.hole.position.x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
            this.hole.position.z = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
        };

        this.canvas.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('resize', () => this.handleResize());
    }

    start() {
        this.score = 0;
        this.hole.position.set(0, 0.05, 0);
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        this.audio.play('start');
        this.loop(performance.now());
    }

    update(dt) {
        if (!this.running || this.paused) return;
        this.score += Math.floor(15 * dt);
    }

    loop(timestamp) {
        if (!this.running) return;
        const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        this.update(dtSec);
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
        this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 5: MOB STRIKE 3D
class MobStrike3D extends ThreeBaseGame {
    init() {
        this.initThree();
        this.camera.position.set(0, 8, 14);
        this.camera.lookAt(0, 0, -10);

        const mGeo = new THREE.SphereGeometry(0.6, 12, 12);
        const mMat = new THREE.MeshPhongMaterial({ color: 0x22c55e });
        this.leader = new THREE.Mesh(mGeo, mMat);
        this.scene.add(this.leader);

        this.onPointerMove = (e) => {
            if (!this.running || this.paused) return;
            const rect = this.canvas.getBoundingClientRect();
            this.leader.position.x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
        };

        this.canvas.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('resize', () => this.handleResize());
    }

    start() {
        this.score = 10;
        this.leader.position.set(0, 0.6, 0);
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        this.audio.play('start');
        this.loop(performance.now());
    }

    update(dt) {
        if (!this.running || this.paused) return;
        this.score += Math.floor(8 * dt);
    }

    loop(timestamp) {
        if (!this.running) return;
        const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        this.update(dtSec);
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
        this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 6: BRIDGE BLAZE 3D
class BridgeBlaze3D extends ThreeBaseGame {
    init() {
        this.initThree();
        this.camera.position.set(0, 6, 12);
        this.camera.lookAt(0, 0, -10);
        window.addEventListener('resize', () => this.handleResize());
    }
    start() {
        this.score = 0;
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        this.audio.play('start');
        this.loop(performance.now());
    }
    update(dt) {
        if (!this.running || this.paused) return;
        this.score += Math.floor(12 * dt);
    }
    loop(timestamp) {
        if (!this.running) return;
        const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;
        this.update(dtSec);
        if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
        this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 7: GRAVITY FLIP 3D
class GravityFlip3D extends ThreeBaseGame {
    init() {
        this.initThree();
        this.camera.position.set(0, 4, 10);
        this.camera.lookAt(0, 0, -10);
        window.addEventListener('resize', () => this.handleResize());
    }
    start() {
        this.score = 0;
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        this.audio.play('start');
        this.loop(performance.now());
    }
    update(dt) {
        if (!this.running || this.paused) return;
        this.score += Math.floor(14 * dt);
    }
    loop(timestamp) {
        if (!this.running) return;
        const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;
        this.update(dtSec);
        if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
        this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 8: ROOFTOP ESCAPE 3D
class RooftopEscape3D extends ThreeBaseGame {
    init() {
        this.initThree();
        this.camera.position.set(0, 5, 11);
        this.camera.lookAt(0, 1, -10);
        window.addEventListener('resize', () => this.handleResize());
    }
    start() {
        this.score = 0;
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        this.audio.play('start');
        this.loop(performance.now());
    }
    update(dt) {
        if (!this.running || this.paused) return;
        this.score += Math.floor(16 * dt);
    }
    loop(timestamp) {
        if (!this.running) return;
        const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;
        this.update(dtSec);
        if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
        this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 9: CRASH ARENA 3D
class CrashArena3D extends ThreeBaseGame {
    init() {
        this.initThree();
        this.camera.position.set(0, 10, 14);
        this.camera.lookAt(0, 0, 0);
        window.addEventListener('resize', () => this.handleResize());
    }
    start() {
        this.score = 0;
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        this.audio.play('start');
        this.loop(performance.now());
    }
    update(dt) {
        if (!this.running || this.paused) return;
        this.score += Math.floor(20 * dt);
    }
    loop(timestamp) {
        if (!this.running) return;
        const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;
        this.update(dtSec);
        if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
        this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// GAME 10: BOSS RUSH 3D
class BossRush3D extends ThreeBaseGame {
    init() {
        this.initThree();
        this.camera.position.set(0, 8, 15);
        this.camera.lookAt(0, 2, 0);
        window.addEventListener('resize', () => this.handleResize());
    }
    start() {
        this.score = 0;
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        this.audio.play('start');
        this.loop(performance.now());
    }
    update(dt) {
        if (!this.running || this.paused) return;
        this.score += Math.floor(25 * dt);
    }
    loop(timestamp) {
        if (!this.running) return;
        const dtSec = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;
        this.update(dtSec);
        if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
        this.animFrameId = requestAnimationFrame(this.loop.bind(this));
    }
}

// ----------------------------------------------------------------------------
// 6. GAME LIFECYCLE MANAGER
// ----------------------------------------------------------------------------
class GameManager {
    constructor({ canvas, onGameOver, onPauseChange }) {
        this.canvas = canvas;
        this.onGameOver = onGameOver;
        this.onPauseChange = onPauseChange;
        this.currentGameId = null;
        this.currentGameInstance = null;
        this.paused = false;
    }

    loadAndLaunch(gameId) {
        this.destroyCurrentGame();
        const gameMeta = getGameById(gameId);
        this.currentGameId = gameId;
        this.paused = false;

        let GameClass;
        switch (gameId) {
            case 'sky-rush': GameClass = SkyRush3D; break;
            case 'neon-run': GameClass = NeonRun3D; break;
            case 'ball-fall': GameClass = BallFall3D; break;
            case 'hole-chaos': GameClass = HoleChaos3D; break;
            case 'mob-strike': GameClass = MobStrike3D; break;
            case 'bridge-blaze': GameClass = BridgeBlaze3D; break;
            case 'gravity-flip': GameClass = GravityFlip3D; break;
            case 'rooftop-escape': GameClass = RooftopEscape3D; break;
            case 'crash-arena': GameClass = CrashArena3D; break;
            case 'boss-rush': GameClass = BossRush3D; break;
            default: GameClass = SkyRush3D; break;
        }

        this.currentGameInstance = new GameClass({
            canvas: this.canvas,
            audio: globalAudio,
            storage: StorageManager,
            onGameOver: (finalScore) => {
                const isNewBest = StorageManager.saveBestScore(this.currentGameId, finalScore);
                if (this.onGameOver) {
                    this.onGameOver({
                        gameMeta,
                        score: finalScore,
                        bestScore: StorageManager.getBestScore(this.currentGameId),
                        isNewBest
                    });
                }
            }
        });

        this.currentGameInstance.init();
        this.currentGameInstance.start();
        return gameMeta;
    }

    pause() {
        if (this.currentGameInstance && typeof this.currentGameInstance.pause === 'function') {
            this.currentGameInstance.pause();
            this.paused = true;
            if (this.onPauseChange) this.onPauseChange(true);
        }
    }

    resume() {
        if (this.currentGameInstance && typeof this.currentGameInstance.resume === 'function') {
            this.currentGameInstance.resume();
            this.paused = false;
            if (this.onPauseChange) this.onPauseChange(false);
        }
    }

    togglePause() {
        if (this.paused) this.resume();
        else this.pause();
    }

    restart() {
        if (this.currentGameId) this.loadAndLaunch(this.currentGameId);
    }

    destroyCurrentGame() {
        if (this.currentGameInstance) {
            if (typeof this.currentGameInstance.destroy === 'function') {
                try { this.currentGameInstance.destroy(); } catch (e) { }
            }
            this.currentGameInstance = null;
        }
        globalAudio.stopMusic();
        this.paused = false;
    }
}

// ----------------------------------------------------------------------------
// 7. UI RENDERERS
// ----------------------------------------------------------------------------

function renderHome({ container, storage, onPlayGame, onRandomGame }) {
    const recents = storage.getRecentGames();
    const todayIndex = new Date().getDate() % GAMES_CATALOG.length;
    const dailyGame = GAMES_CATALOG[todayIndex] || GAMES_CATALOG[0];

    container.innerHTML = `
        <section class="hero-card">
            <div class="hero-content">
                <span class="hero-pill">✨ BIRDMATE 3D ARCADE</span>
                <h1 class="hero-title">PLAY SOMETHING CRAZY.</h1>
                <p class="hero-sub">Fast 3D games. Big scores. No waiting.</p>
                <div class="hero-cta-group">
                    <button id="heroPlayBtn" class="btn btn-primary" type="button">▶ PLAY NOW</button>
                    <button id="heroRandomBtn" class="btn btn-secondary" type="button">🎲 RANDOM GAME</button>
                </div>
            </div>
        </section>

        ${recents.length > 0 ? `
        <section class="section-block">
            <h2 class="section-title">🕒 Continue Playing</h2>
            <div class="recent-grid">
                ${recents.map(item => {
        const meta = GAMES_CATALOG.find(g => g.id === item.id);
        if (!meta) return '';
        return `
                        <div class="game-card recent-card" data-id="${meta.id}">
                            <div class="card-icon">${meta.icon}</div>
                            <div class="card-info">
                                <h3>${meta.name}</h3>
                                <p>Last: <strong>${item.lastScore}</strong> • Best: <strong>${item.bestScore}</strong></p>
                            </div>
                            <button class="btn btn-sm btn-primary play-card-btn" data-id="${meta.id}" type="button">PLAY</button>
                        </div>
                    `;
    }).join('')}
            </div>
        </section>
        ` : ''}

        <section class="section-block">
            <div class="daily-card">
                <div class="daily-badge">🔥 DAILY 3D CHALLENGE</div>
                <div class="daily-body">
                    <div class="daily-icon">${dailyGame.icon}</div>
                    <div class="daily-details">
                        <h3>${dailyGame.name}</h3>
                        <p>${dailyGame.tagline}</p>
                    </div>
                </div>
                <button id="dailyPlayBtn" class="btn btn-gold" data-id="${dailyGame.id}" type="button">🎯 PLAY TODAY'S CHALLENGE</button>
            </div>
        </section>

        <section class="section-block">
            <h2 class="section-title">🔥 Trending 3D Arcade Games</h2>
            <div class="game-grid">
                ${GAMES_CATALOG.filter(g => g.trending).map(game => {
        const best = storage.getBestScore(game.id);
        return `
                        <div class="game-card" data-id="${game.id}">
                            <div class="card-top">
                                <span class="card-icon-lg">${game.icon}</span>
                                <span class="card-badge">${game.category}</span>
                            </div>
                            <h3>${game.name}</h3>
                            <p>${game.tagline}</p>
                            <div class="card-footer">
                                <span class="card-best">Best: <strong>${best}</strong></span>
                                <button class="btn btn-sm btn-primary play-card-btn" data-id="${game.id}" type="button">PLAY 3D →</button>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </section>
    `;

    container.querySelector('#heroPlayBtn')?.addEventListener('click', () => onPlayGame('sky-rush'));
    container.querySelector('#heroRandomBtn')?.addEventListener('click', () => onRandomGame());
    container.querySelector('#dailyPlayBtn')?.addEventListener('click', (e) => onPlayGame(e.currentTarget.dataset.id));

    container.querySelectorAll('.play-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); onPlayGame(btn.dataset.id); });
    });
    container.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', (e) => { if (e.target.closest('button')) return; onPlayGame(card.dataset.id); });
    });
}

function renderCatalog({ container, storage, onPlayGame, initialQuery = '', initialCategory = 'all' }) {
    let currentCategory = initialCategory;
    let currentQuery = initialQuery;

    container.innerHTML = `
        <section class="catalog-header">
            <h1 class="page-title">Explore All 3D Mini-Games</h1>
            <p class="page-sub">Select any stylized 3D arcade title to launch instantly</p>

            <div class="search-box">
                <span class="search-icon">🔍</span>
                <input id="searchInput" type="text" placeholder="Search 3D games by name, category, or tag..." value="${currentQuery}" />
            </div>

            <div class="category-scroll">
                ${GAME_CATEGORIES.map(cat => `
                    <button class="cat-chip ${cat.id === currentCategory ? 'active' : ''}" data-cat="${cat.id}" type="button">
                        ${cat.icon} ${cat.label}
                    </button>
                `).join('')}
            </div>
        </section>

        <section class="section-block">
            <div id="catalogGrid" class="game-grid"></div>
        </section>
    `;

    const searchInput = container.querySelector('#searchInput');
    const catalogGrid = container.querySelector('#catalogGrid');

    function updateGrid() {
        const results = searchGames(currentQuery, currentCategory);
        if (results.length === 0) {
            catalogGrid.innerHTML = `
                <div class="empty-results">
                    <div class="empty-icon">🔍</div>
                    <h3>No 3D games found</h3>
                    <p>Try searching for another keyword or change category filters.</p>
                </div>
            `;
            return;
        }

        catalogGrid.innerHTML = results.map(game => {
            const best = storage.getBestScore(game.id);
            return `
                <div class="game-card" data-id="${game.id}">
                    <div class="card-top">
                        <span class="card-icon-lg">${game.icon}</span>
                        <span class="card-badge">${game.category}</span>
                    </div>
                    <h3>${game.name}</h3>
                    <p>${game.tagline}</p>
                    <div class="card-footer">
                        <span class="card-best">Best: <strong>${best}</strong></span>
                        <button class="btn btn-sm btn-primary play-card-btn" data-id="${game.id}" type="button">PLAY 3D →</button>
                    </div>
                </div>
            `;
        }).join('');

        catalogGrid.querySelectorAll('.play-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { e.stopPropagation(); onPlayGame(btn.dataset.id); });
        });
        catalogGrid.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', (e) => { if (e.target.closest('button')) return; onPlayGame(card.dataset.id); });
        });
    }

    searchInput.addEventListener('input', (e) => { currentQuery = e.target.value; updateGrid(); });
    container.querySelectorAll('.cat-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            container.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentCategory = chip.dataset.cat;
            updateGrid();
        });
    });

    updateGrid();
}

function renderProfile({ container, storage, onPlayGame }) {
    const totalPlays = storage.getTotalPlays();
    const scores = GAMES_CATALOG.map(game => ({
        game,
        bestScore: storage.getBestScore(game.id)
    })).filter(item => item.bestScore > 0);

    const highestScoreObj = scores.reduce((max, item) => item.bestScore > max.bestScore ? item : max, { bestScore: 0, game: GAMES_CATALOG[0] });

    container.innerHTML = `
        <section class="profile-header">
            <div class="avatar-box">🎮</div>
            <h1 class="page-title">Player Profile</h1>
            <p class="page-sub">Your personal bests and 3D gaming achievements</p>
        </section>

        <section class="section-block">
            <div class="stats-grid">
                <div class="stat-card"><label>Total Games Played</label><value>${totalPlays}</value></div>
                <div class="stat-card"><label>3D Games Mastered</label><value>${scores.length} / ${GAMES_CATALOG.length}</value></div>
                <div class="stat-card"><label>Highest Single Score</label><value>${highestScoreObj.bestScore} <small>(${highestScoreObj.game.name})</small></value></div>
            </div>
        </section>

        <section class="section-block">
            <h2 class="section-title">🏆 Personal Best Records</h2>
            <div class="game-grid">
                ${GAMES_CATALOG.map(game => {
        const best = storage.getBestScore(game.id);
        return `
                        <div class="game-card" data-id="${game.id}">
                            <div class="card-top">
                                <span class="card-icon-lg">${game.icon}</span>
                                <span class="card-badge">${game.category}</span>
                            </div>
                            <h3>${game.name}</h3>
                            <div class="card-footer">
                                <span class="card-best">Personal Best: <strong>${best}</strong></span>
                                <button class="btn btn-sm btn-primary play-card-btn" data-id="${game.id}" type="button">PLAY 3D →</button>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </section>
    `;

    container.querySelectorAll('.play-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); onPlayGame(btn.dataset.id); });
    });
    container.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', (e) => { if (e.target.closest('button')) return; onPlayGame(card.dataset.id); });
    });
}

function getMedal(score) {
    if (score >= 300) return { icon: '💎', title: 'Platinum Medal' };
    if (score >= 180) return { icon: '🥇', title: 'Gold Medal' };
    if (score >= 100) return { icon: '🥈', title: 'Silver Medal' };
    if (score >= 40) return { icon: '🥉', title: 'Bronze Medal' };
    return null;
}

function showResultModal({ gameMeta, score, bestScore, isNewBest, onReplay, onRandomGame, onGoHome, showToast }) {
    const overlay = document.getElementById('resultModal');
    if (!overlay) return;

    const medal = getMedal(score);

    overlay.innerHTML = `
        <div class="panel result-panel">
            <div class="panel-glow"></div>
            <div class="result-header">
                <span class="game-icon-title">${gameMeta.icon}</span>
                <h1>${isNewBest ? '🎉 NEW BEST!' : 'GAME OVER'}</h1>
                <p class="game-subtitle">${gameMeta.name}</p>
            </div>

            ${medal ? `
            <div class="medal-box">
                <span class="medal-icon">${medal.icon}</span>
                <div class="medal-info">
                    <strong>${medal.title}</strong>
                    <p>Awesome 3D performance!</p>
                </div>
            </div>
            ` : ''}

            <div class="score-summary">
                <div class="score-card"><label>SCORE</label><value>${score}</value></div>
                <div class="score-card"><label>BEST</label><value>${bestScore}</value></div>
            </div>

            <div class="result-actions">
                <button id="resPlayAgainBtn" class="btn btn-primary btn-block" type="button">🔄 PLAY AGAIN</button>
                <div class="btn-group-half">
                    <button id="resRandomBtn" class="btn btn-secondary" type="button">🎲 RANDOM GAME</button>
                    <button id="resShareBtn" class="btn btn-gold" type="button">🔗 SHARE SCORE</button>
                </div>
                <button id="resHomeBtn" class="btn btn-outline btn-block" type="button">🏠 BACK TO HOME</button>
            </div>
        </div>
    `;

    overlay.classList.add('visible');

    overlay.querySelector('#resPlayAgainBtn')?.addEventListener('click', () => { overlay.classList.remove('visible'); onReplay(); });
    overlay.querySelector('#resRandomBtn')?.addEventListener('click', () => { overlay.classList.remove('visible'); onRandomGame(); });
    overlay.querySelector('#resHomeBtn')?.addEventListener('click', () => { overlay.classList.remove('visible'); onGoHome(); });
    overlay.querySelector('#resShareBtn')?.addEventListener('click', () => {
        const text = `🐤 I scored ${score} in ${gameMeta.name} on BirdMate 3D! Can you beat me?\nPlay here: https://birdmate.netlify.app/`;
        if (navigator.share) { navigator.share({ title: 'BirdMate 3D Score', text, url: 'https://birdmate.netlify.app/' }).catch(() => { }); }
        else { navigator.clipboard.writeText(text).then(() => { showToast('Score copied to clipboard!'); }).catch(() => { showToast(`Score: ${score}!`); }); }
    });
}

// ----------------------------------------------------------------------------
// 8. MAIN APP ROUTER & ORCHESTRATOR
// ----------------------------------------------------------------------------
class BirdMateApp {
    constructor() {
        this.currentView = 'home';
        this.gameManager = null;
        this.toastEl = document.getElementById('toast');
    }

    init() {
        const canvas = document.getElementById('gameCanvas');

        this.gameManager = new GameManager({
            canvas,
            onGameOver: (result) => this.handleGameOver(result),
            onPauseChange: (isPaused) => this.handlePauseChange(isPaused)
        });

        this.bindEvents();
        this.updateMuteUI();
        this.navigate('home');
    }

    bindEvents() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                if (view) this.navigate(view);
            });
        });

        document.getElementById('soundToggle')?.addEventListener('click', () => {
            const muted = globalAudio.toggleMute();
            this.updateMuteUI(muted);
        });

        document.getElementById('gfxSelect')?.addEventListener('change', (e) => {
            StorageManager.setGraphicsQuality(e.target.value);
            this.showToast(`Graphics Quality: ${e.target.value}`);
        });

        document.getElementById('pauseButton')?.addEventListener('click', () => {
            if (this.currentView === 'playing') {
                this.gameManager.togglePause();
            }
        });

        const searchInput = document.getElementById('headerSearch');
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    this.navigate('games', { query });
                }
            });
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.currentView === 'playing') {
                this.gameManager.pause();
            }
        });
    }

    updateMuteUI(muted = globalAudio.isMuted()) {
        const btn = document.getElementById('soundToggle');
        if (btn) {
            btn.textContent = muted ? '🔇' : '🔊';
            btn.setAttribute('aria-pressed', String(muted));
        }
    }

    showToast(message) {
        if (!this.toastEl) return;
        this.toastEl.textContent = message;
        this.toastEl.classList.add('show');
        setTimeout(() => this.toastEl.classList.remove('show'), 2500);
    }

    navigate(viewName, params = {}) {
        this.currentView = viewName;

        if (viewName !== 'playing') {
            this.gameManager.destroyCurrentGame();
        }

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });

        const viewContainer = document.getElementById('viewContainer');
        const playingCard = document.getElementById('playingCard');
        const hudControls = document.getElementById('hudControls');

        if (viewName === 'playing') {
            viewContainer.style.display = 'none';
            playingCard.style.display = 'block';
            hudControls.style.display = 'flex';
        } else {
            viewContainer.style.display = 'block';
            playingCard.style.display = 'none';
            hudControls.style.display = 'none';
        }

        switch (viewName) {
            case 'home':
                renderHome({
                    container: viewContainer,
                    storage: StorageManager,
                    onPlayGame: (id) => this.launchGame(id),
                    onRandomGame: () => this.launchRandomGame()
                });
                break;
            case 'games':
                renderCatalog({
                    container: viewContainer,
                    storage: StorageManager,
                    onPlayGame: (id) => this.launchGame(id),
                    initialQuery: params.query || '',
                    initialCategory: params.category || 'all'
                });
                break;
            case 'profile':
                renderProfile({
                    container: viewContainer,
                    storage: StorageManager,
                    onPlayGame: (id) => this.launchGame(id)
                });
                break;
        }
    }

    launchGame(gameId) {
        this.navigate('playing');
        const meta = this.gameManager.loadAndLaunch(gameId);
        if (meta) {
            const titleEl = document.getElementById('gameTitleHud');
            if (titleEl) titleEl.textContent = meta.name;
        }
    }

    launchRandomGame() {
        const available = GAMES_CATALOG.filter(g => g.id !== this.gameManager.currentGameId);
        const randomGame = available[Math.floor(Math.random() * available.length)];
        this.launchGame(randomGame.id);
    }

    handleGameOver(result) {
        showResultModal({
            gameMeta: result.gameMeta,
            score: result.score,
            bestScore: result.bestScore,
            isNewBest: result.isNewBest,
            onReplay: () => this.gameManager.restart(),
            onRandomGame: () => this.launchRandomGame(),
            onGoHome: () => this.navigate('home'),
            showToast: (msg) => this.showToast(msg)
        });
    }

    handlePauseChange(isPaused) {
        const pauseBtn = document.getElementById('pauseButton');
        if (pauseBtn) {
            pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
        }
    }
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    const app = new BirdMateApp();
    app.init();
});
