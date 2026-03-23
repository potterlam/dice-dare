/*
  骰子挑戰遊戲 - Dice Dare (Socket.IO version for Render)
  Cross-device real-time sync between GM and Roller
*/

const socket = io();

let role = null;     // 'gm' or 'roller'
let roomCode = null;
let cameraStream = null;
let peerConnection = null;
let pendingCandidates = [];
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};
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
  setupWebRTCListeners();
  applyTranslations();
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
  document.getElementById('dareInputs').innerHTML = '';
  t('defaultDares').forEach(d => addDareInput(d));
}

function addDareInput(value) {
  const container = document.getElementById('dareInputs');
  const index = container.children.length + 1;
  const div = document.createElement('div');
  div.className = 'input-group';
  const label = document.createElement('label');
  label.textContent = t('dareLabel') + ' ' + index + '：';
  const textarea = document.createElement('textarea');
  textarea.className = 'dare-input';
  textarea.placeholder = t('darePlaceholder');
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
  if (dares.length < 2) { alert(t('alertMinDares')); return; }

  socket.emit('createRoom', { dares }, (res) => {
    if (!res.success) { alert(res.message || t('alertCreateFail')); return; }
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
  if (code.length !== 4) { alert(t('alertRoomCode')); return; }

  socket.emit('joinRoom', { roomCode: code, role: 'roller' }, (res) => {
    if (!res.success) { alert(res.message || t('alertJoinFail')); return; }
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
    document.getElementById('roleIndicator').textContent = t('gmSpectator');
    document.getElementById('rollerControls').classList.add('hidden');
    document.getElementById('spectatorBadge').classList.remove('hidden');
  } else {
    document.getElementById('roleIndicator').textContent = t('rollerRole');
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
  document.getElementById('lobbyBtn').addEventListener('click', backToLobby);
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.querySelector('.modal-overlay').addEventListener('click', closeModal);
  document.getElementById('startCameraBtn').addEventListener('click', startCamera);
  document.getElementById('stopCameraBtn').addEventListener('click', stopCamera);
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
          alert(res.message || t('alertRollFail'));
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
      alert(res.message || t('alertStopFail'));
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
    showLastRollMsg(t('eliminatedMsg') + elim.number + '：' + elim.dare);

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
    if (role === 'gm') showToast(t('rollerDisconnected'));
  });
  socket.on('gmLeft', () => {
    if (role === 'roller') showToast(t('gmDisconnected'));
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
    container.innerHTML = '<p class="empty-msg">' + escapeHtml(t('noHistory')) + '</p>';
    return;
  }
  const locale = currentLang === 'zh' ? 'zh-HK' : 'en-US';
  [...gameData.rollHistory].reverse().forEach(r => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML =
      '<span class="history-eliminated">' + escapeHtml(t('historyEliminated')) + '</span> ' +
      '<strong>#' + r.number + '</strong> — ' + escapeHtml(r.dare) +
      '<div class="history-time">' + new Date(r.timestamp).toLocaleString(locale) + '</div>';
    container.appendChild(div);
  });
}

function showFinalDareUI(dareNumber, dareText, dareIndex) {
  document.getElementById('finalDareNumber').textContent = t('challengePrefix') + dareNumber;
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

/* ---- Camera Stream + WebRTC ---- */
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
    cameraStream = stream;
    const video = document.getElementById('cameraStream');
    video.srcObject = stream;
    video.classList.add('active');
    document.getElementById('cameraPlaceholder').classList.add('hidden');
    document.getElementById('startCameraBtn').classList.add('hidden');
    document.getElementById('stopCameraBtn').classList.remove('hidden');

    // Start WebRTC - send our stream to the other peer
    await createPeerConnection(true);
  } catch (err) {
    showToast(t('cameraError') + (err.message || t('cameraErrorFallback')));
  }
}

function stopCamera() {
  // Close WebRTC
  closePeerConnection();
  // Notify the other side
  if (roomCode) {
    socket.emit('webrtc-stop', { roomCode });
  }

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  const video = document.getElementById('cameraStream');
  video.srcObject = null;
  video.classList.remove('active');
  document.getElementById('cameraPlaceholder').classList.remove('hidden');
  document.getElementById('startCameraBtn').classList.remove('hidden');
  document.getElementById('stopCameraBtn').classList.add('hidden');
}

async function createPeerConnection(isInitiator) {
  closePeerConnection();
  peerConnection = new RTCPeerConnection(rtcConfig);
  pendingCandidates = [];

  // Add local tracks if we have a stream
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, cameraStream);
    });
  }

  // When we receive a remote stream, show it
  peerConnection.ontrack = (event) => {
    const remoteVideo = document.getElementById('remoteStream');
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.classList.add('active');
    document.getElementById('remotePlaceholder').classList.add('hidden');
  };

  // Send ICE candidates to the other peer
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && roomCode) {
      socket.emit('webrtc-ice-candidate', { roomCode, candidate: event.candidate });
    }
  };

  // If we're the initiator, create and send an offer
  if (isInitiator) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('webrtc-offer', { roomCode, offer });
  }
}

