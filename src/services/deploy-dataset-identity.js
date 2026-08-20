/**
 * Dataset identity matching, duplicate detection, and key helpers
 */
import { MODULE_ID } from "../utils/constants.js";

export function findExistingItemForDoc(doc) {
  return Array.from(game.items ?? []).find((i) => this.isSameItemByIdentity(doc, i));
}

export function isSameItemByIdentity(doc, worldItem) {
  if (!doc || !worldItem) return false;
  const incomingType = String(doc?.type || "");
  if (incomingType && worldItem.type !== incomingType) return false;

  const incomingWorldId = this.extractWorldItemId(doc);
  if (incomingWorldId && worldItem.id === incomingWorldId) return true;

  const incomingSourceId = doc?.flags?.core?.sourceId ?? doc?.flags?.dnd5e?.sourceId ?? "";
  const worldSourceId = worldItem?.flags?.core?.sourceId ?? worldItem?.flags?.dnd5e?.sourceId ?? "";
  if (incomingSourceId && worldSourceId && incomingSourceId === worldSourceId) return true;

  const incomingIdentifier = doc?.system?.identifier ?? "";
  const worldIdentifier = worldItem?.system?.identifier ?? "";
  if (incomingIdentifier && worldIdentifier && incomingIdentifier === worldIdentifier) return true;

  return this.normalizeName(doc?.name) === this.normalizeName(worldItem?.name);
}

