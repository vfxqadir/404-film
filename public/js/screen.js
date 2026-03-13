let socket;
try {
  socket = io();
} catch(e) {
  console.warn('Socket.IO not ready, retrying...', e);
  socket = { on: () => {}, emit: () => {} }; // dummy so nothing crashes
}

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

// Login event listeners + boot
function initBoot() {
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('login-screen').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  runBootSequence();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBoot);
} else {
  initBoot();
}

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

// Attach directly — script is at bottom of body, DOM is ready
document.getElementById('folder-login-btn').addEventListener('click', attempt404Login);
document.getElementById('folder-login-cancel').addEventListener('click', close404Login);
document.getElementById('folder-login-overlay').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') attempt404Login();
  if (e.key === 'Escape') close404Login();
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
  } else if (name === 'music') {
    // Show only .mp3 files in Music folder
    const musicFiles = folderFiles.filter(f => f.ext === '.mp3');
    if (musicFiles.length === 0) {
      contents.innerHTML = '<div class="folder-empty">No music files — upload .mp3 from Control Panel</div>';
    } else {
      musicFiles.forEach(f => {
        const el = createFileEntry(f);
        contents.appendChild(el);
      });
    }
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
  const iconMap = { '.mp3': '🎵', '.mp4': '🎬', '.txt': '📄', '.dat': '💾', '.bin': '⬛', '.log': '📋', '.enc': '🔒', '.raw': '📦', '.bak': '🗄', '.tmp': '⏳', '.key': '🔑' };
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
    } else if (file.ext === '.mp3') {
      openAudioFile(file);
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

// ── AUDIO PLAYER ──
function openAudioFile(file) {
  const player = document.getElementById('audio-player');
  const audio = document.getElementById('audio-element');
  document.getElementById('audio-title').textContent = file.originalName;
  document.getElementById('audio-now-playing').textContent = file.originalName.replace(/\.mp3$/i, '');

  audio.src = file.url;
  audio.play();

  player.classList.remove('hidden');
  pushWindow('audio-player');

  // Progress
  audio.addEventListener('timeupdate', updateAudioProgress);
  audio.addEventListener('ended', () => {
    document.getElementById('audio-play-btn').textContent = '▶';
  });
}

function updateAudioProgress() {
  const audio = document.getElementById('audio-element');
  if (audio.duration) {
    const pct = (audio.currentTime / audio.duration) * 100;
    document.getElementById('audio-progress-fill').style.width = pct + '%';
    document.getElementById('audio-time').textContent =
      formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
  }
}

function toggleAudioPlayPause() {
  const audio = document.getElementById('audio-element');
  const btn = document.getElementById('audio-play-btn');
  if (audio.paused) {
    audio.play();
    btn.textContent = '⏸';
  } else {
    audio.pause();
    btn.textContent = '▶';
  }
}

function seekAudio(e) {
  const audio = document.getElementById('audio-element');
  const bar = document.getElementById('audio-progress-bar');
  const rect = bar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  audio.currentTime = pct * audio.duration;
}

function closeAudioPlayer() {
  const audio = document.getElementById('audio-element');
  audio.pause();
  audio.src = '';
  closeWindow('audio-player');
  removeFromStack('audio-player');
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
    } else if (topWindow === 'browser-window') {
      closeBrowser();
    } else if (topWindow === 'audio-player') {
      closeAudioPlayer();
    }
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

// ── RETRO BROWSER ──
const browserHistory = [];
let browserHistoryIndex = -1;

const browserPages = {
  'void://home': {
    title: 'NetVoid - Home',
    html: `<div class="browser-page">
      <div style="text-align:center;margin:30px 0 10px">
        <div style="font-size:28px;color:#7af;letter-spacing:4px;text-shadow:0 0 10px rgba(120,170,255,0.3)">NetVoid</div>
        <div style="font-size:10px;color:#555;margin-top:4px">Search the void...</div>
      </div>
      <div class="search-box">
        <input type="text" id="browser-search" placeholder="Search..." onkeydown="if(event.key==='Enter')browserSearch()">
        <br><button class="search-btn" onclick="browserSearch()">Search</button>
      </div>
      <div class="marquee-text">★ Welcome to NetVoid Browser v1.0 — The gateway to the underground ★ Your connection is encrypted ★ Browsing is anonymous ★</div>
      <h2>Quick Links</h2>
      <ul class="link-list">
        <li><a onclick="browserGo('void://darkboard')">DarkBoard Forums</a><div class="link-desc">Anonymous discussion board — 12,847 active threads</div></li>
        <li><a onclick="browserGo('void://tracker')">Network Tracker</a><div class="link-desc">Real-time connection monitoring</div></li>
        <li><a onclick="browserGo('void://vault')">The Vault</a><div class="link-desc">Encrypted file storage — 2.4TB indexed</div></li>
        <li><a onclick="browserGo('void://about')">About NetVoid</a><div class="link-desc">Browser information and credits</div></li>
      </ul>
      <div class="hit-counter">[ Visitors: 1,247,893 ] — Page loaded in 0.042s — NetVoid v1.0</div>
    </div>`
  },
  'void://darkboard': {
    title: 'DarkBoard — Anonymous Forums',
    html: `<div class="browser-page">
      <h1>◈ DarkBoard Forums</h1>
      <div class="marquee-text">⚠ REMINDER: Do not share personal information. All posts are logged for 24h then purged. ⚠</div>
      <h2>Recent Threads</h2>
      <table>
        <tr><th>Thread</th><th>Author</th><th>Replies</th><th>Last Post</th></tr>
        <tr><td><a onclick="browserGo('void://darkboard/thread1')">Has anyone found the archive?</a></td><td style="color:#4a4">gh0st_</td><td>47</td><td>2 min ago</td></tr>
        <tr><td>New encryption bypass method</td><td style="color:#4a4">null_ptr</td><td>132</td><td>8 min ago</td></tr>
        <tr><td>WARNING: Node 7 compromised</td><td style="color:#f44">ADMIN</td><td>89</td><td>15 min ago</td></tr>
        <tr><td>Looking for Charon — urgent</td><td style="color:#4a4">seekr_01</td><td>3</td><td>22 min ago</td></tr>
        <tr><td>[CLOSED] The game has changed</td><td style="color:#f44">Pawn V</td><td>201</td><td>1 hr ago</td></tr>
        <tr><td>Stream source locations leaked</td><td style="color:#4a4">anon_8472</td><td>67</td><td>1 hr ago</td></tr>
        <tr><td>How to access .onion mirrors</td><td style="color:#4a4">r00tless</td><td>24</td><td>3 hr ago</td></tr>
      </table>
      <div class="hit-counter">Showing 7 of 12,847 threads — <a onclick="browserGo('void://home')">Back to Home</a></div>
    </div>`
  },
  'void://darkboard/thread1': {
    title: 'DarkBoard — Thread: Has anyone found the archive?',
    html: `<div class="browser-page">
      <h1>Has anyone found the archive?</h1>
      <p style="color:#555">Posted by <span style="color:#4a4">gh0st_</span> — 47 replies</p>
      <div style="border-left:2px solid #333;padding:8px 12px;margin:10px 0">
        <p style="color:#4a4;font-size:11px">gh0st_ wrote:</p>
        <p>I keep hearing about a hidden archive on Node 7. Files dating back years. Anyone know how to get in? The usual paths are dead.</p>
      </div>
      <div style="border-left:2px solid #333;padding:8px 12px;margin:10px 0">
        <p style="color:#7af;font-size:11px">null_ptr wrote:</p>
        <p>Don't go looking. Some doors are closed for a reason.</p>
      </div>
      <div style="border-left:2px solid #333;padding:8px 12px;margin:10px 0">
        <p style="color:#f44;font-size:11px">Pawn V wrote:</p>
        <p>The archive finds you. Not the other way around.</p>
      </div>
      <div style="border-left:2px solid #333;padding:8px 12px;margin:10px 0">
        <p style="color:#4a4;font-size:11px">[DELETED] wrote:</p>
        <p style="color:#444;font-style:italic">[This message has been removed by an administrator]</p>
      </div>
      <div class="hit-counter"><a onclick="browserGo('void://darkboard')">← Back to Forums</a></div>
    </div>`
  },
  'void://tracker': {
    title: 'Network Tracker — Live Connections',
    html: `<div class="browser-page">
      <h1>⟐ Network Tracker</h1>
      <p>Active connections through your node:</p>
      <table>
        <tr><th>IP</th><th>Port</th><th>Protocol</th><th>Status</th><th>Location</th></tr>
        <tr><td>███.███.42.1</td><td>443</td><td>TLS 1.3</td><td style="color:#4a4">ACTIVE</td><td>Unknown</td></tr>
        <tr><td>███.███.89.14</td><td>8080</td><td>SOCKS5</td><td style="color:#4a4">ACTIVE</td><td>Proxy Chain</td></tr>
        <tr><td>███.███.11.203</td><td>22</td><td>SSH</td><td style="color:#ff4">IDLE</td><td>Node 3</td></tr>
        <tr><td>███.███.67.55</td><td>9001</td><td>TOR</td><td style="color:#4a4">ACTIVE</td><td>Exit Node</td></tr>
        <tr><td>███.███.12.100</td><td>443</td><td>TLS 1.3</td><td style="color:#f44">DROPPED</td><td>Unknown</td></tr>
        <tr><td>███.███.204.7</td><td>51820</td><td>WireGuard</td><td style="color:#4a4">ACTIVE</td><td>Relay</td></tr>
      </table>
      <p style="color:#f44;font-size:11px;margin-top:16px">⚠ WARNING: 1 connection dropped unexpectedly. Possible monitoring detected.</p>
      <div class="hit-counter">Last updated: just now — Auto-refresh: 30s — <a onclick="browserGo('void://home')">Home</a></div>
    </div>`
  },
  'void://vault': {
    title: 'The Vault — Encrypted Storage',
    html: `<div class="browser-page">
      <h1>🔒 The Vault</h1>
      <p>Encrypted file storage — End-to-end encrypted, zero-knowledge architecture.</p>
      <table>
        <tr><th>File</th><th>Size</th><th>Uploaded</th><th>Status</th></tr>
        <tr><td>archive_2024_final.enc</td><td>847 MB</td><td>2 days ago</td><td style="color:#4a4">Encrypted</td></tr>
        <tr><td>node7_dump.tar.gz</td><td>2.1 GB</td><td>5 days ago</td><td style="color:#4a4">Encrypted</td></tr>
        <tr><td>stream_captures/</td><td>12.4 GB</td><td>1 week ago</td><td style="color:#ff4">Partial</td></tr>
        <tr><td>chat_logs_export.db</td><td>340 MB</td><td>2 weeks ago</td><td style="color:#4a4">Encrypted</td></tr>
        <tr><td>[REDACTED].mp4</td><td>4.7 GB</td><td>1 month ago</td><td style="color:#f44">Locked</td></tr>
      </table>
      <p style="font-size:11px;color:#555">Total: 2.4 TB across 14,203 files — Storage: 78% used</p>
      <div class="hit-counter"><a onclick="browserGo('void://home')">Home</a></div>
    </div>`
  },
  'void://about': {
    title: 'About NetVoid Browser',
    html: `<div class="browser-page">
      <h1>About NetVoid Browser</h1>
      <p>Version: 1.0.7 (Build 404)</p>
      <p>Engine: VoidKit 2.3</p>
      <p>Encryption: AES-256 / TLS 1.3</p>
      <p>Routing: Multi-hop onion routing enabled</p>
      <p>DNS: Encrypted DNS over HTTPS</p>
      <h2>Features</h2>
      <p>• Anonymous browsing with zero logs<br>• Built-in encryption for all traffic<br>• Multi-hop proxy chain support<br>• Automatic session purging<br>• Decentralized bookmark sync</p>
      <h2>Legal</h2>
      <p style="font-size:10px;color:#444">This software is provided as-is. The developers assume no responsibility for how this tool is used. All connections are routed through encrypted channels. No browsing data is stored or transmitted to third parties.</p>
      <div class="hit-counter"><a onclick="browserGo('void://home')">Home</a></div>
    </div>`
  }
};

function openBrowser() {
  const win = document.getElementById('browser-window');
  win.classList.remove('hidden');
  win.classList.remove('minimized');
  pushWindow('browser-window');
  if (browserHistory.length === 0) {
    browserGo('void://home');
  }
}

function closeBrowser() {
  const win = document.getElementById('browser-window');
  const iframe = document.getElementById('browser-iframe');
  win.classList.add('hidden');
  win.classList.remove('iframe-mode');
  iframe.classList.add('hidden');
  iframe.src = '';
  removeFromStack('browser-window');
}

function isRealUrl(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}

function isSoundCloudUrl(url) {
  return url.includes('soundcloud.com');
}

function getSoundCloudEmbedUrl(url) {
  // SoundCloud oEmbed-compatible widget URL
  // Works for tracks, playlists, artists
  return 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) + '&color=%234a9eff&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true';
}

