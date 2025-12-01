import React, { useState, useCallback, useRef } from 'react';

const ROWS = 21;
const COLS = 21;
const CELL_SIZE = 20;

const createGrid = (addBorder = false) => {
  const grid = [];
  for (let row = 0; row < ROWS; row++) {
    const currentRow = [];
    for (let col = 0; col < COLS; col++) {
      currentRow.push({
        row, col,
        isStart: row === 1 && col === 1,
        isEnd: row === ROWS - 2 && col === COLS - 2,
        isWall: addBorder ? (row === 0 || col === 0 || row === ROWS - 1 || col === COLS - 1) : false,
        isVisited: false, isPath: false,
        distance: Infinity, heuristic: 0, previous: null,
      });
    }
    grid.push(currentRow);
  }
  return grid;
};

const cloneGrid = (grid) => grid.map(row => row.map(n => ({ ...n, isVisited: false, isPath: false, distance: Infinity, heuristic: 0, previous: null })));

const heuristic = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

const getNeighbors = (node, grid) => {
  const neighbors = [];
  const { row, col } = node;
  if (row > 0) neighbors.push(grid[row - 1][col]);
  if (row < ROWS - 1) neighbors.push(grid[row + 1][col]);
  if (col > 0) neighbors.push(grid[row][col - 1]);
  if (col < COLS - 1) neighbors.push(grid[row][col + 1]);
  return neighbors;
};

const bfs = (grid, start, end) => {
  const visited = [];
  const queue = [start];
  start.distance = 0;
  while (queue.length) {
    const cur = queue.shift();
    if (cur.isVisited || cur.isWall) continue;
    cur.isVisited = true;
    visited.push(cur);
    if (cur === end) return visited;
    for (const n of getNeighbors(cur, grid)) {
      if (!n.isVisited && !n.isWall) {
        n.distance = cur.distance + 1;
        n.previous = cur;
        queue.push(n);
      }
    }
  }
  return visited;
};

const dfs = (grid, start, end) => {
  const visited = [];
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop();
    if (cur.isVisited || cur.isWall) continue;
    cur.isVisited = true;
    visited.push(cur);
    if (cur === end) return visited;
    for (const n of getNeighbors(cur, grid)) {
      if (!n.isVisited && !n.isWall) {
        n.previous = cur;
        stack.push(n);
      }
    }
  }
  return visited;
};

const aStar = (grid, start, end) => {
  const visited = [];
  const open = [start];
  start.distance = 0;
  start.heuristic = heuristic(start, end);
  while (open.length) {
    open.sort((a, b) => (a.distance + a.heuristic) - (b.distance + b.heuristic));
    const cur = open.shift();
    if (cur.isVisited || cur.isWall) continue;
    cur.isVisited = true;
    visited.push(cur);
    if (cur === end) return visited;
    for (const n of getNeighbors(cur, grid)) {
      if (!n.isVisited && !n.isWall) {
        const d = cur.distance + 1;
        if (d < n.distance) {
          n.distance = d;
          n.heuristic = heuristic(n, end);
          n.previous = cur;
          if (!open.includes(n)) open.push(n);
        }
      }
    }
  }
  return visited;
};

const greedy = (grid, start, end) => {
  const visited = [];
  const open = [start];
  start.heuristic = heuristic(start, end);
  while (open.length) {
    open.sort((a, b) => a.heuristic - b.heuristic);
    const cur = open.shift();
    if (cur.isVisited || cur.isWall) continue;
    cur.isVisited = true;
    visited.push(cur);
    if (cur === end) return visited;
    for (const n of getNeighbors(cur, grid)) {
      if (!n.isVisited && !n.isWall) {
        n.heuristic = heuristic(n, end);
        n.previous = cur;
        open.push(n);
      }
    }
  }
  return visited;
};

const getPath = (end) => {
  const path = [];
  let cur = end;
  while (cur) { path.unshift(cur); cur = cur.previous; }
  return path;
};

