const Level2 = {
  start: [60, 60],
  exit: [550, 400],
  walls: [
    [200, 50, 20, 200],
    [300, 150, 200, 20],
    [500, 150, 20, 200],
  ],
  key: { x: 550, y: 100 },
  treasure: { x: 100, y: 400 },
  enemies: [
    { x: 400, y: 200, dx: 0, dy: 1, route: [{x:400,y:200}, {x:400,y:350}] },
    { x: 300, y: 100, dx: -1, dy: 0, route: [{x:300,y:100}, {x:150,y:100}] }
  ]
};

export default Level2;