function smartUrl(input) {
  // If it already has a protocol, return as-is
  if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('void://')) {
    return input;
  }
  // If it looks like a domain (has a dot), add https://
  if (input.includes('.') && !input.includes(' ')) {
    return 'https://' + input;
  }
  // Otherwise treat as a search on void
  return 'void://search?q=' + encodeURIComponent(input);
}

function browserGo(url) {
  const content = document.getElementById('browser-content');
  const iframe = document.getElementById('browser-iframe');
  const urlInput = document.getElementById('browser-url');
  const status = document.getElementById('browser-status');
  const titleEl = document.getElementById('browser-window-title');
  const win = document.getElementById('browser-window');

  // Smart URL processing
  url = smartUrl(url);
  urlInput.value = url;
  status.textContent = 'Connecting...';

  // Switch to iframe mode for real URLs
  if (isRealUrl(url)) {
    content.innerHTML = '<div class="browser-loading">Loading<span class="dots"></span></div>';
    win.classList.add('iframe-mode');

    if (isSoundCloudUrl(url)) {
      // SoundCloud uses their own embed widget (no proxy needed)
      const embedUrl = getSoundCloudEmbedUrl(url);
      iframe.src = embedUrl;
      iframe.classList.remove('hidden');
      content.innerHTML = '';
      titleEl.textContent = 'NetVoid - SoundCloud';
      status.textContent = 'Connected — SoundCloud';
    } else {
      // Use proxy for other sites
      const proxyUrl = '/proxy?url=' + encodeURIComponent(url);
      iframe.src = proxyUrl;
      iframe.classList.remove('hidden');
      content.innerHTML = '';

      try {
        const hostname = new URL(url).hostname;
        titleEl.textContent = 'NetVoid - ' + hostname;
        status.textContent = 'Connected — ' + hostname;
      } catch {
        titleEl.textContent = 'NetVoid - Loading...';
        status.textContent = 'Connected';
      }
    }

    iframe.onload = () => {
      status.textContent = 'Done';
    };
    iframe.onerror = () => {
      status.textContent = 'Error loading page';
    };
  } else {
    // Internal void:// pages — use the content div
    win.classList.remove('iframe-mode');
    iframe.classList.add('hidden');
    iframe.src = '';

    status.textContent = 'Loading...';
    content.innerHTML = '<div class="browser-loading">Loading<span class="dots"></span></div>';

    setTimeout(() => {
      const page = browserPages[url];
      if (page) {
        content.innerHTML = page.html;
        titleEl.textContent = 'NetVoid - ' + page.title;
        status.textContent = 'Done';
      } else if (url.startsWith('void://search?q=')) {
        const query = decodeURIComponent(url.replace('void://search?q=', ''));
        content.innerHTML = browserSearchResults(query);
        titleEl.textContent = 'NetVoid - Search: ' + query;
        status.textContent = 'Done — ' + Math.floor(Math.random() * 9000 + 1000) + ' results';
      } else {
        content.innerHTML = `<div class="browser-page"><div class="error-page">
          <h1>Connection Failed</h1>
          <p>NetVoid cannot establish a secure connection to<br><strong style="color:#7af">${escapeHtml(url)}</strong></p>
          <p style="margin-top:16px">Error: VOID_ERR_CONNECTION_REFUSED (-404)</p>
          <p style="margin-top:20px"><a onclick="browserGo('void://home')">Return to Home</a></p>
        </div></div>`;
        titleEl.textContent = 'NetVoid - Error';
        status.textContent = 'Error: Connection refused';
      }
    }, 300 + Math.random() * 500);
  }

  // Update history
  if (browserHistoryIndex < browserHistory.length - 1) {
    browserHistory.splice(browserHistoryIndex + 1);
  }
  browserHistory.push(url);
  browserHistoryIndex = browserHistory.length - 1;
}

