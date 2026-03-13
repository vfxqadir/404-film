const socket = io();

// ── STATE ──
let chatOpen = false;
let folderFiles = [];
const activeTriggers = new Set();
const ACTOR_NAME = 'Mubashir';

// ── BOOT SEQUENCE ──
const BIOS_LINES = [
  { text: '', delay: 300 },
  { text: '  VOID OS 3.2.1', delay: 400, cls: '' },
  { text: '  Copyright (c) 2024 VOID Systems Ltd.', delay: 200, cls: 'bios-ok' },
  { text: '', delay: 300 },
  { text: '  Initializing secure boot...          [OK]', delay: 500, cls: '' },
  { text: '  Encrypting connection...             [OK]', delay: 600, cls: '' },
  { text: '  Masking IP: ███.███.███.███', delay: 400, cls: 'bios-masked' },
  { text: '  Loading kernel modules...            [OK]', delay: 500, cls: '' },
  { text: '  Mounting encrypted volumes...        [OK]', delay: 400, cls: '' },
  { text: '', delay: 200 },
  { text: '  Boot complete.', delay: 300, cls: '' },
];

async function runBootSequence() {
  const output = document.getElementById('bios-output');
  // Remove initial cursor
  const cursor = output.querySelector('.bios-cursor');
  if (cursor) cursor.remove();

  for (const line of BIOS_LINES) {
    await sleep(line.delay);
    const el = document.createElement('div');
    el.className = 'bios-line' + (line.cls ? ' ' + line.cls : '');
    el.textContent = line.text;
    output.appendChild(el);
  }

  // Wait a beat then show login
  await sleep(800);
  document.getElementById('boot-screen').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-btn').focus();
}

function handleLogin() {
  // Glitch transition
  const glitch = document.getElementById('glitch-overlay');
  glitch.classList.remove('hidden');

  // Hide login, show desktop after glitch
  setTimeout(() => {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('desktop').classList.remove('hidden');
    // Remove glitch after animation completes
    setTimeout(() => {
      glitch.classList.add('hidden');
    }, 500);
  }, 100);
}

// Login event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('login-screen').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // Start boot sequence
  runBootSequence();
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── CLOCK ──
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('taskbar-clock').textContent = `${h}:${m}`;
}
setInterval(updateClock, 1000);
updateClock();

// ── DESKTOP ICONS ──
document.querySelectorAll('.desktop-icon[data-folder]').forEach(icon => {
  icon.addEventListener('dblclick', () => {
    const folder = icon.dataset.folder;
    openFolder(folder);
  });
});

document.getElementById('chat-icon').addEventListener('dblclick', () => {
  openChat();
});

// ── 404 FOLDER LOGIN ──
let folder404Unlocked = false;

function open404Login() {
  const overlay = document.getElementById('folder-login-overlay');
  overlay.classList.remove('hidden');
  document.getElementById('folder-login-pass').value = '';
  document.getElementById('folder-login-error').classList.add('hidden');
  document.getElementById('folder-login-pass').focus();
}

function close404Login() {
  document.getElementById('folder-login-overlay').classList.add('hidden');
}

function attempt404Login() {
  const pass = document.getElementById('folder-login-pass').value;

  if (pass === '404') {
    folder404Unlocked = true;
    close404Login();
    openFolder('404');
  } else {
    const err = document.getElementById('folder-login-error');
    err.classList.remove('hidden');
    err.textContent = 'ACCESS DENIED';
    // Re-trigger shake animation
    err.style.animation = 'none';
    err.offsetHeight; // force reflow
    err.style.animation = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('folder-login-btn').addEventListener('click', attempt404Login);
  document.getElementById('folder-login-cancel').addEventListener('click', close404Login);
  document.getElementById('folder-login-overlay').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attempt404Login();
    if (e.key === 'Escape') close404Login();
  });
});

// ── FAKE FILES FOR 404 FOLDER ──
function generateFakeFiles() {
  const types = ['.mp4', '.txt', '.dat', '.bin', '.log', '.enc', '.raw', '.bak', '.tmp', '.key'];
  const prefixes = [
    'feed_', 'cam_', 'node_', 'stream_', 'dump_', 'log_', 'session_',
    'capture_', 'rec_', 'arch_', 'data_', 'usr_', 'trace_', 'pkt_',
    'export_', 'clip_', 'snap_', 'raw_', 'buf_', 'seg_'
  ];
  const files = [];

  for (let i = 0; i < 200; i++) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
    const ext = types[Math.floor(Math.random() * types.length)];
    const size = Math.floor(Math.random() * 800 * 1024 * 1024) + 1024;
    files.push({
      originalName: prefix + num + ext,
      savedName: '',
      ext,
      url: '',
      size,
      fake: true
    });
  }
  return files;
}

