/*
  骰子挑戰遊戲 - Dice Dare (Static Version)
  
  Game flow:
  1. GM sets up dares (or load from shared URL)
  2. Roller presses "Roll" → dice rolls, the matching dare gets ELIMINATED
  3. Already-eliminated numbers are skipped (dice only lands on remaining)
  4. Roller presses "Stop" at any time → random dare from remaining = final punishment
  5. If only 1 dare left → auto becomes the final punishment
*/

let gameData = {
  dares: [],
  eliminated: new Set(),
  rollHistory: [],
  gameOver: false
};

document.addEventListener('DOMContentLoaded', () => {
  const hashData = parseDaresFromHash();
  if (hashData) {
    gameData.dares = hashData;
    startGame();
  }
  setupSetupView();
  setupGameView();
});

/* ---- URL sharing ---- */
function encodeDares(dares) {
  return btoa(encodeURIComponent(JSON.stringify(dares)));
}

function parseDaresFromHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  try {
    const params = new URLSearchParams(hash);
    const encoded = params.get('dares');
    if (!encoded) return null;
    const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
    if (Array.isArray(decoded) && decoded.length > 0 && decoded.every(d => typeof d === 'string')) {
      return decoded;
    }
  } catch (e) { /* invalid */ }
  return null;
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
  startGame();
}

function generateShareLink() {
  const dares = collectDares();
  if (dares.length < 2) { alert('請至少輸入兩個挑戰！'); return; }
  const encoded = encodeDares(dares);
  const url = window.location.origin + window.location.pathname + '#dares=' + encoded;
  document.getElementById('shareLinkInput').value = url;
  document.getElementById('shareLinkArea').classList.remove('hidden');

  document.getElementById('copyLinkBtn').onclick = () => {
    const input = document.getElementById('shareLinkInput');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
      showToast('連結已複製！');
    }).catch(() => {
      document.execCommand('copy');
      showToast('連結已複製！');
    });
  };
}

/* ---- Game ---- */
function startGame() {
  gameData.eliminated = new Set();
  gameData.rollHistory = [];
  gameData.gameOver = false;

  document.getElementById('setupView').classList.add('hidden');
  document.getElementById('gameView').classList.remove('hidden');

  renderDareGrid();
  updateCounts();
  updateRollHistory();
  setGameButtons(true);
  document.getElementById('diceDisplay').textContent = '?';
  document.getElementById('lastRollMsg').textContent = '';
}

function setupGameView() {
  document.getElementById('rollBtn').addEventListener('click', rollDice);
  document.getElementById('stopBtn').addEventListener('click', stopAndPunish);
  document.getElementById('resetBtn').addEventListener('click', resetGame);
  document.getElementById('backToSetupBtn').addEventListener('click', () => {
    window.location.hash = '';
    window.location.reload();
  });
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.querySelector('.modal-overlay').addEventListener('click', closeModal);
}

function rollDice() {
  if (gameData.gameOver) return;

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

      // Pick a random dare from remaining to ELIMINATE
      const elimIdx = remaining[Math.floor(Math.random() * remaining.length)];
      const dareNumber = elimIdx + 1;
      const dareText = gameData.dares[elimIdx];
      gameData.eliminated.add(elimIdx);

      gameData.rollHistory.push({
        number: dareNumber,
        dare: dareText,
        timestamp: Date.now()
      });

      dice.textContent = dareNumber;
      showLastRollMsg('✖ 淘汰 #' + dareNumber + '：' + dareText);

      renderDareGrid();
      updateCounts();
      updateRollHistory();

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
  if (gameData.gameOver) return;
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

  document.getElementById('finalDareNumber').textContent = '挑戰 #' + dareNumber;
  document.getElementById('finalDareText').textContent = dareText;
  document.getElementById('resultModal').classList.remove('hidden');

  document.querySelectorAll('.dare-grid-item').forEach(item => {
    if (parseInt(item.dataset.index) === dareIndex) {
      item.classList.add('final');
    }
  });
}

function closeModal() {
  document.getElementById('resultModal').classList.add('hidden');
}

function resetGame() {
  gameData.eliminated = new Set();
  gameData.rollHistory = [];
  gameData.gameOver = false;
  document.getElementById('diceDisplay').textContent = '?';
  document.getElementById('lastRollMsg').textContent = '';
  renderDareGrid();
  updateCounts();
  updateRollHistory();
  setGameButtons(true);
  closeModal();
}

/* ---- Helpers ---- */
function getRemainingIndices() {
  return gameData.dares.map((_, i) => i).filter(i => !gameData.eliminated.has(i));
}

function setGameButtons(active) {
  document.getElementById('rollBtn').disabled = !active;
  document.getElementById('stopBtn').disabled = !active;
}

function renderDareGrid() {
  const grid = document.getElementById('dareGrid');
  grid.innerHTML = '';
  gameData.dares.forEach((dare, i) => {
    const div = document.createElement('div');
    div.className = 'dare-grid-item';
    div.dataset.index = i;
    if (gameData.eliminated.has(i)) div.classList.add('eliminated');
    div.innerHTML =
      '<div class="dare-grid-number">#' + (i + 1) + '</div>' +
      '<div class="dare-grid-text">' + dare + '</div>';
    grid.appendChild(div);
  });
}

function updateCounts() {
  document.getElementById('remainingCount').textContent = getRemainingIndices().length;
  document.getElementById('rolledCount').textContent = gameData.eliminated.size;
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