function browserNavigate() {
  const url = document.getElementById('browser-url').value.trim();
  if (url) browserGo(url);
}

function browserBack() {
  if (browserHistoryIndex > 0) {
    browserHistoryIndex--;
    const url = browserHistory[browserHistoryIndex];
    document.getElementById('browser-url').value = url;
    browserGo(url);
    // Fix index since browserGo pushes to history
    browserHistoryIndex = Math.max(0, browserHistoryIndex - 1);
  }
}

function browserForward() {
  if (browserHistoryIndex < browserHistory.length - 1) {
    browserHistoryIndex++;
    const url = browserHistory[browserHistoryIndex];
    browserGo(url);
  }
}

function browserRefresh() {
  const url = document.getElementById('browser-url').value;
  browserGo(url);
}

function browserHome() {
  browserGo('void://home');
}

function browserSearch() {
  const input = document.getElementById('browser-search');
  if (input && input.value.trim()) {
    browserGo('void://search?q=' + encodeURIComponent(input.value.trim()));
  }
}

// Known real websites that show up in search results
const realSiteIndex = [
  { keywords: ['soundcloud', 'music', 'songs', 'tracks', 'listen', 'audio', 'beats'], title: 'SoundCloud — Listen to free music and podcasts', url: 'https://soundcloud.com', desc: 'https://soundcloud.com — Stream music, upload tracks, and discover new artists. Free.' },
  { keywords: ['youtube', 'video', 'watch', 'stream'], title: 'YouTube — Watch videos and more', url: 'https://youtube.com', desc: 'https://youtube.com — Watch, share, and discover videos.' },
  { keywords: ['reddit', 'forum', 'community', 'discussion'], title: 'Reddit — Pair into communities', url: 'https://reddit.com', desc: 'https://reddit.com — Community forums and discussions.' },
  { keywords: ['wikipedia', 'wiki', 'encyclopedia', 'info'], title: 'Wikipedia — The Free Encyclopedia', url: 'https://wikipedia.org', desc: 'https://wikipedia.org — Free online encyclopedia.' },
  { keywords: ['github', 'code', 'programming', 'repository'], title: 'GitHub — Where the world builds software', url: 'https://github.com', desc: 'https://github.com — Code hosting and collaboration.' },
  { keywords: ['twitter', 'x', 'tweets', 'social'], title: 'X (Twitter) — Social network', url: 'https://x.com', desc: 'https://x.com — Social media and news.' },
  { keywords: ['google', 'search'], title: 'Google — Search engine', url: 'https://google.com', desc: 'https://google.com — Search the web.' },
  { keywords: ['instagram', 'photos', 'reels'], title: 'Instagram — Photos and Reels', url: 'https://instagram.com', desc: 'https://instagram.com — Share photos and short videos.' },
];

