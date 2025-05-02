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
let score = 0;
let level = 1;
let gameOver = false;
let gameStarted = false;
let paused = false;
let highScore = localStorage.getItem('highScore') || 0;
highScoreElement.textContent = `High Score: ${highScore}`;

// Level configurations
const levels = [
    { rows: 5, cols: 10, speed: 1, shootChance: 0.005, pattern: 'standard' },
    { rows: 6, cols: 10, speed: 1.2, shootChance: 0.006, pattern: 'zigzag' },
    { rows: 4, cols: 12, speed: 1.5, shootChance: 0.007, pattern: 'fast' },
    { rows: 5, cols: 10, speed: 1.8, shootChance: 0.008, pattern: 'standard', boss: true },
    { rows: 6, cols: 8, speed: 2, shootChance: 0.009, pattern: 'zigzag' },
    { rows: 5, cols: 10, speed: 2.2, shootChance: 0.01, pattern: 'fast' },
    { rows: 4, cols: 12, speed: 2.5, shootChance: 0.011, pattern: 'standard' },
    { rows: 5, cols: 10, speed: 2.8, shootChance: 0.012, pattern: 'zigzag', boss: true },
    { rows: 6, cols: 10, speed: 3, shootChance: 0.013, pattern: 'fast' },
    { rows: 5, cols: 12, speed: 3.5, shootChance: 0.015, pattern: 'standard', boss: true, final: true }
];

// Sound effects (base64-encoded WAV placeholders)
const sounds = {
    shoot: new Audio('data:audio/wav;base64,...'), // Replace with actual base64 WAV
    explosion: new Audio('data:audio/wav;base64,...'),
    powerUp: new Audio('data:audio/wav;base64,...')
};

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

// Touch controls
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
            shootChance: config.shootChance * 2,
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
}

function initBarriers() {
    barriers = [
        { x: 150, y: canvas.height - 150, width: 100, height: 20, health: 5 },
        { x: 350, y: canvas.height - 150, width: 100, height: 20, health: 5 },
        { x: 550, y: canvas.height - 150, width: 100, height: 20, health: 5 }
    ];
}

// Draw functions
function drawPlayer() {
    ctx.fillStyle = player.powerUp === 'shield' ? '#00ffff' : '#00ffcc';
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function drawBullets() {
    ctx.fillStyle = '#ffcc00';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    ctx.fillStyle = '#ff3333';
    enemyBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.alive) {
            ctx.fillStyle = enemy.type === 'boss' ? '#ff6666' : '#33cc33';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
    });
}

function drawBarriers() {
    ctx.fillStyle = '#666666';
    barriers.forEach(barrier => {
        if (barrier.health > 0) {
            ctx.fillRect(barrier.x, barrier.y, barrier.width, barrier.height);
        }
    });
}

function drawPowerUps() {
    ctx.fillStyle = '#ff00ff';
    powerUps.forEach(powerUp => {
        ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
    });
}

function drawParticles() {
    particles.forEach((particle, index) => {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
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
    if (keys.Space && !gameOver && player.shootCooldown <= 0) {
        if (player.powerUp === 'triple') {
            bullets.push(
                { x: player.x + player.width / 2 - 2.5, y: player.y, width: 5, height: 10, speed: 7 },
                { x: player.x + player.width / 2 - 12.5, y: player.y, width: 5, height: 10, speed: 7, dx: -1 },
                { x: player.x + player.width / 2 + 7.5, y: player.y, width: 5, height: 10, speed: 7, dx: 1 }
            );
        } else {
            bullets.push({ x: player.x + player.width / 2 - 2.5, y: player.y, width: 5, height: 10, speed: 7 });
        }
        player.shootCooldown = player.powerUp === 'rapid' ? 5 : 15;
        // sounds.shoot.play();
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
                    enemy.x += enemy.speed * enemyDirection;
                }
                if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) edgeReached = true;
            }
            if (enemy.y + enemy.height >= player.y) {
                gameOver = true;
                gameOverElement.style.display = 'block';
            }
        }
    });
    if (edgeReached) {
        enemyDirection *= -1;
        enemies.forEach(enemy => {
            if (enemy.alive && enemy.type !== 'boss') enemy.y += 20;
        });
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
                    // sounds.explosion.play();
                }
                scoreElement.textContent = `Score: ${score}`;
            }
        });
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
            setTimeout(() => player.powerUp = null, 10000); // Power-up lasts 10 seconds
            powerUps.splice(index, 1);
            // sounds.powerUp.play();
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
    if (enemies.every(enemy => !enemy.alive)) {
        level++;
        if (level > levels.length) {
            gameOver = true;
            gameOverElement.textContent = 'You Win! Press R to Restart';
            gameOverElement.style.display = 'block';
        } else {
            initEnemies();
            initBarriers();
        }
        levelElement.textContent = `Level: ${level}`;
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
    score = 0;
    level = 1;
    gameOver = false;
    paused = false;
    gameStarted = true;
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
    movePowerUps();
    checkCollisions();
    checkLevel();
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawBarriers();
    drawPowerUps();
    drawParticles();
    requestAnimationFrame(gameLoop);
}

// Start loop
gameLoop();
