/*
  骰子挑戰遊戲 - Dice Dare
  
  Game flow (Deal-or-No-Deal style):
  1. GM sets up dares → generates share link for Roller
  2. GM clicks "觀戰模式" → enters read-only spectator view
  3. Roller opens link → rolls dice to eliminate dares
  4. Roller presses "Stop" → random remaining dare = final punishment
  5. GM spectator view syncs in real-time via BroadcastChannel (same device)
*/

let gameData = {
  dares: [],
  eliminated: [],  // array of indices (for JSON serialization)
  rollHistory: [],
  gameOver: false
};

let isSpectator = false;
let channel = null; // BroadcastChannel for GM-Roller sync

document.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.slice(1);

  if (hash) {
    const params = new URLSearchParams(hash);

    // Spectator mode: #spectate=<encoded>
    const spectateData = params.get('spectate');
    if (spectateData) {
      const dares = decodeDares(spectateData);
      if (dares) {
        gameData.dares = dares;
        isSpectator = true;
        startSpectatorMode();
        return;
      }
    }

    // Roller mode: #dares=<encoded>
    const daresData = params.get('dares');
    if (daresData) {
      const dares = decodeDares(daresData);
      if (dares) {
        gameData.dares = dares;
        startGame(false);
        setupBroadcast(false);
        return;
      }
    }
  }

  // Default: show setup view
  setupSetupView();
  setupGameView();
});

/* ---- Encoding ---- */
function encodeDares(dares) {
  return btoa(encodeURIComponent(JSON.stringify(dares)));
}

function decodeDares(encoded) {
  try {
    const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
    if (Array.isArray(decoded) && decoded.length > 0 && decoded.every(d => typeof d === 'string')) {
      return decoded;
    }
  } catch (e) { /* invalid */ }
  return null;
}

/* ---- BroadcastChannel sync ---- */
function setupBroadcast(spectator) {
  try {
    channel = new BroadcastChannel('dice-dare-sync');
    if (spectator) {
      channel.onmessage = (e) => {
        if (e.data && e.data.type === 'stateUpdate') {
          gameData.dares = e.data.state.dares;
          gameData.eliminated = e.data.state.eliminated;
          gameData.rollHistory = e.data.state.rollHistory;
          gameData.gameOver = e.data.state.gameOver;
          renderDareGrid();
          updateCounts();
          updateRollHistory();
          document.getElementById('diceDisplay').textContent = e.data.state.diceValue || '?';
          document.getElementById('lastRollMsg').textContent = e.data.state.lastMsg || '';

          if (e.data.state.finalDare) {
            showFinalDareUI(e.data.state.finalDare.number, e.data.state.finalDare.text);
          }
        }
      };
    }
  } catch (e) {
    // BroadcastChannel not supported
  }
}

function broadcastState(extra) {
  if (!channel) return;
  channel.postMessage({
    type: 'stateUpdate',
    state: {
      dares: gameData.dares,
      eliminated: gameData.eliminated,
      rollHistory: gameData.rollHistory,
      gameOver: gameData.gameOver,
      ...extra
    }
  });
}

