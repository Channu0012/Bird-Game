// Catalog & Search UI Component for BirdMate Platform

import { GAME_CATEGORIES, searchGames } from '../core/game-registry.js';

export function renderCatalog({ container, storage, onPlayGame, initialQuery = '', initialCategory = 'all' }) {
    let currentCategory = initialCategory;
    let currentQuery = initialQuery;

    container.innerHTML = `
        <section class="catalog-header">
            <h1 class="page-title">Explore All Mini-Games</h1>
            <p class="page-sub">Select a game to start playing instantly</p>

            <!-- SEARCH BAR -->
            <div class="search-box">
                <span class="search-icon">🔍</span>
                <input id="searchInput" type="text" placeholder="Search games by name, category, or tag..." value="${currentQuery}" />
            </div>

            <!-- CATEGORY FILTER TABS -->
            <div class="category-scroll">
                ${GAME_CATEGORIES.map(cat => `
                    <button class="cat-chip ${cat.id === currentCategory ? 'active' : ''}" data-cat="${cat.id}" type="button">
                        ${cat.icon} ${cat.label}
                    </button>
                `).join('')}
            </div>
        </section>

        <!-- GAMES GRID -->
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
                    <h3>No games found</h3>
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
                        <button class="btn btn-sm btn-primary play-card-btn" data-id="${game.id}" type="button">PLAY →</button>
                    </div>
                </div>
            `;
        }).join('');

        catalogGrid.querySelectorAll('.play-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                onPlayGame(btn.dataset.id);
            });
        });

        catalogGrid.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                onPlayGame(card.dataset.id);
            });
        });
    }

    // Input Search Handler
    searchInput.addEventListener('input', (e) => {
        currentQuery = e.target.value;
        updateGrid();
    });

    // Category Tabs Handler
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
