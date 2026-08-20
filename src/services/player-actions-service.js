import { MODULE_ID } from "../utils/constants.js";
import { classItemScalingService } from "./class-item-scaling-service.js";
import { scalingRuleService } from "./scaling-rule-service.js";

export const SOCKET_ACTIONS = {
  OPEN_ITEM_SHEET: "open-item-sheet"
};

export class PlayerActionsService {
  getSocketChannel() {
    return `module.${MODULE_ID}`;
  }

  registerSocketListener() {
    if (this._socketBound || !game?.socket) return;
    this._socketBound = true;
    this._socketHandler = async (payload) => {
      await this.handleSocketPayload(payload);
    };
    game.socket.on(this.getSocketChannel(), this._socketHandler);
  }

  async handleSocketPayload(payload) {
    if (!payload || payload.targetUserId !== game.user.id) return;

    if (payload.action === SOCKET_ACTIONS.OPEN_ITEM_SHEET) {
      const doc = await fromUuid(payload.itemUuid);
      if (!doc || doc.documentName !== "Item") return;
      try {
        doc.sheet?.render?.({ force: true });
      } catch (_) {
        doc.sheet?.render?.(true);
      }
    }
  }

  async sendItemPopupToUser({ userId, itemUuid }) {
    game.socket.emit(this.getSocketChannel(), {
      action: SOCKET_ACTIONS.OPEN_ITEM_SHEET,
      targetUserId: userId,
      itemUuid
    });
  }

  async addItemToActorSheet({ actorId, itemId }) {
    const actor = game.actors?.get(actorId);
    const item = game.items?.get(itemId);

    if (!actor) throw new Error("Target actor not found.");
    if (!item) throw new Error("Source item not found.");

    const clone = foundry.utils.deepClone(item.toObject());
    delete clone._id;
    delete clone.id;

    clone.effects = this.sanitizeUnsafeEffectFormulas(clone.effects).effects;

    await actor.createEmbeddedDocuments("Item", [clone]);

    return {
      actorName: actor.name,
      itemName: item.name
    };
  }

  sanitizeUnsafeEffectFormulas(effects = []) {
    if (!Array.isArray(effects) || effects.length === 0) {
      return { effects: Array.isArray(effects) ? effects : [], changed: false, fixes: 0 };
    }

    const cloned = foundry.utils.deepClone(effects);
    let changed = false;
    let fixes = 0;

    for (const effect of cloned) {
      const changes = Array.isArray(effect?.changes) ? effect.changes : [];
      for (const ch of changes) {
        const key = String(ch?.key ?? "").trim();
        const value = String(ch?.value ?? "").trim();

        const isAcBonusPath = key === "system.attributes.ac.bonus";
        const hasUnsafeTernary = value.includes("?") && value.includes(":") && /@details\.level|>=|<=|==|!=/.test(value);

        if (!isAcBonusPath || !hasUnsafeTernary) continue;

        ch.value = "0";
        changed = true;
        fixes += 1;
      }
    }

    return { effects: cloned, changed, fixes };
  }

  async sanitizeWorldAndActorItemEffects() {
    if (!game.user?.isGM) return { worldItems: 0, actorItems: 0, fixes: 0 };

    let worldItems = 0;
    let actorItems = 0;
    let fixes = 0;

    const worldUpdates = [];
    for (const item of Array.from(game.items ?? [])) {
      const result = this.sanitizeUnsafeEffectFormulas(item.effects?.toObject?.() ?? []);
      if (!result.changed) continue;

      worldUpdates.push({ _id: item.id, effects: result.effects });
      worldItems += 1;
      fixes += result.fixes;
    }

    if (worldUpdates.length) {
      await Item.updateDocuments(worldUpdates);
    }

    for (const actor of Array.from(game.actors ?? [])) {
      const embeddedUpdates = [];
      for (const item of Array.from(actor.items ?? [])) {
        const result = this.sanitizeUnsafeEffectFormulas(item.effects?.toObject?.() ?? []);
        if (!result.changed) continue;

        embeddedUpdates.push({ _id: item.id, effects: result.effects });
        actorItems += 1;
        fixes += result.fixes;
      }

      if (embeddedUpdates.length) {
        await actor.updateEmbeddedDocuments("Item", embeddedUpdates);
      }
    }

    return { worldItems, actorItems, fixes };
  }

