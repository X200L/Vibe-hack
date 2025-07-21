// game.js
import playSound from './sounds.js';
import setupMobileControls from './mobile.js';

export default class Game {
  constructor(levels) {
    this.levels = levels;
    this.currentLevelIndex = 0;
    this.score = 0;
    this.keysPressed = {};

    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.W = this.canvas.width;
    this.H = this.canvas.height;

    this.SPEED = 3;
    this.SIZE = 20;

    this.setupKeyboardControls();
    setupMobileControls(this.keysPressed);

    this.loadLevel(this.currentLevelIndex);
  }

  loadLevel(index) {
    const level = this.levels[index];
    this.playerX = level.start[0];
    this.playerY = level.start[1];
    this.walls = level.walls.map(w => [...w]);
    this.key = { ...level.key, collected: false };
    this.treasure = { ...level.treasure, collected: false };
    this.exit = { x: level.exit[0], y: level.exit[1], active: false };
    this.enemies = level.enemies.map(e => ({ ...e }));

    this.hasKey = false;
    this.hasTreasure = false;
  }

  setupKeyboardControls() {
    window.addEventListener('keydown', e => {
      this.keysPressed[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', e => {
      this.keysPressed[e.key.toLowerCase()] = false;
    });
  }

  movePlayer() {
    let dx = 0, dy = 0;

    const keys = this.keysPressed;
    if (keys['w'] || keys['arrowup'] || keys['up']) dy -= this.SPEED;
    if (keys['s'] || keys['arrowdown'] || keys['down']) dy += this.SPEED;
    if (keys['a'] || keys['arrowleft'] || keys['left']) dx -= this.SPEED;
    if (keys['d'] || keys['arrowright'] || keys['right']) dx += this.SPEED;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7;
      dy *= 0.7;
    }

    if (!this.checkCollision(this.playerX + dx, this.playerY)) this.playerX += dx;
    if (!this.checkCollision(this.playerX, this.playerY + dy)) this.playerY += dy;

    this.playerX = Math.max(0, Math.min(this.W - this.SIZE, this.playerX));
    this.playerY = Math.max(0, Math.min(this.H - this.SIZE, this.playerY));
  }

  checkCollision(x, y) {
    for (const wall of this.walls) {
      if (
        x < wall[0] + wall[2] &&
        x + this.SIZE > wall[0] &&
        y < wall[1] + wall[3] &&
        y + this.SIZE > wall[1]
      ) return true;
    }
    return false;
  }

  collectItems() {
    if (!this.key.collected && !this.hasKey && this.dist(this.playerX, this.playerY, this.key.x, this.key.y) < this.SIZE) {
      this.key.collected = true;
      this.hasKey = true;
      this.score += 10;
      playSound(523);
      this.updateScore();
    }

    if (!this.treasure.collected && this.hasKey && !this.hasTreasure && this.dist(this.playerX, this.playerY, this.treasure.x, this.treasure.y) < this.SIZE) {
      this.treasure.collected = true;
      this.hasTreasure = true;
      this.score += 50;
      playSound(659);
      this.updateScore();
    }

    // Активация выхода после получения сокровища
    if (this.hasTreasure) {
      this.exit.active = true;
    }

    // Проверка входа в активированный выход
    if (this.exit.active && this.dist(this.playerX, this.playerY, this.exit.x, this.exit.y) < this.SIZE) {
      this.nextLevel();
    }
  }

  nextLevel() {
    this.currentLevelIndex++;
    if (this.currentLevelIndex >= this.levels.length) {
      this.endGame(true);
    } else {
      // Сообщение о переходе
      setTimeout(() => {
        alert(`Уровень ${this.currentLevelIndex + 1} начат!`);
      }, 100);
      this.loadLevel(this.currentLevelIndex);
      this.updateScore();
    }
  }

  moveEnemies() {
    this.enemies.forEach(enemy => {
      enemy.x += enemy.dx;
      enemy.y += enemy.dy;

      let hitWall = false;
      for (const wall of this.walls) {
        if (
          enemy.x < wall[0] + wall[2] &&
          enemy.x + this.SIZE > wall[0] &&
          enemy.y < wall[1] + wall[3] &&
          enemy.y + this.SIZE > wall[1]
        ) {
          hitWall = true;
          break;
        }
      }

      const target = enemy.route[1];
      const from = enemy.route[0];
      if (Math.abs(enemy.x - target.x) < 5 && Math.abs(enemy.y - target.y) < 5) {
        [enemy.dx, enemy.dy] = [-enemy.dx, -enemy.dy];
      } else if (hitWall) {
        [enemy.dx, enemy.dy] = [-enemy.dx, -enemy.dy];
      }

      if (this.dist(this.playerX, this.playerY, enemy.x, enemy.y) < this.SIZE) {
        playSound(200, 0.3);
        alert("Тебя поймали! Игра окончена.");
        this.endGame(false);
      }
    });
  }

