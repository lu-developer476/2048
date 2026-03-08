const GRID_SIZE = 4;
const STORAGE_KEY = 'gamer-2048-save';
const BEST_SCORE_KEY = 'gamer-2048-best';
const LEADERBOARD_SENT_KEY = 'gamer-2048-last-sent';
const SOUND_VOLUME_KEY = 'gamer-2048-volume';

const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const movesEl = document.getElementById('moves');
const statusTextEl = document.getElementById('status-text');
const sessionEl = document.getElementById('session-id');
const timePlayedEl = document.getElementById('time-played');
const levelTileEl = document.getElementById('level-tile');
const overlayEl = document.getElementById('overlay');
const overlayTitleEl = document.getElementById('overlay-title');
const overlayMessageEl = document.getElementById('overlay-message');
const overlayActionEl = document.getElementById('overlay-action');
const overlayCancelEl = document.getElementById('overlay-cancel');
const newGameBtn = document.getElementById('new-game-btn');
const pauseBtn = document.getElementById('undo-btn');
const restartBtn = document.getElementById('clear-save-btn');
const leaderboardContentEl = document.getElementById('leaderboard-content');
const soundVolumeEl = document.getElementById('sound-volume');
const soundToggleEl = document.getElementById('sound-toggle');

let state = null;
let previousState = null;
let touchStartX = 0;
let touchStartY = 0;
let hasWon = false;
let isInputLocked = false;
let isPaused = false;
let sessionId = Math.random().toString(36).slice(2, 8).toUpperCase();
let sessionStartTime = Date.now();
let overlayMode = null;
let overlayConfirmHandler = null;

const FX = {
  audioContext: null,
  enabled: true,
  masterVolume: 0.7,
  lastNonZeroVolume: 0.7,

  init() {
    if (this.audioContext) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      this.enabled = false;
      return;
    }

    try {
      this.audioContext = new AudioCtx();
    } catch {
      this.enabled = false;
    }
  },

  resume() {
    if (!this.enabled) return;
    this.init();
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  },


  setVolume(volume, { persist = true } = {}) {
    const next = Math.min(Math.max(Number(volume) || 0, 0), 1);
    this.masterVolume = next;

    if (next > 0) {
      this.lastNonZeroVolume = next;
    }

    if (persist) {
      localStorage.setItem(SOUND_VOLUME_KEY, String(Math.round(next * 100)));
    }

    updateSoundUI();
  },

  tone({
    frequency = 440,
    type = 'sine',
    duration = 0.08,
    volume = 0.03,
    attack = 0.005,
    release = 0.06,
    detune = 0,
  }) {
    if (!this.enabled) return;

    const effectiveVolume = volume * this.masterVolume;

    if (effectiveVolume <= 0.0001) return;

    this.init();
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.detune.setValueAtTime(detune, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(effectiveVolume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + release + 0.02);
  },

  move() {
    this.tone({
      frequency: 240,
      type: 'triangle',
      duration: 0.04,
      volume: 0.018,
      attack: 0.003,
      release: 0.04,
    });
  },

  spawn(value = 2) {
    this.tone({
      frequency: value === 4 ? 560 : 420,
      type: 'sine',
      duration: 0.05,
      volume: 0.02,
      attack: 0.003,
      release: 0.05,
    });
  },

  merge(level = 2) {
    const base = Math.min(320 + level * 22, 1200);

    this.tone({
      frequency: base,
      type: 'square',
      duration: 0.05,
      volume: 0.028,
      attack: 0.002,
      release: 0.05,
    });

    this.tone({
      frequency: base * 1.5,
      type: 'triangle',
      duration: 0.07,
      volume: 0.016,
      attack: 0.002,
      release: 0.06,
    });
  },

  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, i) => {
      setTimeout(() => {
        this.tone({
          frequency,
          type: 'triangle',
          duration: 0.11,
          volume: 0.035,
          attack: 0.004,
          release: 0.09,
        });
      }, i * 90);
    });
  },

  gameOver() {
    const notes = [392, 311.13, 233.08];
    notes.forEach((frequency, i) => {
      setTimeout(() => {
        this.tone({
          frequency,
          type: 'sawtooth',
          duration: 0.12,
          volume: 0.03,
          attack: 0.004,
          release: 0.09,
        });
      }, i * 110);
    });
  },
};

