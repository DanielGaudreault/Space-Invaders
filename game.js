document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const startButton = document.getElementById('startButton');
    const gameOverDisplay = document.getElementById('gameOver');

    // Game state
    let gameRunning = false;
    let score = 0;
    let lives = 3;
    
    // Player
    const player = {
        x: canvas.width / 2 - 25,
        y: canvas.height - 60,
        width: 50,
        height: 20,
        speed: 8,
        color: '#0f0',
        isMovingLeft: false,
        isMovingRight: false
    };

    // Bullets
    const bullets = [];
    const bulletSpeed = 7;
    const bulletWidth = 3;
    const bulletHeight = 10;

    // Invaders
    const invaders = [];
    const invaderRows = 5;
    const invaderCols = 10;
    const invaderWidth = 30;
    const invaderHeight = 20;
    const invaderPadding = 10;
    const invaderOffsetTop = 60;
    const invaderOffsetLeft = 30;
    let invaderDirection = 1;
    let invaderSpeed = 1;
    let invaderDropDistance = 20;

    // Invader bullets
    const invaderBullets = [];
    const invaderBulletSpeed = 5;
    let invaderShootInterval = 1000; // ms
    let lastInvaderShootTime = 0;

    // Bunkers
    const bunkers = [];
    const bunkerWidth = 80;
    const bunkerHeight = 40;
    const bunkerPadding = 20;

    // Initialize game objects
    function initGame() {
        // Clear arrays
        bullets.length = 0;
        invaders.length = 0;
        invaderBullets.length = 0;
        bunkers.length = 0;

        // Reset game state
        score = 0;
        lives = 3;
        invaderSpeed = 1;
        invaderDirection = 1;
        updateScore();

        // Create invaders
        for (let r = 0; r < invaderRows; r++) {
            for (let c = 0; c < invaderCols; c++) {
                invaders.push({
                    x: c * (invaderWidth + invaderPadding) + invaderOffsetLeft,
                    y: r * (invaderHeight + invaderPadding) + invaderOffsetTop,
                    width: invaderWidth,
                    height: invaderHeight,
                    color: r === 0 ? '#f00' : r < 3 ? '#ff0' : '#0f0',
                    points: r === 0 ? 30 : r < 3 ? 20 : 10
                });
            }
        }

        // Create bunkers
        for (let i = 0; i < 4; i++) {
            bunkers.push({
                x: i * (bunkerWidth + bunkerPadding) + (canvas.width - (4 * bunkerWidth + 3 * bunkerPadding)) / 2,
                y: canvas.height - 120,
                width: bunkerWidth,
                height: bunkerHeight,
                color: '#0a0'
            });
        }

        // Reset player position
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - 60;
    }

    // Update score display
    function updateScore() {
        scoreDisplay.textContent = `SCORE: ${score}`;
    }

    // Draw player
    function drawPlayer() {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
        
        // Draw player "cockpit"
        ctx.fillStyle = '#000';
        ctx.fillRect(player.x + 20, player.y - 10, 10, 10);
    }

    // Draw bullets
    function drawBullets() {
        ctx.fillStyle = '#0f0';
        bullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
    }

    // Draw invaders
    function drawInvaders() {
        invaders.forEach(invader => {
            ctx.fillStyle = invader.color;
            ctx.fillRect(invader.x, invader.y, invader.width, invader.height);
            
            // Draw invader eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(invader.x + 5, invader.y + 5, 5, 5);
            ctx.fillRect(invader.x + 20, invader.y + 5, 5, 5);
        });
    }

    // Draw invader bullets
    function drawInvaderBullets() {
        ctx.fillStyle = '#f00';
        invaderBullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
    }

    // Draw bunkers
    function drawBunkers() {
        ctx.fillStyle = '#0a0';
        bunkers.forEach(bunker => {
            ctx.fillRect(bunker.x, bunker.y, bunker.width, bunker.height);
        });
    }

    // Draw lives
    function drawLives() {
        ctx.fillStyle = '#0f0';
        for (let i = 0; i < lives; i++) {
            ctx.fillRect(10 + i * 30, canvas.height - 20, 20, 10);
        }
    }

    // Update player position
    function updatePlayer() {
        if (player.isMovingLeft && player.x > 0) {
            player.x -= player.speed;
        }
        if (player.isMovingRight && player.x < canvas.width - player.width) {
            player.x += player.speed;
        }
    }

    // Update bullets
    function updateBullets() {
        // Move bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].y -= bulletSpeed;
            
            // Remove bullets that go off screen
            if (bullets[i].y < 0) {
                bullets.splice(i, 1);
                continue;
            }
            
            // Check for collision with invaders
            for (let j = invaders.length - 1; j >= 0; j--) {
                if (checkCollision(bullets[i], invaders[j])) {
                    // Add to score
                    score += invaders[j].points;
                    updateScore();
                    
                    // Remove bullet and invader
                    bullets.splice(i, 1);
                    invaders.splice(j, 1);
                    
                    // Increase speed as invaders are eliminated
                    if (invaders.length > 0) {
                        invaderSpeed = 1 + (1 - invaders.length / (invaderRows * invaderCols)) * 3;
                    }
                    
                    break;
                }
            }
            
            // Check for collision with bunkers
            for (let j = bunkers.length - 1; j >= 0; j--) {
                if (checkCollision(bullets[i], bunkers[j])) {
                    bullets.splice(i, 1);
                    damageBunker(j);
                    break;
                }
            }
        }
    }

    // Update invaders
    function updateInvaders() {
        let moveDown = false;
        let edgeReached = false;
        
        // Check if any invader has reached the edge
        for (const invader of invaders) {
            if ((invader.x + invader.width + invaderSpeed * invaderDirection > canvas.width) {
                edgeReached = true;
                break;
            }
            if ((invader.x + invaderSpeed * invaderDirection < 0)) {
                edgeReached = true;
                break;
            }
        }
        
        // If edge reached, change direction and move down
        if (edgeReached) {
            invaderDirection *= -1;
            moveDown = true;
        }
        
        // Move invaders
        for (const invader of invaders) {
            invader.x += invaderSpeed * invaderDirection;
            if (moveDown) {
                invader.y += invaderDropDistance;
            }
            
            // Check if invaders reached the bottom
            if (invader.y + invader.height > player.y) {
                gameOver();
                return;
            }
        }
    }

    // Update invader bullets
    function updateInvaderBullets(currentTime) {
        // Invaders shoot randomly
        if (currentTime - lastInvaderShootTime > invaderShootInterval && invaders.length > 0) {
            const randomInvader = invaders[Math.floor(Math.random() * invaders.length)];
            invaderBullets.push({
                x: randomInvader.x + randomInvader.width / 2 - bulletWidth / 2,
                y: randomInvader.y + randomInvader.height,
                width: bulletWidth,
                height: bulletHeight
            });
            lastInvaderShootTime = currentTime;
        }
        
        // Move invader bullets
        for (let i = invaderBullets.length - 1; i >= 0; i--) {
            invaderBullets[i].y += invaderBulletSpeed;
            
            // Remove bullets that go off screen
            if (invaderBullets[i].y > canvas.height) {
                invaderBullets.splice(i, 1);
                continue;
            }
            
            // Check for collision with player
            if (checkCollision(invaderBullets[i], player)) {
                invaderBullets.splice(i, 1);
                lives--;
                if (lives <= 0) {
                    gameOver();
                }
                continue;
            }
            
            // Check for collision with bunkers
            for (let j = bunkers.length - 1; j >= 0; j--) {
                if (checkCollision(invaderBullets[i], bunkers[j])) {
                    invaderBullets.splice(i, 1);
                    damageBunker(j);
                    break;
                }
            }
        }
    }

    // Damage bunker
    function damageBunker(index) {
        bunkers[index].width -= 10;
        bunkers[index].x += 5;
        if (bunkers[index].width <= 0) {
            bunkers.splice(index, 1);
        }
    }

    // Check collision between two objects
    function checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    // Game over
    function gameOver() {
        gameRunning = false;
        gameOverDisplay.style.display = 'block';
    }

    // Game loop
    function gameLoop(timestamp) {
        if (!gameRunning) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update game state
        updatePlayer();
        updateBullets();
        updateInvaders();
        updateInvaderBullets(timestamp);
        
        // Draw game objects
        drawBunkers();
        drawInvaders();
        drawBullets();
        drawInvaderBullets();
        drawPlayer();
        drawLives();
        
        // Check win condition
        if (invaders.length === 0) {
            // Level complete (in a real game you'd load the next level)
            gameOverDisplay.textContent = "YOU WIN!";
            gameOver();
            return;
        }
        
        // Continue game loop
        requestAnimationFrame(gameLoop);
    }

    // Event listeners
    startButton.addEventListener('click', () => {
        initGame();
        gameRunning = true;
        gameOverDisplay.style.display = 'none';
        requestAnimationFrame(gameLoop);
    });

    document.addEventListener('keydown', (e) => {
        if (!gameRunning) return;
        
        switch (e.key) {
            case 'ArrowLeft':
                player.isMovingLeft = true;
                break;
            case 'ArrowRight':
                player.isMovingRight = true;
                break;
            case ' ':
                // Shoot bullet
                bullets.push({
                    x: player.x + player.width / 2 - bulletWidth / 2,
                    y: player.y,
                    width: bulletWidth,
                    height: bulletHeight
                });
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.key) {
            case 'ArrowLeft':
                player.isMovingLeft = false;
                break;
            case 'ArrowRight':
                player.isMovingRight = false;
                break;
        }
    });
});
