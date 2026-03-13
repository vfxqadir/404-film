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

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

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

// Web proxy — lets the retro browser load real websites in an iframe
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url parameter');

  // Only allow http/https
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    return res.status(400).send('Only http/https URLs allowed');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || 'text/html';

    // For HTML pages, inject a <base> tag so relative URLs resolve correctly
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Parse the origin from the target URL for the base tag
      const urlObj = new URL(targetUrl);
      const base = urlObj.origin;

      // Inject <base> tag right after <head> so relative URLs work
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head><base href="${base}/">`);
      } else if (html.includes('<head ')) {
        html = html.replace(/<head\s[^>]*>/, `$&<base href="${base}/">`);
      } else {
        html = `<base href="${base}/">` + html;
      }

      // Send without iframe-blocking headers
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } else {
      // For non-HTML (CSS, JS, images), pipe through
      res.setHeader('Content-Type', contentType);
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(502).send(`<html><body style="background:#111;color:#f44;font-family:monospace;padding:40px">
      <h1>Connection Failed</h1>
      <p>Could not connect to: ${targetUrl}</p>
      <p style="color:#666">${err.message}</p>
    </body></html>`);
  }
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
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`  /screen  — Fake OS desktop`);
  console.log(`  /control — Control panel`);
});
