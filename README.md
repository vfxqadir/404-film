# 404 Film - OS Desktop

A fake dark OS desktop web app built for a film production inspired by *Unfriended: Dark Web*.

## Features

- **Boot sequence** — BIOS POST screen with green monospace text
- **Login screen** — Anonymous mask SVG with glitch transition
- **Desktop** — Dark OS with taskbar, clock, draggable windows
- **404 folder** — Password-protected encrypted directory with 10,000+ fake files
- **CCTV media player** — Grainy overlay, scanlines, REC indicator, live timestamp
- **THE VOID chat** — BBS terminal aesthetic with typing animations
- **Control panel** — File upload, chat as "Pawn V", scene triggers
- **Real-time** — WebSocket sync between /screen and /control

## Setup

```bash
npm install
npm start
```

- `/screen` — Fake OS desktop (fullscreen for filming)
- `/control` — Control panel (use on second device)

## Tech

Node.js, Express, Socket.IO, Multer