  async adjustActorLevel({ actorId, delta }) {
    const actor = game.actors?.get(actorId);
    if (!actor) throw new Error("Target actor not found.");

    const classItems = Array.from(actor.items ?? []).filter((i) => i.type === "class");
    const previousClassLevels = this.getClassLevelMap(classItems);

    if (classItems.length > 0) {
      const updates = classItems.map((cls) => {
        const current = Number(cls.system?.levels ?? 1);
        const next = Math.max(1, current + delta);
        return { _id: cls.id, "system.levels": next };
      });

      await actor.updateEmbeddedDocuments("Item", updates);

      const total = updates.reduce((sum, up) => sum + Number(up["system.levels"] ?? 1), 0);
      await actor.update({ "system.details.level": total });

      const currentClassItems = Array.from(actor.items ?? []).filter((i) => i.type === "class");
      await this.applyAutomaticHitPointProgression(actor, previousClassLevels, currentClassItems, delta);
    } else {
      const current = Number(actor.system?.details?.level ?? 1);
      const next = Math.max(1, current + delta);
      await actor.update({ "system.details.level": next });
    }

    await this.applyPostLevelProgression(actor);

    let asiEarned = 0;
    let asiApplied = 0;
    if (delta > 0) {
      const currentClassItems = Array.from(actor.items ?? []).filter((i) => i.type === "class");
      asiEarned = this.getAsiPointsEarned(previousClassLevels, currentClassItems);
      if (asiEarned > 0) {
        asiApplied = await this.applyAutomaticAsi(actor, asiEarned);
      }
    }

    const rules = scalingRuleService.getRules();
    const scaleResult = await classItemScalingService.applyScalingForActor(actor, rules);
    const currentClassItems = Array.from(actor.items ?? []).filter((i) => i.type === "class");
    const nextAsiLevel = this.getNextAsiLevel(currentClassItems, Number(actor.system?.details?.level ?? 0));

    return {
      actorName: actor.name,
      level: Number(actor.system?.details?.level ?? 0),
      hpMax: Number(actor.system?.attributes?.hp?.max ?? 0),
      asiEarned,
      asiApplied,
      nextAsiLevel,
      scaled: scaleResult.updated,
      checked: scaleResult.checked
    };
  }

  getClassLevelMap(classItems) {
    const map = new Map();
    for (const cls of classItems) {
      map.set(cls.id, Number(cls.system?.levels ?? 1));
    }
    return map;
  }

  getAsiPointsEarned(previousLevels, classItems) {
    let points = 0;
    const defaultAsiMilestones = [4, 8, 12, 16, 19];

    for (const cls of classItems) {
      const oldLevel = Number(previousLevels.get(cls.id) ?? 1);
      const newLevel = Number(cls.system?.levels ?? oldLevel);
      if (newLevel <= oldLevel) continue;

      const advancements = Array.isArray(cls.system?.advancement) ? cls.system.advancement : [];
      const asiAdvancements = advancements.filter((adv) => adv?.type === "AbilityScoreImprovement");

      if (!asiAdvancements.length) {
        for (const level of defaultAsiMilestones) {
          if (level > oldLevel && level <= newLevel) points += 2;
        }
        continue;
      }

      for (const adv of asiAdvancements) {

        const level = Number(adv?.level ?? 0);
        if (level <= oldLevel || level > newLevel) continue;

        const configuredPoints = Number(adv?.configuration?.points ?? 0);
        points += configuredPoints > 0 ? configuredPoints : 2;
      }
    }

    return points;
  }