// Maze Generation Algorithms
const generateRecursiveBacktracking = () => {
  const grid = [];
  for (let row = 0; row < ROWS; row++) {
    const currentRow = [];
    for (let col = 0; col < COLS; col++) {
      currentRow.push({
        row, col,
        isStart: false, isEnd: false,
        isWall: true,
        isVisited: false, isPath: false,
        distance: Infinity, heuristic: 0, previous: null,
      });
    }
    grid.push(currentRow);
  }

  const stack = [];
  const startRow = 1, startCol = 1;
  grid[startRow][startCol].isWall = false;
  stack.push([startRow, startCol]);

  const directions = [[0, 2], [2, 0], [0, -2], [-2, 0]];

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const shuffled = directions.sort(() => Math.random() - 0.5);
    let found = false;

    for (const [dr, dc] of shuffled) {
      const nr = r + dr, nc = c + dc;
      if (nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1 && grid[nr][nc].isWall) {
        grid[nr][nc].isWall = false;
        grid[r + dr / 2][c + dc / 2].isWall = false;
        stack.push([nr, nc]);
        found = true;
        break;
      }
    }
    if (!found) stack.pop();
  }

  grid[1][1].isStart = true;
  grid[ROWS - 2][COLS - 2].isEnd = true;
  return grid;
};

const generatePrimsMaze = () => {
  const grid = [];
  for (let row = 0; row < ROWS; row++) {
    const currentRow = [];
    for (let col = 0; col < COLS; col++) {
      currentRow.push({
        row, col,
        isStart: false, isEnd: false,
        isWall: true,
        isVisited: false, isPath: false,
        distance: Infinity, heuristic: 0, previous: null,
      });
    }
    grid.push(currentRow);
  }

  const walls = [];
  const startRow = 1, startCol = 1;
  grid[startRow][startCol].isWall = false;

  const addWalls = (r, c) => {
    const dirs = [[0, 2], [2, 0], [0, -2], [-2, 0]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1 && grid[nr][nc].isWall) {
        walls.push([r + dr / 2, c + dc / 2, nr, nc]);
      }
    }
  };

  addWalls(startRow, startCol);

  while (walls.length > 0) {
    const idx = Math.floor(Math.random() * walls.length);
    const [wr, wc, cr, cc] = walls.splice(idx, 1)[0];

    if (grid[cr][cc].isWall) {
      grid[wr][wc].isWall = false;
      grid[cr][cc].isWall = false;
      addWalls(cr, cc);
    }
  }

  grid[1][1].isStart = true;
  grid[ROWS - 2][COLS - 2].isEnd = true;
  return grid;
};

const generateKruskalsMaze = () => {
  const grid = [];
  const sets = [];
  let setId = 0;

  for (let row = 0; row < ROWS; row++) {
    const currentRow = [];
    const setRow = [];
    for (let col = 0; col < COLS; col++) {
      currentRow.push({
        row, col,
        isStart: false, isEnd: false,
        isWall: true,
        isVisited: false, isPath: false,
        distance: Infinity, heuristic: 0, previous: null,
      });
      if (row % 2 === 1 && col % 2 === 1 && row < ROWS - 1 && col < COLS - 1) {
        setRow.push(setId++);
      } else {
        setRow.push(-1);
      }
    }
    grid.push(currentRow);
    sets.push(setRow);
  }

  // Mark cells as passages
  for (let row = 1; row < ROWS - 1; row += 2) {
    for (let col = 1; col < COLS - 1; col += 2) {
      grid[row][col].isWall = false;
    }
  }

  // Collect all walls between cells
  const walls = [];
  for (let row = 1; row < ROWS - 1; row += 2) {
    for (let col = 1; col < COLS - 1; col += 2) {
      if (col + 2 < COLS - 1) walls.push([row, col + 1, row, col, row, col + 2]);
      if (row + 2 < ROWS - 1) walls.push([row + 1, col, row, col, row + 2, col]);
    }
  }

  // Shuffle walls
  walls.sort(() => Math.random() - 0.5);

  const find = (r, c) => sets[r][c];
  const union = (id1, id2) => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (sets[r][c] === id2) sets[r][c] = id1;
      }
    }
  };

  for (const [wr, wc, r1, c1, r2, c2] of walls) {
    const set1 = find(r1, c1);
    const set2 = find(r2, c2);
    if (set1 !== set2) {
      grid[wr][wc].isWall = false;
      union(set1, set2);
    }
  }

  grid[1][1].isStart = true;
  grid[ROWS - 2][COLS - 2].isEnd = true;
  return grid;
};

