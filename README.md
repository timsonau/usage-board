# Claude Usage Widget

![Windows](https://img.shields.io/badge/platform-Windows-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A small always-on-top Windows widget for people using Claude Code. Nibble, a pixel-art cat, sits on your desktop and shows how much of your current 5-hour and 7-day usage windows you have left — no terminal, no dashboard, just a glance.

## What you get

- Live **5h** and **7d** usage bars, each colored independently off its own percentage
- A reset countdown next to each bar
- Nibble's mood (and the bars' color) shifts through four tiers — calm, busy, anxious, critical — as you approach your limits
- A Windows toast when you cross 85% or 100% of either window
- Always-on-top, draggable, no taskbar clutter

## Requirements

- Windows 10 or 11
- Claude Code (CLI) installed and signed in (`claude login`)

## Install

Prebuilt installers are published on the [Releases](../../releases) page — download the latest `.exe` and run it. No admin rights needed.

## How it works

The widget reads the OAuth token Claude Code already stores locally at `~/.claude/.credentials.json` and polls the same endpoint Claude Code's own UI uses to show your usage — the app never asks you to log in separately, and it never sees or stores your credentials anywhere but that existing file.

## Privacy

- Reads: `~/.claude/.credentials.json` (read-only)
- Sends: requests to `api.anthropic.com` to read your usage, using your existing Claude Code session — nothing else
- Stores locally: window position, and a startup-launch preference, under `%APPDATA%\usage-board\`
- No analytics, no telemetry, no separate backend

## Development

```powershell
npm install
npm run tauri dev
```

## License

MIT — see [LICENSE](LICENSE).