let confettiReady = false;
let confettiLoading = false;

function loadConfettiScript() {
  return new Promise((resolve) => {
    if (window.confetti) {
      confettiReady = true;
      resolve(true);
      return;
    }

    if (confettiLoading) {
      const waitForConfetti = () => {
        if (window.confetti) {
          confettiReady = true;
          resolve(true);
        } else {
          window.setTimeout(waitForConfetti, 60);
        }
      };

      waitForConfetti();
      return;
    }

    confettiLoading = true;

    const script = document.createElement('script');
    script.src =
      'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
    script.async = true;

    script.onload = () => {
      confettiReady = true;
      confettiLoading = false;
      resolve(true);
    };

    script.onerror = () => {
      confettiReady = false;
      confettiLoading = false;
      resolve(false);
    };

    document.head.appendChild(script);
  });
}

async function triggerWinParticles() {
  const ok = await loadConfettiScript();
  if (!ok || !window.confetti) return;

  const duration = 1400;
  const end = Date.now() + duration;

  const fire = () => {
    window.confetti({
      particleCount: 14,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.65 },
    });

    window.confetti({
      particleCount: 14,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.65 },
    });
  };

  fire();

  const interval = window.setInterval(() => {
    if (Date.now() > end) {
      window.clearInterval(interval);
      return;
    }

    fire();
  }, 180);
}

function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function cloneState(src) {
  return JSON.parse(JSON.stringify(src));
}

function createInitialState() {
  return {
    grid: createEmptyGrid(),
    score: 0,
    moves: 0,
    over: false,
    lastSpawn: null,
    mergedCells: [],
  };
}

function isValidGrid(grid) {
  return (
    Array.isArray(grid) &&
    grid.length === GRID_SIZE &&
    grid.every(
      (row) =>
        Array.isArray(row) &&
        row.length === GRID_SIZE &&
        row.every((value) => Number.isFinite(Number(value)))
    )
  );
}

function saveState() {
  if (!state) return;

  const payload = {
    state,
    previousState,
    hasWon,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);

    if (!parsed || typeof parsed !== 'object' || !parsed.state) {
      return null;
    }

    const parsedState = parsed.state;

    if (!isValidGrid(parsedState.grid)) {
      return null;
    }

    const normalizedState = {
      grid: parsedState.grid.map((row) => row.map((value) => Number(value) || 0)),
      score: Number(parsedState.score) || 0,
      moves: Number(parsedState.moves) || 0,
      over: Boolean(parsedState.over),
      lastSpawn: parsedState.lastSpawn ?? null,
      mergedCells: Array.isArray(parsedState.mergedCells) ? parsedState.mergedCells : [],
    };

    let normalizedPreviousState = null;

    if (parsed.previousState && isValidGrid(parsed.previousState.grid)) {
      normalizedPreviousState = {
        grid: parsed.previousState.grid.map((row) => row.map((value) => Number(value) || 0)),
        score: Number(parsed.previousState.score) || 0,
        moves: Number(parsed.previousState.moves) || 0,
        over: Boolean(parsed.previousState.over),
        lastSpawn: parsed.previousState.lastSpawn ?? null,
        mergedCells: Array.isArray(parsed.previousState.mergedCells)
          ? parsed.previousState.mergedCells
          : [],
      };
    }

    return {
      state: normalizedState,
      previousState: normalizedPreviousState,
      hasWon: Boolean(parsed.hasWon),
    };
  } catch {
    return null;
  }
}

function getBestScore() {
  return Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
}

function setBestScore(score) {
  localStorage.setItem(BEST_SCORE_KEY, String(score));
}

