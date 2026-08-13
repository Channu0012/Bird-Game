// Central Lifecycle & Game Instance Manager for BirdMate Platform

import { getGameById } from './game-registry.js';
import { StorageManager } from './storage.js';
import { globalAudio } from './audio-manager.js';

export class GameManager {
    constructor({ canvas, ctx, onGameOver, onPauseChange }) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.onGameOver = onGameOver;
        this.onPauseChange = onPauseChange;
        this.currentGameId = null;
        this.currentGameInstance = null;
        this.paused = false;
    }

    async loadAndLaunch(gameId) {
        // Destroy existing running game instance cleanly
        this.destroyCurrentGame();

        const gameMeta = getGameById(gameId);
        this.currentGameId = gameId;
        this.paused = false;

        try {
            let GameModule;
            switch (gameId) {
                case 'crazy-bird':
                    GameModule = await import('../games/crazy-bird.js');
                    break;
                case 'tap-rush':
                    GameModule = await import('../games/tap-rush.js');
                    break;
                case 'brain-trap':
                    GameModule = await import('../games/brain-trap.js');
                    break;
                case 'dodge-it':
                    GameModule = await import('../games/dodge-it.js');
                    break;
                case 'perfect-hit':
                    GameModule = await import('../games/perfect-hit.js');
                    break;
                case 'stack-master':
                    GameModule = await import('../games/stack-master.js');
                    break;
                case 'bomb-run':
                    GameModule = await import('../games/bomb-run.js');
                    break;
                case 'color-chaos':
                    GameModule = await import('../games/color-chaos.js');
                    break;
                case 'run-till-dead':
                    GameModule = await import('../games/run-till-dead.js');
                    break;
                case 'memory-blitz':
                    GameModule = await import('../games/memory-blitz.js');
                    break;
                default:
                    GameModule = await import('../games/crazy-bird.js');
                    break;
            }

            const GameClass = GameModule.default || GameModule.Game;
            this.currentGameInstance = new GameClass({
                canvas: this.canvas,
                ctx: this.ctx,
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
        } catch (err) {
            console.error('Error launching game:', err);
            return null;
        }
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
        if (this.paused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    restart() {
        if (this.currentGameId) {
            this.loadAndLaunch(this.currentGameId);
        }
    }

    destroyCurrentGame() {
        if (this.currentGameInstance) {
            if (typeof this.currentGameInstance.destroy === 'function') {
                try {
                    this.currentGameInstance.destroy();
                } catch (e) {
                    console.warn('Error during game destroy:', e);
                }
            }
            this.currentGameInstance = null;
        }
        globalAudio.stopMusic();
        this.paused = false;
    }
}
