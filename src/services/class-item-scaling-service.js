import { FLAG_KEYS, MODULE_ID } from "../utils/constants.js";

export class ClassItemScalingService {
  isManagedClassItem(item) {
    const scaling = item?.flags?.[FLAG_KEYS.ROOT]?.[FLAG_KEYS.SCALING];
    return Boolean(scaling?.[FLAG_KEYS.ENABLED] && scaling?.[FLAG_KEYS.CLASS_SPECIFIC]);
  }

  async applyScalingForActor(actor, rules) {
    if (!actor?.items?.size) return { checked: 0, updated: 0 };

    const actorLevel = this.getActorLevel(actor);
    if (actorLevel <= 0) return { checked: 0, updated: 0 };

    const managedItems = Array.from(actor.items).filter((item) => this.isManagedClassItem(item));
    let updated = 0;

    for (const item of managedItems) {
      const role = item.flags?.[FLAG_KEYS.ROOT]?.[FLAG_KEYS.SCALING]?.[FLAG_KEYS.ITEM_ROLE] ?? this.inferRole(item);
      const patch = role === "weapon"
        ? this.buildWeaponPatch(item, actorLevel, rules)
        : this.buildArmorPatch(item, actorLevel, rules);

      if (!patch) continue;

      await item.update(patch);
      updated += 1;
    }

    return { checked: managedItems.length, updated };
  }

  getActorLevel(actor) {
    const level = Number(actor?.system?.details?.level ?? 0);
    if (Number.isFinite(level) && level > 0) return level;

    const classLevels = Array.from(actor?.classes ?? []).reduce((sum, cls) => {
      const clsLevel = Number(cls?.system?.levels ?? 0);
      return sum + (Number.isFinite(clsLevel) ? clsLevel : 0);
    }, 0);

    return classLevels;
  }

  getTierIndex(level, tiers) {
    let idx = 0;
    for (let i = 0; i < tiers.length; i += 1) {
      if (level >= Number(tiers[i])) idx = i;
    }
    return idx;
  }

  buildWeaponPatch(item, level, rules) {
    if (item.type !== "weapon") return null;

    const scaling = item.flags?.[FLAG_KEYS.ROOT]?.[FLAG_KEYS.SCALING] ?? {};
    const baseDen = Number(scaling?.base?.denomination ?? item.system?.damage?.base?.denomination ?? 8);
    const tiers = rules?.weapons?.tierLevels ?? [1, 5, 11, 17];
    const increments = rules?.weapons?.denominationIncrements ?? [0, 2, 4, 4];
    const minDen = Number(rules?.weapons?.minDenomination ?? 4);
    const maxDen = Number(rules?.weapons?.maxDenomination ?? 12);
    const tierIndex = this.getTierIndex(level, tiers);
    const increment = Number(increments[tierIndex] ?? 0);

    const targetDen = Math.max(minDen, Math.min(maxDen, baseDen + increment));
    const currentDen = Number(item.system?.damage?.base?.denomination ?? 0);
    const currentFormula = String(item.system?.damage?.base?.custom?.formula ?? "");
    const enforceEmptyFormula = Boolean(rules?.weapons?.enforceEmptyCustomFormula);

    if (currentDen === targetDen && (!enforceEmptyFormula || !currentFormula.trim())) {
      return null;
    }

    const patch = {
      "system.damage.base.denomination": targetDen
    };

    if (enforceEmptyFormula) {
      patch["system.damage.base.custom.enabled"] = false;
      patch["system.damage.base.custom.formula"] = "";
    }

    return patch;
  }

  buildArmorPatch(item, level, rules) {
    if (item.type !== "equipment") return null;

    const scaling = item.flags?.[FLAG_KEYS.ROOT]?.[FLAG_KEYS.SCALING] ?? {};
    const baseAc = Number(scaling?.base?.armorValue ?? item.system?.armor?.value ?? rules?.armor?.baseAcDefault ?? 11);
    const tiers = rules?.armor?.tierLevels ?? [1, 5, 11, 17];
    const bonuses = rules?.armor?.acBonusByTier ?? [0, 1, 2, 3];
    const tierIndex = this.getTierIndex(level, tiers);
    const bonus = Number(bonuses[tierIndex] ?? 0);
    const targetAc = baseAc + bonus;
    const currentAc = Number(item.system?.armor?.value ?? NaN);

    if (Number.isFinite(currentAc) && currentAc === targetAc) {
      return null;
    }

    return {
      "system.armor.value": targetAc
    };
  }

  inferRole(item) {
    if (item.type === "weapon") return "weapon";
    if (item.type === "equipment") return "armor";
    return "unknown";
  }
}

export const classItemScalingService = new ClassItemScalingService();

console.debug(`${MODULE_ID} | class-item-scaling-service ready`);