function getLastSentScoreSignature() {
  return localStorage.getItem(LEADERBOARD_SENT_KEY) || '';
}

function getSavedVolume() {
  const savedVolume = Number(localStorage.getItem(SOUND_VOLUME_KEY));

  if (!Number.isFinite(savedVolume)) {
    return 0.7;
  }

  return Math.min(Math.max(savedVolume, 0), 100) / 100;
}

function updateSoundUI() {
  if (!soundVolumeEl || !soundToggleEl) return;

  const percent = Math.round(FX.masterVolume * 100);
  soundVolumeEl.value = String(percent);

  soundToggleEl.textContent = percent === 0 ? 'MUTE' : `${percent}%`;
  soundToggleEl.classList.toggle('danger', percent === 0);
}

function setupSoundControls() {
  const savedVolume = getSavedVolume();
  FX.setVolume(savedVolume, { persist: false });

  if (!soundVolumeEl || !soundToggleEl) {
    return;
  }

  soundVolumeEl.addEventListener('input', () => {
    FX.setVolume(Number(soundVolumeEl.value) / 100);
  });

  soundToggleEl.addEventListener('click', () => {
    FX.resume();

    if (FX.masterVolume > 0) {
      FX.setVolume(0);
      return;
    }

    FX.setVolume(FX.lastNonZeroVolume || 0.7);
  });

  updateSoundUI();
}

function setLastSentScoreSignature(signature) {
  localStorage.setItem(LEADERBOARD_SENT_KEY, signature);
}

function buildScoreSignature() {
  return `${state.score}-${state.moves}-${findMaxTile(state.grid)}`;
}

async function submitScoreToLeaderboard() {
  if (!state || state.score <= 0) return;

  const signature = buildScoreSignature();

  if (getLastSentScoreSignature() === signature) {
    return;
  }

  let playerName = window.prompt('Ingresá tu nombre para el ranking online:', 'Player');

  if (playerName === null) return;

  playerName = playerName.trim();

  if (!playerName) {
    playerName = 'Player';
  }

  if (playerName.length > 30) {
    playerName = playerName.slice(0, 30);
  }

  try {
    const response = await fetch('/submit-score/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: playerName,
        points: state.score,
        moves: state.moves,
      }),
    });

    if (!response.ok) {
      throw new Error('No se pudo guardar el puntaje');
    }

    setLastSentScoreSignature(signature);
    await loadLeaderboard();
    console.log('Score enviado al leaderboard');
  } catch (error) {
    console.error('Error al enviar score:', error);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return map[char] || char;
  });
}

function renderLeaderboard(results = []) {
  if (!leaderboardContentEl) return;

  if (!Array.isArray(results) || results.length === 0) {
    leaderboardContentEl.innerHTML = `
      <p class="leaderboard-empty">
        Todavía no hay puntajes cargados. Sé el primero en dejar tu marca.
      </p>
    `;
    return;
  }

  const itemsHtml = results
    .map((entry, index) => {
      const safeName = escapeHtml(entry.name || 'Player');
      const points = Number(entry.points) || 0;
      const moves = Number(entry.moves) || 0;

      return `
        <article class="leaderboard-item">
          <div class="leaderboard-rank">#${index + 1}</div>

          <div class="leaderboard-meta">
            <p class="leaderboard-name">${safeName}</p>
            <p class="leaderboard-sub">Moves: ${moves}</p>
          </div>

          <div class="leaderboard-points">
            <strong>${points}</strong>
            <span>PTS</span>
          </div>
        </article>
      `;
    })
    .join('');

  leaderboardContentEl.innerHTML = `
    <div class="leaderboard-list">
      ${itemsHtml}
    </div>
  `;
}

