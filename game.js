// Canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const levelElement = document.getElementById('level');
const highScoreElement = document.getElementById('highScore');
const gameOverElement = document.getElementById('gameOver');
const startScreen = document.getElementById('startScreen');

// Game state
let player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 50,
    width: 50,
    height: 30,
    speed: 5,
    dx: 0,
    lives: 3,
    shootCooldown: 0,
    powerUp: null
};
let bullets = [];
let enemyBullets = [];
let enemies = [];
let barriers = [];
let powerUps = [];
let particles = [];
let ufo = null;
let score = 0;
let level = 1;
let gameOver = false;
let gameStarted = false;
let paused = false;
let highScore = localStorage.getItem('highScore') || 0;
let extraLifeAwarded = false;
highScoreElement.textContent = `High Score: ${highScore}`;
let enemyDirection = 1;
let enemySpeed = 1;
let enemyMoveDown = false;
let ufoTimer = 0;

// Level configurations
const levels = [
    { rows: 5, cols: 11, speed: 1, shootChance: 0.005, pattern: 'standard' },
    { rows: 5, cols: 11, speed: 1.2, shootChance: 0.006, pattern: 'zigzag' },
    { rows: 5, cols: 11, speed: 1.5, shootChance: 0.007, pattern: 'fast' },
    { rows: 1, cols: 1, speed: 1.8, shootChance: 0.02, pattern: 'boss', boss: true },
    { rows: 5, cols: 11, speed: 2, shootChance: 0.008, pattern: 'zigzag' },
    { rows: 5, cols: 11, speed: 2.2, shootChance: 0.009, pattern: 'fast' },
    { rows: 5, cols: 11, speed: 2.5, shootChance: 0.01, pattern: 'standard' },
    { rows: 1, cols: 1, speed: 2.8, shootChance: 0.025, pattern: 'boss', boss: true },
    { rows: 5, cols: 11, speed: 3, shootChance: 0.011, pattern: 'zigzag' },
    { rows: 1, cols: 1, speed: 3.5, shootChance: 0.03, pattern: 'boss', boss: true, final: true }
];

// Keyboard and touch controls
let keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
    Enter: false,
    KeyP: false
};

document.addEventListener('keydown', (e) => {
    if (e.code in keys) keys[e.code] = true;
    if (e.code === 'KeyR' && gameOver) resetGame();
    if (e.code === 'Enter' && !gameStarted) startGame();
    if (e.code === 'KeyP' && gameStarted && !gameOver) togglePause();
});
document.addEventListener('keyup', (e) => {
    if (e.code in keys) keys[e.code] = false;
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touchX = e.touches[0].clientX - canvas.offsetLeft;
    if (touchX < canvas.width / 3) keys.ArrowLeft = true;
    else if (touchX > 2 * canvas.width / 3) keys.ArrowRight = true;
    else keys.Space = true;
});
canvas.addEventListener('touchend', () => {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    keys.Space = false;
});

// Initialize game objects
function initEnemies() {
    enemies = [];
    const config = levels[level - 1];
    if (config.boss) {
        enemies.push({
            x: canvas.width / 2 - 100,
            y: 50,
            width: 200,
            height: 100,
            health: 50,
            speed: config.speed,
            shootChance: config.shootChance,
            alive: true,
            type: 'boss'
        });
    } else {
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                enemies.push({
                    x: col * (40 + 10) + 50,
                    y: row * (30 + 10) + 50,
                    width: 40,
                    height: 30,
                    health: 1,
                    speed: config.speed,
                    shootChance: config.shootChance,
                    alive: true,
                    type: 'standard',
                    pattern: config.pattern
                });
            }
        }
    }
    // Speed up based on remaining enemies (classic behavior)
    enemySpeed = config.speed * (1 + (55 - enemies.filter(e => e.alive).length) / 55);
}

