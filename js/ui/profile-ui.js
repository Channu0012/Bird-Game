// Player Profile UI Component for BirdMate Platform

import { GAMES_CATALOG } from '../core/game-registry.js';

export function renderProfile({ container, storage, onPlayGame }) {
    const totalPlays = storage.getTotalPlays();
    const scores = GAMES_CATALOG.map(game => ({
        game,
        bestScore: storage.getBestScore(game.id)
    })).filter(item => item.bestScore > 0);

    const highestScoreObj = scores.reduce((max, item) => item.bestScore > max.bestScore ? item : max, { bestScore: 0, game: GAMES_CATALOG[0] });

    container.innerHTML = `
        <section class="profile-header">
            <div class="avatar-box">🐤</div>
            <h1 class="page-title">Player Profile</h1>
            <p class="page-sub">Your personal bests and gaming achievements</p>
        </section>

        <!-- STATS OVERVIEW CARDS -->
        <section class="section-block">
            <div class="stats-grid">
                <div class="stat-card">
                    <label>Total Games Played</label>
                    <value>${totalPlays}</value>
                </div>
                <div class="stat-card">
                    <label>Games Mastered</label>
                    <value>${scores.length} / ${GAMES_CATALOG.length}</value>
                </div>
                <div class="stat-card">
                    <label>Highest Single Score</label>
                    <value>${highestScoreObj.bestScore} <small>(${highestScoreObj.game.name})</small></value>
                </div>
            </div>
        </section>

        <!-- HIGH SCORES PER GAME -->
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
                                <button class="btn btn-sm btn-primary play-card-btn" data-id="${game.id}" type="button">PLAY →</button>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </section>
    `;

    container.querySelectorAll('.play-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onPlayGame(btn.dataset.id);
        });
    });

    container.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            onPlayGame(card.dataset.id);
        });
    });
}