function closePeerConnection() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  // Clear remote video
  const remoteVideo = document.getElementById('remoteStream');
  if (remoteVideo) {
    remoteVideo.srcObject = null;
    remoteVideo.classList.remove('active');
  }
  const remotePlaceholder = document.getElementById('remotePlaceholder');
  if (remotePlaceholder) {
    remotePlaceholder.classList.remove('hidden');
  }
}

function setupWebRTCListeners() {
  // Receive an offer from the other peer
  socket.on('webrtc-offer', async ({ offer }) => {
    await createPeerConnection(false);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Add any local stream tracks so the offerer can see us too
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        // Avoid adding duplicate tracks
        const senders = peerConnection.getSenders();
        if (!senders.find(s => s.track === track)) {
          peerConnection.addTrack(track, cameraStream);
        }
      });
    }

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('webrtc-answer', { roomCode, answer });

    // Apply any ICE candidates that arrived before we were ready
    for (const c of pendingCandidates) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(c));
    }
    pendingCandidates = [];
  });

  // Receive an answer from the other peer
  socket.on('webrtc-answer', async ({ answer }) => {
    if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      // Apply any ICE candidates that arrived before the answer
      for (const c of pendingCandidates) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(c));
      }
      pendingCandidates = [];
    }
  });

  // Receive ICE candidates
  socket.on('webrtc-ice-candidate', async ({ candidate }) => {
    if (peerConnection && peerConnection.remoteDescription) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      pendingCandidates.push(candidate);
    }
  });

  // Other peer stopped their camera
  socket.on('webrtc-stop', () => {
    closePeerConnection();
  });
}

/* ---- Back to Lobby ---- */
function backToLobby() {
  stopCamera();
  closePeerConnection();
  roomCode = null;
  role = null;
  gameData = { dares: [], eliminated: [], rollHistory: [], gameOver: false };
  document.getElementById('createRoomBtn').disabled = false;
  document.getElementById('roomCreatedArea').classList.add('hidden');
  document.getElementById('gmWaitingMsg').classList.remove('hidden');
  document.getElementById('gmRollerJoined').classList.add('hidden');
  document.getElementById('roomCodeInput').value = '';
  showView('roleView');
}

/* ---- Language Refresh ---- */
function refreshDynamicText() {
  // Re-label dare inputs
  const inputs = document.getElementById('dareInputs');
  if (inputs) {
    Array.from(inputs.children).forEach((div, i) => {
      const label = div.querySelector('label');
      if (label) label.textContent = t('dareLabel') + ' ' + (i + 1) + '：';
      const textarea = div.querySelector('textarea');
      if (textarea) textarea.placeholder = t('darePlaceholder');
    });
  }

  // Re-render game view dynamic content if visible
  if (!document.getElementById('gameView').classList.contains('hidden')) {
    if (role === 'gm') {
      document.getElementById('roleIndicator').textContent = t('gmSpectator');
    } else if (role === 'roller') {
      document.getElementById('roleIndicator').textContent = t('rollerRole');
    }
    updateRollHistory();
  }
}