  dist(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  updateScore() {
    document.getElementById('score-display').textContent =
      `Очки: ${this.score} | Ключ: ${this.hasKey ? '✅' : '❌'} | Сокровище: ${this.hasTreasure ? '✅' : '❌'}`;
  }

  // Рисуем улучшенную графику
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.fillStyle = '#0a0a2a'; // Тёмно-синий фон
    ctx.fillRect(0, 0, this.W, this.H);

    // Стены — кирпичный стиль
    ctx.strokeStyle = '#8B4513';
    for (const wall of this.walls) {
      ctx.fillStyle = '#A0522D';
      ctx.fillRect(wall[0], wall[1], wall[2], wall[3]);
      ctx.strokeRect(wall[0], wall[1], wall[2], wall[3]);
      // Горизонтальные линии для эффекта кирпичей
      for (let y = wall[1]; y < wall[1] + wall[3]; y += 10) {
        ctx.beginPath();
        ctx.moveTo(wall[0], y);
        ctx.lineTo(wall[0] + wall[2], y);
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Ключ
    if (!this.key.collected) {
      ctx.save();
      ctx.translate(this.key.x + 10, this.key.y + 10);
      ctx.rotate(Math.sin(Date.now() / 500) * 0.2); // Лёгкое покачивание
      ctx.fillStyle = 'gold';
      ctx.fillRect(-5, -8, 10, 16);
      ctx.fillRect(-10, -2, 5, 4);
      ctx.fillRect(-5, -2, 5, 4);
      ctx.restore();
    }

    // Сокровище (сундук)
    if (!this.treasure.collected) {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(this.treasure.x, this.treasure.y, this.SIZE, this.SIZE);
      ctx.fillStyle = 'gold';
      ctx.fillRect(this.treasure.x + 2, this.treasure.y + 2, this.SIZE - 4, 6);
      ctx.fillStyle = '#CD853F';
      ctx.fillRect(this.treasure.x + 5, this.treasure.y + 10, 10, 6);
    }

    // Выход (портал)
    if (this.exit.active) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
      ctx.fillStyle = `rgba(255, 0, 255, ${pulse})`;
      ctx.fillRect(this.exit.x, this.exit.y, this.SIZE, this.SIZE);
      ctx.strokeStyle = '#FF00FF';
      ctx.setLineDash([5, 3]);
      ctx.lineWidth = 2;
      ctx.strokeRect(this.exit.x, this.exit.y, this.SIZE, this.SIZE);
      ctx.setLineDash([]);
      ctx.fillStyle = 'white';
      ctx.font = '10px monospace';
      ctx.fillText('EXIT', this.exit.x + 2, this.exit.y + 12);
    } else {
      ctx.fillStyle = '#666';
      ctx.fillRect(this.exit.x, this.exit.y, this.SIZE, this.SIZE);
      ctx.fillStyle = 'gray';
      ctx.font = '8px monospace';
      ctx.fillText('LOCK', this.exit.x + 1, this.exit.y + 12);
    }

    // Игрок (рыцарь)
    ctx.save();
    ctx.translate(this.playerX + 10, this.playerY + 10);
    ctx.rotate(Math.sin(Date.now() / 300) * 0.1);
    // Тело
    ctx.fillStyle = '#0f0';
    ctx.fillRect(-8, -8, 16, 16);
    // Голова
    ctx.fillStyle = '#D2691E';
    ctx.fillRect(-4, -10, 8, 6);
    // Глаза
    ctx.fillStyle = 'black';
    ctx.fillRect(-3, -8, 2, 2);
    ctx.fillRect(1, -8, 2, 2);
    // Меч
    ctx.fillStyle = 'silver';
    ctx.fillRect(8, -4, 6, 2);
    ctx.fillRect(10, -6, 2, 6);
    ctx.restore();

    // Враги (драконы)
    this.enemies.forEach(enemy => {
      ctx.save();
      ctx.translate(enemy.x + 10, enemy.y + 10);
      ctx.scale(1.2, 1.2);
      // Тело
      ctx.fillStyle = '#c00';
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Глаза
      ctx.fillStyle = 'yellow';
      ctx.beginPath();
      ctx.arc(-3, -2, 3, 0, Math.PI * 2);
      ctx.arc(3, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(-3, -2, 1, 0, Math.PI * 2);
      ctx.arc(3, -2, 1, 0, Math.PI * 2);
      ctx.fill();
      // Огонь (мерцание)
      if (Math.random() > 0.5) {
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(5, 10);
        ctx.lineTo(0, 12);
        ctx.lineTo(-5, 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
  }

  gameLoop() {
    if (!this.active) return;
    this.movePlayer();
    this.collectItems();
    this.moveEnemies();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }

  start() {
    this.active = true;
    this.currentLevelIndex = 0;
    this.score = 0;
    this.updateScore();
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('win-screen').style.display = 'none';
    this.loadLevel(0);
    this.gameLoop();
  }

  endGame(win) {
    this.active = false;
    if (win) {
      document.getElementById('final-score').textContent = this.score;
      document.getElementById('win-screen').style.display = 'flex';
    } else {
      document.getElementById('start-screen').style.display = 'flex';
    }
  }
}
