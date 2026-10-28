const COLS = 20;
const ROWS = 11;

function createLevel(world, number, layout) {
  const map = layout.map(row => row.padEnd(COLS, "#").slice(0, COLS));

  while (map.length < ROWS) {
    map.push("#".repeat(COLS));
  }

  map.length = ROWS;

  // أرضية المرحلة
  map[ROWS - 1] = "#".repeat(COLS);

  // نقطة البداية والنهاية
  const startRow = 8;
  map[startRow] = map[startRow].split("");
  map[startRow][1] = "S";
  map[startRow][COLS - 2] = "E";
  map[startRow] = map[startRow].join("");

  return {
    world,
    t: number,
    h: `${world} — المرحلة ${number}`,
    map
  };
}

function makeMap(options = {}) {
  const grid = Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLS }, (_, x) =>
      y === ROWS - 1 ? "#" : " "
    )
  );

  // منصات أرضية
  for (let x = 0; x < COLS; x++) {
    grid[ROWS - 1][x] = "#";
  }

  // منصات علوية
  (options.platforms || []).forEach(([x, y, length]) => {
    for (let i = 0; i < length && x + i < COLS; i++) {
      if (y >= 0 && y < ROWS - 1) grid[y][x + i] = "#";
    }
  });

  // فخاخ
  (options.spikes || []).forEach(([x, y]) => {
    if (x > 1 && x < COLS - 2 && y >= 0 && y < ROWS - 1) {
      grid[y][x] = "^";
    }
  });

  // ألواح الضغط والأبواب
  (options.puzzle || []).forEach(([plate, door, x, y]) => {
    grid[y][x] = String(plate);
    grid[y - 2][Math.min(COLS - 2, x + 4)] = String.fromCharCode(96 + door);
  });

  // أرضيات إضافية لتسهيل القفز
  (options.steps || []).forEach(([x, y]) => {
    if (x > 1 && x < COLS - 2 && y > 0 && y < ROWS - 1) {
      grid[y][x] = "#";
    }
  });

  // نقطة البداية والنهاية
  grid[8][1] = "S";
  grid[8][COLS - 2] = "E";

  return grid.map(row => row.join(""));
}

const FOREST_LEVELS = [
  makeMap(),
  makeMap({ platforms: [[4,7,3],[10,6,3]], spikes: [[7,9],[8,9],[14,9]] }),
  makeMap({ platforms: [[3,7,3],[8,6,3],[13,7,3]], spikes: [[6,9],[7,9],[11,9]] }),
  makeMap({ platforms: [[4,7,4],[11,5,3]], spikes: [[8,9],[9,9],[15,9]] }),
  makeMap({ platforms: [[3,6,3],[8,7,3],[13,5,3]], spikes: [[6,9],[10,9],[11,9],[16,9]] }),
  makeMap({ platforms: [[4,6,3],[9,5,3],[14,6,3]], spikes: [[7,9],[8,9],[12,9],[13,9]] }),
  makeMap({ platforms: [[3,7,3],[7,5,3],[12,6,3],[16,7,2]], spikes: [[6,9],[10,9],[11,9],[15,9]] }),
  makeMap({ platforms: [[3,6,3],[8,4,3],[13,6,3]], spikes: [[6,9],[7,9],[11,9],[12,9],[16,9]] }),
  makeMap({ platforms: [[4,6,3],[8,5,2],[12,4,3],[16,6,2]], spikes: [[7,9],[10,9],[11,9],[15,9]] }),
  makeMap({ platforms: [[3,6,3],[7,4,3],[12,5,3],[16,4,2]], spikes: [[5,9],[6,9],[9,9],[10,9],[14,9],[15,9]] })
];

