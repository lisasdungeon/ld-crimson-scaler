import { DEFAULT_SCALING_RULES, MODULE_ID, SETTING_KEYS } from "../utils/constants.js";

export class ScalingRuleService {
  getRules() {
    const raw = game.settings.get(MODULE_ID, SETTING_KEYS.RULES_JSON);
    const fallback = this.clone(DEFAULT_SCALING_RULES);

    if (!raw || !raw.trim()) return fallback;

    try {
      const parsed = JSON.parse(raw);
      return this.mergeWithDefaults(parsed, fallback);
    } catch (_error) {
      console.warn(`${MODULE_ID} | Invalid rules JSON. Falling back to defaults.`);
      return fallback;
    }
  }

  async saveRulesFromJson(jsonText) {
    const parsed = JSON.parse(jsonText);
    const normalized = this.mergeWithDefaults(parsed, this.clone(DEFAULT_SCALING_RULES));
    await game.settings.set(MODULE_ID, SETTING_KEYS.RULES_JSON, JSON.stringify(normalized, null, 2));
    return normalized;
  }

  getRulesAsJson() {
    return JSON.stringify(this.getRules(), null, 2);
  }

  mergeWithDefaults(input, defaults) {
    if (Array.isArray(defaults)) {
      return Array.isArray(input) ? input : defaults;
    }

    if (typeof defaults !== "object" || defaults === null) {
      return input ?? defaults;
    }

    const output = { ...defaults };
    for (const [key, value] of Object.entries(defaults)) {
      output[key] = this.mergeWithDefaults(input?.[key], value);
    }

    if (input && typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (!(key in output)) output[key] = value;
      }
    }

    return output;
  }

  clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
}

export const scalingRuleService = new ScalingRuleService();