  async applyAutomaticHitPointProgression(actor, previousLevels, classItems, delta) {
    if (!delta || !classItems.length) return;

    const hpPath = actor.system?.attributes?.hp ?? {};
    const hpMaxCurrent = Number(hpPath.max ?? 0);
    const hpValueCurrent = Number(hpPath.value ?? 0);
    const conMod = Number(actor.system?.abilities?.con?.mod ?? 0);

    if (!Number.isFinite(hpMaxCurrent)) return;

    let hpDelta = 0;

    for (const cls of classItems) {
      const oldLevel = Number(previousLevels.get(cls.id) ?? 1);
      const newLevel = Number(cls.system?.levels ?? oldLevel);
      if (newLevel === oldLevel) continue;

      const faces = this.parseHitDieFaces(cls?.system?.hd?.denomination);
      const perLevelGain = Math.max(1, Math.floor(faces / 2) + 1 + conMod);

      if (newLevel > oldLevel) {
        hpDelta += (newLevel - oldLevel) * perLevelGain;
      } else {
        hpDelta -= (oldLevel - newLevel) * perLevelGain;
      }
    }

    if (!hpDelta) return;

    const nextMax = Math.max(1, hpMaxCurrent + hpDelta);
    const nextValue = Math.max(0, Math.min(nextMax, hpValueCurrent + hpDelta));

    await actor.update({
      "system.attributes.hp.max": nextMax,
      "system.attributes.hp.value": nextValue
    });
  }

  parseHitDieFaces(denomination) {
    const text = String(denomination ?? "").trim().toLowerCase();
    const match = text.match(/d(\d+)/);
    if (match) {
      const faces = Number(match[1]);
      if (Number.isFinite(faces) && faces > 0) return faces;
    }
    return 8;
  }

  getNextAsiLevel(classItems, actorLevel) {
    const defaultAsiMilestones = [4, 8, 12, 16, 19];
    const milestones = new Set();

    if (Array.isArray(classItems) && classItems.length) {
      for (const cls of classItems) {
        const advancements = Array.isArray(cls.system?.advancement) ? cls.system.advancement : [];
        const asiAdvancements = advancements.filter((adv) => adv?.type === "AbilityScoreImprovement");

        if (!asiAdvancements.length) {
          for (const level of defaultAsiMilestones) milestones.add(level);
          continue;
        }

        for (const adv of asiAdvancements) {
          const level = Number(adv?.level ?? 0);
          if (Number.isFinite(level) && level > 0) milestones.add(level);
        }
      }
    } else {
      for (const level of defaultAsiMilestones) milestones.add(level);
    }

    const sorted = [...milestones].sort((a, b) => a - b);
    return sorted.find((lvl) => lvl > actorLevel) ?? null;
  }

  async applyAutomaticAsi(actor, pointsToApply) {
    const abilities = actor.system?.abilities ?? {};
    const keys = ["str", "dex", "con", "int", "wis", "cha"];

    const current = {};
    const max = {};
    for (const key of keys) {
      current[key] = Number(abilities?.[key]?.value ?? 0);
      const m = Number(abilities?.[key]?.max ?? 20);
      max[key] = Number.isFinite(m) && m > 0 ? m : 20;
    }

    let applied = 0;
    for (let i = 0; i < pointsToApply; i += 1) {
      const candidates = keys
        .filter((k) => current[k] < max[k])
        .sort((a, b) => current[b] - current[a]);

      if (!candidates.length) break;

      const target = candidates[0];
      current[target] += 1;
      applied += 1;
    }

    if (applied > 0) {
      const patch = {};
      for (const key of keys) {
        patch[`system.abilities.${key}.value`] = current[key];
      }
      await actor.update(patch);
    }

    return applied;
  }

  async applyPostLevelProgression(actor) {
    const hpMax = Number(actor.system?.attributes?.hp?.max ?? 0);
    if (Number.isFinite(hpMax) && hpMax > 0) {
      await actor.update({ "system.attributes.hp.value": hpMax });
    }
  }
}

export const playerActionsService = new PlayerActionsService();
