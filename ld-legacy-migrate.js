/**
 * Copy actor flags from the retired RNK module id onto the LD id,
 * and remap stored asset paths that still point at rnk-* modules or
 * removed Foundry SVG placeholders.
 */
const PATH_REWRITES = [
  ["modules/rnk-", "modules/ld-"],
  ["icons/svg/damage/psychic.svg", "systems/dnd5e/icons/svg/damage/psychic.svg"],
  ["icons/svg/damage/necrotic.svg", "systems/dnd5e/icons/svg/damage/necrotic.svg"],
  ["icons/svg/items/equipment.svg", "systems/dnd5e/icons/svg/items/weapon.svg"],
  ["icons/magic/death/skull-energy-white.webp", "systems/dnd5e/icons/svg/damage/necrotic.svg"],
  ["icons/containers/chest/chest-wooden-brown-red.webp", "icons/svg/chest.svg"]
];

const EXISTING_OUTDATED = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
const EXISTING_OUTDATED_SET = new Set(EXISTING_OUTDATED);

function rewriteMissingScalerPortrait(value) {
  const match = /modules\/ld-crimson-scaler\/assets\/portraits\/outdated_(\d+)\.png/.exec(value);
  if (!match) return value;
  const n = Number(match[1]);
  if (EXISTING_OUTDATED_SET.has(n)) return value;
  const mapped = EXISTING_OUTDATED[n % EXISTING_OUTDATED.length];
  return value.replace(/outdated_\d+\.png/, `outdated_${String(mapped).padStart(2, "0")}.png`);
}

export function rewriteLegacyAssetPath(value) {
  if (typeof value !== "string" || !value) return value;
  let next = value;
  if (next.includes("modules/rnk-")) next = next.split("modules/rnk-").join("modules/ld-");
  for (const [from, to] of PATH_REWRITES) {
    if (from === "modules/rnk-") continue;
    if (next === from || next.startsWith(from)) next = `${to}${next.slice(from.length)}`;
  }
  return rewriteMissingScalerPortrait(next);
}

function imgPatch(doc) {
  const updates = {};
  if (!doc) return updates;
  const img = rewriteLegacyAssetPath(doc.img);
  if (img !== doc.img) updates.img = img;
  const protoSrc = doc.prototypeToken?.texture?.src;
  const nextProto = rewriteLegacyAssetPath(protoSrc);
  if (nextProto !== protoSrc) updates["prototypeToken.texture.src"] = nextProto;
  const texSrc = doc.texture?.src;
  const nextTex = rewriteLegacyAssetPath(texSrc);
  if (nextTex !== texSrc) updates["texture.src"] = nextTex;
  return updates;
}

export async function migrateLegacyFlags(moduleId, legacyId) {
  const actors = globalThis.game?.actors;
  if (!actors || !moduleId || !legacyId || moduleId === legacyId) return 0;
  let moved = 0;
  for (const actor of actors) {
    const legacy = actor.flags?.[legacyId];
    if (legacy == null) continue;
    const current = actor.flags?.[moduleId];
    const empty = current == null || (typeof current === "object" && !Object.keys(current).length);
    if (!empty) continue;
    try {
      const clone = globalThis.foundry?.utils?.deepClone
        ? foundry.utils.deepClone(legacy)
        : JSON.parse(JSON.stringify(legacy));
      await actor.update({ [`flags.${moduleId}`]: clone });
      moved += 1;
    } catch (err) {
      console.warn(`${moduleId} | legacy flag migrate failed for ${actor.name}`, err);
    }
  }
  return moved;
}

async function migrateCollection(col, embeddedItems) {
  if (!col) return 0;
  let changed = 0;
  for (const doc of col) {
    const patch = imgPatch(doc);
    if (Object.keys(patch).length) {
      try {
        await doc.update(patch);
        changed += 1;
      } catch (err) {
        console.warn(`ld-legacy-migrate | failed updating ${doc.name}`, err);
      }
    }
    if (!embeddedItems || !doc.items) continue;
    const itemUpdates = [];
    for (const item of doc.items) {
      const p = imgPatch(item);
      if (Object.keys(p).length) itemUpdates.push({ _id: item.id, ...p });
    }
    if (!itemUpdates.length) continue;
    try {
      await doc.updateEmbeddedDocuments("Item", itemUpdates);
      changed += itemUpdates.length;
    } catch (err) {
      console.warn(`ld-legacy-migrate | failed embedded items for ${doc.name}`, err);
    }
  }
  return changed;
}

async function migrateScenes(scenes) {
  if (!scenes) return 0;
  let changed = 0;
  for (const scene of scenes) {
    const tokenUpdates = [];
    for (const token of scene.tokens ?? []) {
      const src = token.texture?.src;
      const next = rewriteLegacyAssetPath(src);
      if (next !== src) tokenUpdates.push({ _id: token.id, "texture.src": next });
    }
    if (!tokenUpdates.length) continue;
    try {
      await scene.updateEmbeddedDocuments("Token", tokenUpdates);
      changed += tokenUpdates.length;
    } catch (err) {
      console.warn("ld-legacy-migrate | failed scene token remap", err);
    }
  }
  return changed;
}

export async function migrateLegacyAssetPaths() {
  if (!globalThis.game?.user?.isGM) return 0;
  let changed = 0;
  changed += await migrateCollection(globalThis.game.actors, true);
  changed += await migrateCollection(globalThis.game.items, false);
  changed += await migrateScenes(globalThis.game.scenes);
  return changed;
}