export async function purgeClassDuplicates(classDocs) {
  const worldItems = Array.from(game.items ?? []).filter((i) => i.type === "class");
  const toDelete = new Set();
  let duplicateGroups = 0;

  for (const sourceDoc of classDocs) {
    if (sourceDoc?.type !== "class") continue;

    const candidates = this.findClassDuplicateCandidates(sourceDoc, worldItems)
      .filter((doc) => !toDelete.has(doc.id));

    if (candidates.length <= 1) continue;
    duplicateGroups += 1;

    const keep = this.pickPreferredDoc(candidates, "class", sourceDoc);
    for (const doc of candidates) {
      if (doc.id !== keep.id) toDelete.add(doc.id);
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

export async function purgeItemDuplicates(itemDocs) {
  const worldItems = Array.from(game.items ?? []).filter((i) => i.type === "weapon" || i.type === "equipment");
  const toDelete = new Set();
  let duplicateGroups = 0;

  for (const sourceDoc of itemDocs) {
    const type = sourceDoc?.type;
    if (!(type === "weapon" || type === "equipment")) continue;

    const candidates = this.findItemDuplicateCandidates(sourceDoc, worldItems)
      .filter((doc) => !toDelete.has(doc.id));

    if (candidates.length <= 1) continue;
    duplicateGroups += 1;

    const keep = this.pickPreferredDoc(candidates, "item", sourceDoc);
    for (const doc of candidates) {
      if (doc.id !== keep.id) toDelete.add(doc.id);
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

export function findClassDuplicateCandidates(sourceDoc, worldItems) {
  const canonicalId = this.extractWorldItemId(sourceDoc);
  const sourceId = sourceDoc?.flags?.core?.sourceId ?? sourceDoc?.flags?.dnd5e?.sourceId ?? "";
  const identifier = sourceDoc?.system?.identifier ?? "";
  const sourceName = this.normalizeName(sourceDoc?.name ?? "");

  return worldItems.filter((item) => {
    if (item.type !== "class") return false;

    if (canonicalId && item.id === canonicalId) return true;

    const itemSourceId = item?.flags?.core?.sourceId ?? item?.flags?.dnd5e?.sourceId ?? "";
    if (sourceId && itemSourceId && itemSourceId === sourceId) return true;

    const itemIdentifier = item?.system?.identifier ?? "";
    if (identifier && itemIdentifier && itemIdentifier === identifier) return true;

    return sourceName && this.normalizeName(item.name) === sourceName;
  });
}

export function findItemDuplicateCandidates(sourceDoc, worldItems) {
  const canonicalId = this.extractWorldItemId(sourceDoc);
  const sourceType = sourceDoc?.type ?? "";
  const sourceId = sourceDoc?.flags?.core?.sourceId ?? sourceDoc?.flags?.dnd5e?.sourceId ?? "";
  const sourceClassKey = sourceDoc?.flags?.[MODULE_ID]?.scaling?.classKey ?? "";
  const sourceRole = sourceDoc?.flags?.[MODULE_ID]?.scaling?.itemRole ?? "";
  const sourceName = this.normalizeName(sourceDoc?.name ?? "");

  return worldItems.filter((item) => {
    if (item.type !== sourceType) return false;

    if (canonicalId && item.id === canonicalId) return true;

    const itemSourceId = item?.flags?.core?.sourceId ?? item?.flags?.dnd5e?.sourceId ?? "";
    if (sourceId && itemSourceId && itemSourceId === sourceId) return true;

    if (this.normalizeName(item.name) !== sourceName) return false;

    const itemClassKey = item?.flags?.[MODULE_ID]?.scaling?.classKey ?? "";
    const itemRole = item?.flags?.[MODULE_ID]?.scaling?.itemRole ?? "";

    if (sourceClassKey || sourceRole) {
      return itemClassKey === sourceClassKey && itemRole === sourceRole;
    }

    return true;
  });
}

export function pickPreferredDoc(docs, kind, sourceDoc = null) {
  const canonicalId = this.extractWorldItemId(sourceDoc);
  if (canonicalId) {
    const canonical = docs.find((d) => d.id === canonicalId);
    if (canonical) return canonical;
  }

  const ranked = [...docs].sort((a, b) => this.scoreDoc(b, kind) - this.scoreDoc(a, kind));
  return ranked[0];
}

export function scoreDoc(doc, kind) {
  let score = 0;

  const sourceId = doc?.flags?.core?.sourceId ?? doc?.flags?.dnd5e?.sourceId;
  if (sourceId) score += 100;

  if (kind === "class") {
    if (doc?.system?.identifier) score += 25;
  }

  if (kind === "item") {
    if (doc?.flags?.[MODULE_ID]?.scaling?.classKey) score += 20;
    if (doc?.flags?.[MODULE_ID]?.scaling?.itemRole) score += 10;
    if (doc?.flags?.[MODULE_ID]?.scaling?.enabled) score += 5;
  }

  return score;
}

export function getClassKeyFromDoc(doc) {
  const worldItemId = this.extractWorldItemId(doc);
  const sourceId = doc?.flags?.core?.sourceId ?? doc?.flags?.dnd5e?.sourceId ?? "";
  const identifier = doc?.system?.identifier ?? "";
  const name = this.normalizeName(doc?.name ?? "");

  if (worldItemId) return `wid:${worldItemId}`;
  if (sourceId) return `src:${sourceId}`;
  if (identifier) return `id:${identifier}`;
  if (name) return `nm:${name}`;
  return "";
}

export function getClassKeyFromItem(item) {
  const worldItemId = item?.id ?? "";
  const sourceId = item?.flags?.core?.sourceId ?? item?.flags?.dnd5e?.sourceId ?? "";
  const identifier = item?.system?.identifier ?? "";
  const name = this.normalizeName(item?.name ?? "");

  if (worldItemId) return `wid:${worldItemId}`;
  if (sourceId) return `src:${sourceId}`;
  if (identifier) return `id:${identifier}`;
  if (name) return `nm:${name}`;
  return "";
}

export function getScaledItemKeyFromDoc(doc) {
  const type = doc?.type ?? "";
  const worldItemId = this.extractWorldItemId(doc);
  const sourceId = doc?.flags?.core?.sourceId ?? doc?.flags?.dnd5e?.sourceId ?? "";
  const classKey = doc?.flags?.[MODULE_ID]?.scaling?.classKey ?? "";
  const role = doc?.flags?.[MODULE_ID]?.scaling?.itemRole ?? "";
  const name = this.normalizeName(doc?.name ?? "");

  if (!type) return "";
  if (worldItemId) return `${type}|wid:${worldItemId}`;
  if (sourceId) return `${type}|src:${sourceId}`;
  if (name) return `${type}|nm:${name}|ck:${classKey}|rl:${role}`;
  return "";
}

export function getScaledItemKeyFromItem(item) {
  const type = item?.type ?? "";
  const worldItemId = item?.id ?? "";
  const sourceId = item?.flags?.core?.sourceId ?? item?.flags?.dnd5e?.sourceId ?? "";
  const classKey = item?.flags?.[MODULE_ID]?.scaling?.classKey ?? "";
  const role = item?.flags?.[MODULE_ID]?.scaling?.itemRole ?? "";
  const name = this.normalizeName(item?.name ?? "");

  if (!type) return "";
  if (worldItemId) return `${type}|wid:${worldItemId}`;
  if (sourceId) return `${type}|src:${sourceId}`;
  if (name) return `${type}|nm:${name}|ck:${classKey}|rl:${role}`;
  return "";
}

export function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}
