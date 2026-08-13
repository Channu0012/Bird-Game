// Main Application Orchestrator & Router for BirdMate Platform 2.0

import { StorageManager } from './core/storage.js';
import { globalAudio } from './core/audio-manager.js';
import { GAMES_CATALOG } from './core/game-registry.js';
import { GameManager } from './core/game-manager.js';

import { renderHome } from './ui/home-ui.js';
import { renderCatalog } from './ui/catalog-ui.js';
import { renderProfile } from './ui/profile-ui.js';
import { showResultModal } from './ui/result-ui.js';

class BirdMateApp {
    constructor() {
        this.currentView = 'home'; // 'home', 'games', 'profile', 'playing'
        this.gameManager = null;
        this.toastEl = document.getElementById('toast');
    }

    init() {
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        this.gameManager = new GameManager({
            canvas,
            ctx,
            onGameOver: (result) => this.handleGameOver(result),
            onPauseChange: (isPaused) => this.handlePauseChange(isPaused)
        });

        this.bindEvents();
        this.updateMuteUI();
        this.navigate('home');
    }

    bindEvents() {
        // Nav Links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                if (view) this.navigate(view);
            });
        });

        // Topbar Mute Button
        document.getElementById('soundToggle')?.addEventListener('click', () => {
            const muted = globalAudio.toggleMute();
            this.updateMuteUI(muted);
        });

        // Pause / Resume Button
        document.getElementById('pauseButton')?.addEventListener('click', () => {
            if (this.currentView === 'playing') {
                this.gameManager.togglePause();
            }
        });

        // Header Instant Search
        const searchInput = document.getElementById('headerSearch');
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    this.navigate('games', { query });
                }
            });
        }

        // Tab Blur Handler
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

        // If navigating away from active game, clean up instance
        if (viewName !== 'playing') {
            this.gameManager.destroyCurrentGame();
        }

        // Update Nav UI
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

    async launchGame(gameId) {
        this.navigate('playing');
        const meta = await this.gameManager.loadAndLaunch(gameId);
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

// Instantiate and initialize BirdMate Platform on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new BirdMateApp();
    app.init();
});
