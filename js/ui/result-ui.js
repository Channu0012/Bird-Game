// Result Modal Component for BirdMate Platform

function getMedal(score) {
    if (score >= 50) return { icon: '💎', title: 'Platinum Medal' };
    if (score >= 35) return { icon: '🥇', title: 'Gold Medal' };
    if (score >= 20) return { icon: '🥈', title: 'Silver Medal' };
    if (score >= 10) return { icon: '🥉', title: 'Bronze Medal' };
    return null;
}

export function showResultModal({ gameMeta, score, bestScore, isNewBest, onReplay, onRandomGame, onGoHome, showToast }) {
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
                    <p>Awesome performance!</p>
                </div>
            </div>
            ` : ''}

            <div class="score-summary">
                <div class="score-card">
                    <label>SCORE</label>
                    <value>${score}</value>
                </div>
                <div class="score-card">
                    <label>BEST</label>
                    <value>${bestScore}</value>
                </div>
            </div>

            <div class="result-actions">
                <button id="resPlayAgainBtn" class="btn btn-primary btn-block" type="button">
                    🔄 PLAY AGAIN
                </button>
                <div class="btn-group-half">
                    <button id="resRandomBtn" class="btn btn-secondary" type="button">
                        🎲 RANDOM GAME
                    </button>
                    <button id="resShareBtn" class="btn btn-gold" type="button">
                        🔗 SHARE SCORE
                    </button>
                </div>
                <button id="resHomeBtn" class="btn btn-outline btn-block" type="button">
                    🏠 BACK TO HOME
                </button>
            </div>
        </div>
    `;

    overlay.classList.add('visible');

    overlay.querySelector('#resPlayAgainBtn')?.addEventListener('click', () => {
        overlay.classList.remove('visible');
        onReplay();
    });

    overlay.querySelector('#resRandomBtn')?.addEventListener('click', () => {
        overlay.classList.remove('visible');
        onRandomGame();
    });

    overlay.querySelector('#resHomeBtn')?.addEventListener('click', () => {
        overlay.classList.remove('visible');
        onGoHome();
    });

    overlay.querySelector('#resShareBtn')?.addEventListener('click', () => {
        const text = `🐤 I scored ${score} in ${gameMeta.name} on BirdMate! Can you beat me?\nPlay here: https://birdmate.netlify.app/`;

        if (navigator.share) {
            navigator.share({ title: 'BirdMate Score', text, url: 'https://birdmate.netlify.app/' }).catch(() => { });
        } else {
            navigator.clipboard.writeText(text).then(() => {
                showToast('Score copied to clipboard!');
            }).catch(() => {
                showToast(`Score: ${score}!`);
            });
        }
    });
}
