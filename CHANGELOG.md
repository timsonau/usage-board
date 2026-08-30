# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project
versions per [Semantic Versioning](https://semver.org/), staying on a
`0.x.y-alpha` line until it's ready for a real `1.0.0`.

## [0.2.1-alpha] - 2026-08-30

### Changed

- Replaced the default Tauri logo with a pixel-art cat icon (sourced from the portfolio site's favicon) for the window/taskbar icon.

## [0.2.0-alpha] - 2026-08-30

### Added

- Close (`×`) button on the widget — previously the only way to close it was Task Manager.

### Fixed

- Granted the `core:window:allow-close` permission the close button needs; without it the Tauri ACL silently rejected the close call.

## [0.1.1-alpha] - 2026-08-30

### Fixed

- Usage polling now backs off on a 429 instead of retrying at the fixed cadence and tripping the rate limit again.
- Construct `ClaudeError::TokenExpired` instead of a bare `eprintln`.
- Release workflow grants `contents: write` so it can create the GitHub Release.

## [0.1.0-alpha] - 2026-08-30

### Added

- Initial release: Nibble mascot with mood-driven pose, 5-hour/7-day usage bars and reset countdowns, polling against the Claude Code OAuth usage endpoint.