async function loadLeaderboard() {
  if (!leaderboardContentEl) return;

  try {
    const response = await fetch('/leaderboard/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('No se pudo cargar el leaderboard');
    }

    const data = await response.json();
    renderLeaderboard(data.results || []);
  } catch (error) {
    console.error('Error al cargar leaderboard:', error);

    leaderboardContentEl.innerHTML = `
      <p class="leaderboard-empty">
        No se pudo cargar el ranking online.
      </p>
    `;
  }
}

function updateHUD() {
  scoreEl.textContent = state.score;
  movesEl.textContent = state.moves;
  bestScoreEl.textContent = getBestScore();

  if (levelTileEl) {
    levelTileEl.textContent = findMaxTile(state.grid);
  }

  if (pauseBtn) {
    pauseBtn.textContent = isPaused ? 'Reanudar' : 'Pausar';
    pauseBtn.disabled = state.over || isInputLocked;
  }

  if (state.over) {
    statusTextEl.textContent = 'OFFLINE';
  } else if (isPaused) {
    statusTextEl.textContent = 'PAUSED';
  } else {
    statusTextEl.textContent = 'ONLINE';
  }
}

function updateTimer() {
  if (!timePlayedEl || isPaused) return;

  const seconds = Math.floor((Date.now() - sessionStartTime) / 1000);

  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');

  timePlayedEl.textContent = `${m}:${s}`;
}

function randomEmptyCell(grid) {
  const empties = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) empties.push({ r, c });
    }
  }

  if (!empties.length) return null;
  return empties[Math.floor(Math.random() * empties.length)];
}

function addRandomTile(grid, { playSound = false } = {}) {
  const cell = randomEmptyCell(grid);
  if (!cell) return null;

  const value = Math.random() < 0.9 ? 2 : 4;
  grid[cell.r][cell.c] = value;

  const spawnData = {
    r: cell.r,
    c: cell.c,
    value,
  };

  if (playSound) {
    FX.spawn(value);
  }

  return spawnData;
}

function buildFreshBoardState() {
  hasWon = false;
  previousState = null;
  state = createInitialState();

  const firstSpawn = addRandomTile(state.grid);
  const secondSpawn = addRandomTile(state.grid);

  state.lastSpawn = secondSpawn || firstSpawn;
  state.mergedCells = [];
}

function startNewGame() {
  sessionId = Math.random().toString(36).slice(2, 8).toUpperCase();
  sessionStartTime = Date.now();
  isPaused = false;

  if (sessionEl) {
    sessionEl.textContent = sessionId;
  }

  FX.resume();
  localStorage.removeItem(LEADERBOARD_SENT_KEY);

  buildFreshBoardState();

  hideOverlay();
  syncAndRender();
}

function restartCurrentGame() {
  sessionStartTime = Date.now();
  isPaused = false;
  buildFreshBoardState();
  hideOverlay();
  syncAndRender();
}

function restoreOrStart() {
  const saved = loadState();

  if (saved) {
    state = saved.state;
    previousState = saved.previousState;
    hasWon = saved.hasWon || findMaxTile(state.grid) >= 2048;
    isPaused = false;

    hideOverlay();

    if (state.over) {
      showGameOver(false);
    } else if (hasWon) {
      showWin(false);
    }

    syncAndRender();
    return;
  }

  startNewGame();
}

function findMaxTile(grid) {
  return Math.max(...grid.flat());
}

function getTileLevel(value) {
  return Math.log2(value || 2);
}

function compressLine(line, rowIndex = null, direction = 'left') {
  const items = [];

  for (let i = 0; i < line.length; i++) {
    if (line[i] !== 0) {
      items.push({
        value: line[i],
        originalIndex: i,
      });
    }
  }

  const merged = [];
  const mergedCells = [];
  let scoreGain = 0;

  for (let i = 0; i < items.length; i++) {
    const current = items[i];
    const next = items[i + 1];

    if (next && current.value === next.value) {
      const newValue = current.value * 2;
      const targetIndex = merged.length;

      merged.push(newValue);
      scoreGain += newValue;

      mergedCells.push({
        row: rowIndex,
        col: targetIndex,
        value: newValue,
        direction,
      });

      i++;
    } else {
      merged.push(current.value);
    }
  }

  while (merged.length < GRID_SIZE) {
    merged.push(0);
  }

  const moved = line.some((value, index) => value !== merged[index]);

  return {
    line: merged,
    scoreGain,
    moved,
    mergedCells,
  };
}