const fakeFiles = generateFakeFiles();

// ── FOLDER WINDOW ──
function openFolder(name) {
  const win = document.getElementById('folder-window');
  const title = document.getElementById('folder-title');
  const pathEl = document.getElementById('folder-path');
  const contents = document.getElementById('folder-contents');

  const labels = {
    downloads: 'Downloads',
    documents: 'Documents',
    music: 'Music',
    '404': '404'
  };

  // 404 folder needs login first
  if (name === '404' && !folder404Unlocked) {
    open404Login();
    return;
  }

  title.textContent = labels[name] || 'Folder';
  pathEl.textContent = `/home/user/${labels[name] || 'folder'}/`;

  contents.innerHTML = '';

  // Remove old status bar if any
  const oldStatus = win.querySelector('.folder-status-bar');
  if (oldStatus) oldStatus.remove();

  if (name === '404') {
    // Show real uploaded files first, then fake files
    const allFiles = [...folderFiles, ...fakeFiles];
    allFiles.forEach(f => {
      const el = createFileEntry(f);
      contents.appendChild(el);
    });

    // Add status bar showing fake totals
    const totalCount = 10247 + folderFiles.length;
    const statusBar = document.createElement('div');
    statusBar.className = 'folder-status-bar';
    statusBar.innerHTML = `
      <span class="status-files">${totalCount.toLocaleString()} files</span>
      <span class="status-size">1.02 TB</span>
    `;
    win.appendChild(statusBar);
  } else {
    contents.innerHTML = '<div class="folder-empty">Empty folder</div>';
  }

  win.classList.remove('hidden');
  pushWindow('folder-window');
  document.getElementById('taskbar-folder-label').textContent = labels[name] || 'Folder';
  document.getElementById('taskbar-folder-label').classList.remove('hidden');
}

function createFileEntry(file) {
  const div = document.createElement('div');
  div.className = 'folder-file';
  const iconMap = { '.mp4': '🎬', '.txt': '📄', '.dat': '💾', '.bin': '⬛', '.log': '📋', '.enc': '🔒', '.raw': '📦', '.bak': '🗄', '.tmp': '⏳', '.key': '🔑' };
  const icon = iconMap[file.ext] || '📄';
  const sizeStr = file.size > 1024 * 1024
    ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
    : (file.size / 1024).toFixed(1) + ' KB';

  div.innerHTML = `
    <span class="file-icon">${icon}</span>
    <span class="file-name">${escapeHtml(file.originalName)}</span>
    <span class="file-size">${sizeStr}</span>
  `;

  div.addEventListener('dblclick', () => {
    if (file.fake) return; // Fake files can't be opened
    if (file.ext === '.txt') {
      openTextFile(file);
    } else if (file.ext === '.mp4') {
      openVideoFile(file);
    }
  });

  return div;
}

// ── TEXT EDITOR ──
async function openTextFile(file) {
  const res = await fetch('/api/file-content/' + file.savedName);
  const data = await res.json();

  const editor = document.getElementById('text-editor');
  document.getElementById('editor-title').textContent = file.originalName;

  const lines = data.content.split('\n');
  const lineNums = lines.map((_, i) => i + 1).join('\n');
  document.getElementById('line-numbers').textContent = lineNums;
  document.getElementById('editor-content').textContent = data.content;

  editor.classList.remove('hidden');
  pushWindow('text-editor');
  document.getElementById('taskbar-editor').classList.remove('hidden');
}

// ── VIDEO PLAYER (CCTV) ──
let cctvInterval = null;

function openVideoFile(file) {
  const player = document.getElementById('video-player');
  const video = document.getElementById('video-element');
  document.getElementById('player-title').textContent = file.originalName;

  video.src = file.url;
  video.play();

  player.classList.remove('hidden');
  pushWindow('video-player');
  document.getElementById('taskbar-video').classList.remove('hidden');

  // CCTV timestamp
  if (cctvInterval) clearInterval(cctvInterval);
  cctvInterval = setInterval(updateCCTVTimestamp, 100);

  // Progress
  video.addEventListener('timeupdate', updateVideoProgress);
  video.addEventListener('ended', () => {
    document.getElementById('play-pause-btn').textContent = '▶';
  });
}