/* ---- Setup View ---- */
function setupSetupView() {
  document.getElementById('addDareBtn').addEventListener('click', () => addDareInput());
  document.getElementById('removeDareBtn').addEventListener('click', removeLastDare);
  document.getElementById('startGameBtn').addEventListener('click', onStartGame);
  document.getElementById('generateLinkBtn').addEventListener('click', generateShareLink);

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

function onStartGame() {
  const dares = collectDares();
  if (dares.length < 2) { alert('請至少輸入兩個挑戰！'); return; }
  gameData.dares = dares;
  startGame(false);
  setupBroadcast(false);
}

function generateShareLink() {
  const dares = collectDares();
  if (dares.length < 2) { alert('請至少輸入兩個挑戰！'); return; }
  const encoded = encodeDares(dares);
  const base = window.location.origin + window.location.pathname;
  const rollerUrl = base + '#dares=' + encoded;
  const spectateUrl = base + '#spectate=' + encoded;

  document.getElementById('rollerLinkInput').value = rollerUrl;
  document.getElementById('spectateLinkInput').value = spectateUrl;
  document.getElementById('shareLinkArea').classList.remove('hidden');

  document.getElementById('copyRollerLinkBtn').onclick = () => {
    copyToClipboard(document.getElementById('rollerLinkInput'));
  };
  document.getElementById('copySpectateLinkBtn').onclick = () => {
    copyToClipboard(document.getElementById('spectateLinkInput'));
  };
  document.getElementById('openSpectateBtn').onclick = () => {
    window.open(spectateUrl, '_blank');
  };
}

function copyToClipboard(inputEl) {
  inputEl.select();
  navigator.clipboard.writeText(inputEl.value).then(() => {
    showToast('連結已複製！');
  }).catch(() => {
    document.execCommand('copy');
    showToast('連結已複製！');
  });
}

/* ---- Game ---- */
function startGame(spectator) {
  gameData.eliminated = [];
  gameData.rollHistory = [];
  gameData.gameOver = false;

  document.getElementById('setupView').classList.add('hidden');
  document.getElementById('gameView').classList.remove('hidden');

  if (spectator) {
    document.getElementById('rollBtn').classList.add('hidden');
    document.getElementById('stopBtn').classList.add('hidden');
    document.getElementById('resetBtn').classList.add('hidden');
    document.getElementById('spectatorBadge').classList.remove('hidden');
  }

  renderDareGrid();
  updateCounts();
  updateRollHistory();
  setGameButtons(!spectator);
  document.getElementById('diceDisplay').textContent = '?';
  document.getElementById('lastRollMsg').textContent = '';
}

function startSpectatorMode() {
  setupGameView();
  startGame(true);
  setupBroadcast(true);
}

function setupGameView() {
  const rollBtn = document.getElementById('rollBtn');
  const stopBtn = document.getElementById('stopBtn');
  const resetBtn = document.getElementById('resetBtn');
  const backBtn = document.getElementById('backToSetupBtn');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const overlay = document.querySelector('.modal-overlay');

  if (rollBtn) rollBtn.addEventListener('click', rollDice);
  if (stopBtn) stopBtn.addEventListener('click', stopAndPunish);
  if (resetBtn) resetBtn.addEventListener('click', resetGame);
  if (backBtn) backBtn.addEventListener('click', () => {
    window.location.hash = '';
    window.location.reload();
  });
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', closeModal);
}

function rollDice() {
  if (gameData.gameOver || isSpectator) return;

  const remaining = getRemainingIndices();
  if (remaining.length <= 1) return;

  const dice = document.getElementById('diceDisplay');
  const rollBtn = document.getElementById('rollBtn');
  rollBtn.disabled = true;
  dice.classList.add('rolling');

  let count = 0;
  const interval = setInterval(() => {
    const randIdx = remaining[Math.floor(Math.random() * remaining.length)];
    dice.textContent = randIdx + 1;
    count++;
    if (count > 8) {
      clearInterval(interval);
      dice.classList.remove('rolling');

      const elimIdx = remaining[Math.floor(Math.random() * remaining.length)];
      const dareNumber = elimIdx + 1;
      const dareText = gameData.dares[elimIdx];
      gameData.eliminated.push(elimIdx);

      gameData.rollHistory.push({
        number: dareNumber,
        dare: dareText,
        timestamp: Date.now()
      });

      dice.textContent = dareNumber;
      const msg = '✖ 淘汰 #' + dareNumber + '：' + dareText;
      showLastRollMsg(msg);

      renderDareGrid();
      updateCounts();
      updateRollHistory();

      broadcastState({ diceValue: dareNumber, lastMsg: msg });

      const nowRemaining = getRemainingIndices();
      if (nowRemaining.length === 1) {
        setTimeout(() => showFinalDare(nowRemaining[0]), 600);
      } else {
        rollBtn.disabled = false;
      }
    }
  }, 100);
}

function stopAndPunish() {
  if (gameData.gameOver || isSpectator) return;
  const remaining = getRemainingIndices();
  if (!remaining.length) return;

  const pickedIdx = remaining[Math.floor(Math.random() * remaining.length)];
  showFinalDare(pickedIdx);
}

function showFinalDare(dareIndex) {
  gameData.gameOver = true;
  setGameButtons(false);

  const dareNumber = dareIndex + 1;
  const dareText = gameData.dares[dareIndex];

  showFinalDareUI(dareNumber, dareText);

  document.querySelectorAll('.dare-grid-item').forEach(item => {
    if (parseInt(item.dataset.index) === dareIndex) {
      item.classList.add('final');
    }
  });

  broadcastState({
    diceValue: dareNumber,
    lastMsg: '🎯 最終懲罰！',
    finalDare: { number: dareNumber, text: dareText }
  });
}

function showFinalDareUI(dareNumber, dareText) {
  document.getElementById('finalDareNumber').textContent = '挑戰 #' + dareNumber;
  document.getElementById('finalDareText').textContent = dareText;
  document.getElementById('resultModal').classList.remove('hidden');

  document.querySelectorAll('.dare-grid-item').forEach(item => {
    if (parseInt(item.dataset.index) === (dareNumber - 1)) {
      item.classList.add('final');
    }
  });
}

function closeModal() {
  document.getElementById('resultModal').classList.add('hidden');
}

function resetGame() {
  if (isSpectator) return;
  gameData.eliminated = [];
  gameData.rollHistory = [];
  gameData.gameOver = false;
  document.getElementById('diceDisplay').textContent = '?';
  document.getElementById('lastRollMsg').textContent = '';
  renderDareGrid();
  updateCounts();
  updateRollHistory();
  setGameButtons(true);
  closeModal();
  broadcastState({ diceValue: '?', lastMsg: '' });
}

/* ---- Helpers ---- */
function getRemainingIndices() {
  return gameData.dares.map((_, i) => i).filter(i => !gameData.eliminated.includes(i));
}

function setGameButtons(active) {
  const rollBtn = document.getElementById('rollBtn');
  const stopBtn = document.getElementById('stopBtn');
  if (rollBtn) rollBtn.disabled = !active;
  if (stopBtn) stopBtn.disabled = !active;
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
      '<div class="dare-grid-text">' + dare + '</div>';
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
    container.innerHTML = '<p class="empty-msg">暫無擲骰紀錄，按「擲骰子」開始！</p>';
    return;
  }
  [...gameData.rollHistory].reverse().forEach(r => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML =
      '<span class="history-eliminated">✖ 淘汰</span> ' +
      '<strong>#' + r.number + '</strong> — ' + r.dare +
      '<div class="history-time">' + new Date(r.timestamp).toLocaleString('zh-HK') + '</div>';
    container.appendChild(div);
  });
}

function showLastRollMsg(msg) {
  const el = document.getElementById('lastRollMsg');
  el.textContent = msg;
  el.classList.remove('fade-in');
  void el.offsetWidth;
  el.classList.add('fade-in');
}

function showToast(message) {
  const existing = document.querySelector('.copy-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}
