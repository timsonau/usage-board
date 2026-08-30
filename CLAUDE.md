# CLAUDE.md

Agent-facing workflow notes for this repo. For domain vocabulary (Nibble, Usage window, Mood, Widget), see `CONTEXT.md` — don't restate it here.

## Shipping a feature idea

1. Open a GitHub issue for it first (`gh issue create`) — one issue per feature, plain description of what and why, no template.
2. Branch off `main`: `feature/<short-slug>` for additions, `fix/<short-slug>` for bugs.
3. Implement, then open a PR (`gh pr create`) referencing the issue (`Closes #N`). Single maintainer, no required review — the PR exists for traceability and changelog history, not gatekeeping.
4. Merge to `main` once it's clean (see Verification below). No branch protection is configured, so a direct push to `main` is fine for something too small to bother ticketing — use judgment.

## Cutting a release

Tag `main` as `vX.Y.Z` (pre-1.0: `vX.Y.Z-alpha`/`-beta` while still unstable) and push the tag — that alone triggers `.github/workflows/release.yml`, which builds the NSIS installer and attaches it to a **draft** GitHub Release. Nothing goes public until that draft is manually published.

**Version lives in three files that don't sync automatically**: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`. Bump all three to match the tag before tagging, or the installer's internal version won't match its release name.

## Verification before merging or tagging

- `cargo build --no-default-features` and `cargo test --no-default-features` from `src-tauri/`
- `npx tsc --noEmit` from the repo root

## Working alongside other sessions

The user sometimes runs more than one Claude Code session on this repo at once (e.g. across devices via Remote Control). If files change on disk mid-task that you didn't touch, that's a peer session, not corruption — use `ListAgents` to find it, coordinate before pushing or tagging, and independently re-run Verification rather than trusting a peer's report unchecked.
