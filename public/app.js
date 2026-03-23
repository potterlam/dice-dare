/*
  骰子挑戰遊戲 - Dice Dare (Socket.IO version for Render)
  Cross-device real-time sync between GM and Roller
*/

const socket = io();

let role = null;     // 'gm' or 'roller'
let roomCode = null;
let gameData = {
  dares: [],
  eliminated: [],
  rollHistory: [],
  gameOver: false
};

document.addEventListener('DOMContentLoaded', () => {
  setupRoleSelection();
  setupGMView();
  setupRollerJoin();
  setupGameControls();
  setupSocketListeners();
});

/* ---- Role Selection ---- */
function setupRoleSelection() {
  document.getElementById('selectGmBtn').addEventListener('click', () => {
    role = 'gm';
    showView('gmSetupView');
  });
  document.getElementById('selectRollerBtn').addEventListener('click', () => {
    role = 'roller';
    showView('rollerJoinView');
  });
}

function showView(viewId) {
  ['roleView', 'gmSetupView', 'rollerJoinView', 'gameView'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(viewId).classList.remove('hidden');
}

/* ---- GM Setup ---- */
function setupGMView() {
  document.getElementById('addDareBtn').addEventListener('click', () => addDareInput());
  document.getElementById('removeDareBtn').addEventListener('click', removeLastDare);
  document.getElementById('createRoomBtn').addEventListener('click', createRoom);

  // Pre-fill defaults
  const defaults = [
    '講一個尷尬嘅經歷',
    '模仿一個動物叫聲',
    '跳一段舞',
    '唱一首歌',
    '做10個掌上壓',
    '講一個冷笑話'
  ];
  document.getElementById('dareInputs').innerHTML = '';
  defaults.forEach(t => addDareInput(t));
}

function addDareInput(value) {
  const container = document.getElementById('dareInputs');
  const index = container.children.length + 1;
  const div = document.createElement('div');
  div.className = 'input-group';
  const label = document.createElement('label');
  label.textContent = '挑戰 ' + index + '：';
  const textarea = document.createElement('textarea');
  textarea.className = 'dare-input';
  textarea.placeholder = '輸入挑戰內容...';
  if (value) textarea.value = value;
  div.appendChild(label);
  div.appendChild(textarea);
  container.appendChild(div);
}

function removeLastDare() {
  const container = document.getElementById('dareInputs');
  if (container.children.length > 1) {
    container.removeChild(container.lastChild);
  }
}

function collectDares() {
  const dares = [];
  document.querySelectorAll('.dare-input').forEach(input => {
    const text = input.value.trim();
    if (text) dares.push(text);
  });
  return dares;
}

function createRoom() {
  const dares = collectDares();
  if (dares.length < 2) { alert('請至少輸入兩個挑戰！'); return; }

  socket.emit('createRoom', { dares }, (res) => {
    if (!res.success) { alert(res.message || '創建失敗'); return; }
    roomCode = res.roomCode;
    gameData.dares = dares;
    gameData.eliminated = [];
    gameData.rollHistory = [];
    gameData.gameOver = false;

    document.getElementById('gmRoomCode').textContent = roomCode;
    document.getElementById('roomCreatedArea').classList.remove('hidden');
    document.getElementById('createRoomBtn').disabled = true;

    // GM also joins the room as spectator
    socket.emit('joinRoom', { roomCode, role: 'gm' }, () => {});
  });
}

/* ---- Roller Join ---- */
function setupRollerJoin() {
  document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);
  document.getElementById('roomCodeInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinRoom();
  });
}

function joinRoom() {
  const code = document.getElementById('roomCodeInput').value.trim();
  if (code.length !== 4) { alert('請輸入4位數字的房間代碼！'); return; }

  socket.emit('joinRoom', { roomCode: code, role: 'roller' }, (res) => {
    if (!res.success) { alert(res.message || '加入失敗'); return; }
    roomCode = code;
    gameData.dares = res.state.dares;
    gameData.eliminated = res.state.eliminated;
    gameData.rollHistory = res.state.rollHistory;
    gameData.gameOver = res.state.gameOver;

    enterGameView();
  });
}

