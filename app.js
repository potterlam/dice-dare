/*
  骰子挑戰遊戲 - 純前端版
  GM 設定挑戰 → 產生分享連結（挑戰編碼在 URL hash）→ Roller 開連結直接玩
  也支援同一裝置直接開始遊戲
*/

let gameData = { dares: [], usedDares: [], rollHistory: [] };

document.addEventListener('DOMContentLoaded', () => {
  // Check if URL has dares data (shared link)
  const hashData = parseDaresFromHash();
  if (hashData) {
    gameData.dares = hashData;
    gameData.usedDares = [];
    gameData.rollHistory = [];
    switchToRoller();
  } else {
    setupModeSelector();
  }
  setupGMView();
  setupRollerView();
});

/* ---- URL sharing helpers ---- */
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
  } catch (e) {
    // invalid hash data
  }
  return null;
}

/* ---- Mode selector ---- */
function setupModeSelector() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      document.getElementById('gmView').classList.add('hidden');
      document.getElementById('rollerView').classList.add('hidden');
      if (mode === 'gm') document.getElementById('gmView').classList.remove('hidden');
      if (mode === 'roller') switchToRoller();
    });
  });
}

function switchToRoller() {
  document.getElementById('modeSelector').classList.add('hidden');
  document.getElementById('gmView').classList.add('hidden');
  document.getElementById('rollerView').classList.remove('hidden');
  updateDaresList();
  updateStats();
  updateRollHistory();
}

/* ---- GM View ---- */
function setupGMView() {
  document.getElementById('addDareBtn').addEventListener('click', () => addDareInput());
  document.getElementById('removeDareBtn').addEventListener('click', removeLastDare);
  document.getElementById('generateLinkBtn').addEventListener('click', generateShareLink);
  document.getElementById('startLocalBtn').addEventListener('click', startLocalGame);

  // Pre-fill default dares
  const defaults = [
    '講一個尷尬嘅經歷',
    '模仿一個動物叫聲',
    '跳一段舞',
    '唱一首歌',
    '做10個掌上壓',
    '講一個冷笑話'
  ];
  const container = document.getElementById('dareInputs');
  container.innerHTML = '';
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

function generateShareLink() {
  const dares = collectDares();
  if (!dares.length) { alert('請至少輸入一個挑戰！'); return; }
  const encoded = encodeDares(dares);
  const url = window.location.origin + window.location.pathname + '#dares=' + encoded;
  document.getElementById('shareLinkInput').value = url;
  document.getElementById('shareLinkArea').classList.remove('hidden');

  document.getElementById('copyLinkBtn').addEventListener('click', () => {
    const input = document.getElementById('shareLinkInput');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
      showToast('連結已複製！');
    }).catch(() => {
      document.execCommand('copy');
      showToast('連結已複製！');
    });
  });
}

function startLocalGame() {
  const dares = collectDares();
  if (!dares.length) { alert('請至少輸入一個挑戰！'); return; }
  gameData.dares = dares;
  gameData.usedDares = [];
  gameData.rollHistory = [];
  switchToRoller();
}

/* ---- Roller View ---- */
function setupRollerView() {
  document.getElementById('rollBtn').addEventListener('click', rollDice);
  document.getElementById('resetBtn').addEventListener('click', resetGame);
  document.getElementById('backToGmBtn').addEventListener('click', () => {
    // Clear hash and reload to go back to GM view
    window.location.hash = '';
    window.location.reload();
  });
}

function rollDice() {
  if (!gameData.dares.length) {
    alert('沒有挑戰內容！請先由 GM 設定。');
    return;
  }

  const available = gameData.dares
    .map((_, i) => i)
    .filter(i => !gameData.usedDares.includes(i));

  if (!available.length) {
    alert('所有挑戰都已完成！請按「重置」重新開始。');
    return;
  }

  const dice = document.getElementById('diceDisplay');
  const btn = document.getElementById('rollBtn');
  btn.disabled = true;
  dice.classList.add('rolling');
  dice.textContent = '?';

  let count = 0;
  const maxDisplay = Math.min(gameData.dares.length, 6);
  const interval = setInterval(() => {
    dice.textContent = Math.floor(Math.random() * maxDisplay) + 1;
    count++;
    if (count > 12) {
      clearInterval(interval);
      dice.classList.remove('rolling');

      // Pick random from available
      const dareIndex = available[Math.floor(Math.random() * available.length)];
      const dareNumber = dareIndex + 1;
      const dareText = gameData.dares[dareIndex];
      gameData.usedDares.push(dareIndex);

      const record = {
        number: dareNumber,
        dare: dareText,
        timestamp: Date.now()
      };
      gameData.rollHistory.push(record);

      dice.textContent = dareNumber;
      document.getElementById('resultArea').classList.remove('hidden');
      document.getElementById('resultNumber').textContent = '挑戰 ' + dareNumber;
      document.getElementById('resultText').textContent = dareText;

      updateDaresList();
      updateStats();
      updateRollHistory();
      btn.disabled = false;
    }
  }, 100);
}

function resetGame() {
  gameData.usedDares = [];
  gameData.rollHistory = [];
  document.getElementById('resultArea').classList.add('hidden');
  document.getElementById('diceDisplay').textContent = '?';
  updateDaresList();
  updateStats();
  updateRollHistory();
}

/* ---- UI updates ---- */
function updateDaresList() {
  const list = document.getElementById('daresList');
  list.innerHTML = '';
  gameData.dares.forEach((dare, i) => {
    const used = gameData.usedDares.includes(i);
    const div = document.createElement('div');
    div.className = 'dare-item' + (used ? ' used' : '');
    div.innerHTML =
      '<div class="dare-content">' +
        '<span class="dare-number">' + (i + 1) + '.</span>' +
        dare +
        (used ? ' <span style="color:var(--color-danger);">(已完成)</span>' : '') +
      '</div>';
    list.appendChild(div);
  });
}

function updateStats() {
  document.getElementById('totalRolls').textContent = gameData.rollHistory.length;
  document.getElementById('remainingDares').textContent = gameData.dares.length - gameData.usedDares.length;
}

function updateRollHistory() {
  const container = document.getElementById('rollHistory');
  container.innerHTML = '';
  if (!gameData.rollHistory.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--color-text-secondary);">暫無擲骰紀錄</p>';
    return;
  }
  [...gameData.rollHistory].reverse().forEach(r => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML =
      '<strong>骰子：' + r.number + '</strong> - ' + r.dare +
      '<div style="font-size:.85rem;color:var(--color-text-secondary);margin-top:5px;">' +
        new Date(r.timestamp).toLocaleString('zh-HK') +
      '</div>';
    container.appendChild(div);
  });
}

/* ---- Toast notification ---- */
function showToast(message) {
  const existing = document.querySelector('.copy-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}
