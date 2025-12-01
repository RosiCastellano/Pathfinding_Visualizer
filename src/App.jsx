import React, { useState, useCallback, useRef } from 'react';

const ROWS = 25;
const COLS = 40;
const CELL_SIZE = 22;

const createGrid = () => {
  const grid = [];
  for (let row = 0; row < ROWS; row++) {
    const currentRow = [];
    for (let col = 0; col < COLS; col++) {
      currentRow.push({
        row, col,
        isStart: row === 12 && col === 5,
        isEnd: row === 12 && col === 34,
        isWall: false, isVisited: false, isPath: false,
        distance: Infinity, heuristic: 0, previous: null,
      });
    }
    grid.push(currentRow);
  }
  return grid;
};

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

export default function App() {
  const [grid, setGrid] = useState(createGrid);
  const [isRunning, setIsRunning] = useState(false);
  const [algorithm, setAlgorithm] = useState('astar');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState('wall');
  const [stats, setStats] = useState({ visited: 0, pathLength: 0, time: 0 });
  const [speed, setSpeed] = useState(15);
  const timeouts = useRef([]);

  const clearTimeouts = () => { timeouts.current.forEach(t => clearTimeout(t)); timeouts.current = []; };

  const resetGrid = useCallback(() => {
    clearTimeouts(); setIsRunning(false); setGrid(createGrid()); setStats({ visited: 0, pathLength: 0, time: 0 });
  }, []);

  const clearPath = useCallback(() => {
    clearTimeouts(); setIsRunning(false);
    setGrid(prev => prev.map(row => row.map(n => ({ ...n, isVisited: false, isPath: false, distance: Infinity, heuristic: 0, previous: null }))));
    setStats({ visited: 0, pathLength: 0, time: 0 });
  }, []);

  const generateMaze = useCallback(() => {
    clearTimeouts(); setIsRunning(false);
    const g = createGrid();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!g[r][c].isStart && !g[r][c].isEnd) g[r][c].isWall = Math.random() < 0.3;
    setGrid(g); setStats({ visited: 0, pathLength: 0, time: 0 });
  }, []);

  const handleMouseDown = (r, c) => {
    if (isRunning) return;
    const n = grid[r][c];
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
    if (grid[r][c].isStart || grid[r][c].isEnd) return;
    setGrid(prev => { const g = prev.map(row => row.map(n => ({ ...n }))); g[r][c].isWall = !g[r][c].isWall; return g; });
  };

  const moveStart = (r, c) => {
    if (grid[r][c].isEnd || grid[r][c].isWall) return;
    setGrid(prev => { const g = prev.map(row => row.map(n => ({ ...n, isStart: false }))); g[r][c].isStart = true; return g; });
  };

  const moveEnd = (r, c) => {
    if (grid[r][c].isStart || grid[r][c].isWall) return;
    setGrid(prev => { const g = prev.map(row => row.map(n => ({ ...n, isEnd: false }))); g[r][c].isEnd = true; return g; });
  };

  const visualize = useCallback(() => {
    if (isRunning) return;
    clearPath();
    setTimeout(() => {
      setIsRunning(true);
      const t0 = performance.now();
      const g = grid.map(row => row.map(n => ({ ...n, isVisited: false, isPath: false, distance: Infinity, heuristic: 0, previous: null })));
      let start, end;
      for (const row of g) for (const n of row) { if (n.isStart) start = n; if (n.isEnd) end = n; }
      let visited;
      switch (algorithm) {
        case 'bfs': visited = bfs(g, start, end); break;
        case 'dfs': visited = dfs(g, start, end); break;
        case 'greedy': visited = greedy(g, start, end); break;
        default: visited = aStar(g, start, end);
      }
      const t1 = performance.now();
      const path = getPath(end);
      for (let i = 0; i <= visited.length; i++) {
        const t = setTimeout(() => {
          if (i === visited.length) {
            for (let j = 0; j < path.length; j++) {
              const pt = setTimeout(() => {
                setGrid(prev => { const u = prev.map(r => r.map(n => ({ ...n }))); u[path[j].row][path[j].col].isPath = true; return u; });
                if (j === path.length - 1) { setIsRunning(false); setStats({ visited: visited.length, pathLength: path.length, time: (t1 - t0).toFixed(2) }); }
              }, 50 * j);
              timeouts.current.push(pt);
            }
          } else {
            setGrid(prev => { const u = prev.map(r => r.map(n => ({ ...n }))); u[visited[i].row][visited[i].col].isVisited = true; return u; });
          }
        }, speed * i);
        timeouts.current.push(t);
      }
    }, 50);
  }, [grid, algorithm, isRunning, speed, clearPath]);

  const algoInfo = {
    astar: { name: 'A* Search', desc: 'Optimal — Uses heuristic + distance', color: '#00ff88' },
    bfs: { name: 'Breadth-First', desc: 'Optimal — Explores level by level', color: '#00d4ff' },
    dfs: { name: 'Depth-First', desc: 'Not Optimal — Goes deep first', color: '#ff6b6b' },
    greedy: { name: 'Greedy Best-First', desc: 'Not Optimal — Only uses heuristic', color: '#ffd93d' },
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', padding: 20, fontFamily: "'JetBrains Mono', monospace", color: '#e0e0e0', userSelect: 'none' }} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Orbitron:wght@700;900&display=swap');
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 20px #00ff88; } 50% { box-shadow: 0 0 40px #00ff88; } }
        @keyframes endPulse { 0%, 100% { box-shadow: 0 0 20px #ff6b6b; } 50% { box-shadow: 0 0 40px #ff6b6b; } }
        @keyframes visitedAnim { 0% { transform: scale(0); background: #00ff88; } 50% { transform: scale(1.2); } 100% { transform: scale(1); background: rgba(0, 212, 255, 0.4); } }
        @keyframes pathAnim { 0% { transform: scale(0.5); } 50% { transform: scale(1.3); } 100% { transform: scale(1); background: linear-gradient(135deg, #00ff88, #00d4ff); } }`}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '2.5rem', fontWeight: 900, textAlign: 'center', marginBottom: 8, background: 'linear-gradient(135deg, #00ff88, #00d4ff, #ff6b6b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: 4 }}>PATHFINDER</h1>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: 24, fontSize: '0.85rem', letterSpacing: 2 }}>SEARCH ALGORITHM VISUALIZER</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          {Object.entries(algoInfo).map(([key, info]) => (
            <button key={key} onClick={() => setAlgorithm(key)} style={{ padding: '12px 20px', border: algorithm === key ? `2px solid ${info.color}` : '2px solid #333', background: algorithm === key ? `${info.color}15` : 'transparent', color: algorithm === key ? info.color : '#888', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, boxShadow: algorithm === key ? `0 0 20px ${info.color}40` : 'none' }}>{info.name}</button>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginBottom: 16, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid #222' }}>
          <span style={{ color: algoInfo[algorithm].color, fontWeight: 600 }}>{algoInfo[algorithm].name}</span>
          <span style={{ color: '#666', margin: '0 12px' }}>—</span>
          <span style={{ color: '#888' }}>{algoInfo[algorithm].desc}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={visualize} disabled={isRunning} style={{ padding: '14px 32px', background: isRunning ? '#333' : 'linear-gradient(135deg, #00ff88, #00d4ff)', border: 'none', borderRadius: 8, color: isRunning ? '#666' : '#000', fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 700, cursor: isRunning ? 'not-allowed' : 'pointer', boxShadow: isRunning ? 'none' : '0 0 30px rgba(0,255,136,0.4)', letterSpacing: 1 }}>{isRunning ? 'RUNNING...' : '▶ VISUALIZE'}</button>
          <button onClick={clearPath} disabled={isRunning} style={{ padding: '14px 24px', background: 'transparent', border: '2px solid #444', borderRadius: 8, color: '#888', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, cursor: isRunning ? 'not-allowed' : 'pointer' }}>Clear Path</button>
          <button onClick={generateMaze} disabled={isRunning} style={{ padding: '14px 24px', background: 'transparent', border: '2px solid #444', borderRadius: 8, color: '#888', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, cursor: isRunning ? 'not-allowed' : 'pointer' }}>Random Maze</button>
          <button onClick={resetGrid} style={{ padding: '14px 24px', background: 'transparent', border: '2px solid #444', borderRadius: 8, color: '#888', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Reset All</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <span style={{ color: '#666', fontSize: '0.8rem' }}>SPEED:</span>
          <input type="range" min="1" max="50" value={51 - speed} onChange={(e) => setSpeed(51 - parseInt(e.target.value))} style={{ width: 120, accentColor: '#00ff88' }} />
          <span style={{ color: '#888', fontSize: '0.8rem', minWidth: 50 }}>{speed < 15 ? 'Fast' : speed < 30 ? 'Medium' : 'Slow'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-block', padding: 16, background: 'rgba(0,0,0,0.5)', borderRadius: 12, border: '1px solid #222', boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}>
            {grid.map((row, ri) => (
              <div key={ri} style={{ display: 'flex' }}>
                {row.map((node, ci) => {
                  let bg = 'rgba(30,30,40,0.8)', anim = 'none', shadow = 'inset 0 0 0 1px rgba(255,255,255,0.03)';
                  if (node.isStart) { bg = '#00ff88'; anim = 'pulse 2s infinite'; shadow = '0 0 20px #00ff88'; }
                  else if (node.isEnd) { bg = '#ff6b6b'; anim = 'endPulse 2s infinite'; shadow = '0 0 20px #ff6b6b'; }
                  else if (node.isPath) { bg = 'linear-gradient(135deg, #00ff88, #00d4ff)'; anim = 'pathAnim 0.5s forwards'; shadow = '0 0 15px rgba(0,255,136,0.6)'; }
                  else if (node.isVisited) { bg = 'rgba(0, 212, 255, 0.4)'; anim = 'visitedAnim 0.4s forwards'; }
                  else if (node.isWall) { bg = 'linear-gradient(135deg, #1a1a2e, #2a2a4e)'; shadow = 'inset 0 0 10px rgba(0,0,0,0.8)'; }
                  return <div key={ci} onMouseDown={() => handleMouseDown(ri, ci)} onMouseEnter={() => handleMouseEnter(ri, ci)} style={{ width: CELL_SIZE, height: CELL_SIZE, background: bg, border: '1px solid rgba(255,255,255,0.02)', animation: anim, boxShadow: shadow, cursor: 'pointer', borderRadius: 2 }} />;
                })}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid #222', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}><div style={{ color: '#00d4ff', fontSize: '1.8rem', fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>{stats.visited}</div><div style={{ color: '#666', fontSize: '0.75rem', letterSpacing: 2 }}>NODES VISITED</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ color: '#00ff88', fontSize: '1.8rem', fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>{stats.pathLength}</div><div style={{ color: '#666', fontSize: '0.75rem', letterSpacing: 2 }}>PATH LENGTH</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ color: '#ffd93d', fontSize: '1.8rem', fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>{stats.time}ms</div><div style={{ color: '#666', fontSize: '0.75rem', letterSpacing: 2 }}>COMPUTE TIME</div></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20, fontSize: '0.75rem', color: '#666', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 16, height: 16, background: '#00ff88', borderRadius: 3, boxShadow: '0 0 10px #00ff88' }} /><span>Start</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 16, height: 16, background: '#ff6b6b', borderRadius: 3, boxShadow: '0 0 10px #ff6b6b' }} /><span>End</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 16, height: 16, background: '#2a2a4e', borderRadius: 3 }} /><span>Wall (click)</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 16, height: 16, background: 'rgba(0,212,255,0.4)', borderRadius: 3 }} /><span>Visited</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 16, height: 16, background: 'linear-gradient(135deg, #00ff88, #00d4ff)', borderRadius: 3 }} /><span>Path</span></div>
        </div>
      </div>
    </div>
  );
}