function initBarriers() {
    barriers = [
        { x: 150, y: canvas.height - 150, width: 100, height: 20, health: 5 },
        { x: 350, y: canvas.height - 150, width: 100, height: 20, health: 5 },
        { x: 550, y: canvas.height - 150, width: 100, height: 20, health: 5 }
    ];
}

// Draw functions (fixed to avoid white squares)
function drawPlayer() {
    ctx.fillStyle = '#00ffcc'; // Cyan for player
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y); // Triangle shape
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    if (player.powerUp === 'shield') {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x - 5, player.y - 5, player.width + 10, player.height + 10);
    }
    // Optional: Add image
    // const img = new Image(); img.src = 'player.png'; ctx.drawImage(img, player.x, player.y, player.width, player.height);
}

function drawBullets() {
    ctx.fillStyle = '#ffcc00'; // Yellow for player bullets
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    ctx.fillStyle = '#ff3333'; // Red for enemy bullets
    enemyBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.alive) {
            ctx.fillStyle = enemy.type === 'boss' ? '#ff6666' : '#33cc33'; // Red for boss, green for standard
            ctx.beginPath();
            ctx.roundRect(enemy.x, enemy.y, enemy.width, enemy.height, 5); // Rounded rectangle
            ctx.fill();
        }
    });
}

