// Простые константы
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const CELL_SIZE = 40
const COLS = 20
const ROWS = 15

// Игровое состояние
let gameState = "menu"
let score = 0
let animationId = null
let audioContext = null
let musicGain = null
let musicPlaying = false

// Кешированные объекты для производительности
let cachedGradient = null
let frameCounter = 0
let scanlineOffset = 0

// Игрок
let player = {
  x: 50,
  y: 50,
  size: 30,
  health: 3,
  hasKey: false,
  hasTreasure: false,
  speed: 2.5,
  animFrame: 0,
}

// Управление
let keys = {
  up: false,
  down: false,
  left: false,
  right: false,
}

// Враги
let enemies = []
let keyCollected = false
let treasureCollected = false

// Оптимизированные позиции предметов (кешируем)
let keyPosition = null
let treasurePosition = null

// Простой лабиринт
const MAZE = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 4, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
]

let canvas, ctx

// Инициализация
document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("game-canvas")
  ctx = canvas.getContext("2d")

  // Отключаем сглаживание для пиксельной графики
  ctx.imageSmoothingEnabled = false

  // Кешируем градиент
  cachedGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  cachedGradient.addColorStop(0, "#001122")
  cachedGradient.addColorStop(1, "#000000")

  // Находим позиции предметов один раз
  findItemPositions()

  initAudio()
  setupEvents()
  showScreen("menu")
})

function findItemPositions() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (MAZE[row][col] === 2) {
        keyPosition = { x: col * CELL_SIZE, y: row * CELL_SIZE }
      } else if (MAZE[row][col] === 3) {
        treasurePosition = { x: col * CELL_SIZE, y: row * CELL_SIZE }
      }
    }
  }
}

function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    musicGain = audioContext.createGain()
    musicGain.connect(audioContext.destination)
    musicGain.gain.value = 0.05

    document.addEventListener(
      "click",
      () => {
        if (audioContext.state === "suspended") {
          audioContext.resume()
        }
      },
      { once: true },
    )
  } catch (e) {
    console.log("Audio not supported")
  }
}

function setupEvents() {
  // Кнопки
  document.getElementById("start-btn").onclick = startGame
  document.getElementById("menu-btn").onclick = () => showScreen("menu")
  document.getElementById("play-again-win").onclick = startGame
  document.getElementById("main-menu-win").onclick = () => showScreen("menu")
  document.getElementById("try-again").onclick = startGame
  document.getElementById("main-menu-lose").onclick = () => showScreen("menu")

  // Оптимизированное управление
  document.addEventListener("keydown", handleKeyDown)
  document.addEventListener("keyup", handleKeyUp)
}

function handleKeyDown(e) {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      keys.up = true
      break
    case "KeyS":
    case "ArrowDown":
      keys.down = true
      break
    case "KeyA":
    case "ArrowLeft":
      keys.left = true
      break
    case "KeyD":
    case "ArrowRight":
      keys.right = true
      break
  }
  e.preventDefault()
}

function handleKeyUp(e) {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      keys.up = false
      break
    case "KeyS":
    case "ArrowDown":
      keys.down = false
      break
    case "KeyA":
    case "ArrowLeft":
      keys.left = false
      break
    case "KeyD":
    case "ArrowRight":
      keys.right = false
      break
  }
}

// Оптимизированная проверка коллизии
function checkWallCollision(x, y) {
  const left = Math.floor(x / CELL_SIZE)
  const right = Math.floor((x + player.size) / CELL_SIZE)
  const top = Math.floor(y / CELL_SIZE)
  const bottom = Math.floor((y + player.size) / CELL_SIZE)

  if (left < 0 || right >= COLS || top < 0 || bottom >= ROWS) {
    return true
  }

  return MAZE[top][left] === 1 || MAZE[top][right] === 1 || MAZE[bottom][left] === 1 || MAZE[bottom][right] === 1
}

