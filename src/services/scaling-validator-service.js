import { MODULE_ID } from "../utils/constants.js";

export class ScalingValidatorService {
  validateRules(rules) {
    const errors = [];

    if (!Array.isArray(rules?.weapons?.tierLevels) || rules.weapons.tierLevels.length !== 4) {
      errors.push("weapons.tierLevels must be an array of 4 levels.");
    }

    if (!Array.isArray(rules?.weapons?.denominationIncrements) || rules.weapons.denominationIncrements.length !== 4) {
      errors.push("weapons.denominationIncrements must be an array of 4 increments.");
    }

    if (!Array.isArray(rules?.armor?.tierLevels) || rules.armor.tierLevels.length !== 4) {
      errors.push("armor.tierLevels must be an array of 4 levels.");
    }

    if (!Array.isArray(rules?.armor?.acBonusByTier) || rules.armor.acBonusByTier.length !== 4) {
      errors.push("armor.acBonusByTier must be an array of 4 values.");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  evaluateWeaponItem(item, rules) {
    const denomination = Number(item?.system?.damage?.base?.denomination ?? 0);
    const customFormula = item?.system?.damage?.base?.custom?.formula ?? "";
    const issues = [];

    if (!Number.isFinite(denomination) || denomination <= 0) {
      issues.push("Invalid or missing weapon damage denomination.");
    }

    if (rules?.weapons?.enforceEmptyCustomFormula && customFormula?.trim()) {
      issues.push("Custom damage formula must be empty under active rules.");
    }

    const projections = this.projectWeaponScaling(denomination, rules?.weapons);

    return {
      id: item.id,
      name: item.name,
      type: item.type,
      denomination,
      projected: projections,
      issues
    };
  }

  evaluateArmorItem(item, rules) {
    const armorValue = Number(item?.system?.armor?.value ?? NaN);
    const issues = [];

    if (rules?.armor?.requireArmorValue && !Number.isFinite(armorValue)) {
      issues.push("Missing armor.value for scaling checks.");
    }

    const projectedBonuses = this.projectArmorBonuses(rules?.armor);

    return {
      id: item.id,
      name: item.name,
      type: item.type,
      armorValue: Number.isFinite(armorValue) ? armorValue : null,
      projectedBonuses,
      issues
    };
  }

  projectWeaponScaling(baseDenomination, weaponRules) {
    if (!Number.isFinite(baseDenomination) || baseDenomination <= 0) {
      return [];
    }

    const increments = weaponRules?.denominationIncrements ?? [0, 2, 4, 4];
    const levels = weaponRules?.tierLevels ?? [1, 5, 11, 17];
    const min = Number(weaponRules?.minDenomination ?? 4);
    const max = Number(weaponRules?.maxDenomination ?? 12);

    return levels.map((level, index) => {
      const increment = Number(increments[index] ?? 0);
      const raw = baseDenomination + increment;
      const clamped = Math.max(min, Math.min(max, raw));
      return { level, denomination: clamped };
    });
  }

  projectArmorBonuses(armorRules) {
    const levels = armorRules?.tierLevels ?? [1, 5, 11, 17];
    const bonuses = armorRules?.acBonusByTier ?? [0, 1, 2, 3];

    return levels.map((level, index) => ({
      level,
      acBonus: Number(bonuses[index] ?? 0)
    }));
  }

  summarize(results) {
    const total = results.length;
    const withIssues = results.filter((r) => r.issues.length > 0).length;

    return {
      total,
      withIssues,
      healthy: total - withIssues
    };
  }
}

export const scalingValidatorService = new ScalingValidatorService();

console.debug(`${MODULE_ID} | scaling-validator-service ready`);