const RUINS_LEVELS = [
  makeMap({ platforms: [[4,7,3],[10,6,3]], spikes: [[6,9],[7,9],[13,9]] }),
  makeMap({ platforms: [[3,6,3],[8,5,3],[13,6,3]], spikes: [[6,9],[10,9],[11,9],[15,9]] }),
  makeMap({ platforms: [[4,5,3],[9,6,3],[14,5,3]], spikes: [[7,9],[8,9],[12,9],[13,9]] }),
  makeMap({ platforms: [[3,6,2],[7,4,3],[12,6,3],[16,5,2]], spikes: [[5,9],[9,9],[10,9],[14,9]] }),
  makeMap({ platforms: [[4,5,3],[9,4,3],[14,5,3]], spikes: [[7,9],[8,9],[11,9],[12,9],[16,9]] }),
  makeMap({ platforms: [[3,5,3],[7,6,3],[12,4,3],[16,6,2]], spikes: [[5,9],[9,9],[10,9],[14,9],[15,9]] }),
  makeMap({ platforms: [[3,6,3],[8,4,3],[13,5,3]], spikes: [[6,9],[7,9],[11,9],[12,9],[16,9]] }),
  makeMap({ platforms: [[4,5,3],[9,3,3],[14,5,3]], spikes: [[6,9],[7,9],[10,9],[11,9],[15,9]] }),
  makeMap({ platforms: [[3,5,3],[7,3,3],[12,4,3],[16,5,2]], spikes: [[5,9],[9,9],[10,9],[14,9],[15,9]] }),
  makeMap({ platforms: [[3,4,3],[8,3,3],[13,4,3]], spikes: [[5,9],[6,9],[9,9],[10,9],[13,9],[14,9],[16,9]] })
];

const CRYSTAL_LEVELS = [
  makeMap({ platforms: [[3,6,3],[8,5,3],[13,6,3]], spikes: [[6,9],[7,9],[12,9],[15,9]] }),
  makeMap({ platforms: [[4,5,3],[9,4,3],[14,5,3]], spikes: [[6,9],[7,9],[10,9],[11,9],[15,9]] }),
  makeMap({ platforms: [[3,5,3],[7,3,3],[12,5,3],[16,4,2]], spikes: [[5,9],[9,9],[10,9],[14,9],[15,9]] }),
  makeMap({ platforms: [[3,4,3],[8,5,3],[13,3,3]], spikes: [[5,9],[6,9],[9,9],[10,9],[13,9],[14,9]] }),
  makeMap({ platforms: [[4,4,3],[9,3,3],[14,4,3]], spikes: [[6,9],[7,9],[10,9],[11,9],[14,9],[15,9]] }),
  makeMap({ platforms: [[3,5,3],[7,3,3],[12,4,3],[16,3,2]], spikes: [[5,9],[8,9],[9,9],[12,9],[15,9]] }),
  makeMap({ platforms: [[3,4,3],[8,2,3],[13,4,3]], spikes: [[5,9],[6,9],[9,9],[10,9],[13,9],[14,9],[16,9]] }),
  makeMap({ platforms: [[4,3,3],[9,2,3],[14,3,3]], spikes: [[6,9],[7,9],[10,9],[11,9],[14,9],[15,9]] }),
  makeMap({ platforms: [[3,3,3],[7,2,3],[12,3,3],[16,2,2]], spikes: [[5,9],[8,9],[9,9],[12,9],[15,9]] }),
  makeMap({ platforms: [[3,3,3],[8,2,3],[13,3,3]], spikes: [[5,9],[6,9],[9,9],[10,9],[13,9],[14,9],[16,9]] })
];

const LEVELS = [
  ...FOREST_LEVELS.map((map, i) => ({
    world: "الغابة الغامضة",
    t: i + 1,
    h: "الغابة الغامضة",
    map
  })),
  ...RUINS_LEVELS.map((map, i) => ({
    world: "الآثار القديمة",
    t: i + 11,
    h: "الآثار القديمة",
    map
  })),
  ...CRYSTAL_LEVELS.map((map, i) => ({
    world: "عالم الكريستال",
    t: i + 21,
    h: "عالم الكريستال",
    map
  }))
];

const WORLDS = [
  { name: "الغابة الغامضة", start: 0, end: 9 },
  { name: "الآثار القديمة", start: 10, end: 19 },
  { name: "عالم الكريستال", start: 20, end: 29 }
]; 
