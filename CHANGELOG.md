# Changelog

## [Unreleased]

- Rebrand to Lisa's Dungeon (`ld-*` module ids).
- Copy actor flags from the retired `rnk-*` id on first ready.
- Add LICENSE, package.json, syntax and validate checks.
- Keep existing worlds working via `ld-legacy-migrate.js`.


## [1.0.5] - 2026-07-20

### Fixed
- GM Hub open reuses ApplicationV2 instance with `render({ force: true })`.
- GM Hub UI rebinds with **AbortController** (no stacked tab/deploy/level clicks).
- Detail apps (class/archetype) AbortController on back button.
- Socket listener for player item popups registered once.
- Item sheet popup render multipath.
- Removed `backups/` package bloat (~116M).
- No Codex registration.

## [1.0.4] - 2026-04-16
- Verified Foundry VTT 14 compatibility.