function moveLeft(grid) {
  let moved = false;
  let gained = 0;
  const mergedCells = [];

  const newGrid = grid.map((row, r) => {
    const result = compressLine(row, r, 'left');
    if (result.moved) moved = true;
    gained += result.scoreGain;
    mergedCells.push(...result.mergedCells);
    return result.line;
  });

  return { grid: newGrid, moved, gained, mergedCells };
}

function reverseRows(grid) {
  return grid.map((row) => [...row].reverse());
}

function transpose(grid) {
  return grid[0].map((_, colIndex) => grid.map((row) => row[colIndex]));
}

function remapMergedCellsFromRight(mergedCells) {
  return mergedCells.map((cell) => ({
    ...cell,
    col: GRID_SIZE - 1 - cell.col,
  }));
}

function remapMergedCellsFromUp(mergedCells) {
  return mergedCells.map((cell) => ({
    row: cell.col,
    col: cell.row,
    value: cell.value,
    direction: 'up',
  }));
}

function remapMergedCellsFromDown(mergedCells) {
  return mergedCells.map((cell) => ({
    row: GRID_SIZE - 1 - cell.col,
    col: cell.row,
    value: cell.value,
    direction: 'down',
  }));
}

function moveRight(grid) {
  const reversed = reverseRows(grid);
  const moved = moveLeft(reversed);

  return {
    grid: reverseRows(moved.grid),
    moved: moved.moved,
    gained: moved.gained,
    mergedCells: remapMergedCellsFromRight(moved.mergedCells).map((cell) => ({
      ...cell,
      direction: 'right',
    })),
  };
}

function moveUp(grid) {
  const transposed = transpose(grid);
  const moved = moveLeft(transposed);

  return {
    grid: transpose(moved.grid),
    moved: moved.moved,
    gained: moved.gained,
    mergedCells: remapMergedCellsFromUp(moved.mergedCells),
  };
}

function moveDown(grid) {
  const transposed = transpose(grid);
  const moved = moveRight(transposed);

  return {
    grid: transpose(moved.grid),
    moved: moved.moved,
    gained: moved.gained,
    mergedCells: remapMergedCellsFromDown(moved.mergedCells),
  };
}

function hasAvailableMoves(grid) {
  if (grid.flat().includes(0)) return true;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const value = grid[r][c];
      if (c + 1 < GRID_SIZE && grid[r][c + 1] === value) return true;
      if (r + 1 < GRID_SIZE && grid[r + 1][c] === value) return true;
    }
  }

  return false;
}

function updateBestScore() {
  if (state.score > getBestScore()) {
    setBestScore(state.score);
  }
}

function clearTransientFlags() {
  state.lastSpawn = null;
  state.mergedCells = [];
}

function applyMove(direction) {
  if (state.over || isInputLocked || isPaused) return;

  FX.resume();

  let result;
  switch (direction) {
    case 'left':
      result = moveLeft(state.grid);
      break;
    case 'right':
      result = moveRight(state.grid);
      break;
    case 'up':
      result = moveUp(state.grid);
      break;
    case 'down':
      result = moveDown(state.grid);
      break;
    default:
      return;
  }

  if (!result.moved) return;

  previousState = cloneState(state);
  isInputLocked = true;

  clearTransientFlags();
  state.grid = result.grid;
  state.score += result.gained;
  state.moves += 1;
  state.mergedCells = result.mergedCells;

  FX.move();

  if (result.mergedCells.length) {
    const maxMergedValue = Math.max(...result.mergedCells.map((cell) => cell.value));
    FX.merge(getTileLevel(maxMergedValue));
  }

  const spawnData = addRandomTile(state.grid, { playSound: true });
  state.lastSpawn = spawnData;

  const maxTile = findMaxTile(state.grid);

  if (maxTile >= 2048 && !hasWon) {
    hasWon = true;
    showWin(true);
  }

  if (!hasAvailableMoves(state.grid)) {
    state.over = true;
    showGameOver(true);
  }

  updateBestScore();
  syncAndRender();

  window.setTimeout(() => {
    isInputLocked = false;
    clearTransientFlags();
    renderBoard();
    saveState();
  }, 140);
}

