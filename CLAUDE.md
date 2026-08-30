# CLAUDE.md

Agent-facing workflow notes for this repo. For domain vocabulary (Nibble, Usage window, Mood, Widget), see `CONTEXT.md` — don't restate it here.

## Shipping a feature idea

1. Open a GitHub issue for it first (`gh issue create`) — one issue per feature, plain description of what and why, no template.
2. Branch off `main`: `feature/<short-slug>` for additions, `fix/<short-slug>` for bugs.
3. Implement, then open a PR (`gh pr create`) referencing the issue (`Closes #N`). Single maintainer, no required review — the PR exists for traceability and changelog history, not gatekeeping.
4. Merge to `main` once it's clean (see Verification below). No branch protection is configured, so a direct push to `main` is fine for something too small to bother ticketing — use judgment.

## Cutting a release

When the user says "tag", "cut a release", or "bump the version" — with no version number given — pick it via semver from what shipped since the last tag: patch for fixes, minor for new features. Stay on a `0.x.y-alpha` line (keep the `-alpha` suffix) until the user says the project is ready to drop it for a real `1.0.0`.

1. `git pull origin main` — always tag from the tip of `main`.
2. Find the last tag: `git describe --tags --abbrev=0` (if none exist yet, this is `0.1.0-alpha`).
3. Decide the next version by semver from that tag, per the rule above.
4. Update the version string in all three files to match it — **they don't sync automatically**: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`.
5. Commit directly to `main` (a version bump is exactly the "too small to ticket" case above): `chore: bump version to vX.Y.Z`.
6. `git tag vX.Y.Z`, then `git push origin main && git push origin vX.Y.Z`.

The tag push alone triggers `.github/workflows/release.yml`, which builds the NSIS installer and attaches it to a **draft** GitHub Release — nothing goes public until that draft is manually published on GitHub.

## Verification before merging or tagging

- `cargo build --no-default-features` and `cargo test --no-default-features` from `src-tauri/`
- `npx tsc --noEmit` from the repo root

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