function drawUFO() {
    if (ufo && ufo.alive) {
        ctx.fillStyle = '#ff00ff'; // Purple for UFO
        ctx.beginPath();
        ctx.ellipse(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2, ufo.width / 2, ufo.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawBarriers() {
    ctx.fillStyle = '#666666'; // Gray for barriers
    barriers.forEach(barrier => {
        if (barrier.health > 0) {
            ctx.fillRect(barrier.x, barrier.y, barrier.width, barrier.height);
        }
    });
}

function drawPowerUps() {
    ctx.fillStyle = '#ff00ff'; // Purple for power-ups
    powerUps.forEach(powerUp => {
        ctx.beginPath();
        ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, powerUp.width / 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawParticles() {
    particles.forEach((particle, index) => {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.alpha;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.alpha -= 0.02;
        if (particle.alpha <= 0) particles.splice(index, 1);
    });
}

// Movement and logic
function movePlayer() {
    player.dx = 0;
    if (keys.ArrowLeft && player.x > 0) player.dx = -player.speed;
    if (keys.ArrowRight && player.x < canvas.width - player.width) player.dx = player.speed;
    player.x += player.dx;
}

function moveBullets() {
    bullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        if (bullet.y < 0) bullets.splice(index, 1);
    });
    enemyBullets.forEach((bullet, index) => {
        bullet.y += bullet.speed;
        if (bullet.y > canvas.height) enemyBullets.splice(index, 1);
    });
}

function shoot() {
    if (keys.Space && !gameOver && player.shootCooldown <= 0 && bullets.length < 1) { // Classic: one bullet at a time
        if (player.powerUp === 'triple') {
            bullets.push(
                { x: player.x + player.width / 2 - 2.5, y: player.y, width: 5, height: 10, speed: 7 },
                { x: player.x + player.width / 2 - 12.5, y: player.y, width: 5, height: 10, speed: 7, dx: -1 },
                { x: player.x + player.width / 2 + 7.5, y: player.y, width: 5, height: 10, speed: 7, dx: 1 }
            );
        } else {
            bullets.push({ x: player.x + player.width / 2 - 2.5, y: player.y, width: 5, height: 10, speed: 7 });
        }
        player.shootCooldown = player.powerUp === 'rapid' ? 5 : 30; // Classic slow firing
        // new Audio('data:audio/wav;base64,...').play(); // Add base64 WAV
    }
    if (player.shootCooldown > 0) player.shootCooldown--;
}

function enemyShoot() {
    enemies.forEach(enemy => {
        if (enemy.alive && Math.random() < enemy.shootChance) {
            enemyBullets.push({
                x: enemy.x + enemy.width / 2 - 2.5,
                y: enemy.y + enemy.height,
                width: 5,
                height: 10,
                speed: 5
            });
        }
    });
}

function moveEnemies() {
    const config = levels[level - 1];
    let edgeReached = false;
    enemies.forEach(enemy => {
        if (enemy.alive) {
            if (enemy.type === 'boss') {
                enemy.x += enemy.speed * (Math.random() > 0.5 ? 1 : -1);
                if (enemy.x < 0 || enemy.x + enemy.width > canvas.width) enemy.x = Math.max(0, Math.min(canvas.width - enemy.width, enemy.x));
            } else {
                if (enemy.pattern === 'zigzag') {
                    enemy.x += enemy.speed * Math.sin(enemy.y / 50);
                    enemy.y += 0.5;
                } else if (enemy.pattern === 'fast') {
                    enemy.x += enemy.speed * 2 * enemyDirection;
                } else {
                    enemy.x += enemySpeed * enemyDirection;
                }
                if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) edgeReached = true;
            }
            if (enemy.y + enemy.height >= player.y - 50) {
                gameOver = true;
                gameOverElement.style.display = 'block';
            }
        }
    });
    if (edgeReached || enemyMoveDown) {
        enemyDirection *= -1;
        enemies.forEach(enemy => {
            if (enemy.alive && enemy.type !== 'boss') enemy.y += 20;
        });
        enemyMoveDown = false;
    }
    // Speed up as enemies are destroyed
    const aliveEnemies = enemies.filter(e => e.alive).length;
    enemySpeed = config.speed * (1 + (55 - aliveEnemies) / 55);
}

function moveUFO() {
    if (!ufo) {
        ufoTimer++;
        if (ufoTimer > 600 && Math.random() < 0.01) { // Spawn every ~10 seconds
            ufo = {
                x: -50,
                y: 30,
                width: 60,
                height: 20,
                speed: 3,
                alive: true
            };
            ufoTimer = 0;
        }
    } else if (ufo.alive) {
        ufo.x += ufo.speed;
        if (ufo.x > canvas.width) ufo = null;
    }
}

function movePowerUps() {
    powerUps.forEach((powerUp, index) => {
        powerUp.y += powerUp.speed;
        if (powerUp.y > canvas.height) powerUps.splice(index, 1);
    });
}

function checkCollisions() {
    // Player bullets vs enemies
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (enemy.alive && bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x && bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) {
                enemy.health--;
                bullets.splice(bulletIndex, 1);
                if (enemy.health <= 0) {
                    enemy.alive = false;
                    score += enemy.type === 'boss' ? 100 : 10;
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    if (Math.random() < 0.1) spawnPowerUp(enemy.x, enemy.y);
                    // new Audio('data:audio/wav;base64,...').play();
                }
                scoreElement.textContent = `Score: ${score}`;
            }
        });
        if (ufo && ufo.alive && bullet.x < ufo.x + ufo.width && bullet.x + bullet.width > ufo.x && bullet.y < ufo.y + ufo.height && bullet.y + bullet.height > ufo.y) {
            ufo.alive = false;
            score += Math.floor(Math.random() * 150) + 50; // 50-200 points
            createExplosion(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2);
            bullets.splice(bulletIndex, 1);
            scoreElement.textContent = `Score: ${score}`;
        }
        barriers.forEach(barrier => {
            if (barrier.health > 0 && bullet.x < barrier.x + barrier.width && bullet.x + bullet.width > barrier.x && bullet.y < barrier.y + barrier.height && bullet.y + bullet.height > barrier.y) {
                bullets.splice(bulletIndex, 1);
                barrier.health--;
            }
        });
    });

    // Enemy bullets vs player and barriers
    enemyBullets.forEach((bullet, bulletIndex) => {
        if (bullet.x < player.x + player.width && bullet.x + bullet.width > player.x && bullet.y < player.y + player.height && bullet.y + bullet.height > player.y) {
            if (player.powerUp !== 'shield') {
                player.lives--;
                livesElement.textContent = `Lives: ${player.lives}`;
                if (player.lives <= 0) {
                    gameOver = true;
                    gameOverElement.style.display = 'block';
                }
            }
            enemyBullets.splice(bulletIndex, 1);
            createExplosion(player.x + player.width / 2, player.y + player.height / 2);
        }
        barriers.forEach(barrier => {
            if (barrier.health > 0 && bullet.x < barrier.x + barrier.width && bullet.x + bullet.width > barrier.x && bullet.y < barrier.y + barrier.height && bullet.y + bullet.height > barrier.y) {
                enemyBullets.splice(bulletIndex, 1);
                barrier.health--;
            }
        });
    });

    // Power-ups vs player
    powerUps.forEach((powerUp, index) => {
        if (powerUp.x < player.x + player.width && powerUp.x + powerUp.width > player.x && powerUp.y < player.y + player.height && powerUp.y + powerUp.height > player.y) {
            player.powerUp = powerUp.type;
            setTimeout(() => player.powerUp = null, 10000);
            powerUps.splice(index, 1);
            // new Audio('data:audio/wav;base64,...').play();
        }
    });
}