function undoMove() {
  if (!previousState || isInputLocked) return;

  FX.resume();

  state = cloneState(previousState);
  previousState = null;
  hasWon = findMaxTile(state.grid) >= 2048;

  hideOverlay();
  clearTransientFlags();
  syncAndRender();

  FX.tone({
    frequency: 280,
    type: 'triangle',
    duration: 0.06,
    volume: 0.018,
    attack: 0.003,
    release: 0.05,
  });
}

function syncAndRender() {
  saveState();
  updateHUD();
  renderBoard();
}

function renderBoard() {
  boardEl.innerHTML = '';

  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    boardEl.appendChild(cell);
  }

  const boardStyles = getComputedStyle(boardEl);
  const gap = parseFloat(boardStyles.getPropertyValue('--gap')) || 12;
  const sampleCell = boardEl.querySelector('.cell');
  const cellSize = sampleCell?.getBoundingClientRect().width || 92;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const value = state.grid[r][c];
      if (!value) continue;

      const tile = document.createElement('div');
      const special = value > 2048 ? ' tile-super' : ` tile-${value}`;

      tile.className = `tile${special}`;
      tile.textContent = value;
      tile.style.left = `${gap + c * (cellSize + gap)}px`;
      tile.style.top = `${gap + r * (cellSize + gap)}px`;
      tile.style.fontSize =
        value >= 1024 ? '1.2rem' : value >= 128 ? '1.5rem' : '1.8rem';

      if (state.lastSpawn && state.lastSpawn.r === r && state.lastSpawn.c === c) {
        tile.classList.add('tile-spawn');
      }

      if (state.mergedCells.some((cell) => cell.row === r && cell.col === c)) {
        tile.classList.add('tile-merge');
      }

      boardEl.appendChild(tile);
    }
  }
}

function showOverlay(
  title,
  message,
  {
    actionLabel = 'Aceptar',
    actionClass = 'primary',
    showCancel = false,
    cancelLabel = 'Cancelar',
    mode = null,
    onConfirm = null,
  } = {}
) {
  overlayMode = mode;
  overlayConfirmHandler = onConfirm;

  overlayTitleEl.textContent = title;
  overlayMessageEl.textContent = message;

  overlayActionEl.textContent = actionLabel;
  overlayActionEl.classList.remove('primary', 'secondary', 'danger');
  overlayActionEl.classList.add(actionClass);

  if (overlayCancelEl) {
    overlayCancelEl.textContent = cancelLabel;
    overlayCancelEl.classList.toggle('hidden', !showCancel);
  }

  overlayEl.classList.remove('hidden');
}

function hideOverlay() {
  overlayMode = null;
  overlayConfirmHandler = null;
  overlayEl.classList.add('hidden');
}

function showWin(playSound = false) {
  overlayActionEl.textContent = 'Jugar otra vez';

  showOverlay(
    'Objetivo cumplido',
    'Llegaste a 2048. Podés seguir jugando y reventar el tablero todavía más.',
    {
      actionLabel: 'Jugar otra vez',
      actionClass: 'primary',
      mode: 'result',
      onConfirm: () => startNewGame(),
    }
  );

  if (playSound) {
    FX.win();
    triggerWinParticles();
  }
}