const runAlgorithm = (alg, grid, start, end) => {
  switch (alg) {
    case 'bfs': return bfs(grid, start, end);
    case 'dfs': return dfs(grid, start, end);
    case 'greedy': return greedy(grid, start, end);
    default: return aStar(grid, start, end);
  }
};

export default function App() {
  const [baseGrid, setBaseGrid] = useState(createGrid);
  const [grid1, setGrid1] = useState(() => cloneGrid(createGrid()));
  const [grid2, setGrid2] = useState(() => cloneGrid(createGrid()));
  const [isRunning, setIsRunning] = useState(false);
  const [algo1, setAlgo1] = useState('astar');
  const [algo2, setAlgo2] = useState('bfs');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState('wall');
  const [stats1, setStats1] = useState({ visited: 0, pathLength: 0, time: 0 });
  const [stats2, setStats2] = useState({ visited: 0, pathLength: 0, time: 0 });
  const [speed, setSpeed] = useState(15);
  const [comparisonMode, setComparisonMode] = useState(false);
  const timeouts = useRef([]);

  const clearTimeouts = () => { timeouts.current.forEach(t => clearTimeout(t)); timeouts.current = []; };

  const syncGrids = (newBase) => {
    setBaseGrid(newBase);
    setGrid1(cloneGrid(newBase));
    setGrid2(cloneGrid(newBase));
  };

  const resetGrid = useCallback(() => {
    clearTimeouts(); setIsRunning(false);
    const g = createGrid();
    syncGrids(g);
    setStats1({ visited: 0, pathLength: 0, time: 0 });
    setStats2({ visited: 0, pathLength: 0, time: 0 });
  }, []);

  const clearPath = useCallback(() => {
    clearTimeouts(); setIsRunning(false);
    setGrid1(cloneGrid(baseGrid));
    setGrid2(cloneGrid(baseGrid));
    setStats1({ visited: 0, pathLength: 0, time: 0 });
    setStats2({ visited: 0, pathLength: 0, time: 0 });
  }, [baseGrid]);

  const handleMazeGen = (type) => {
    clearTimeouts(); setIsRunning(false);
    let g;
    switch (type) {
      case 'recursive': g = generateRecursiveBacktracking(); break;
      case 'prims': g = generatePrimsMaze(); break;
      case 'kruskals': g = generateKruskalsMaze(); break;
      default: g = createGrid(); for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!g[r][c].isStart && !g[r][c].isEnd) g[r][c].isWall = Math.random() < 0.3;
    }
    syncGrids(g);
    setStats1({ visited: 0, pathLength: 0, time: 0 });
    setStats2({ visited: 0, pathLength: 0, time: 0 });
  };

  const handleMouseDown = (r, c) => {
    if (isRunning) return;
    const n = baseGrid[r][c];
    if (n.isStart) setDrawMode('start');
    else if (n.isEnd) setDrawMode('end');
    else { setDrawMode('wall'); toggleWall(r, c); }
    setIsDrawing(true);
  };

  const handleMouseEnter = (r, c) => {
    if (!isDrawing || isRunning) return;
    if (drawMode === 'wall') toggleWall(r, c);
    else if (drawMode === 'start') moveStart(r, c);
    else if (drawMode === 'end') moveEnd(r, c);
  };

  const toggleWall = (r, c) => {
    if (baseGrid[r][c].isStart || baseGrid[r][c].isEnd) return;
    const newBase = baseGrid.map(row => row.map(n => ({ ...n })));
    newBase[r][c].isWall = !newBase[r][c].isWall;
    syncGrids(newBase);
  };

  const moveStart = (r, c) => {
    if (baseGrid[r][c].isEnd || baseGrid[r][c].isWall) return;
    const newBase = baseGrid.map(row => row.map(n => ({ ...n, isStart: false })));
    newBase[r][c].isStart = true;
    syncGrids(newBase);
  };

  const moveEnd = (r, c) => {
    if (baseGrid[r][c].isStart || baseGrid[r][c].isWall) return;
    const newBase = baseGrid.map(row => row.map(n => ({ ...n, isEnd: false })));
    newBase[r][c].isEnd = true;
    syncGrids(newBase);
  };

  const animateGrid = (visited, path, setGrid, setStats, time, callback) => {
    for (let i = 0; i <= visited.length; i++) {
      const t = setTimeout(() => {
        if (i === visited.length) {
          for (let j = 0; j < path.length; j++) {
            const pt = setTimeout(() => {
              setGrid(prev => {
                const u = prev.map(r => r.map(n => ({ ...n })));
                u[path[j].row][path[j].col].isPath = true;
                return u;
              });
              if (j === path.length - 1) {
                setStats({ visited: visited.length, pathLength: path.length, time: time.toFixed(2) });
                if (callback) callback();
              }
            }, 40 * j);
            timeouts.current.push(pt);
          }
        } else {
          setGrid(prev => {
            const u = prev.map(r => r.map(n => ({ ...n })));
            u[visited[i].row][visited[i].col].isVisited = true;
            return u;
          });
        }
      }, speed * i);
      timeouts.current.push(t);
    }
  };

  const visualize = useCallback(() => {
    if (isRunning) return;
    clearPath();
    setTimeout(() => {
      setIsRunning(true);

      // Run algorithm 1
      const g1 = cloneGrid(baseGrid);
      let start1, end1;
      for (const row of g1) for (const n of row) { if (n.isStart) start1 = n; if (n.isEnd) end1 = n; }
      const t0_1 = performance.now();
      const visited1 = runAlgorithm(algo1, g1, start1, end1);
      const t1_1 = performance.now();
      const path1 = getPath(end1);

      if (comparisonMode) {
        // Run algorithm 2
        const g2 = cloneGrid(baseGrid);
        let start2, end2;
        for (const row of g2) for (const n of row) { if (n.isStart) start2 = n; if (n.isEnd) end2 = n; }
        const t0_2 = performance.now();
        const visited2 = runAlgorithm(algo2, g2, start2, end2);
        const t1_2 = performance.now();
        const path2 = getPath(end2);

        // Animate both
        animateGrid(visited1, path1, setGrid1, setStats1, t1_1 - t0_1, null);
        animateGrid(visited2, path2, setGrid2, setStats2, t1_2 - t0_2, () => setIsRunning(false));
      } else {
        animateGrid(visited1, path1, setGrid1, setStats1, t1_1 - t0_1, () => setIsRunning(false));
      }
    }, 50);
  }, [baseGrid, algo1, algo2, isRunning, speed, clearPath, comparisonMode]);

  const algoInfo = {
    astar: { name: 'A*', desc: 'Optimal — heuristic + distance', color: '#00ff88' },
    bfs: { name: 'BFS', desc: 'Optimal — level by level', color: '#00d4ff' },
    dfs: { name: 'DFS', desc: 'Not Optimal — goes deep', color: '#ff6b6b' },
    greedy: { name: 'Greedy', desc: 'Not Optimal — heuristic only', color: '#ffd93d' },
  };

  const mazeInfo = {
    recursive: { name: 'Recursive Backtracking', desc: 'DFS-based, long corridors' },
    prims: { name: "Prim's Algorithm", desc: 'Random growth, organic look' },
    kruskals: { name: "Kruskal's Algorithm", desc: 'Union-find, uniform distribution' },
    random: { name: 'Random Walls', desc: '30% random obstacles' },
  };

  const renderGrid = (grid, isMain = true) => (
    <div style={{ display: 'inline-block', padding: 12, background: 'rgba(0,0,0,0.5)', borderRadius: 12, border: '1px solid #222' }}>
      {grid.map((row, ri) => (
        <div key={ri} style={{ display: 'flex' }}>
          {row.map((node, ci) => {
            let bg = 'rgba(30,30,40,0.8)', anim = 'none', shadow = 'inset 0 0 0 1px rgba(255,255,255,0.03)';
            if (node.isStart) { bg = '#00ff88'; anim = 'pulse 2s infinite'; shadow = '0 0 15px #00ff88'; }
            else if (node.isEnd) { bg = '#ff6b6b'; anim = 'endPulse 2s infinite'; shadow = '0 0 15px #ff6b6b'; }
            else if (node.isPath) { bg = 'linear-gradient(135deg, #00ff88, #00d4ff)'; anim = 'pathAnim 0.5s forwards'; shadow = '0 0 10px rgba(0,255,136,0.6)'; }
            else if (node.isVisited) { bg = 'rgba(0, 212, 255, 0.4)'; anim = 'visitedAnim 0.4s forwards'; }
            else if (node.isWall) { bg = 'linear-gradient(135deg, #1a1a2e, #2a2a4e)'; shadow = 'inset 0 0 8px rgba(0,0,0,0.8)'; }
            return (
              <div
                key={ci}
                onMouseDown={isMain ? () => handleMouseDown(ri, ci) : undefined}
                onMouseEnter={isMain ? () => handleMouseEnter(ri, ci) : undefined}
                style={{ width: CELL_SIZE, height: CELL_SIZE, background: bg, border: '1px solid rgba(255,255,255,0.02)', animation: anim, boxShadow: shadow, cursor: isMain ? 'pointer' : 'default', borderRadius: 2 }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );

  const renderStats = (stats, algo, color) => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: `1px solid ${color}40`, marginTop: 10 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color, fontSize: '1.2rem', fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>{stats.visited}</div>
        <div style={{ color: '#666', fontSize: '0.65rem', letterSpacing: 1 }}>VISITED</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color, fontSize: '1.2rem', fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>{stats.pathLength}</div>
        <div style={{ color: '#666', fontSize: '0.65rem', letterSpacing: 1 }}>PATH</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color, fontSize: '1.2rem', fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>{stats.time}ms</div>
        <div style={{ color: '#666', fontSize: '0.65rem', letterSpacing: 1 }}>TIME</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', padding: 20, fontFamily: "'JetBrains Mono', monospace", color: '#e0e0e0', userSelect: 'none' }} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Orbitron:wght@700;900&display=swap');
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 15px #00ff88; } 50% { box-shadow: 0 0 30px #00ff88; } }
        @keyframes endPulse { 0%, 100% { box-shadow: 0 0 15px #ff6b6b; } 50% { box-shadow: 0 0 30px #ff6b6b; } }
        @keyframes visitedAnim { 0% { transform: scale(0); background: #00ff88; } 50% { transform: scale(1.2); } 100% { transform: scale(1); background: rgba(0, 212, 255, 0.4); } }
        @keyframes pathAnim { 0% { transform: scale(0.5); } 50% { transform: scale(1.3); } 100% { transform: scale(1); background: linear-gradient(135deg, #00ff88, #00d4ff); } }`}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '2rem', fontWeight: 900, textAlign: 'center', marginBottom: 6, background: 'linear-gradient(135deg, #00ff88, #00d4ff, #ff6b6b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: 3 }}>PATHFINDER</h1>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: 16, fontSize: '0.75rem', letterSpacing: 2 }}>ALGORITHM COMPARISON VISUALIZER</p>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <button onClick={() => setComparisonMode(!comparisonMode)} style={{ padding: '10px 24px', background: comparisonMode ? 'linear-gradient(135deg, #00ff88, #00d4ff)' : 'transparent', border: comparisonMode ? 'none' : '2px solid #444', borderRadius: 8, color: comparisonMode ? '#000' : '#888', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
            {comparisonMode ? '⚡ COMPARISON MODE' : 'SINGLE MODE'}
          </button>
        </div>

        {/* Maze Generation */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ color: '#666', fontSize: '0.75rem', marginRight: 12 }}>MAZE:</span>
          {Object.entries(mazeInfo).map(([key, info]) => (
            <button key={key} onClick={() => handleMazeGen(key)} disabled={isRunning} title={info.desc} style={{ padding: '8px 14px', margin: '0 4px', background: 'transparent', border: '1px solid #333', borderRadius: 6, color: '#888', fontFamily: 'inherit', fontSize: '0.7rem', cursor: isRunning ? 'not-allowed' : 'pointer' }}>{info.name}</button>
          ))}
        </div>

        {/* Algorithm Selection */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: comparisonMode ? 60 : 0, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            {comparisonMode && <div style={{ textAlign: 'center', color: '#666', fontSize: '0.7rem', marginBottom: 8 }}>ALGORITHM 1</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {Object.entries(algoInfo).map(([key, info]) => (
                <button key={key} onClick={() => setAlgo1(key)} style={{ padding: '10px 16px', border: algo1 === key ? `2px solid ${info.color}` : '2px solid #333', background: algo1 === key ? `${info.color}15` : 'transparent', color: algo1 === key ? info.color : '#888', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 600, boxShadow: algo1 === key ? `0 0 15px ${info.color}40` : 'none' }}>{info.name}</button>
              ))}
            </div>
          </div>
          {comparisonMode && (
            <div>
              <div style={{ textAlign: 'center', color: '#666', fontSize: '0.7rem', marginBottom: 8 }}>ALGORITHM 2</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {Object.entries(algoInfo).map(([key, info]) => (
                  <button key={key} onClick={() => setAlgo2(key)} style={{ padding: '10px 16px', border: algo2 === key ? `2px solid ${info.color}` : '2px solid #333', background: algo2 === key ? `${info.color}15` : 'transparent', color: algo2 === key ? info.color : '#888', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 600, boxShadow: algo2 === key ? `0 0 15px ${info.color}40` : 'none' }}>{info.name}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={visualize} disabled={isRunning} style={{ padding: '12px 28px', background: isRunning ? '#333' : 'linear-gradient(135deg, #00ff88, #00d4ff)', border: 'none', borderRadius: 8, color: isRunning ? '#666' : '#000', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 700, cursor: isRunning ? 'not-allowed' : 'pointer', boxShadow: isRunning ? 'none' : '0 0 25px rgba(0,255,136,0.4)', letterSpacing: 1 }}>{isRunning ? 'RUNNING...' : '▶ VISUALIZE'}</button>
          <button onClick={clearPath} disabled={isRunning} style={{ padding: '10px 18px', background: 'transparent', border: '2px solid #444', borderRadius: 8, color: '#888', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, cursor: isRunning ? 'not-allowed' : 'pointer' }}>Clear Path</button>
          <button onClick={resetGrid} style={{ padding: '10px 18px', background: 'transparent', border: '2px solid #444', borderRadius: 8, color: '#888', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Reset All</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 10 }}>
            <span style={{ color: '#666', fontSize: '0.75rem' }}>SPEED:</span>
            <input type="range" min="1" max="50" value={51 - speed} onChange={(e) => setSpeed(51 - parseInt(e.target.value))} style={{ width: 80, accentColor: '#00ff88' }} />
          </div>
        </div>

        {/* Grids */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 30, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ color: algoInfo[algo1].color, fontWeight: 700, fontSize: '0.9rem' }}>{algoInfo[algo1].name}</span>
              <span style={{ color: '#555', margin: '0 8px' }}>—</span>
              <span style={{ color: '#666', fontSize: '0.75rem' }}>{algoInfo[algo1].desc}</span>
            </div>
            {renderGrid(comparisonMode ? grid1 : grid1, !comparisonMode)}
            {renderStats(stats1, algo1, algoInfo[algo1].color)}
          </div>
          {comparisonMode && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <span style={{ color: algoInfo[algo2].color, fontWeight: 700, fontSize: '0.9rem' }}>{algoInfo[algo2].name}</span>
                <span style={{ color: '#555', margin: '0 8px' }}>—</span>
                <span style={{ color: '#666', fontSize: '0.75rem' }}>{algoInfo[algo2].desc}</span>
              </div>
              {renderGrid(grid2, false)}
              {renderStats(stats2, algo2, algoInfo[algo2].color)}
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: '0.7rem', color: '#666', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 14, height: 14, background: '#00ff88', borderRadius: 2, boxShadow: '0 0 8px #00ff88' }} /><span>Start</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 14, height: 14, background: '#ff6b6b', borderRadius: 2, boxShadow: '0 0 8px #ff6b6b' }} /><span>End</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 14, height: 14, background: '#2a2a4e', borderRadius: 2 }} /><span>Wall</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 14, height: 14, background: 'rgba(0,212,255,0.4)', borderRadius: 2 }} /><span>Visited</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 14, height: 14, background: 'linear-gradient(135deg, #00ff88, #00d4ff)', borderRadius: 2 }} /><span>Path</span></div>
        </div>

        {/* Info */}
        <div style={{ textAlign: 'center', marginTop: 20, color: '#444', fontSize: '0.7rem' }}>
          Click to draw walls • Drag start/end to move • Generate mazes with different algorithms
        </div>
      </div>
    </div>
  );
}
