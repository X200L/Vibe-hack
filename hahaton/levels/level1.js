const Level1 = {
  start: [60, 60],
  exit: [550, 50], // где находится выход
  walls: [
    [100, 100, 200, 20],
    [300, 100, 20, 150],
    [100, 230, 220, 20],
  ],
  key: { x: 250, y: 180 },
  treasure: { x: 500, y: 400 },
  enemies: [
    { x: 200, y: 150, dx: 1, dy: 0, route: [{x:200,y:150}, {x:400,y:150}] }
  ]
};

export default Level1;