function showGameOver(playSound = false) {
  overlayActionEl.textContent = 'Jugar otra vez';

  showOverlay(
    'Game Over',
    'Sin movimientos. ¡Bien jugado!',
    {
      actionLabel: 'Jugar otra vez',
      actionClass: 'primary',
      mode: 'result',
      onConfirm: () => startNewGame(),
    }
  );

  if (playSound) {
    FX.gameOver();
  }

  submitScoreToLeaderboard();
}

function togglePause() {
  if (state.over || isInputLocked) return;

  isPaused = !isPaused;

  if (isPaused) {
    showOverlay('Partida en pausa', 'El juego está detenido. Presioná "Reanudar" para continuar.', {
      actionLabel: 'Reanudar',
      actionClass: 'primary',
      mode: 'pause',
      onConfirm: () => togglePause(),
    });
  } else {
    hideOverlay();
  }

  updateHUD();
}

function confirmNewGame() {
  showOverlay('¿Desea iniciar una partida?', 'Se comenzará una nueva sesión y se perderá el progreso actual.', {
    actionLabel: 'Confirmar',
    actionClass: 'primary',
    showCancel: true,
    cancelLabel: 'Cancelar',
    mode: 'confirm',
    onConfirm: () => startNewGame(),
  });
}

function confirmRestartCurrentGame() {
  showOverlay('¿Desea reiniciar la partida?', 'Se reiniciará la partida en curso, manteniendo la sesión activa.', {
    actionLabel: 'Reiniciar',
    actionClass: 'primary',
    showCancel: true,
    cancelLabel: 'Cancelar',
    mode: 'confirm',
    onConfirm: () => restartCurrentGame(),
  });
}

function handleKey(event) {
  const key = event.key.toLowerCase();

  const map = {
    arrowleft: 'left',
    a: 'left',
    arrowright: 'right',
    d: 'right',
    arrowup: 'up',
    w: 'up',
    arrowdown: 'down',
    s: 'down',
  };

  if (map[key]) {
    event.preventDefault();
    applyMove(map[key]);
    return;
  }

  if (key === 'u') {
    event.preventDefault();
    undoMove();
  }

  if (key === 'r') {
    event.preventDefault();
    confirmRestartCurrentGame();
  }
}

function handleTouchStart(event) {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  FX.resume();
}

function handleTouchEnd(event) {
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  const threshold = 30;

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    applyMove(dx > 0 ? 'right' : 'left');
  } else {
    applyMove(dy > 0 ? 'down' : 'up');
  }
}


function handleTouchMove(event) {
  event.preventDefault();
}

function setupAudioUnlock() {
  const unlock = () => FX.resume();

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true, once: false });
}

window.addEventListener('keydown', handleKey);
window.addEventListener('resize', renderBoard);

boardEl.addEventListener('touchstart', handleTouchStart, { passive: true });
boardEl.addEventListener('touchend', handleTouchEnd, { passive: true });
boardEl.addEventListener('touchmove', handleTouchMove, { passive: false });

newGameBtn.addEventListener('click', () => {
  FX.resume();
  confirmNewGame();
});

pauseBtn.addEventListener('click', () => {
  FX.resume();
  togglePause();
});

restartBtn.addEventListener('click', () => {
  FX.resume();
  confirmRestartCurrentGame();
});

overlayActionEl.addEventListener('click', () => {
  FX.resume();

  if (typeof overlayConfirmHandler === 'function') {
    const handler = overlayConfirmHandler;
    if (overlayMode !== 'pause') {
      hideOverlay();
    }
    handler();
  }
});

if (overlayCancelEl) {
  overlayCancelEl.addEventListener('click', () => {
    if (isPaused) {
      showOverlay('Partida en pausa', 'El juego está detenido. Presioná "Reanudar" para continuar.', {
        actionLabel: 'Reanudar',
        actionClass: 'primary',
        mode: 'pause',
        onConfirm: () => togglePause(),
      });
      return;
    }

    hideOverlay();
  });
}

setupAudioUnlock();
setupSoundControls();
restoreOrStart();
updateTimer();
loadLeaderboard();
setInterval(updateTimer, 1000);
