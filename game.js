const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const player = {
  x: canvas.width / 2 - 15,
  y: canvas.height - 40,
  width: 30,
  height: 20,
  color: "lime",
  speed: 5,
  bullets: []
};

const enemies = [];
const enemyRows = 3;
const enemyCols = 6;

for (let r = 0; r < enemyRows; r++) {
  for (let c = 0; c < enemyCols; c++) {
    enemies.push({
      x: c * 60 + 30,
      y: r * 40 + 30,
      width: 30,
      height: 20,
      color: "red",
      alive: true
    });
  }
}

let keys = {};
document.addEventListener("keydown", (e) => keys[e.key] = true);
document.addEventListener("keyup", (e) => keys[e.key] = false);

function shoot() {
  player.bullets.push({
    x: player.x + player.width / 2 - 2,
    y: player.y,
    width: 4,
    height: 10,
    speed: 7
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === " ") shoot();
});

function update() {
  if (keys["ArrowLeft"] && player.x > 0) {
    player.x -= player.speed;
  }
  if (keys["ArrowRight"] && player.x + player.width < canvas.width) {
    player.x += player.speed;
  }

  player.bullets = player.bullets.filter(b => b.y > 0);
  player.bullets.forEach(b => b.y -= b.speed);

  // Bullet-Enemy collision
  player.bullets.forEach(bullet => {
    enemies.forEach(enemy => {
      if (enemy.alive &&
          bullet.x < enemy.x + enemy.width &&
          bullet.x + bullet.width > enemy.x &&
          bullet.y < enemy.y + enemy.height &&
          bullet.y + bullet.height > enemy.y) {
        enemy.alive = false;
        bullet.y = -10; // remove bullet
      }
    });
  });
}

function drawRect(obj) {
  ctx.fillStyle = obj.color;
  ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawRect(player);
  player.bullets.forEach(drawRect);

  enemies.forEach(enemy => {
    if (enemy.alive) drawRect(enemy);
  });
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