function browserSearchResults(query) {
  const q = query.toLowerCase();
  const results = [];

  // Check for matching real websites first
  realSiteIndex.forEach(site => {
    if (site.keywords.some(kw => q.includes(kw))) {
      results.push({ title: site.title, url: site.url, desc: site.desc, real: true });
    }
  });

  // Add the fake void results after
  results.push(
    { title: 'DarkBoard Forums — ' + query, url: 'void://darkboard', desc: 'Discussion threads matching "' + query + '" — 47 results found' },
    { title: query + ' — The Vault Archives', url: 'void://vault', desc: 'Encrypted files related to your search — Access restricted' },
    { title: 'Network logs mentioning "' + query + '"', url: 'void://tracker', desc: 'Connection records from the past 24 hours' },
    { title: '[REDACTED] — ' + query, url: '#', desc: 'This result has been removed by an administrator' },
    { title: query + ' discussion — Node 7 Archive', url: '#', desc: 'Archived thread from 2023 — May no longer be accessible' },
  );

  let html = `<div class="browser-page">
    <h1>Search results for "${escapeHtml(query)}"</h1>
    <p style="color:#555;font-size:11px">About ${Math.floor(Math.random() * 9000 + 1000)} results (0.${Math.floor(Math.random() * 90 + 10)}s)</p>
    <ul class="link-list">`;

  results.forEach(r => {
    const urlSafe = r.url.replace(/'/g, "\\'");
    if (r.real) {
      html += `<li class="real-result"><a onclick="browserGo('${urlSafe}')">${r.title}</a><div class="link-desc" style="color:#4a4">${r.desc}</div></li>`;
    } else {
      html += `<li><a onclick="browserGo('${urlSafe}')">${r.title}</a><div class="link-desc">${r.desc}</div></li>`;
    }
  });

  html += `</ul><div class="hit-counter"><a onclick="browserGo('void://home')">Home</a></div></div>`;
  return html;
}

// Browser icon double-click
document.getElementById('browser-icon').addEventListener('dblclick', () => {
  openBrowser();
});

// Enter key in address bar
document.getElementById('browser-url').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') browserNavigate();
});

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