/* ---- Game View ---- */
function enterGameView() {
  showView('gameView');

  document.getElementById('gameRoomCode').textContent = roomCode;

  if (role === 'gm') {
    document.getElementById('roleIndicator').textContent = '👑 GM 觀戰';
    document.getElementById('rollerControls').classList.add('hidden');
    document.getElementById('spectatorBadge').classList.remove('hidden');
  } else {
    document.getElementById('roleIndicator').textContent = '🎲 Roller';
    document.getElementById('rollerControls').classList.remove('hidden');
    document.getElementById('spectatorBadge').classList.add('hidden');
  }

  renderDareGrid();
  updateCounts();
  updateRollHistory();
  document.getElementById('diceDisplay').textContent = '?';
  document.getElementById('lastRollMsg').textContent = '';
}

function setupGameControls() {
  document.getElementById('rollBtn').addEventListener('click', rollDice);
  document.getElementById('stopBtn').addEventListener('click', stopGame);
  document.getElementById('resetBtn').addEventListener('click', resetGame);
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.querySelector('.modal-overlay').addEventListener('click', closeModal);
}

function rollDice() {
  if (role !== 'roller' || gameData.gameOver) return;

  const remaining = getRemainingIndices();
  if (remaining.length <= 1) return;

  const dice = document.getElementById('diceDisplay');
  const rollBtn = document.getElementById('rollBtn');
  const stopBtn = document.getElementById('stopBtn');
  rollBtn.disabled = true;
  stopBtn.disabled = true;
  dice.classList.add('rolling');

  // Animate random numbers
  let count = 0;
  const interval = setInterval(() => {
    const randIdx = remaining[Math.floor(Math.random() * remaining.length)];
    dice.textContent = randIdx + 1;
    count++;
    if (count > 8) {
      clearInterval(interval);
      dice.classList.remove('rolling');

      // Ask server to pick and eliminate
      socket.emit('rollDice', { roomCode }, (res) => {
        if (!res.success) {
          alert(res.message || '擲骰失敗');
          rollBtn.disabled = false;
          stopBtn.disabled = false;
          return;
        }
        // Server event 'diceRolled' will update the UI for everyone
      });
    }
  }, 100);
}

function stopGame() {
  if (role !== 'roller' || gameData.gameOver) return;

  socket.emit('stopGame', { roomCode }, (res) => {
    if (!res.success) {
      alert(res.message || '操作失敗');
    }
    // Server event 'gameOver' will update the UI for everyone
  });
}

function resetGame() {
  socket.emit('resetGame', { roomCode });
}

/* ---- Socket Event Listeners ---- */
function setupSocketListeners() {
  // Roller joined (GM sees this)
  socket.on('rollerJoined', () => {
    if (role === 'gm') {
      document.getElementById('gmWaitingMsg').classList.add('hidden');
      document.getElementById('gmRollerJoined').classList.remove('hidden');

      // Auto enter spectator game view
      socket.emit('joinRoom', { roomCode, role: 'gm' }, (res) => {
        if (res.success) {
          gameData.dares = res.state.dares;
          gameData.eliminated = res.state.eliminated;
          gameData.rollHistory = res.state.rollHistory;
          gameData.gameOver = res.state.gameOver;
          enterGameView();
        }
      });
    }
  });

  // Dice rolled (both GM and Roller receive)
  socket.on('diceRolled', (data) => {
    const { eliminated: elim, remaining, finalDare } = data;
    gameData.eliminated.push(elim.index);
    gameData.rollHistory.push({
      number: elim.number,
      dare: elim.dare,
      timestamp: Date.now()
    });

    document.getElementById('diceDisplay').textContent = elim.number;
    showLastRollMsg('✖ 淘汰 #' + elim.number + '：' + elim.dare);

    renderDareGrid();
    updateCounts();
    updateRollHistory();

    if (finalDare) {
      gameData.gameOver = true;
      setTimeout(() => showFinalDareUI(finalDare.number, finalDare.text, finalDare.index), 600);
    } else if (role === 'roller') {
      document.getElementById('rollBtn').disabled = false;
      document.getElementById('stopBtn').disabled = false;
    }
  });

  // Game over (stop button)
  socket.on('gameOver', (data) => {
    gameData.gameOver = true;
    showFinalDareUI(data.finalDare.number, data.finalDare.text, data.finalDare.index);
  });

  // Game reset
  socket.on('gameReset', (data) => {
    gameData.dares = data.dares;
    gameData.eliminated = [];
    gameData.rollHistory = [];
    gameData.gameOver = false;
    document.getElementById('diceDisplay').textContent = '?';
    document.getElementById('lastRollMsg').textContent = '';
    renderDareGrid();
    updateCounts();
    updateRollHistory();
    closeModal();
    if (role === 'roller') {
      document.getElementById('rollBtn').disabled = false;
      document.getElementById('stopBtn').disabled = false;
    }
  });

  // Connection events
  socket.on('rollerLeft', () => {
    if (role === 'gm') showToast('⚠️ Roller 斷線了');
  });
  socket.on('gmLeft', () => {
    if (role === 'roller') showToast('⚠️ GM 斷線了');
  });

  socket.on('disconnect', () => {
    const dot = document.getElementById('connectionStatus');
    if (dot) { dot.classList.remove('status-connected'); dot.classList.add('status-disconnected'); }
  });
  socket.on('connect', () => {
    const dot = document.getElementById('connectionStatus');
    if (dot) { dot.classList.remove('status-disconnected'); dot.classList.add('status-connected'); }
    // Rejoin room if we had one
    if (roomCode && role) {
      socket.emit('joinRoom', { roomCode, role }, () => {});
    }
  });
}

