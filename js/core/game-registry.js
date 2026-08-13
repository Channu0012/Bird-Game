// Catalog Registry for All 10 BirdMate Mini-Games

export const GAME_CATEGORIES = [
    { id: 'all', label: 'All Games', icon: '🎮' },
    { id: 'arcade', label: 'Arcade', icon: '🕹️' },
    { id: 'reflex', label: 'Reflex', icon: '⚡' },
    { id: 'timing', label: 'Timing', icon: '🎯' },
    { id: 'brain', label: 'Brain', icon: '🧠' },
    { id: 'action', label: 'Action', icon: '🛡️' },
    { id: 'memory', label: 'Memory', icon: '🧩' },
    { id: 'casual', label: 'Casual', icon: '☕' },
];

export const GAMES_CATALOG = [
    {
        id: 'crazy-bird',
        name: 'Crazy Bird',
        tagline: 'Fly through obstacles & chase high scores!',
        description: 'The legendary flappy flying flight challenge. Pass through narrow pipe gaps without crashing!',
        category: 'arcade',
        difficulty: 'Medium',
        icon: '🐤',
        color: 'from-amber-400 to-orange-500',
        tags: ['bird', 'flappy', 'arcade', 'flying', 'sky', 'crazy'],
        controls: 'Tap / Click / Space to Flap',
        modulePath: '../games/crazy-bird.js',
        trending: true,
        dailyEligible: true,
    },
    {
        id: 'tap-rush',
        name: 'Tap Rush',
        tagline: '10 seconds of rapid-fire tapping!',
        description: 'Tap appearing targets as fast as possible before the 10-second timer runs out. Build combo multipliers!',
        category: 'reflex',
        difficulty: 'Easy',
        icon: '⚡',
        color: 'from-cyan-400 to-blue-600',
        tags: ['tap', 'speed', 'reflex', 'fast', 'timer', 'rush'],
        controls: 'Tap / Click targets fast',
        modulePath: '../games/tap-rush.js',
        trending: true,
        dailyEligible: true,
    },
    {
        id: 'brain-trap',
        name: 'Brain Trap',
        tagline: 'Trick questions & split-second choices!',
        description: 'Fast-fire brain teasers testing attention and reaction speed under extreme 2-second time pressure!',
        category: 'brain',
        difficulty: 'Hard',
        icon: '🧠',
        color: 'from-purple-500 to-indigo-600',
        tags: ['brain', 'mind', 'quiz', 'trick', 'fast', 'logic'],
        controls: 'Tap the correct answer fast',
        modulePath: '../games/brain-trap.js',
        trending: true,
        dailyEligible: true,
    },
    {
        id: 'dodge-it',
        name: 'Dodge It',
        tagline: 'Dodge falling hazards & collect stars!',
        description: 'Control your hero and survive a storm of falling spikes and meteors. Collect glowing power stars!',
        category: 'action',
        difficulty: 'Medium',
        icon: '🛡️',
        color: 'from-rose-500 to-red-600',
        tags: ['dodge', 'hazard', 'survival', 'action', 'ship', 'stars'],
        controls: 'Drag / Touch / Arrow Keys to move',
        modulePath: '../games/dodge-it.js',
        trending: true,
        dailyEligible: true,
    },
    {
        id: 'perfect-hit',
        name: 'Perfect Hit',
        tagline: 'Precision timing bar sweet-spot hits!',
        description: 'Stop the oscillating marker in the central PERFECT zone. Build streak multipliers for massive points!',
        category: 'timing',
        difficulty: 'Medium',
        icon: '🎯',
        color: 'from-emerald-400 to-teal-600',
        tags: ['timing', 'hit', 'precision', 'bar', 'perfect', 'streak'],
        controls: 'Tap / Click / Space at the right moment',
        modulePath: '../games/perfect-hit.js',
        trending: true,
        dailyEligible: true,
    },
    {
        id: 'stack-master',
        name: 'Stack Master',
        tagline: 'Build the tallest block tower!',
        description: 'Drop sliding blocks onto the stack. Overhanging edges get chopped off! Stack as high as you can!',
        category: 'arcade',
        difficulty: 'Medium',
        icon: '🏗️',
        color: 'from-sky-400 to-indigo-500',
        tags: ['stack', 'tower', 'blocks', 'drop', 'arcade', 'build'],
        controls: 'Tap / Click to drop block',
        modulePath: '../games/stack-master.js',
        trending: false,
        dailyEligible: true,
    },
    {
        id: 'bomb-run',
        name: 'Bomb Run',
        tagline: 'Safe tile grid survival!',
        description: 'A 4x4 grid flashes safe vs bomb tiles. Tap safe tiles quickly to advance rounds without hitting a bomb!',
        category: 'reflex',
        difficulty: 'Hard',
        icon: '💣',
        color: 'from-red-500 to-orange-600',
        tags: ['bomb', 'grid', 'safe', 'tiles', 'reflex', 'survival'],
        controls: 'Tap safe tiles',
        modulePath: '../games/bomb-run.js',
        trending: false,
        dailyEligible: true,
    },
    {
        id: 'color-chaos',
        name: 'Color Chaos',
        tagline: 'Stroop effect color reaction test!',
        description: 'Does the word match the text color? Pick the correct swatch under 2-second round pressure!',
        category: 'brain',
        difficulty: 'Medium',
        icon: '🎨',
        color: 'from-pink-500 to-purple-600',
        tags: ['color', 'stroop', 'brain', 'reaction', 'match', 'speed'],
        controls: 'Tap the correct color swatch',
        modulePath: '../games/color-chaos.js',
        trending: false,
        dailyEligible: true,
    },
    {
        id: 'run-till-dead',
        name: 'Run Till Dead',
        tagline: 'Endless runner jump & duck action!',
        description: 'Auto-running obstacle course! Jump over low hurdles, duck under flying hazards, and dodge pits!',
        category: 'action',
        difficulty: 'Hard',
        icon: '🏃',
        color: 'from-green-500 to-emerald-700',
        tags: ['run', 'runner', 'endless', 'jump', 'duck', 'action'],
        controls: 'Tap Top / Up to Jump, Tap Bottom / Down to Duck',
        modulePath: '../games/run-till-dead.js',
        trending: false,
        dailyEligible: true,
    },
    {
        id: 'memory-blitz',
        name: 'Memory Blitz',
        tagline: 'Grid pattern sequence recall!',
        description: 'Watch the grid tiles light up in sequence, then reproduce the pattern from memory. Grid expands!',
        category: 'memory',
        difficulty: 'Medium',
        icon: '🧩',
        color: 'from-blue-500 to-cyan-600',
        tags: ['memory', 'blitz', 'pattern', 'grid', 'sequence', 'recall'],
        controls: 'Tap grid tiles in order',
        modulePath: '../games/memory-blitz.js',
        trending: false,
        dailyEligible: true,
    },
];

export function getGameById(id) {
    return GAMES_CATALOG.find(game => game.id === id) || GAMES_CATALOG[0];
}

export function searchGames(query = '', category = 'all') {
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