function checkCollision(obj1, obj2) {
  return (
    obj1.x < obj2.x + obj2.size &&
    obj1.x + obj1.size > obj2.x &&
    obj1.y < obj2.y + obj2.size &&
    obj1.y + obj1.size > obj2.y
  )
}

function startGame() {
  gameState = "playing"
  score = 0
  frameCounter = 0

  player = {
    x: 50,
    y: 50,
    size: 30,
    health: 3,
    hasKey: false,
    hasTreasure: false,
    speed: 2.5,
    animFrame: 0,
  }

  keys = { up: false, down: false, left: false, right: false }
  keyCollected = false
  treasureCollected = false

  // Создание врагов (оптимизировано)
  enemies = []

  enemies.push({
    x: 10 * CELL_SIZE + 5,
    y: 1 * CELL_SIZE + 5,
    size: 30,
    direction: Math.random() > 0.5 ? 1 : -1,
    axis: "x",
    speed: 1.5,
    animFrame: 0,
  })

  enemies.push({
    x: 5 * CELL_SIZE + 5,
    y: 3 * CELL_SIZE + 5,
    size: 30,
    direction: Math.random() > 0.5 ? 1 : -1,
    axis: "x",
    speed: 2,
    animFrame: 0,
  })

  enemies.push({
    x: 3 * CELL_SIZE + 5,
    y: 5 * CELL_SIZE + 5,
    size: 30,
    direction: Math.random() > 0.5 ? 1 : -1,
    axis: "x",
    speed: 2,
    animFrame: 0,
  })

  enemies.push({
    x: 8 * CELL_SIZE + 5,
    y: 5 * CELL_SIZE + 5,
    size: 30,
    direction: Math.random() > 0.5 ? 1 : -1,
    axis: "x",
    speed: 2,
    animFrame: 0,
  })

  enemies.push({
    x: 14 * CELL_SIZE + 5,
    y: 5 * CELL_SIZE + 5,
    size: 30,
    direction: Math.random() > 0.5 ? 1 : -1,
    axis: "y",
    speed: 2,
    animFrame: 0,
  })

  enemies.push({
    x: 10 * CELL_SIZE + 5,
    y: 7 * CELL_SIZE + 5,
    size: 30,
    direction: Math.random() > 0.5 ? 1 : -1,
    axis: "x",
    speed: 3,
    animFrame: 0,
  })

  enemies.push({
    x: 10 * CELL_SIZE + 5,
    y: 9 * CELL_SIZE + 5,
    size: 30,
    direction: Math.random() > 0.5 ? 1 : -1,
    axis: "x",
    speed: 3,
    animFrame: 0,
  })

  enemies.push({
    x: 10 * CELL_SIZE + 5,
    y: 11 * CELL_SIZE + 5,
    size: 30,
    direction: Math.random() > 0.5 ? 1 : -1,
    axis: "x",
    speed: 3,
    animFrame: 0,
  })

  updateUI()
  showScreen("game")
  startSimpleMusic()
  gameLoop()
}

function showScreen(screen) {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  stopMusic()

  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"))
  document.getElementById(screen + "-screen").classList.add("active")
}

function updateUI() {
  document.getElementById("score").textContent = score
  document.getElementById("health").textContent = "❤️".repeat(player.health)
  document.getElementById("key-status").textContent = player.hasKey ? "🔑" : "❌"
  document.getElementById("treasure-status").textContent = player.hasTreasure ? "🏆" : "❌"
}

function gameLoop() {
  if (gameState !== "playing") return

  frameCounter++
  update()
  draw()

  // 8-битные эффекты только каждый 4-й кадр для производительности
  if (frameCounter % 4 === 0) {
    drawOptimized8BitEffects()
  }

  animationId = requestAnimationFrame(gameLoop)
}