function spawnPowerUp(x, y) {
    const types = ['rapid', 'triple', 'shield'];
    powerUps.push({
        x: x,
        y: y,
        width: 20,
        height: 20,
        speed: 2,
        type: types[Math.floor(Math.random() * types.length)]
    });
}

function createExplosion(x, y) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            radius: Math.random() * 5 + 2,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            dx: (Math.random() - 0.5) * 5,
            dy: (Math.random() - 0.5) * 5,
            alpha: 1
        });
    }
}

function checkLevel() {
    if (enemies.every(enemy => !enemy.alive) && (!ufo || !ufo.alive)) {
        level++;
        if (level > levels.length) {
            gameOver = true;
            gameOverElement.textContent = 'You Win! Press R to Restart';
            gameOverElement.style.display = 'block';
        } else {
            initEnemies();
            initBarriers();
            ufo = null;
            ufoTimer = 0;
        }
        levelElement.textContent = `Level: ${level}`;
    }
}

function checkExtraLife() {
    if (score >= 1500 && !extraLifeAwarded) {
        player.lives++;
        livesElement.textContent = `Lives: ${player.lives}`;
        extraLifeAwarded = true;
    }
}

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreElement.textContent = `High Score: ${highScore}`;
    }
}

function startGame() {
    gameStarted = true;
    startScreen.style.display = 'none';
    initEnemies();
    initBarriers();
}

function togglePause() {
    paused = !paused;
}

function resetGame() {
    player = { x: canvas.width / 2 - 25, y: canvas.height - 50, width: 50, height: 30, speed: 5, dx: 0, lives: 3, shootCooldown: 0, powerUp: null };
    bullets = [];
    enemyBullets = [];
    powerUps = [];
    particles = [];
    ufo = null;
    ufoTimer = 0;
    score = 0;
    level = 1;
    gameOver = false;
    paused = false;
    gameStarted = true;
    extraLifeAwarded = false;
    enemyDirection = 1;
    enemySpeed = 1;
    enemyMoveDown = false;
    startScreen.style.display = 'none';
    scoreElement.textContent = `Score: ${score}`;
    livesElement.textContent = `Lives: ${player.lives}`;
    levelElement.textContent = `Level: ${level}`;
    updateHighScore();
    initEnemies();
    initBarriers();
}

// Game loop
function gameLoop() {
    if (!gameStarted || gameOver || paused) {
        requestAnimationFrame(gameLoop);
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    movePlayer();
    shoot();
    enemyShoot();
    moveBullets();
    moveEnemies();
    moveUFO();
    movePowerUps();
    checkCollisions();
    checkLevel();
    checkExtraLife();
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawUFO();
    drawBarriers();
    drawPowerUps();
    drawParticles();
    requestAnimationFrame(gameLoop);
}

// Polyfill for roundRect (for older browsers)
if (!ctx.roundRect) {
    ctx.roundRect = function(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    };
}

// Start loop
gameLoop();
