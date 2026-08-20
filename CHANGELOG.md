# Changelog

## [Unreleased]

## [1.0.10] - 2026-08-20

- Fetch coven generic pools only when the coven index lists `genericPool` (Vespera/Yelena no longer 404).
- Generate vampires from packaged portraits instead of missing `outdated_26.png`–`outdated_104.png`.
- Rewrite missing `outdated_*` portraits and dead Foundry icon paths onto files that exist.


## [1.0.9] - 2026-08-20

- Load coven generics only from index `templates`/`variants` instead of guessing filenames (stops 404 storms).
- Rewrite dead `icons/svg/damage` paths in chat cards.

## [1.0.8] - 2026-08-20

- Load a new crimson override stylesheet so cached purple hub CSS cannot keep winning.
- Paint class-card icons and rank chips in the same crimson as the other LD hubs.

## [1.0.7] - 2026-08-20

- Restyle the GM Hub to the crimson palette used by the other LD Crimson modules.
- Replace leftover RNK labels in hub chrome, scene controls, and notifications.

## [1.0.6] - 2026-08-20

- Remap stored `modules/rnk-*` portrait and token paths to `modules/ld-*` on GM ready.
- Replace removed `icons/svg/damage/*.svg` placeholders with Foundry icon library art.


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
