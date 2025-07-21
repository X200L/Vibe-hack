// Adventure Game - Ретро игра в стиле Atari
class AdventureGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false; // Пиксельная графика
        
        // Размеры игрового поля
        this.tileSize = 40;
        this.mapWidth = 20;
        this.mapHeight = 15;
        
        // Игровое состояние
        this.gameState = 'start'; // start, playing, gameOver, victory
        this.score = 0;
        this.health = 3;
        this.hasKey = false;
        this.hasSword = false;
        this.hasTreasure = false;
        
        // Позиции объектов
        this.player = { x: 1, y: 1, color: '#00ff00' };
        this.startPos = { x: 1, y: 1 };
        
        // Карта лабиринта (1 = стена, 0 = пустое место)
        this.map = this.generateMap();
        
        // Размещаем объекты после генерации карты
        this.placeGameObjects();
        
        // Управление
        this.keys = {};
        this.lastMoveTime = 0;
        this.moveDelay = 150; // мс между движениями
        this.lastEnemyMoveTime = 0;
        this.enemyMoveDelay = 300; // мс между движениями врагов
        
        this.initializeGame();
    }
    
    generateMap() {
        // Создаем карту, заполненную стенами
        const map = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(1));
        
        // Случайная генерация лабиринта с помощью алгоритма "Recursive Backtracking"
        const stack = [];
        const visited = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(false));
        
        // Начинаем с позиции игрока
        let currentX = 1;
        let currentY = 1;
        map[currentY][currentX] = 0;
        visited[currentY][currentX] = true;
        stack.push({x: currentX, y: currentY});
        
        const directions = [
            {x: 0, y: -2}, // вверх
            {x: 2, y: 0},  // вправо
            {x: 0, y: 2},  // вниз
            {x: -2, y: 0}  // влево
        ];
        
        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = [];
            
            // Находим непосещенных соседей
            directions.forEach(dir => {
                const newX = current.x + dir.x;
                const newY = current.y + dir.y;
                
                if (newX > 0 && newX < this.mapWidth - 1 && 
                    newY > 0 && newY < this.mapHeight - 1 && 
                    !visited[newY][newX]) {
                    neighbors.push({x: newX, y: newY, dir: dir});
                }
            });
            
            if (neighbors.length > 0) {
                // Выбираем случайного соседа
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                
                // Создаем проход
                map[next.y][next.x] = 0;
                map[current.y + next.dir.y / 2][current.x + next.dir.x / 2] = 0;
                
                visited[next.y][next.x] = true;
                stack.push({x: next.x, y: next.y});
            } else {
                stack.pop();
            }
        }
        
        // Создаем специальную комнату для сокровища и обеспечиваем к ней путь
        const treasureRoomX = this.mapWidth - 3;
        const treasureRoomY = this.mapHeight - 3;
        map[treasureRoomY][treasureRoomX] = 0;
        map[treasureRoomY][treasureRoomX + 1] = 0;
        map[treasureRoomY + 1][treasureRoomX] = 0;
        map[treasureRoomY + 1][treasureRoomX + 1] = 0;
        
        // Создаем гарантированный путь к комнате с сокровищем
        this.ensurePathToTreasure(map, treasureRoomX, treasureRoomY);
        
        // Добавляем дополнительные проходы для более интересного лабиринта
        // и улучшения связности
        for (let i = 0; i < 8; i++) {
            const x = Math.floor(Math.random() * (this.mapWidth - 2)) + 1;
            const y = Math.floor(Math.random() * (this.mapHeight - 2)) + 1;
            map[y][x] = 0;
        }
        
        // Проверяем и исправляем связность карты
        this.ensureMapConnectivity(map);
        
        return map;
    }
    
    ensurePathToTreasure(map, treasureX, treasureY) {
        // Создаем путь от ближайшей доступной точки к комнате с сокровищем
        let currentX = treasureX - 2;
        let currentY = treasureY;
        
        // Идем влево от комнаты сокровищ, создавая проходы
        while (currentX > 1) {
            map[currentY][currentX] = 0;
            if (this.isConnectedToStart(map, currentX, currentY)) {
                break;
            }
            currentX--;
        }
        
        // Если не удалось соединить горизонтально, пробуем вертикально
        if (!this.isConnectedToStart(map, treasureX - 2, treasureY)) {
            currentX = treasureX;
            currentY = treasureY - 2;
            
            while (currentY > 1) {
                map[currentY][currentX] = 0;
                if (this.isConnectedToStart(map, currentX, currentY)) {
                    break;
                }
                currentY--;
            }
        }
    }
    
    ensureMapConnectivity(map) {
        // Находим все изолированные области и соединяем их
        const visited = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(false));
        const components = [];
        
        // Находим все связные компоненты
        for (let y = 1; y < this.mapHeight - 1; y++) {
            for (let x = 1; x < this.mapWidth - 1; x++) {
                if (map[y][x] === 0 && !visited[y][x]) {
                    const component = this.floodFill(map, visited, x, y);
                    components.push(component);
                }
            }
        }
        
        // Если есть изолированные компоненты, соединяем их с основной
        if (components.length > 1) {
            const mainComponent = components[0]; // Компонент, содержащий стартовую позицию
            
            for (let i = 1; i < components.length; i++) {
                this.connectComponents(map, mainComponent, components[i]);
            }
        }
    }
    
    floodFill(map, visited, startX, startY) {
        const component = [];
        const queue = [{x: startX, y: startY}];
        visited[startY][startX] = true;
        
        while (queue.length > 0) {
            const {x, y} = queue.shift();
            component.push({x, y});
            
            // Проверяем соседей
            const neighbors = [
                {x: x + 1, y}, {x: x - 1, y},
                {x, y: y + 1}, {x, y: y - 1}
            ];
            
            neighbors.forEach(neighbor => {
                if (neighbor.x > 0 && neighbor.x < this.mapWidth - 1 &&
                    neighbor.y > 0 && neighbor.y < this.mapHeight - 1 &&
                    map[neighbor.y][neighbor.x] === 0 &&
                    !visited[neighbor.y][neighbor.x]) {
                    visited[neighbor.y][neighbor.x] = true;
                    queue.push(neighbor);
                }
            });
        }
        
        return component;
    }
    
    connectComponents(map, component1, component2) {
        // Находим ближайшие точки между компонентами
        let minDistance = Infinity;
        let bestConnection = null;
        
        component1.forEach(point1 => {
            component2.forEach(point2 => {
                const distance = Math.abs(point1.x - point2.x) + Math.abs(point1.y - point2.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestConnection = {from: point1, to: point2};
                }
            });
        });
        
        if (bestConnection) {
            // Создаем путь между компонентами
            this.createPath(map, bestConnection.from, bestConnection.to);
        }
    }
    
    createPath(map, from, to) {
        let currentX = from.x;
        let currentY = from.y;
        
        // Сначала двигаемся по горизонтали
        while (currentX !== to.x) {
            map[currentY][currentX] = 0;
            currentX += currentX < to.x ? 1 : -1;
        }
        
        // Затем по вертикали
        while (currentY !== to.y) {
            map[currentY][currentX] = 0;
            currentY += currentY < to.y ? 1 : -1;
        }
        
        // Убеждаемся, что конечная точка тоже проходима
        map[to.y][to.x] = 0;
    }
    
    isConnectedToStart(map, x, y) {
        // Проверяем, можно ли добраться от точки (x, y) до стартовой позиции (1, 1)
        const visited = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(false));
        const queue = [{x, y}];
        visited[y][x] = true;
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            // Если достигли стартовой позиции
            if (current.x === 1 && current.y === 1) {
                return true;
            }
            
            // Проверяем соседей
            const neighbors = [
                {x: current.x + 1, y: current.y},
                {x: current.x - 1, y: current.y},
                {x: current.x, y: current.y + 1},
                {x: current.x, y: current.y - 1}
            ];
            
            neighbors.forEach(neighbor => {
                if (neighbor.x >= 0 && neighbor.x < this.mapWidth &&
                    neighbor.y >= 0 && neighbor.y < this.mapHeight &&
                    map[neighbor.y][neighbor.x] === 0 &&
                    !visited[neighbor.y][neighbor.x]) {
                    visited[neighbor.y][neighbor.x] = true;
                    queue.push(neighbor);
                }
            });
        }
        
        return false;
    }
    
    placeGameObjects() {
        // Находим все свободные клетки
        const freeCells = [];
        for (let y = 1; y < this.mapHeight - 1; y++) {
            for (let x = 1; x < this.mapWidth - 1; x++) {
                if (this.map[y][x] === 0 && !(x === 1 && y === 1)) { // Исключаем стартовую позицию
                    freeCells.push({x, y});
                }
            }
        }
        
        // Перемешиваем массив свободных клеток
        for (let i = freeCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [freeCells[i], freeCells[j]] = [freeCells[j], freeCells[i]];
        }
        
        // Размещаем объекты
        let cellIndex = 0;
        
        // Ключ
        this.key = { 
            x: freeCells[cellIndex].x, 
            y: freeCells[cellIndex].y, 
            collected: false 
        };
        cellIndex++;
        
        // Меч
        this.sword = { 
            x: freeCells[cellIndex].x, 
            y: freeCells[cellIndex].y, 
            collected: false 
        };
        cellIndex++;
        
        // Сокровище (в специальной комнате)
        const treasureRoomX = this.mapWidth - 3;
        const treasureRoomY = this.mapHeight - 3;
        this.treasure = { 
            x: treasureRoomX, 
            y: treasureRoomY, 
            collected: false 
        };
        this.treasureRoom = { 
            x: treasureRoomX - 1, 
            y: treasureRoomY - 1, 
            unlocked: false 
        };
        
        // Порталы (2 пары)
        this.portals = [
            {
                id: 1,
                entrance: { x: freeCells[cellIndex].x, y: freeCells[cellIndex].y },
                exit: { x: freeCells[cellIndex + 1].x, y: freeCells[cellIndex + 1].y },
                color: '#ff00ff',
                cooldown: 0
            },
            {
                id: 2,
                entrance: { x: freeCells[cellIndex + 2].x, y: freeCells[cellIndex + 2].y },
                exit: { x: freeCells[cellIndex + 3].x, y: freeCells[cellIndex + 3].y },
                color: '#00ffff',
                cooldown: 0
            }
        ];
        cellIndex += 4;
        
        // Враги (драконы) с улучшенным ИИ
        this.enemies = [];
        const enemyCount = 3 + Math.floor(Math.random() * 3); // 3-5 врагов
        
        for (let i = 0; i < enemyCount && cellIndex < freeCells.length; i++) {
            const patrolTypes = ['horizontal', 'vertical', 'random'];
            const colors = ['#ff4444', '#44ff44', '#4444ff'];
            
            this.enemies.push({
                x: freeCells[cellIndex].x,
                y: freeCells[cellIndex].y,
                startX: freeCells[cellIndex].x,
                startY: freeCells[cellIndex].y,
                direction: Math.random() > 0.5 ? 1 : -1,
                aiType: patrolTypes[i % patrolTypes.length],
                color: colors[i % colors.length],
                moveDelay: 1000 + Math.random() * 500, // Медленные враги: 1000-1500ms
                lastMove: 0,
                isChasing: false,
                chaseSteps: 0,
                returnTarget: null
            });
            cellIndex++;
        }
    }
    
    initializeGame() {
        this.setupEventListeners();
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Кнопки интерфейса
        document.getElementById('startButton').addEventListener('click', () => this.startGame());
        document.getElementById('restartButton').addEventListener('click', () => this.restartGame());
        
        // Управление клавиатурой
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Атака мечом
            if (e.code === 'Space' && this.hasSword && this.gameState === 'playing') {
                this.attackWithSword();
                e.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('startScreen').classList.add('hidden');
        this.updateUI();
    }
    
    restartGame() {
        // Сброс всех параметров
        this.score = 0;
        this.health = 3;
        this.hasKey = false;
        this.hasSword = false;
        this.hasTreasure = false;
        this.player = { x: 1, y: 1, color: '#00ff00' };
        
        // Генерируем новый лабиринт и размещаем объекты
        this.map = this.generateMap();
        this.placeGameObjects();
        
        this.gameState = 'playing';
        document.getElementById('gameOverScreen').classList.add('hidden');
        this.updateUI();
    }
    
    handleInput() {
        if (this.gameState !== 'playing') return;
        
        const now = Date.now();
        if (now - this.lastMoveTime < this.moveDelay) return;
        
        let newX = this.player.x;
        let newY = this.player.y;
        
        // Движение
        if (this.keys['KeyW'] || this.keys['ArrowUp']) newY--;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) newY++;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) newX--;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) newX++;
        
        // Проверка коллизий и движение
        if (this.canMoveTo(newX, newY)) {
            this.player.x = newX;
            this.player.y = newY;
            this.lastMoveTime = now;
            
            // Проверка взаимодействий
            this.checkInteractions();
        }
    }
    
    canMoveTo(x, y) {
        // Проверка границ
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return false;
        
        // Проверка стен
        if (this.map[y][x] === 1) return false;
        
        // Проверка заблокированной комнаты с сокровищем
        if ((x === 17 || x === 18) && (y === 12 || y === 13) && !this.treasureRoom.unlocked) {
            return false;
        }
        
        return true;
    }
    
    checkInteractions() {
        const px = this.player.x;
        const py = this.player.y;
        
        // Подбор ключа
        if (px === this.key.x && py === this.key.y && !this.key.collected) {
            this.key.collected = true;
            this.hasKey = true;
            this.score += 10;
            this.treasureRoom.unlocked = true; // Ключ открывает комнату с сокровищем
            this.playSound('key');
        }
        
        // Подбор меча
        if (px === this.sword.x && py === this.sword.y && !this.sword.collected) {
            this.sword.collected = true;
            this.hasSword = true;
            this.score += 15;
            this.playSound('sword');
        }
        
        // Подбор сокровища
        if (px === this.treasure.x && py === this.treasure.y && !this.treasure.collected && this.treasureRoom.unlocked) {
            this.treasure.collected = true;
            this.hasTreasure = true;
            this.score += 50;
            this.playSound('treasure');
        }
        
        // Проверка победы (вернуться домой с сокровищем)
        if (px === this.startPos.x && py === this.startPos.y && this.hasTreasure) {
            this.victory();
        }
        
        // Проверка столкновения с врагами
        this.enemies.forEach(enemy => {
            if (px === enemy.x && py === enemy.y) {
                this.takeDamage();
            }
        });
        
        // Проверка порталов
        this.portals.forEach(portal => {
            const now = Date.now();
            if (portal.cooldown > now) return; // Кулдаун портала
            
            // Проверка входа в портал
            if (px === portal.entrance.x && py === portal.entrance.y) {
                this.player.x = portal.exit.x;
                this.player.y = portal.exit.y;
                portal.cooldown = now + 1000; // Кулдаун 1 секунда
                this.playSound('portal');
            } else if (px === portal.exit.x && py === portal.exit.y) {
                this.player.x = portal.entrance.x;
                this.player.y = portal.entrance.y;
                portal.cooldown = now + 1000; // Кулдаун 1 секунда
                this.playSound('portal');
            }
        });
        
        this.updateUI();
    }
    
    attackWithSword() {
        const px = this.player.x;
        const py = this.player.y;
        
        // Проверяем врагов в соседних клетках
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const distance = Math.abs(enemy.x - px) + Math.abs(enemy.y - py);
            
            if (distance === 1) { // Враг рядом
                this.enemies.splice(i, 1);
                this.score += 25;
                this.playSound('attack');
                break;
            }
        }
        
        this.updateUI();
    }
    
    takeDamage() {
        this.health--;
        this.playSound('damage');
        
        // Отталкиваем игрока назад
        this.player.x = Math.max(0, this.player.x - 1);
        
        if (this.health <= 0) {
            this.gameOver();
        } else {
            // Визуальный эффект урона
            document.body.classList.add('damage');
            setTimeout(() => document.body.classList.remove('damage'), 500);
        }
        
        this.updateUI();
    }
    
    updateEnemies() {
        const now = Date.now();
        
        this.enemies.forEach(enemy => {
            // Проверяем задержку движения
            if (now - enemy.lastMove < enemy.moveDelay) return;
            
            const distanceToPlayer = Math.abs(enemy.x - this.player.x) + Math.abs(enemy.y - this.player.y);
            const chaseRange = 2; // Сильно уменьшили радиус преследования
            
            let newX = enemy.x;
            let newY = enemy.y;
            
            // Если игрок очень близко - преследуем (но не всегда)
            if (distanceToPlayer <= chaseRange && Math.random() < 0.5) { // Только 50% шанс начать преследование
                enemy.isChasing = true;
                enemy.returnTarget = null;
                enemy.chaseSteps = (enemy.chaseSteps || 0) + 1;
                
                // Ограничиваем время преследования
                if (enemy.chaseSteps > 5) { // Максимум 5 шагов преследования
                    enemy.isChasing = false;
                    enemy.chaseSteps = 0;
                    enemy.returnTarget = { x: enemy.startX, y: enemy.startY };
                } else {
                    // Преследование с большой неточностью
                    if (Math.random() < 0.6) { // Только 60% точность преследования
                        if (Math.abs(enemy.x - this.player.x) > Math.abs(enemy.y - this.player.y)) {
                            newX = enemy.x + (this.player.x > enemy.x ? 1 : -1);
                        } else {
                            newY = enemy.y + (this.player.y > enemy.y ? 1 : -1);
                        }
                    } else {
                        // Случайное движение вместо точного преследования
                        const directions = [
                            { x: 0, y: -1 }, { x: 1, y: 0 }, 
                            { x: 0, y: 1 }, { x: -1, y: 0 }
                        ];
                        const randomDir = directions[Math.floor(Math.random() * directions.length)];
                        newX = enemy.x + randomDir.x;
                        newY = enemy.y + randomDir.y;
                    }
                }
            } 
            // Если преследовали, но игрок ушел или время вышло - возвращаемся домой
            else if (enemy.isChasing || enemy.returnTarget) {
                enemy.isChasing = false;
                enemy.chaseSteps = 0;
                
                if (!enemy.returnTarget) {
                    enemy.returnTarget = { x: enemy.startX, y: enemy.startY };
                }
                
                // Возвращаемся к стартовой позиции
                if (enemy.x !== enemy.returnTarget.x || enemy.y !== enemy.returnTarget.y) {
                    if (Math.abs(enemy.x - enemy.returnTarget.x) > Math.abs(enemy.y - enemy.returnTarget.y)) {
                        newX = enemy.x + (enemy.returnTarget.x > enemy.x ? 1 : -1);
                    } else {
                        newY = enemy.y + (enemy.returnTarget.y > enemy.y ? 1 : -1);
                    }
                } else {
                    // Вернулись домой - переключаемся на обычное поведение
                    enemy.returnTarget = null;
                }
            }
            // Обычное поведение по типу ИИ
            else {
                switch (enemy.aiType) {
                    case 'horizontal':
                        newX = enemy.x + enemy.direction;
                        if (this.map[enemy.y][newX] === 1 || newX < 0 || newX >= this.mapWidth) {
                            enemy.direction *= -1;
                            newX = enemy.x + enemy.direction;
                        }
                        break;
                        
                    case 'vertical':
                        newY = enemy.y + enemy.direction;
                        if (this.map[newY] === undefined || this.map[newY][enemy.x] === 1 || newY < 0 || newY >= this.mapHeight) {
                            enemy.direction *= -1;
                            newY = enemy.y + enemy.direction;
                        }
                        break;
                        
                    case 'random':
                        // Случайное движение только в 40% случаев (больше пауз)
                        if (Math.random() < 0.4) {
                            const directions = [
                                { x: 0, y: -1 }, { x: 1, y: 0 }, 
                                { x: 0, y: 1 }, { x: -1, y: 0 }
                            ];
                            const randomDir = directions[Math.floor(Math.random() * directions.length)];
                            newX = enemy.x + randomDir.x;
                            newY = enemy.y + randomDir.y;
                        }
                        break;
                }
            }
            
            // Проверяем валидность новой позиции
            if (newX >= 0 && newX < this.mapWidth && 
                newY >= 0 && newY < this.mapHeight && 
                this.map[newY][newX] === 0) {
                
                // Проверяем столкновение с другими врагами
                const collision = this.enemies.some(otherEnemy => 
                    otherEnemy !== enemy && otherEnemy.x === newX && otherEnemy.y === newY
                );
                
                if (!collision) {
                    enemy.x = newX;
                    enemy.y = newY;
                    enemy.lastMove = now;
                }
            }
        });
    }
    
    render() {
        // Очистка экрана
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Отрисовка карты
        this.renderMap();
        
        // Отрисовка объектов
        this.renderObjects();
        
        // Отрисовка игрока
        this.renderPlayer();
        
        // Отрисовка врагов
        this.renderEnemies();
    }
    
    renderMap() {
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.map[y][x] === 1) {
                    // Стена
                    this.ctx.fillStyle = '#444444';
                    this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                    
                    // Граница стены
                    this.ctx.strokeStyle = '#666666';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                }
            }
        }
        
        // Заблокированная комната
        if (!this.treasureRoom.unlocked) {
            this.ctx.fillStyle = '#660000';
            this.ctx.fillRect(17 * this.tileSize, 12 * this.tileSize, this.tileSize * 2, this.tileSize * 2);
        }
        
        // Стартовая позиция (дом)
        this.ctx.fillStyle = '#004400';
        this.ctx.fillRect(this.startPos.x * this.tileSize + 5, this.startPos.y * this.tileSize + 5, 
                         this.tileSize - 10, this.tileSize - 10);
    }
    
    renderObjects() {
        // Ключ
        if (!this.key.collected) {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🔑', this.key.x * this.tileSize + this.tileSize/2, 
                             this.key.y * this.tileSize + this.tileSize/2 + 8);
        }
        
        // Меч
        if (!this.sword.collected) {
            this.ctx.fillStyle = '#cccccc';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('⚔️', this.sword.x * this.tileSize + this.tileSize/2, 
                             this.sword.y * this.tileSize + this.tileSize/2 + 8);
        }
        
        // Сокровище
        if (!this.treasure.collected && this.treasureRoom.unlocked) {
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🏆', this.treasure.x * this.tileSize + this.tileSize/2, 
                             this.treasure.y * this.tileSize + this.tileSize/2 + 8);
        }
        
        // Порталы
        this.portals.forEach(portal => {
            const now = Date.now();
            const isActive = portal.cooldown <= now;
            
            // Анимация порталов
            const pulseIntensity = Math.sin(now * 0.01) * 0.3 + 0.7;
            
            // Вход портала
            this.ctx.fillStyle = isActive ? portal.color : '#666666';
            this.ctx.globalAlpha = pulseIntensity;
            this.ctx.beginPath();
            this.ctx.arc(
                portal.entrance.x * this.tileSize + this.tileSize/2,
                portal.entrance.y * this.tileSize + this.tileSize/2,
                this.tileSize/3, 0, Math.PI * 2
            );
            this.ctx.fill();
            
            // Граница портала
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Выход портала
            this.ctx.beginPath();
            this.ctx.arc(
                portal.exit.x * this.tileSize + this.tileSize/2,
                portal.exit.y * this.tileSize + this.tileSize/2,
                this.tileSize/3, 0, Math.PI * 2
            );
            this.ctx.fill();
            this.ctx.stroke();
            
            this.ctx.globalAlpha = 1.0;
            
            // Символы порталов
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🌀', portal.entrance.x * this.tileSize + this.tileSize/2, 
                             portal.entrance.y * this.tileSize + this.tileSize/2 + 5);
            this.ctx.fillText('🌀', portal.exit.x * this.tileSize + this.tileSize/2, 
                             portal.exit.y * this.tileSize + this.tileSize/2 + 5);
        });
    }
    
    renderPlayer() {
        const x = this.player.x * this.tileSize + this.tileSize/2;
        const y = this.player.y * this.tileSize + this.tileSize/2;
        
        // Игрок (квадрат)
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x * this.tileSize + 8, this.player.y * this.tileSize + 8, 
                         this.tileSize - 16, this.tileSize - 16);
        
        // Граница игрока
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.player.x * this.tileSize + 8, this.player.y * this.tileSize + 8, 
                           this.tileSize - 16, this.tileSize - 16);
    }
    
    renderEnemies() {
        this.enemies.forEach(enemy => {
            // Дракон (круг)
            this.ctx.fillStyle = enemy.color;
            this.ctx.beginPath();
            this.ctx.arc(enemy.x * this.tileSize + this.tileSize/2, 
                        enemy.y * this.tileSize + this.tileSize/2, 
                        this.tileSize/2 - 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Граница дракона
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Эмодзи дракона
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🐉', enemy.x * this.tileSize + this.tileSize/2, 
                             enemy.y * this.tileSize + this.tileSize/2 + 5);
        });
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('health').textContent = this.health;
        document.getElementById('hasKey').classList.toggle('hidden', !this.hasKey);
        document.getElementById('hasSword').classList.toggle('hidden', !this.hasSword);
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('gameOverTitle').textContent = 'GAME OVER';
        document.getElementById('gameOverMessage').textContent = 'Драконы победили! Попробуй снова.';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    victory() {
        this.gameState = 'victory';
        this.score += 100; // Бонус за победу
        document.getElementById('gameOverTitle').textContent = 'ПОБЕДА!';
        document.getElementById('gameOverMessage').textContent = 'Ты успешно доставил сокровище домой!';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    playSound(type) {
        // Простые звуковые эффекты через Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        let frequency, duration;
        
        switch(type) {
            case 'key':
                frequency = 800;
                duration = 0.2;
                break;
            case 'sword':
                frequency = 600;
                duration = 0.3;
                break;
            case 'treasure':
                frequency = 1000;
                duration = 0.5;
                break;
            case 'attack':
                frequency = 400;
                duration = 0.1;
                break;
            case 'damage':
                frequency = 200;
                duration = 0.4;
                break;
            default:
                frequency = 440;
                duration = 0.1;
        }
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    }
    
    gameLoop() {
        this.handleInput();
        this.updateEnemies();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Запуск игры
document.addEventListener('DOMContentLoaded', () => {
    new AdventureGame();
});