function update() {
  // Плавное движение игрока
  let newX = player.x
  let newY = player.y
  let moved = false

  if (keys.up) {
    newY -= player.speed
    moved = true
  }
  if (keys.down) {
    newY += player.speed
    moved = true
  }
  if (keys.left) {
    newX -= player.speed
    moved = true
  }
  if (keys.right) {
    newX += player.speed
    moved = true
  }

  if (moved) {
    if (!checkWallCollision(newX, player.y)) {
      player.x = newX
    }
    if (!checkWallCollision(player.x, newY)) {
      player.y = newY
    }
    player.animFrame++
  }

  // Оптимизированная проверка сбора ключа
  if (!keyCollected && keyPosition) {
    if (
      player.x < keyPosition.x + CELL_SIZE &&
      player.x + player.size > keyPosition.x &&
      player.y < keyPosition.y + CELL_SIZE &&
      player.y + player.size > keyPosition.y
    ) {
      keyCollected = true
      player.hasKey = true
      score += 10
      playSimpleSound("key")
      updateUI()
    }
  }

  // Оптимизированная проверка сбора сокровища
  if (player.hasKey && !treasureCollected && treasurePosition) {
    if (
      player.x < treasurePosition.x + CELL_SIZE &&
      player.x + player.size > treasurePosition.x &&
      player.y < treasurePosition.y + CELL_SIZE &&
      player.y + player.size > treasurePosition.y
    ) {
      treasureCollected = true
      player.hasTreasure = true
      score += 50
      playSimpleSound("treasure")
      updateUI()
    }
  }

  // Проверка победы
  if (player.hasTreasure && player.x < 90 && player.y < 90) {
    gameState = "won"
    document.getElementById("final-score-win").textContent = score
    playSimpleSound("win")
    showScreen("win")
    return
  }

  // Оптимизированное обновление врагов
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i]
    enemy.animFrame++

    let newX = enemy.x
    let newY = enemy.y

    if (enemy.axis === "x") {
      newX += enemy.direction * enemy.speed
      if (checkWallCollision(newX, newY)) {
        enemy.direction *= -1
      } else {
        enemy.x = newX
      }
    } else {
      newY += enemy.direction * enemy.speed
      if (checkWallCollision(newX, newY)) {
        enemy.direction *= -1
      } else {
        enemy.y = newY
      }
    }

    if (checkCollision(player, enemy)) {
      player.health--
      playSimpleSound("hit")

      if (player.health <= 0) {
        gameState = "lost"
        document.getElementById("final-score-lose").textContent = score
        playSimpleSound("death")
        showScreen("lose")
        return
      }
      updateUI()
    }
  }
}

function draw() {
  // Очистка с кешированным градиентом
  ctx.fillStyle = cachedGradient
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Оптимизированное рисование лабиринта
  ctx.fillStyle = "#8B4513"
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (MAZE[row][col] === 1) {
        const x = col * CELL_SIZE
        const y = row * CELL_SIZE
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
      }
    }
  }

  // Рисование предметов
  if (!keyCollected && keyPosition) {
    drawKey(keyPosition.x, keyPosition.y)
  }

  if (!treasureCollected && player.hasKey && treasurePosition) {
    drawTreasure(treasurePosition.x, treasurePosition.y)
  }

  // Подсветка финиша
  if (player.hasTreasure) {
    ctx.strokeStyle = "#00FF00"
    ctx.lineWidth = 2
    ctx.strokeRect(40, 40, 100, 100)
  }

  // Рисование игрока
  drawPlayer()

  // Рисование врагов
  enemies.forEach(drawEnemy)
}

function drawKey(x, y) {
  // Простое мерцание каждые 30 кадров
  if (frameCounter % 30 < 15) {
    ctx.fillStyle = "#FFD700"
    ctx.fillRect(x + 12, y + 16, 16, 8)
    ctx.fillRect(x + 24, y + 12, 4, 16)
  }
}

