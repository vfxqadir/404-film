const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    // Sanitize filename
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '-' + safe);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.txt', '.mp4'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .mp4 files allowed'));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

app.use(express.static('public'));
app.use(express.json());

// Routes
app.get('/screen', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'screen.html'));
});

app.get('/control', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'control.html'));
});

app.get('/', (req, res) => {
  res.redirect('/screen');
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const fileInfo = {
    originalName: req.file.originalname,
    savedName: req.file.filename,
    ext: path.extname(req.file.originalname).toLowerCase(),
    url: '/uploads/' + req.file.filename,
    size: req.file.size
  };

  // Notify screen clients
  io.emit('file-uploaded', fileInfo);
  res.json({ success: true, file: fileInfo });
});

// Get existing files
app.get('/api/files', (req, res) => {
  const files = fs.readdirSync(uploadsDir).map(f => {
    const ext = path.extname(f).toLowerCase();
    return {
      savedName: f,
      originalName: f.replace(/^\d+-/, ''),
      ext,
      url: '/uploads/' + f,
      size: fs.statSync(path.join(uploadsDir, f)).size
    };
  });
  res.json(files);
});

// Get text file content
app.get('/api/file-content/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  const content = fs.readFileSync(filePath, 'utf-8');
  res.json({ content });
});

// WebSocket
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Chat message from control panel (Charon IV)
  socket.on('charon-message', (data) => {
    io.emit('charon-message', data);
  });

  // Actor message from screen (typed on keyboard)
  socket.on('actor-message', (data) => {
    io.emit('actor-message', data);
  });

  // Triggers
  socket.on('trigger', (data) => {
    io.emit('trigger', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`  /screen  — Fake OS desktop`);
  console.log(`  /control — Control panel`);
});
