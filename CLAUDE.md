# CLAUDE.md

Agent-facing workflow notes for this repo. For domain vocabulary (Nibble, Usage window, Mood, Widget), see `CONTEXT.md` — don't restate it here.

## Shipping a feature idea

1. Open a GitHub issue for it first (`gh issue create`) — one issue per feature, plain description of what and why, no template.
2. Branch off `main`: `feature/<short-slug>` for additions, `fix/<short-slug>` for bugs.
3. Implement.
4. Bump the version by semver — patch for fixes, minor for new features, staying on the `0.x.y-alpha` line (keep the `-alpha` suffix) until told the project is ready for a real `1.0.0`. Update all three version files to match — **they don't sync automatically**: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`. Add a matching entry to `CHANGELOG.md` (Keep a Changelog format) as a new `## [X.Y.Z] - YYYY-MM-DD` section — don't fold it into `[Unreleased]`, since the version files are already bumped at this point.
5. Open a PR (`gh pr create`) referencing the issue (`Closes #N`). Single maintainer, no required review — the PR exists for traceability, not gatekeeping.
6. Merge to `main` once it's clean (see Verification below). No branch protection is configured, so a direct push to `main` is fine for something too small to bother ticketing — use judgment, but still bump the version and changelog even for a small direct push.

If two PRs are in flight at once, both branched from the same last version, the second one to merge needs to rebase its version bump on top of the first's before merging — don't land two PRs claiming the same version number.

## Cutting a release

By the time a release is cut, `main`'s version files and `CHANGELOG.md` are already at the version being released — every PR bumps them on the way in (see above). Cutting a release is just tagging what's already there, not deciding a new version.

When the user says "tag" or "cut a release":

1. `git pull origin main` — always tag from the tip of `main`.
2. Read the version already in `package.json` (it should match `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` — if they've drifted, that's a bug in a prior PR; fix it first). Confirm `CHANGELOG.md` has a section for that version.
3. `git tag vX.Y.Z` using that version, then `git push origin main && git push origin vX.Y.Z`.

If the user says "bump the version" with a specific release in mind but the version files weren't already bumped by the PR that should have done it (e.g. old history predating this policy, or a gap), fall back to the old approach: find the last tag with `git describe --tags --abbrev=0`, decide the next version by semver from it, update the three version files plus `CHANGELOG.md`, and commit that directly to `main` before tagging.

The tag push alone triggers `.github/workflows/release.yml`, which builds the NSIS installer and attaches it to a **draft** GitHub Release — nothing goes public until that draft is manually published on GitHub.

## Verification before merging or tagging

- `cargo build --no-default-features` and `cargo test --no-default-features` from `src-tauri/`
- `npx tsc --noEmit` from the repo root

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
