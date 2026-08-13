// Safe LocalStorage Manager for BirdMate Platform

const PREFIX = 'birdmate_';

export const StorageManager = {
    getBestScore(gameId) {
        try {
            const raw = localStorage.getItem(`${PREFIX}best_${gameId}`);
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
                localStorage.setItem(`${PREFIX}best_${gameId}`, String(score));
                this.addPlayStat(gameId, score, true);
                return true; // New record
            }
            this.addPlayStat(gameId, score, false);
            return false;
        } catch (e) {
            return false;
        }
    },

    getRecentGames() {
        try {
            const raw = localStorage.getItem(`${PREFIX}recent_games`);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    addPlayStat(gameId, lastScore, isNewBest) {
        try {
            // Update Recent Games List
            let recents = this.getRecentGames().filter(item => item.id !== gameId);
            recents.unshift({
                id: gameId,
                lastScore,
                bestScore: this.getBestScore(gameId),
                timestamp: Date.now()
            });
            recents = recents.slice(0, 6); // Keep max 6
            localStorage.setItem(`${PREFIX}recent_games`, JSON.stringify(recents));

            // Update Total Play Count
            const totalPlays = this.getTotalPlays() + 1;
            localStorage.setItem(`${PREFIX}total_plays`, String(totalPlays));
        } catch (e) { }
    },

    getTotalPlays() {
        try {
            const raw = localStorage.getItem(`${PREFIX}total_plays`);
            const val = Number(raw);
            return Number.isFinite(val) ? val : 0;
        } catch (e) {
            return 0;
        }
    },

    getMuteState() {
        try {
            return localStorage.getItem(`${PREFIX}muted`) === 'true';
        } catch (e) {
            return false;
        }
    },

    setMuteState(muted) {
        try {
            localStorage.setItem(`${PREFIX}muted`, String(muted));
        } catch (e) { }
    }
};
