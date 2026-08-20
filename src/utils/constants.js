export const MODULE_ID = "ld-crimson-scaler";
export const LEGACY_MODULE_ID = "rnk-crimson-scaler";

export const TEMPLATE_PATHS = {
  GM_HUB: `modules/${MODULE_ID}/templates/gm-hub.hbs`,
  ITEMS_SCALING_EDITOR: `modules/${MODULE_ID}/templates/partials/items-scaling-editor.hbs`,
  CLASS_DETAIL: `modules/${MODULE_ID}/templates/class-detail.hbs`,
  ARCHETYPE_DETAIL: `modules/${MODULE_ID}/templates/archetype-detail.hbs`
};

export const SETTING_KEYS = {
  RULES_JSON: "scalingRulesJson",
  INCLUDE_COMPENDIUM_ITEMS: "includeCompendiumItems"
};

export const HUB_TABS = {
  CLASSES: "classes",
  ARCHETYPES: "archetypes",
  COVENS: "covens",
  GENERATOR: "generator",
  SPELLS: "spells",
  SETTINGS: "settings"
};

export const ITEM_SECTIONS = {
  WEAPONS: "weapons",
  ARMOR: "armor"
};

export const DEFAULT_SCALING_RULES = {
  metadata: {
    name: "RNK Crimson Baseline",
    version: 1
  },
  weapons: {
    tierLevels: [1, 5, 11, 17],
    denominationIncrements: [0, 2, 4, 4],
    minDenomination: 4,
    maxDenomination: 12,
    enforceEmptyCustomFormula: true
  },
  armor: {
    tierLevels: [1, 5, 11, 17],
    acBonusByTier: [0, 1, 2, 3],
    baseAcDefault: 11,
    requireArmorValue: true
  }
};

export const UI_LIMITS = {
  LIST_PREVIEW_COUNT: 200
};

export const FLAG_KEYS = {
  ROOT: MODULE_ID,
  SCALING: "scaling",
  ENABLED: "enabled",
  CLASS_SPECIFIC: "classSpecific",
  BASE: "base",
  ITEM_ROLE: "itemRole"
};
