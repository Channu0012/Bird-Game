// Home Section Component for BirdMate Platform

import { GAMES_CATALOG } from '../core/game-registry.js';

export function renderHome({ container, storage, onPlayGame, onRandomGame }) {
    const recents = storage.getRecentGames();
    const todayIndex = new Date().getDate() % GAMES_CATALOG.length;
    const dailyGame = GAMES_CATALOG[todayIndex] || GAMES_CATALOG[0];

    container.innerHTML = `
        <!-- HERO SECTION -->
        <section class="hero-card">
            <div class="hero-content">
                <span class="hero-pill">⚡ FAST • ADDICTIVE • FUN</span>
                <h1 class="hero-title">PLAY. COMPETE. REPEAT.</h1>
                <p class="hero-sub">Quick mini-games. Instant fun. Big scores.</p>
                <div class="hero-cta-group">
                    <button id="heroPlayBtn" class="btn btn-primary" type="button">
                        ▶ PLAY NOW
                    </button>
                    <button id="heroRandomBtn" class="btn btn-secondary" type="button">
                        🎲 RANDOM GAME
                    </button>
                </div>
            </div>
        </section>

        <!-- CONTINUE PLAYING (IF HISTORY EXISTS) -->
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
                                <p>Last Score: <strong>${item.lastScore}</strong> • Best: <strong>${item.bestScore}</strong></p>
                            </div>
                            <button class="btn btn-sm btn-primary play-card-btn" data-id="${meta.id}" type="button">PLAY</button>
                        </div>
                    `;
    }).join('')}
            </div>
        </section>
        ` : ''}

        <!-- DAILY CHALLENGE -->
        <section class="section-block">
            <div class="daily-card">
                <div class="daily-badge">🔥 DAILY CHALLENGE</div>
                <div class="daily-body">
                    <div class="daily-icon">${dailyGame.icon}</div>
                    <div class="daily-details">
                        <h3>${dailyGame.name}</h3>
                        <p>${dailyGame.tagline}</p>
                    </div>
                </div>
                <button id="dailyPlayBtn" class="btn btn-gold" data-id="${dailyGame.id}" type="button">
                    🎯 PLAY TODAY'S CHALLENGE
                </button>
            </div>
        </section>

        <!-- TRENDING GAMES -->
        <section class="section-block">
            <h2 class="section-title">🔥 Trending Mini-Games</h2>
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
                                <button class="btn btn-sm btn-primary play-card-btn" data-id="${game.id}" type="button">PLAY →</button>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </section>
    `;

    // Event Bindings
    container.querySelector('#heroPlayBtn')?.addEventListener('click', () => onPlayGame('crazy-bird'));
    container.querySelector('#heroRandomBtn')?.addEventListener('click', () => onRandomGame());
    container.querySelector('#dailyPlayBtn')?.addEventListener('click', (e) => onPlayGame(e.currentTarget.dataset.id));

    container.querySelectorAll('.play-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onPlayGame(e.currentTarget.dataset.id);
        });
    });

    container.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            onPlayGame(card.dataset.id);
        });
    });
}
