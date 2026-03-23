/*
  i18n - Internationalization for Dice Dare
  Supports: zh (中文) and en (English)
*/

const translations = {
  zh: {
    // Title & subtitle
    title: '骰子挑戰遊戲',
    subtitle: '擲骰淘汰挑戰 — 隨時可以停，但剩低嘅就要做！',

    // GM Setup
    gmSetupTitle: '設定挑戰',
    addDare: '新增挑戰',
    removeDare: '移除最後一個',
    createRoom: '創建房間',
    roomCreated: '房間已創建！',
    roomCodeLabel: '房間代碼：',
    shareCodeMsg: '將此代碼傳給 Roller，等佢加入就可以開始！',
    waitingRoller: '等待 Roller 加入...',
    rollerJoined: 'Roller 已加入！',

    // Rules
    rulesTitle: '遊戲規則',
    rule1: 'GM 設定挑戰 → 創建房間 → 把房間代碼傳給 Roller',
    rule2: '加入房間後按',
    rule2roll: '「擲骰子」',
    rule2result: '骰到的挑戰被',
    rule2elim: '淘汰',
    rule3: '已淘汰的數字不會再出現，唔會浪費時間',
    rule4: '隨時可以按',
    rule4stop: '「停！接受懲罰」',
    rule4result: '從剩餘挑戰中隨機抽一個',
    rule5: '如果只剩 1 個挑戰，自動成為最終懲罰！',
    rule6: 'GM 可以即時睇到 Roller 嘅畫面同步更新',

    // Roller Join
    rollerJoinTitle: '加入房間',
    enterRoomCode: '輸入房間代碼：',
    roomCodePlaceholder: '輸入4位數字代碼',
    joinRoom: '加入房間',

    // Game View
    roomLabel: '房間',
    dareList: '挑戰列表',
    remaining: '剩餘',
    rolled: '已擲',
    rollHistory: '淘汰紀錄',
    rollDice: '擲骰子',
    stopAccept: '停！接受懲罰',
    spectatorMsg: 'GM 觀戰模式 — 即時同步 Roller 畫面',
    reset: '重新開始',
    backToLobby: '返回大廳',

    // Camera
    cameraTitle: '鏡頭直播',
    remotePlaceholder: '等待對方開啟鏡頭...',
    remoteLabel: '對方畫面',
    localLabel: '我的鏡頭',
    startCamera: '啟動鏡頭',
    stopCamera: '關閉鏡頭',

    // Modal
    finalPunishment: '最終懲罰！',
    confirm: '確認',

    // Dynamic text
    dareLabel: '挑戰',
    darePlaceholder: '輸入挑戰內容...',
    gmSpectator: '👑 GM 觀戰',
    rollerRole: '🎲 Roller',
    eliminatedMsg: '✖ 淘汰 #',
    challengePrefix: '挑戰 #',
    noHistory: '暫無擲骰紀錄，等待擲骰開始！',
    historyEliminated: '✖ 淘汰',
    rollerDisconnected: '⚠️ Roller 斷線了',
    gmDisconnected: '⚠️ GM 斷線了',
    cameraError: '⚠️ 無法啟動鏡頭：',
    cameraErrorFallback: '請檢查權限設定',
    alertMinDares: '請至少輸入兩個挑戰！',
    alertCreateFail: '創建失敗',
    alertRoomCode: '請輸入4位數字的房間代碼！',
    alertJoinFail: '加入失敗',
    alertRollFail: '擲骰失敗',
    alertStopFail: '操作失敗',

    // Defaults
    defaultDares: [
      '講一個尷尬嘅經歷',
      '模仿一個動物叫聲',
      '跳一段舞',
      '唱一首歌',
      '做10個掌上壓',
      '講一個冷笑話'
    ]
  },

  en: {
    // Title & subtitle
    title: 'Dice Dare',
    subtitle: 'Roll to eliminate dares — stop anytime, but you must do what\'s left!',

    // GM Setup
    gmSetupTitle: 'Set Up Dares',
    addDare: 'Add Dare',
    removeDare: 'Remove Last',
    createRoom: 'Create Room',
    roomCreated: 'Room Created!',
    roomCodeLabel: 'Room Code:',
    shareCodeMsg: 'Share this code with the Roller to start!',
    waitingRoller: 'Waiting for Roller to join...',
    rollerJoined: 'Roller has joined!',

    // Rules
    rulesTitle: 'Game Rules',
    rule1: 'GM sets dares → Creates room → Shares room code with Roller',
    rule2: 'joins room and clicks',
    rule2roll: '"Roll Dice"',
    rule2result: 'the rolled dare gets',
    rule2elim: 'eliminated',
    rule3: 'Eliminated numbers won\'t appear again',
    rule4: 'can click',
    rule4stop: '"Stop! Accept Punishment"',
    rule4result: 'to randomly pick from remaining dares',
    rule5: 'If only 1 dare remains, it automatically becomes the final punishment!',
    rule6: 'GM can watch the Roller\'s screen in real-time sync',

    // Roller Join
    rollerJoinTitle: 'Join Room',
    enterRoomCode: 'Enter Room Code:',
    roomCodePlaceholder: 'Enter 4-digit code',
    joinRoom: 'Join Room',

    // Game View
    roomLabel: 'Room',
    dareList: 'Dare List',
    remaining: 'Left',
    rolled: 'Rolled',
    rollHistory: 'Elimination Log',
    rollDice: 'Roll Dice',
    stopAccept: 'Stop! Accept Punishment',
    spectatorMsg: 'GM Spectator Mode — Real-time sync with Roller',
    reset: 'Restart',
    backToLobby: 'Back to Lobby',

    // Camera
    cameraTitle: 'Camera Stream',
    remotePlaceholder: 'Waiting for the other player to start camera...',
    remoteLabel: 'Their Camera',
    localLabel: 'My Camera',
    startCamera: 'Start Camera',
    stopCamera: 'Stop Camera',

    // Modal
    finalPunishment: 'Final Punishment!',
    confirm: 'OK',

    // Dynamic text
    dareLabel: 'Dare',
    darePlaceholder: 'Enter dare content...',
    gmSpectator: '👑 GM Spectator',
    rollerRole: '🎲 Roller',
    eliminatedMsg: '✖ Eliminated #',
    challengePrefix: 'Dare #',
    noHistory: 'No rolls yet — waiting for the game to start!',
    historyEliminated: '✖ Eliminated',
    rollerDisconnected: '⚠️ Roller disconnected',
    gmDisconnected: '⚠️ GM disconnected',
    cameraError: '⚠️ Cannot start camera: ',
    cameraErrorFallback: 'Please check permission settings',
    alertMinDares: 'Please enter at least 2 dares!',
    alertCreateFail: 'Failed to create room',
    alertJoinFail: 'Failed to join room',
    alertRoomCode: 'Please enter a 4-digit room code!',
    alertRollFail: 'Failed to roll dice',
    alertStopFail: 'Operation failed',

    // Defaults
    defaultDares: [
      'Tell an embarrassing story',
      'Imitate an animal sound',
      'Do a short dance',
      'Sing a song',
      'Do 10 push-ups',
      'Tell a bad joke'
    ]
  }
};

let currentLang = 'zh';

function t(key) {
  return translations[currentLang][key] || translations['zh'][key] || key;
}

function applyTranslations() {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[currentLang][key] !== undefined) {
      el.textContent = translations[currentLang][key];
    }
  });

  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[currentLang][key] !== undefined) {
      el.placeholder = translations[currentLang][key];
    }
  });

  // Update page title
  document.title = t('title') + ' - Dice Dare';

  // Update html lang
  document.documentElement.lang = currentLang === 'zh' ? 'zh-HK' : 'en';
}

function setLanguage(lang) {
  currentLang = lang;
  applyTranslations();

  // Update toggle button active state
  document.getElementById('langZhBtn').classList.toggle('active', lang === 'zh');
  document.getElementById('langEnBtn').classList.toggle('active', lang === 'en');

  // Re-render dynamic content if game is active
  if (typeof refreshDynamicText === 'function') {
    refreshDynamicText();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('langZhBtn').addEventListener('click', () => setLanguage('zh'));
  document.getElementById('langEnBtn').addEventListener('click', () => setLanguage('en'));
});
