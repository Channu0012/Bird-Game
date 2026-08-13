// Central Web Audio API Sound Engine for BirdMate

import { StorageManager } from './storage.js';

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
        if (muted) {
            this.stopMusic();
        }
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

export const globalAudio = new AudioManager();
