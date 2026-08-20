# RNK Crimson Scaler - Build Plan (Items First)

## Timeline / Milestones

### Milestone 1: Module Skeleton (Day 0)

- Create Foundry module structure
- Add `module.json`, `src/main.js`, language file, styles, templates
- Register module settings and GM-only launch point

### Milestone 2: GM Hub Shell (Day 0)

- Build ApplicationV2 GM Hub
- Implement tab system:
  - Items
  - Placeholder tabs for future sections
- Create panel regions for item subsections

### Milestone 3: Items Engine (Day 1)

- Build item scanner service
- Group results into Armor/Weapons
- Add counters and summary rows
- Add filter/search support
- Build scaling validation engine for item progression
- Define default scaling rule set (Bible-aligned baseline)

### Milestone 4: UI Integration (Day 1)

- Wire scanner -> hub rendering
- Add refresh button and render lifecycle controls
- Add empty states and error-safe messaging
- Add GM rule editor for scaling formulas and thresholds
- Add rule preview/impact panel (computed results from current rules)
- Add warning states for invalid scaling definitions

### Milestone 5: Validation (Day 1)

- Syntax validation pass
- Runtime sanity checks for hooks/app opening
- Verify no deprecated Foundry API usage in new code
- Validate rule persistence and reload behavior
- Validate scaling results against baseline expectations

## Initial File Map

- `module.json`
- `README.md`
- `LICENSE`
- `src/main.js`
- `src/apps/gm-hub-app.js`
- `src/services/item-monitor-service.js`
- `src/services/scaling-rule-service.js`
- `src/services/scaling-validator-service.js`
- `src/utils/constants.js`
- `templates/gm-hub.hbs`
- `templates/partials/items-scaling-editor.hbs`
- `styles/ld-crimson-scaler.css`
- `languages/en.json`

## Build Sequence

1. Library: constants + service utilities
2. Engine: item monitor service + scaling rule/validation services
3. Turbo: GM Hub UI and interactions

## Test Strategy (Phase 1)

- Open/close GM Hub repeatedly
- Verify refresh updates counts
- Verify Armor/Weapons list population
- Verify search/filter behavior
- Confirm GM-only accessibility
- Verify editing scaling rules updates computed values correctly
- Verify invalid rules are blocked and logged with actionable feedback
