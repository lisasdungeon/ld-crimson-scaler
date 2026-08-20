import { MODULE_ID } from "../utils/constants.js";
import { findExistingItemForDoc, isSameItemByIdentity, purgeClassDuplicates, purgeItemDuplicates, findClassDuplicateCandidates, findItemDuplicateCandidates, pickPreferredDoc, scoreDoc, getClassKeyFromDoc, getClassKeyFromItem, getScaledItemKeyFromDoc, getScaledItemKeyFromItem, normalizeName } from "./deploy-dataset-identity.js";

const DATA_PATHS = {
  classes: `modules/${MODULE_ID}/data/classes/classes.json`,
  items: `modules/${MODULE_ID}/data/class-armor-weapons/items.json`,
  archetypes: `modules/${MODULE_ID}/data/archetypes/index.json`
};

export class DeployDatasetService {
  async deployAll(options = {}) {
    const allowCreate = options.allowCreate === true;
    const archetypesPayload = await this.loadJson(DATA_PATHS.archetypes);
    const archetypeDocs = Array.isArray(archetypesPayload?.items) ? archetypesPayload.items : [];
    const archetypeResult = await this.upsertArchetypes(archetypeDocs, { allowCreate });

    return {
      archetypes: archetypeResult
    };
  }

  async loadJson(path) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch dataset: ${path}`);
    }
    return response.json();
  }

  async purgeDatasetDuplicates() {
    const archetypesPayload = await this.loadJson(DATA_PATHS.archetypes);
    const archetypeDocs = Array.isArray(archetypesPayload?.items) ? archetypesPayload.items : [];
    const archetypeResult = await this.purgeArchetypeDuplicates(archetypeDocs);

    return {
      archetypes: archetypeResult,
      deletedTotal: archetypeResult.deleted
    };
  }

  async upsertArchetypes(itemDocs, options = {}) {
    const allowCreate = options.allowCreate === true;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let subclass = 0;
    let feat = 0;

    for (const doc of itemDocs) {
      const type = String(doc?.type || "");
      if (!(type === "subclass" || type === "feat")) continue;

      if (type === "subclass") subclass += 1;
      if (type === "feat") feat += 1;

      const existing = this.findExistingItemForDoc(doc);
      const payload = this.cleanPayload(doc);

      if (existing) {
        await existing.update({
          name: payload.name,
          type: payload.type,
          img: payload.img,
          system: payload.system,
          flags: payload.flags ?? {},
          effects: payload.effects ?? []
        });
        updated += 1;
      } else if (allowCreate) {
        await Item.create(payload);
        created += 1;
      } else {
        skipped += 1;
      }
    }

    return {
      created,
      updated,
      skipped,
      total: created + updated + skipped,
      subclass,
      feat
    };
  }

  async purgeArchetypeDuplicates(itemDocs) {
    const docs = itemDocs.filter((d) => d?.type === "subclass" || d?.type === "feat");
    const worldItems = Array.from(game.items ?? []).filter((i) => i?.type === "subclass" || i?.type === "feat");

    const toDelete = new Set();
    let duplicateGroups = 0;

    for (const sourceDoc of docs) {
      const candidates = worldItems
        .filter((i) => !toDelete.has(i.id))
        .filter((i) => this.isSameItemByIdentity(sourceDoc, i));

      if (candidates.length <= 1) continue;
      duplicateGroups += 1;

      const keep = this.pickPreferredDoc(candidates, sourceDoc?.type === "subclass" ? "class" : "item", sourceDoc);
      for (const item of candidates) {
        if (item.id !== keep.id) toDelete.add(item.id);
      }
    }

    const deleteIds = [...toDelete];
    if (deleteIds.length > 0) {
      await Item.deleteDocuments(deleteIds);
    }

    return {
      duplicateGroups,
      deleted: deleteIds.length
    };
  }


  async upsertClasses(classDocs, options = {}) {
    const allowCreate = options.allowCreate === true;
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const doc of classDocs) {
      if (doc?.type !== "class") continue;

      const incomingWorldId = this.extractWorldItemId(doc);
      const identifier = doc?.system?.identifier;
      const sourceId = doc?.flags?.core?.sourceId ?? doc?.flags?.dnd5e?.sourceId ?? "";

      const existing = Array.from(game.items ?? []).find((i) => {
        if (i.type !== "class") return false;

        if (incomingWorldId && i.id === incomingWorldId) return true;

        const itemIdentifier = i.system?.identifier;
        if (identifier && itemIdentifier === identifier) return true;

        const itemSourceId = i.flags?.core?.sourceId ?? i.flags?.dnd5e?.sourceId ?? "";
        if (sourceId && itemSourceId && itemSourceId === sourceId) return true;

        return String(i.name || "") === String(doc.name || "");
      });

      const payload = this.cleanPayload(doc);
      if (!payload.system) payload.system = {};

      if (existing) {
        await existing.update({
          name: payload.name,
          img: payload.img,
          system: payload.system,
          flags: payload.flags ?? {},
          effects: payload.effects ?? []
        });
        updated += 1;
      } else if (allowCreate) {
        await Item.create(payload);
        created += 1;
      } else {
        skipped += 1;
      }
    }

    return { created, updated, skipped, total: created + updated + skipped };
  }

  async upsertItems(itemDocs, options = {}) {
    const allowCreate = options.allowCreate === true;
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const doc of itemDocs) {
      const type = doc?.type;
      if (!(type === "weapon" || type === "equipment")) continue;

      const incomingWorldId = this.extractWorldItemId(doc);
      const incomingClassKey = doc?.flags?.[MODULE_ID]?.scaling?.classKey ?? "";
      const incomingRole = doc?.flags?.[MODULE_ID]?.scaling?.itemRole ?? "";
      const incomingSourceId = doc?.flags?.core?.sourceId ?? doc?.flags?.dnd5e?.sourceId ?? "";

      const existing = Array.from(game.items ?? []).find((i) => {
        if (i.type !== type) return false;

        if (incomingWorldId && i.id === incomingWorldId) {
          return true;
        }

        const itemSourceId = i.flags?.core?.sourceId ?? i.flags?.dnd5e?.sourceId ?? "";
        if (incomingSourceId && itemSourceId && itemSourceId === incomingSourceId) {
          return true;
        }

        if (String(i.name || "") !== String(doc.name || "")) return false;

        const classKey = i.flags?.[MODULE_ID]?.scaling?.classKey ?? "";
        const role = i.flags?.[MODULE_ID]?.scaling?.itemRole ?? "";

        if (classKey === incomingClassKey && role === incomingRole) {
          return true;
        }

        if (!incomingClassKey && !incomingRole) {
          return true;
        }

        return classKey === incomingClassKey && role === incomingRole;
      });

      const payload = this.cleanPayload(doc);

      if (existing) {
        await existing.update({
          name: payload.name,
          img: payload.img,
          system: payload.system,
          flags: payload.flags ?? {},
          effects: payload.effects ?? []
        });
        updated += 1;
      } else if (allowCreate) {
        await Item.create(payload);
        created += 1;
      } else {
        skipped += 1;
      }
    }

    return { created, updated, skipped, total: created + updated + skipped };
  }

  cleanPayload(doc) {
    const payload = foundry.utils.deepClone(doc);

    delete payload.id;
    delete payload._id;
    delete payload._stats;
    delete payload.folder;
    delete payload.ownership;
    delete payload.sort;

    if (!payload.img) payload.img = "icons/svg/item-bag.svg";
    if (!payload.flags) payload.flags = {};
    if (!payload.effects) payload.effects = [];

    if (Array.isArray(payload.effects)) {
      for (const effect of payload.effects) {
        if (effect && typeof effect === "object") {
          delete effect._id;
          delete effect._stats;
        }
      }

      payload.effects = this.sanitizeUnsafeEffectFormulas(payload.effects);
    }

    this.sanitizeAdvancementIds(payload);

    return payload;
  }

  sanitizeUnsafeEffectFormulas(effects = []) {
    if (!Array.isArray(effects) || effects.length === 0) return [];

    const cloned = foundry.utils.deepClone(effects);

    for (const effect of cloned) {
      const changes = Array.isArray(effect?.changes) ? effect.changes : [];
      for (const change of changes) {
        const key = String(change?.key ?? "").trim();
        const value = String(change?.value ?? "").trim();
        const isAcBonusPath = key === "system.attributes.ac.bonus";
        const hasUnsafeTernary = value.includes("?") && value.includes(":") && /@details\.level|>=|<=|==|!=/.test(value);

        if (isAcBonusPath && hasUnsafeTernary) {
          change.value = "0";
        }
      }
    }

    return cloned;
  }

  sanitizeAdvancementIds(payload) {
    const advancement = payload?.system?.advancement;
    if (!Array.isArray(advancement)) return;

    const seen = new Set();
    for (let i = 0; i < advancement.length; i += 1) {
      const entry = advancement[i];
      if (!entry || typeof entry !== "object") continue;

      const currentId = String(entry._id ?? "").trim();
      const valid = /^[A-Za-z0-9]{16}$/.test(currentId) && !seen.has(currentId);

      if (valid) {
        seen.add(currentId);
        continue;
      }

      const seed = [
        payload?.system?.identifier ?? payload?.name ?? "item",
        entry?.type ?? "adv",
        entry?.level ?? 0,
        entry?.title ?? "entry",
        i,
        currentId
      ].join("|");

      const replacement = this.toAlnumId16(seed, seen);
      entry._id = replacement;
      seen.add(replacement);
    }
  }

  toAlnumId16(seed, seen = new Set()) {
    const base = this.hashSeed(seed);

    if (!seen.has(base)) return base;

    let attempt = 1;
    while (attempt < 10000) {
      const candidate = this.hashSeed(`${seed}|${attempt}`);
      if (!seen.has(candidate)) return candidate;
      attempt += 1;
    }

    return this.hashSeed(`${seed}|fallback|${Date.now()}`);
  }

  hashSeed(seed) {
    let hash = 0;
    const text = String(seed ?? "");
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }

    const raw = Math.abs(hash).toString(36) + Math.abs(hash * 131).toString(36) + "rnkscaler";
    const alnum = raw.replace(/[^A-Za-z0-9]/g, "");
    if (alnum.length >= 16) return alnum.slice(0, 16);
    return (alnum + "RNKCRIMSONSCALER").slice(0, 16);
  }

  extractWorldItemId(doc) {
    const direct = String(doc?.id ?? doc?._id ?? "").trim();
    if (direct) return this.extractWorldIdFromValue(direct);

    const exportUuid = String(doc?._stats?.exportSource?.uuid ?? "").trim();
    if (exportUuid) return this.extractWorldIdFromValue(exportUuid);

    return "";
  }

  extractWorldIdFromValue(value) {
    if (!value) return "";
    if (!value.includes(".")) return value;

    const parts = value.split(".");
    return parts[parts.length - 1] ?? "";
  }
}

DeployDatasetService.prototype.findExistingItemForDoc = findExistingItemForDoc;
DeployDatasetService.prototype.isSameItemByIdentity = isSameItemByIdentity;
DeployDatasetService.prototype.purgeClassDuplicates = purgeClassDuplicates;
DeployDatasetService.prototype.purgeItemDuplicates = purgeItemDuplicates;
DeployDatasetService.prototype.findClassDuplicateCandidates = findClassDuplicateCandidates;
DeployDatasetService.prototype.findItemDuplicateCandidates = findItemDuplicateCandidates;
DeployDatasetService.prototype.pickPreferredDoc = pickPreferredDoc;
DeployDatasetService.prototype.scoreDoc = scoreDoc;
DeployDatasetService.prototype.getClassKeyFromDoc = getClassKeyFromDoc;
DeployDatasetService.prototype.getClassKeyFromItem = getClassKeyFromItem;
DeployDatasetService.prototype.getScaledItemKeyFromDoc = getScaledItemKeyFromDoc;
DeployDatasetService.prototype.getScaledItemKeyFromItem = getScaledItemKeyFromItem;
DeployDatasetService.prototype.normalizeName = normalizeName;

export const deployDatasetService = new DeployDatasetService();
