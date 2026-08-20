# LD Crimson Scaler - Feature Scope

## Module Identity

- Working name: LD Crimson Scaler
- Target module id: `ld-crimson-scaler`
- Build root: `C:\Users\thugg\Downloads\New folder\crimson scaler`

## Vision

A GM-focused control hub that tracks, monitors, validates, and organizes progression data across item categories first, then expands to spells and additional systems.

## Source of Truth

- RNK Dev Bible instructions are the source of truth for every file in this module.
- Foundry v13 patterns and RNK module standards are enforced in implementation and structure.

## Phase 1 (Now): Items Foundation

- GM Hub window using ApplicationV2
- Tabbed interface shell
- Primary tab: Items
- Items sub-sections under Items:
  - Armor
  - Weapons
- Item indexing service (world + optional compendium scan mode)
- Live summary cards for counts, by type/subtype
- Search and filter for item list
- Refresh action to rescan and update UI
- Scaling monitor for item damage/AC progression checks
- Rule editor for scaling logic (GM configurable)
- Rule preview panel (before/after computed scaling values)
- Rule validation with warning flags for malformed or conflicting rules

## Phase 2 (Next)

- Add spell tracking section
- Add consumables/loot/other item class groups
- Add alerts (missing data, malformed entries)
- Add export/report action
- Extend scaling rule engine to spells and additional categories

## Phase 3 (Expansion)

- Per-actor linkage and usage metrics
- Optional automation hooks
- Rule-driven scaling recommendations

## Non-Negotiables

- Foundry v13 ApplicationV2 architecture
- Lazy loaded scanners and trigger-based updates
- No file above 500 LOC
- Proprietary RNK licensing metadata
- Structured logging and safe failure handling
- Scaling behavior must be deterministic, testable, and override-capable by GM rules
