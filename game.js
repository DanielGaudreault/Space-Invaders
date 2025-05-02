// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');

// Game objects
let player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 50,
    width: 50,
    height: 30,
    speed: 5,
    dx: 0
};

let bullets = []; // Player bullets
let enemyBullets = []; // Enemy bullets
let enemies = [];
let score = 0;
let level = 1;
let gameOver = false;

// Enemy settings
const enemyRows = 5;
const enemyCols = 10;
const enemyWidth = 40;
const enemyHeight = 30;
const enemyPadding = 10;
let enemySpeed = 1;
let enemyDirection = 1;
let enemyShootChance = 0.005; // Initial chance per frame for enemy to shoot

// Keyboard controls
let keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

document.addEventListener('keydown', (e) => {
    if (e.code in keys) keys[e.code] = true;
    if (e.code === 'KeyR' && gameOver) resetGame();
});
document.addEventListener('keyup', (e) => {
    if (e.code in keys) keys[e.code] = false;
});

// Initialize enemies
function initEnemies() {
    enemies = [];
    for (let row = 0; row < enemyRows; row++) {
        for (let col = 0; col < enemyCols; col++) {
            enemies.push({
                x: col * (enemyWidth + enemyPadding) + 50,
                y: row * (enemyHeight + enemyPadding) + 50,
                width: enemyWidth,
                height: enemyHeight,
                alive: true
            });
        }
    }
}

// Draw player
function drawPlayer() {
    ctx.fillStyle = 'linear-gradient(#00ffcc, #00cc99)';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    // Optional: Add image
    // const playerImg = new Image();
    // playerImg.src = 'player.png';
    // ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
}

// Draw bullets
ながらfunction drawBullets() {
    // Player bullets
    ctx.fillStyle = '#ffcc00';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    // Enemy bullets
    ctx.fillStyle = '#ff3333';
    enemyBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

// Draw enemies
function drawEnemies() {
    ctx.fillStyle = 'linear-gradient(#33cc33, #339933)';
    enemies.forEach(enemy => {
        if (enemy.alive) {
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            // Optional: Add image
            // const enemyImg = new Image();
            // enemyImg.src = 'enemy.png';
            // ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height);
        }
    });
}

// Move player
function movePlayer() {
    player.dx = 0;
    if (keys.ArrowLeft && player.x > 0) player.dx = -player.speed;
    if (keys.ArrowRight && player.x < canvas.width - player.width) player.dx = player.speed;
    player.x += player.dx;
}

// Move bullets
function moveBullets() {
    // Player bullets
    bullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        if (bullet.y < 0) bullets.splice(index, 1);
    });
    // Enemy bullets
    enemyBullets.forEach((bullet, index) => {
        bullet.y += bullet.speed;
        if (bullet.y > canvas.height) enemyBullets.splice(index, 1);
    });
}

// Shoot bullet (player)
function shoot() {
    if (keys.Space && !gameOver) {
        bullets.push({
            x: player.x + player.width / 2 - 2.5,
            y: player.y,
            width: 5,
            height: 10,
            speed: 7
        });
        keys.Space = false; // Prevent rapid fire
    }
}

// Enemy shooting
function enemyShoot() {
    enemies.forEach(enemy => {
        if (enemy.alive && Math.random() < enemyShootChance) {
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

// Move enemies
function moveEnemies() {
    let edgeReached = false;
    enemies.forEach(enemy => {
        if (enemy.alive) {
            enemy.x += enemySpeed * enemyDirection;
            if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
                edgeReached = true;
            }
        }
    });

    if (edgeReached) {
        enemyDirection *= -1;
        enemies.forEach(enemy => {
            if (enemy.alive) enemy.y += 20; // Move down
        });
    }

    // Check for game over (enemies reach player level)
    enemies.forEach(enemy => {
        if (enemy.alive && enemy.y + enemy.height >= player.y) {
            gameOver = true;
            gameOverElement.style.display = 'block';
        }
    });
}

// Check collisions
function checkCollisions() {
    // Player bullets hitting enemies
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (enemy.alive &&
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                enemy.alive = false;
                bullets.splice(bulletIndex, 1);
                score += 10;
                scoreElement.textContent = `Score: ${score}`;
            }
        });
    });

    // Enemy bullets hitting player
    enemyBullets.forEach((bullet, bulletIndex) => {
        if (bullet.x < player.x + player.width &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y) {
            gameOver = true;
            gameOverElement.style.display = 'block';
            enemyBullets.splice(bulletIndex, 1);
        }
    });
}

// Check for level completion
function checkLevel() {
    if (enemies.every(enemy => !enemy.alive)) {
        level++;
        enemySpeed += 0.5; // Increase speed
        enemyShootChance += 0.002; // Increase shooting frequency
        initEnemies(); // Spawn new wave
    }
}

// Reset game
function resetGame() {
    player.x = canvas.width / 2 - 25;
    bullets = [];
    enemyBullets = [];
    score = 0;
    level = 1;
    gameOver = false;
    enemySpeed = 1;
    enemyShootChance = 0.005;
    enemyDirection = 1;
    gameOverElement.style.display = 'none';
    scoreElement.textContent = `Score: ${score}`;
    initEnemies();
}

// Game loop
function gameLoop() {
    if (!gameOver) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        movePlayer();
        shoot();
        enemyShoot();
        moveBullets();
        moveEnemies();
        checkCollisions();
        checkLevel();
        drawPlayer();
        drawBullets();
        drawEnemies();
    }
    requestAnimationFrame(gameLoop);
}

// Start game
initEnemies();
gameLoop();
