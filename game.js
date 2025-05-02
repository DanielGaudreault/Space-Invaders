// Canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Debugging: Confirm canvas context
console.log('Canvas context initialized:', ctx);

// Game state
let player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 50,
    width: 50,
    height: 30,
    speed: 5,
    dx: 0,
    lives: 3,
    shootCooldown: 0
};
let bullets = [];
let enemyBullets = [];
let enemies = [];
let score = 0;
let gameOver = false;
let gameStarted = false;

// Enemy settings
const enemyRows = 5;
const enemyCols = 11;
const enemyWidth = 40;
const enemyHeight = 30;
const enemyPadding = 10;
let enemySpeed = 1;
let enemyDirection = 1;
let enemyShootChance = 0.005;

// Keyboard controls
let keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
    Enter: false
};

document.addEventListener('keydown', (e) => {
    if (e.code in keys) {
        keys[e.code] = true;
        console.log(`Key pressed: ${e.code}`); // Debugging
    }
    if (e.code === 'KeyR' && gameOver) resetGame();
    if (e.code === 'Enter' && !gameStarted) startGame();
});
document.addEventListener('keyup', (e) => {
    if (e.code in keys) {
        keys[e.code] = false;
        console.log(`Key released: ${e.code}`); // Debugging
    }
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
    console.log('Enemies initialized:', enemies.length); // Debugging
}

// Draw functions
function drawPlayer() {
    ctx.fillStyle = '#00ffcc'; // Bright cyan
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y); // Triangle shape
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();
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
    ctx.fillStyle = '#33cc33'; // Bright green
    enemies.forEach(enemy => {
        if (enemy.alive) {
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
    });
}

function drawUI() {
    ctx.fillStyle = '#ffffff'; // White text
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Lives: ${player.lives}`, canvas.width - 100, 30);
    if (!gameStarted) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Press ENTER to Start', canvas.width / 2, canvas.height / 2);
        ctx.textAlign = 'left';
    }
    if (gameOver) {
        ctx.fillStyle = '#ff3333';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over! Press R to Restart', canvas.width / 2, canvas.height / 2);
        ctx.textAlign = 'left';
    }
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
    if (keys.Space && !gameOver && player.shootCooldown <= 0 && bullets.length < 1) {
        bullets.push({
            x: player.x + player.width / 2 - 2.5,
            y: player.y,
            width: 5,
            height: 10,
            speed: 7
        });
        player.shootCooldown = 30; // Classic slow firing
        console.log('Player shot bullet'); // Debugging
    }
    if (player.shootCooldown > 0) player.shootCooldown--;
}

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

function moveEnemies() {
    let edgeReached = false;
    enemies.forEach(enemy => {
        if (enemy.alive) {
            enemy.x += enemySpeed * enemyDirection;
            if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) edgeReached = true;
        }
    });
    if (edgeReached) {
        enemyDirection *= -1;
        enemies.forEach(enemy => {
            if (enemy.alive) enemy.y += 20;
        });
    }
    // Speed up as enemies are destroyed
    const aliveEnemies = enemies.filter(e => e.alive).length;
    enemySpeed = 1 * (1 + (55 - aliveEnemies) / 55);
    // Game over if enemies reach bottom
    enemies.forEach(enemy => {
        if (enemy.alive && enemy.y + enemy.height >= player.y) {
            gameOver = true;
        }
    });
}

function checkCollisions() {
    // Player bullets vs enemies
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (enemy.alive &&
                bullet.x < enemy.x咖啡 + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                enemy.alive = false;
                bullets.splice(bulletIndex, 1);
                score += 10;
                console.log('Enemy hit, score:', score); // Debugging
            }
        });
    });
    // Enemy bullets vs player
    enemyBullets.forEach((bullet, bulletIndex) => {
        if (bullet.x < player.x + player.width &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y) {
            player.lives--;
            enemyBullets.splice(bulletIndex, 1);
            if (player.lives <= 0) gameOver = true;
            console.log('Player hit, lives:', player.lives); // Debugging
        }
    });
}

// Start and reset
function startGame() {
    gameStarted = true;
    initEnemies();
    console.log('Game started'); // Debugging
}

function resetGame() {
    player = { x: canvas.width / 2 - 25, y: canvas.height - 50, width: 50, height: 30, speed: 5, dx: 0, lives: 3, shootCooldown: 0 };
    bullets = [];
    enemyBullets = [];
    enemies = [];
    score = 0;
    gameOver = false;
    gameStarted = true;
    enemySpeed = 1;
    enemyDirection = 1;
    initEnemies();
    console.log('Game reset'); // Debugging
}

// Game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
    if (!gameStarted || gameOver) {
        drawUI();
        requestAnimationFrame(gameLoop);
        return;
    }
    movePlayer();
    shoot();
    enemyShoot();
    moveBullets();
    moveEnemies();
    checkCollisions();
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawUI();
    console.log('Frame rendered'); // Debugging
    requestAnimationFrame(gameLoop);
}

// Start loop
console.log('Game loop started');
gameLoop();