/* ---- UI Helpers ---- */
function getRemainingIndices() {
  return gameData.dares.map((_, i) => i).filter(i => !gameData.eliminated.includes(i));
}

function renderDareGrid() {
  const grid = document.getElementById('dareGrid');
  grid.innerHTML = '';
  gameData.dares.forEach((dare, i) => {
    const div = document.createElement('div');
    div.className = 'dare-grid-item';
    div.dataset.index = i;
    if (gameData.eliminated.includes(i)) div.classList.add('eliminated');
    div.innerHTML =
      '<div class="dare-grid-number">#' + (i + 1) + '</div>' +
      '<div class="dare-grid-text">' + escapeHtml(dare) + '</div>';
    grid.appendChild(div);
  });
}

function updateCounts() {
  document.getElementById('remainingCount').textContent = getRemainingIndices().length;
  document.getElementById('rolledCount').textContent = gameData.eliminated.length;
}

function updateRollHistory() {
  const container = document.getElementById('rollHistory');
  container.innerHTML = '';
  if (!gameData.rollHistory.length) {
    container.innerHTML = '<p class="empty-msg">暫無擲骰紀錄，等待擲骰開始！</p>';
    return;
  }
  [...gameData.rollHistory].reverse().forEach(r => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML =
      '<span class="history-eliminated">✖ 淘汰</span> ' +
      '<strong>#' + r.number + '</strong> — ' + escapeHtml(r.dare) +
      '<div class="history-time">' + new Date(r.timestamp).toLocaleString('zh-HK') + '</div>';
    container.appendChild(div);
  });
}

function showFinalDareUI(dareNumber, dareText, dareIndex) {
  document.getElementById('finalDareNumber').textContent = '挑戰 #' + dareNumber;
  document.getElementById('finalDareText').textContent = dareText;
  document.getElementById('resultModal').classList.remove('hidden');

  if (role === 'roller') {
    document.getElementById('rollBtn').disabled = true;
    document.getElementById('stopBtn').disabled = true;
  }

  document.querySelectorAll('.dare-grid-item').forEach(item => {
    if (parseInt(item.dataset.index) === dareIndex) {
      item.classList.add('final');
    }
  });
}

function showLastRollMsg(msg) {
  const el = document.getElementById('lastRollMsg');
  el.textContent = msg;
  el.classList.remove('fade-in');
  void el.offsetWidth;
  el.classList.add('fade-in');
}

function closeModal() {
  document.getElementById('resultModal').classList.add('hidden');
}

function showToast(message) {
  const existing = document.querySelector('.copy-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