function drawTreasure(x, y) {
  // Простое мерцание каждые 40 кадров
  if (frameCounter % 40 < 20) {
    ctx.fillStyle = "#FFD700"
    ctx.fillRect(x + 8, y + 12, 24, 16)
    ctx.fillStyle = "#FFA500"
    ctx.fillRect(x + 16, y + 18, 8, 6)
  }
}

function drawPlayer() {
  // Простая анимация покачивания
  const bob = player.animFrame % 16 < 8 ? 0 : 1

  ctx.fillStyle = "#00FF41"
  ctx.fillRect(player.x, player.y + bob, player.size, player.size)

  // Глаза
  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(player.x + 6, player.y + 8 + bob, 6, 6)
  ctx.fillRect(player.x + 18, player.y + 8 + bob, 6, 6)
  ctx.fillStyle = "#000000"
  ctx.fillRect(player.x + 8, player.y + 10 + bob, 2, 2)
  ctx.fillRect(player.x + 20, player.y + 10 + bob, 2, 2)
}

function drawEnemy(enemy) {
  // Простая анимация покачивания
  const bob = enemy.animFrame % 20 < 10 ? 0 : 1

  ctx.fillStyle = "#FF0000"
  ctx.fillRect(enemy.x, enemy.y + bob, enemy.size, enemy.size)

  // Злые глаза
  ctx.fillStyle = "#FFFF00"
  ctx.fillRect(enemy.x + 6, enemy.y + 8 + bob, 6, 6)
  ctx.fillRect(enemy.x + 18, enemy.y + 8 + bob, 6, 6)
  ctx.fillStyle = "#000000"
  ctx.fillRect(enemy.x + 8, enemy.y + 10 + bob, 2, 2)
  ctx.fillRect(enemy.x + 20, enemy.y + 10 + bob, 2, 2)
}

// Оптимизированные 8-битные эффекты
function drawOptimized8BitEffects() {
  scanlineOffset = (scanlineOffset + 1) % 8

  // Простые сканлайны (меньше линий)
  ctx.globalAlpha = 0.1
  ctx.fillStyle = "#000000"
  for (let y = scanlineOffset; y < CANVAS_HEIGHT; y += 8) {
    ctx.fillRect(0, y, CANVAS_WIDTH, 1)
  }

  // Редкие помехи
  if (frameCounter % 60 === 0) {
    ctx.globalAlpha = 0.2
    ctx.fillStyle = "#FFFFFF"
    const x = Math.random() * CANVAS_WIDTH
    ctx.fillRect(x, 0, 1, CANVAS_HEIGHT)
  }

  ctx.globalAlpha = 1
}

// Упрощенные звуки
function playSimpleSound(type) {
  if (!audioContext) return

  try {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.type = "square"

    switch (type) {
      case "key":
        oscillator.frequency.value = 800
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.2)
        break

      case "treasure":
        oscillator.frequency.value = 1200
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.3)
        break

      case "hit":
        oscillator.frequency.value = 150
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.1)
        break

      case "death":
        oscillator.frequency.value = 100
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.5)
        break

      case "win":
        oscillator.frequency.value = 1000
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.5)
        break
    }
  } catch (e) {
    console.log("Sound failed")
  }
}

// Простая фоновая музыка
function startSimpleMusic() {
  if (!audioContext || musicPlaying) return
  musicPlaying = true
  playSimpleMelody()
}

function playSimpleMelody() {
  if (!musicPlaying || gameState !== "playing") return

  try {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(musicGain)
    oscillator.type = "square"
    oscillator.frequency.value = 262 // C note

    gainNode.gain.setValueAtTime(0.03, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1)

    oscillator.start()
    oscillator.stop(audioContext.currentTime + 1)

    // Повторяем каждые 2 секунды
    setTimeout(() => {
      if (musicPlaying && gameState === "playing") {
        playSimpleMelody()
      }
    }, 2000)
  } catch (e) {
    console.log("Music failed")
  }
}

function stopMusic() {
  musicPlaying = false
}