function updateCCTVTimestamp() {
  const video = document.getElementById('video-element');
  const now = new Date();
  const ts = `CAM 01 — ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  document.getElementById('cctv-timestamp').textContent = ts;
}

function updateVideoProgress() {
  const video = document.getElementById('video-element');
  if (video.duration) {
    const pct = (video.currentTime / video.duration) * 100;
    document.getElementById('progress-fill').style.width = pct + '%';

    const cur = formatTime(video.currentTime);
    const dur = formatTime(video.duration);
    document.getElementById('video-time').textContent = `${cur} / ${dur}`;
  }
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function togglePlayPause() {
  const video = document.getElementById('video-element');
  const btn = document.getElementById('play-pause-btn');
  if (video.paused) {
    video.play();
    btn.textContent = '⏸';
  } else {
    video.pause();
    btn.textContent = '▶';
  }
}

function seekVideo(e) {
  const video = document.getElementById('video-element');
  const bar = document.getElementById('progress-bar');
  const rect = bar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  video.currentTime = pct * video.duration;
}

function closeVideoPlayer() {
  const video = document.getElementById('video-element');
  video.pause();
  video.src = '';
  if (cctvInterval) clearInterval(cctvInterval);
  closeWindow('video-player');
  document.getElementById('taskbar-video').classList.add('hidden');
  removeFromStack('video-player');
}

// ── WINDOW STACK (tracks open order for ESC) ──
const windowStack = [];

function pushWindow(id) {
  const idx = windowStack.indexOf(id);
  if (idx !== -1) windowStack.splice(idx, 1);
  windowStack.push(id);
}

function popWindow() {
  return windowStack.pop();
}

function removeFromStack(id) {
  const idx = windowStack.indexOf(id);
  if (idx !== -1) windowStack.splice(idx, 1);
}

// ── WINDOW MANAGEMENT ──
function closeWindow(id) {
  document.getElementById(id).classList.add('hidden');
  removeFromStack(id);
  if (id === 'text-editor') document.getElementById('taskbar-editor').classList.add('hidden');
  if (id === 'folder-window') document.getElementById('taskbar-folder-label').classList.add('hidden');
}

function closeChat() {
  chatOpen = false;
  document.getElementById('chat-window').classList.add('hidden');
  document.getElementById('taskbar-chat').classList.add('hidden');
  removeFromStack('chat-window');
}

function restoreWindow(id) {
  document.getElementById(id).classList.remove('hidden');
  pushWindow(id);
}

function restoreChat() {
  if (!chatOpen) openChat();
}

// ── DRAGGABLE WINDOWS ──
document.querySelectorAll('.window-titlebar').forEach(titlebar => {
  let isDragging = false;
  let startX, startY, origX, origY;
  const win = titlebar.closest('.window');

  titlebar.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('win-btn')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origX = win.offsetLeft;
    origY = win.offsetTop;
    document.body.classList.add('dragging');
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    win.style.left = (origX + e.clientX - startX) + 'px';
    win.style.top = (origY + e.clientY - startY) + 'px';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.classList.remove('dragging');
  });
});

// ── CHAT (BBS) ──
function openChat() {
  chatOpen = true;
  document.getElementById('chat-window').classList.remove('hidden');
  document.getElementById('taskbar-chat').classList.remove('hidden');
  pushWindow('chat-window');
  document.getElementById('chat-input').focus();
}

// ── UNIVERSAL ESC KEY ──
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Close the topmost open window
    if (windowStack.length === 0) return;

    const topWindow = windowStack[windowStack.length - 1];

    if (topWindow === 'chat-window') {
      closeChat();
    } else if (topWindow === 'video-player') {
      closeVideoPlayer();
    } else if (topWindow === 'text-editor') {
      closeWindow('text-editor');
    } else if (topWindow === 'folder-window') {
      closeWindow('folder-window');
  }
});

document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const input = e.target;
    const text = input.value.trim();
    if (!text) return;

    addChatMessage(ACTOR_NAME, text, 'actor');
    socket.emit('actor-message', { user: ACTOR_NAME, text });
    input.value = '';
  }
});

function addChatMessage(user, text, type) {
  const container = document.getElementById('chat-messages');
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const msgEl = document.createElement('div');
  msgEl.className = 'chat-msg';
  msgEl.innerHTML = `
    <span class="msg-time">[${time}]</span>
    <span class="msg-user ${type}">&lt;${escapeHtml(user)}&gt;</span>
    <span class="msg-text ${type}-text"></span>
  `;

  container.appendChild(msgEl);

  if (type === 'charon') {
    // Typing animation for Pawn V
    typeText(msgEl.querySelector('.msg-text'), text, 40);
  } else {
    msgEl.querySelector('.msg-text').textContent = text;
  }

  container.scrollTop = container.scrollHeight;
}

function typeText(element, text, speed) {
  let i = 0;
  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  element.appendChild(cursor);

  const interval = setInterval(() => {
    if (i < text.length) {
      element.insertBefore(document.createTextNode(text[i]), cursor);
      i++;
      element.closest('.chat-messages')?.scrollTo(0, 99999);
    } else {
      clearInterval(interval);
      cursor.remove();
    }
  }, speed);
}

// ── WEBSOCKET EVENTS ──

// File uploaded
socket.on('file-uploaded', (file) => {
  folderFiles.push(file);

  // If 404 folder is open, refresh it
  const win = document.getElementById('folder-window');
  if (!win.classList.contains('hidden')) {
    const title = document.getElementById('folder-title').textContent;
    if (title === '404') {
      const contents = document.getElementById('folder-contents');
      const emptyMsg = contents.querySelector('.folder-empty');
      if (emptyMsg) emptyMsg.remove();
      // Insert real files at the top
      contents.prepend(createFileEntry(file));
    }
  }
});

// Pawn V message
socket.on('charon-message', (data) => {
  // Auto-open chat if not open
  if (!chatOpen) openChat();
  addChatMessage('Pawn V', data.text, 'charon');
});

// Triggers
socket.on('trigger', (data) => {
  handleTrigger(data.type, data.active);
});

function handleTrigger(type, active) {
  const overlayMap = {
    'camera-light': 'camera-light',
    'live-feed': 'live-feed-overlay',
    'blackout': 'blackout-overlay',
    'viewer-count': 'viewer-count-overlay',
    'good-game': 'good-game-overlay'
  };

  const id = overlayMap[type];
  if (!id) return;

  const el = document.getElementById(id);

  if (active) {
    el.classList.remove('hidden');
    activeTriggers.add(type);

    // Special: live feed starts webcam
    if (type === 'live-feed') {
      startWebcam();
    }
  } else {
    el.classList.add('hidden');
    activeTriggers.delete(type);

    if (type === 'live-feed') {
      stopWebcam();
    }
  }
}

// ── WEBCAM ──
let webcamStream = null;

async function startWebcam() {
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    document.getElementById('webcam-feed').srcObject = webcamStream;
  } catch (e) {
    console.warn('Webcam not available:', e);
  }
}

function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach(t => t.stop());
    webcamStream = null;
  }
}

// ── MINIMIZE / MAXIMIZE BUTTONS ──
document.querySelectorAll('.win-btn.minimize').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const win = btn.closest('.window') || btn.closest('#chat-window');
    if (!win) return;
    e.stopPropagation();

    if (win.id === 'chat-window') {
      chatOpen = false;
      win.classList.add('hidden');
      // Keep taskbar item visible for restore
    } else {
      win.classList.add('minimized');
    }
  });
});

document.querySelectorAll('.win-btn.maximize').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const win = btn.closest('.window');
    if (!win) return;
    e.stopPropagation();
    win.classList.toggle('maximized');
  });
});

// Update taskbar items to show active state
function updateTaskbarActive() {
  const items = {
    'folder-window': 'taskbar-folder',
    'text-editor': 'taskbar-editor',
    'video-player': 'taskbar-video',
    'chat-window': 'taskbar-chat'
  };
  for (const [winId, taskId] of Object.entries(items)) {
    const win = document.getElementById(winId);
    const task = document.getElementById(taskId);
    if (!win || !task) continue;
    const isVisible = !win.classList.contains('hidden') && !win.classList.contains('minimized');
    task.classList.toggle('active-item', isVisible);
  }
}

// Override restoreWindow to also un-minimize
const _origRestoreWindow = restoreWindow;
restoreWindow = function(id) {
  const win = document.getElementById(id);
  win.classList.remove('minimized');
  win.classList.remove('hidden');
  pushWindow(id);
  updateTaskbarActive();
};

const _origRestoreChat = restoreChat;
restoreChat = function() {
  chatOpen = true;
  document.getElementById('chat-window').classList.remove('hidden');
  document.getElementById('taskbar-chat').classList.remove('hidden');
  pushWindow('chat-window');
  document.getElementById('chat-input').focus();
  updateTaskbarActive();
};

// ── TRAY POPUPS ──
let activePopup = null;

function toggleTrayPopup(id) {
  const popup = document.getElementById(id);
  // Close any open popup
  document.querySelectorAll('.tray-popup').forEach(p => {
    if (p.id !== id) p.classList.add('hidden');
  });

  if (popup.classList.contains('hidden')) {
    popup.classList.remove('hidden');
    activePopup = id;
  } else {
    popup.classList.add('hidden');
    activePopup = null;
  }
}

// Close popups when clicking elsewhere
document.addEventListener('click', (e) => {
  if (!activePopup) return;
  const popup = document.getElementById(activePopup);
  const tray = e.target.closest('.tray-icon');
  if (!popup.contains(e.target) && !tray) {
    popup.classList.add('hidden');
    activePopup = null;
  }
});

// ── VOLUME CONTROL ──
let isMuted = false;

document.getElementById('volume-slider').addEventListener('input', (e) => {
  const val = e.target.value;
  document.getElementById('volume-value').textContent = val;
  if (val == 0) {
    document.getElementById('volume-icon').textContent = '🔇';
  } else if (val < 33) {
    document.getElementById('volume-icon').textContent = '🔈';
  } else if (val < 66) {
    document.getElementById('volume-icon').textContent = '🔉';
  } else {
    document.getElementById('volume-icon').textContent = '🔊';
  }
});

function toggleMute() {
  isMuted = !isMuted;
  const toggle = document.getElementById('volume-mute-toggle');
  const slider = document.getElementById('volume-slider');

  if (isMuted) {
    toggle.classList.remove('active');
    document.getElementById('volume-icon').textContent = '🔇';
    slider.disabled = true;
    slider.style.opacity = '0.4';
  } else {
    toggle.classList.add('active');
    slider.disabled = false;
    slider.style.opacity = '1';
    // Restore icon based on value
    slider.dispatchEvent(new Event('input'));
  }
}

// ── BRIGHTNESS CONTROL ──
document.getElementById('brightness-slider').addEventListener('input', (e) => {
  const val = e.target.value;
  document.getElementById('brightness-value').textContent = val;
  // Darken screen by overlaying black with opacity
  const darkness = 1 - (val / 100);
  document.getElementById('brightness-overlay').style.background = `rgba(0,0,0,${darkness})`;
});

// ── NIGHT LIGHT ──
function toggleNightLight() {
  const toggle = document.getElementById('nightlight-toggle');
  const overlay = document.getElementById('nightlight-overlay');
  toggle.classList.toggle('active');
  overlay.classList.toggle('hidden');
}

// ── BATTERY SIMULATION ──
let batteryLevel = 78;
let batteryCharging = true;

function updateBattery() {
  // Slowly charge up
  if (batteryCharging && batteryLevel < 100) {
    batteryLevel += 1;
  }

  document.getElementById('battery-percent').textContent = batteryLevel + '%';
  document.getElementById('battery-fill-bar').style.width = batteryLevel + '%';

  // Color based on level
  const fill = document.getElementById('battery-fill-bar');
  if (batteryLevel <= 20) {
    fill.style.background = 'linear-gradient(90deg, #ff3333, #ff5555)';
    document.getElementById('battery-icon').textContent = '🪫';
  } else if (batteryLevel <= 50) {
    fill.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc33)';
    document.getElementById('battery-icon').textContent = '🔋';
  } else {
    fill.style.background = 'linear-gradient(90deg, #22cc44, #33ff55)';
    document.getElementById('battery-icon').textContent = '🔋';
  }

  if (batteryLevel >= 100) {
    document.getElementById('battery-status').textContent = '⚡ Fully charged';
    document.getElementById('battery-time').textContent = '';
  } else if (batteryCharging) {
    const remaining = 100 - batteryLevel;
    const mins = remaining * 1.5;
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    document.getElementById('battery-status').textContent = '⚡ Charging';
    document.getElementById('battery-time').textContent = `${h}h ${m}m until full`;
  }
}

updateBattery();
setInterval(updateBattery, 30000); // Update every 30s

// ── LOAD EXISTING FILES ──
async function loadExistingFiles() {
  const res = await fetch('/api/files');
  const files = await res.json();
  folderFiles = files;
}
loadExistingFiles();

// ── UTILITIES ──
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
