const socket = io();

// ── CONNECTION STATUS ──
const statusEl = document.getElementById('connection-status');

socket.on('connect', () => {
  statusEl.className = 'connection-status connected';
  statusEl.innerHTML = '<span class="dot"></span> Connected';
});

socket.on('disconnect', () => {
  statusEl.className = 'connection-status';
  statusEl.innerHTML = '<span class="dot"></span> Disconnected';
});

// ── FILE UPLOAD ──
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');

uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', () => {
  handleFiles(fileInput.files);
  fileInput.value = '';
});

async function handleFiles(files) {
  for (const file of files) {
    await uploadFile(file);
  }
}

async function uploadFile(file) {
  const progressEl = document.getElementById('upload-progress');
  const fillEl = document.getElementById('upload-fill');
  const statusTextEl = document.getElementById('upload-status');

  progressEl.classList.remove('hidden');
  fillEl.style.width = '0%';
  statusTextEl.textContent = `Uploading ${file.name}...`;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = (e.loaded / e.total) * 100;
        fillEl.style.width = pct + '%';
      }
    });

    await new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          addFileToList(data.file);
          statusTextEl.textContent = `✓ ${file.name} uploaded`;
          fillEl.style.width = '100%';
          resolve();
        } else {
          reject(new Error('Upload failed'));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.open('POST', '/upload');
      xhr.send(formData);
    });
  } catch (e) {
    statusTextEl.textContent = `✗ Failed: ${file.name}`;
    fillEl.style.width = '0%';
  }

  setTimeout(() => progressEl.classList.add('hidden'), 3000);
}

function addFileToList(file) {
  const list = document.getElementById('uploaded-files');
  const entry = document.createElement('div');
  entry.className = 'file-entry';
  entry.innerHTML = `
    <span>
      <span class="file-name-ctrl">${escapeHtml(file.originalName)}</span>
      <span class="file-ext">${file.ext}</span>
    </span>
    <span class="file-check">✓</span>
  `;
  list.prepend(entry);
}

// ── CHAT (Pawn V) ──
const charonInput = document.getElementById('charon-input');
const charonSend = document.getElementById('charon-send');
const chatHistory = document.getElementById('chat-history');

function sendCharonMessage() {
  const text = charonInput.value.trim();
  if (!text) return;

  socket.emit('charon-message', { text });
  addChatLog('Pawn V', text, 'charon');
  charonInput.value = '';
  charonInput.focus();
}

charonSend.addEventListener('click', sendCharonMessage);
charonInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendCharonMessage();
});

// Actor messages echoed back
socket.on('actor-message', (data) => {
  addChatLog(data.user, data.text, 'actor');
});

function addChatLog(user, text, type) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const entry = document.createElement('div');
  entry.className = 'chat-log-entry';
  entry.innerHTML = `
    <span class="log-time">[${time}]</span>
    <span class="log-user ${type}">&lt;${escapeHtml(user)}&gt;</span>
    <span class="log-text">${escapeHtml(text)}</span>
  `;
  chatHistory.appendChild(entry);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// ── TRIGGERS ──
const triggerStates = {};

document.querySelectorAll('.trigger-btn').forEach(btn => {
  const type = btn.dataset.trigger;
  triggerStates[type] = false;

  btn.addEventListener('click', () => {
    triggerStates[type] = !triggerStates[type];
    btn.classList.toggle('active', triggerStates[type]);

    socket.emit('trigger', { type, active: triggerStates[type] });
    updateActiveList();
  });
});

function updateActiveList() {
  const list = document.getElementById('active-list');
  const active = Object.entries(triggerStates)
    .filter(([, v]) => v)
    .map(([k]) => k);

  list.textContent = active.length ? active.join(', ') : 'None';
}

// ── UTILITIES ──
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
