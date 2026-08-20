import {
  FIRST_NAMES, LAST_NAMES, TITLES, ROLES, CLASSES, SKILLS_BY_CLASS, SPELLS_BY_LEVEL,
  WEAPON_TEMPLATES, ARMOR_TEMPLATES, FOCUS_TEMPLATES, FEATURES_BY_TIER, AI_STYLES,
  GENERATED_PORTRAITS, rnd, rndInt, mod, toKebab
} from "./vampire-generator-tables.js";

// ── GENERATOR ──────────────────────────────────────────────────────────

export class VampireGeneratorService {

  generate(opts = {}) {
    const level = this._normalizeLevel(opts.level);
    const rank = opts.rank && opts.rank !== "auto" ? opts.rank : this._rankForLevel(level);
    const tier = this._tierForRank(rank);
    const buildType = opts.buildType || (Math.random() < 0.4 ? "caster" : Math.random() < 0.6 ? "martial" : "hybrid");
    const build = opts.build || rnd(CLASSES[buildType] || CLASSES.martial);

    const firstName = rnd(FIRST_NAMES);
    const lastName = rnd(LAST_NAMES);
    const hasTitle = level >= 15 && Math.random() < 0.5;
    const name = hasTitle ? `${firstName} "${rnd(TITLES)}" ${lastName}` : `${firstName} ${lastName}`;
    const id = toKebab(`gen-${name}-${Date.now()}`);

    const abilities = this._generateAbilities(level, build, buildType);
    const combat = this._generateCombat(level, rank, abilities, build);
    const skills = this._generateSkills(build);
    const equipment = this._generateEquipment(level, build, buildType);
    const features = this._generateFeatures(tier, level);
    const spells = this._generateSpells(level, build);
    const role = rnd(ROLES[rank] || ROLES.Recruit);

    const img = this._pickPortrait();

    const result = {
      id,
      name,
      img,
      rank,
      level,
      role,
      build: { ...build },
      abilities,
      combat,
      skills,
      equipment,
      features,
      spells,
      integration: {
        faction: "generated-vampire",
        tokenDisposition: "hostile",
        aiStyle: rnd(AI_STYLES)
      },
      prototypeToken: {
        name,
        displayName: 20,
        // Linked tokens always resolve to the world Actor (sidebar-drag parity).
        // Unlinked + getTokenDocument().toObject() leaves a broken ActorDelta in
        // Foundry v13/v14, so clicking the token reports "no longer exists".
        actorLink: true,
        disposition: -1,
        texture: { src: img, scaleX: 1, scaleY: 1 },
        sight: { enabled: false },
        bar1: { attribute: "attributes.hp" }
      }
    };

    return result;
  }

  // ── Deploy to Foundry world as Actor ──────────────────────────────────

  async deployToWorld(vampireData) {
    const actorData = this._buildActorDocument(vampireData);
    const actor = await Actor.create(actorData);
    return actor;
  }

  /**
   * Create the world Actor, then place a linked Token on the active scene.
   * Mirrors Foundry's sidebar-drag path so the token always resolves to the Actor.
   */
  async deployToCanvas(vampireData) {
    const actor = await this.deployToWorld(vampireData);
    if (!actor) return null;

    const scene = canvas?.scene;
    if (!scene) {
      ui.notifications.warn("No active scene to deploy token.");
      return actor;
    }

    const { x, y } = this._canvasDropPoint(scene);

    // Explicit actorId + actorLink so createEmbeddedDocuments never depends on a
    // half-initialized unlinked ActorDelta from an ephemeral TokenDocument.
    const tokenDoc = await actor.getTokenDocument({
      x,
      y,
      actorId: actor.id,
      actorLink: true
    });

    const tokenData = tokenDoc.toObject();
    delete tokenData._id;
    // Drop any delta carried over from the ephemeral document; linked tokens
    // should not keep a synthetic ActorDelta override.
    delete tokenData.delta;
    tokenData.actorId = actor.id;
    tokenData.actorLink = true;

    await scene.createEmbeddedDocuments("Token", [tokenData]);
    return actor;
  }

  /** Center of the playable scene area, snapped to grid when available. */
  _canvasDropPoint(scene) {
    const dims = canvas?.dimensions ?? scene?.dimensions;
    let x;
    let y;

    if (dims?.sceneWidth != null && dims?.sceneHeight != null) {
      x = (dims.sceneX ?? 0) + dims.sceneWidth / 2;
      y = (dims.sceneY ?? 0) + dims.sceneHeight / 2;
    } else {
      x = (scene.width ?? dims?.width ?? 0) / 2;
      y = (scene.height ?? dims?.height ?? 0) / 2;
    }

    if (canvas?.grid?.getTopLeftPoint) {
      try {
        const snapped = canvas.grid.getTopLeftPoint({ x, y });
        if (Number.isFinite(snapped?.x) && Number.isFinite(snapped?.y)) {
          return { x: snapped.x, y: snapped.y };
        }
      } catch (_err) {
        // Fall through to unsnapped center.
      }
    }

    return { x: Math.floor(x), y: Math.floor(y) };
  }

  _normalizeLevel(level) {
    const parsed = Number.parseInt(level, 10);
    if (!Number.isFinite(parsed)) return rndInt(1, 20);
    return Math.max(1, Math.min(30, parsed));
  }

  _buildActorDocument(data) {
    const abilityMap = {};
    for (const [key, val] of Object.entries(data.abilities || {})) {
      abilityMap[key] = { value: val };
    }

    const items = [];

    // Build weapon items
    for (const weap of (data.equipment?.weapons || [])) {
      items.push({
        name: weap.name,
        type: "weapon",
        img: weap.img || WEAPON_TEMPLATES.dagger.img,
        system: {}
      });
    }

    // Build armor items
    for (const arm of (data.equipment?.armor || [])) {
      items.push({
        name: arm.name,
        type: "equipment",
        img: arm.img || ARMOR_TEMPLATES.leather.img,
        system: { type: { value: "medium" } }
      });
    }

    // Build focus items
    for (const foc of (data.equipment?.focus || [])) {
      items.push({
        name: foc.name,
        type: "equipment",
        img: foc.img || FOCUS_TEMPLATES.mark.img,
        system: {}
      });
    }

    // Build feature items
    for (const feat of (data.features || [])) {
      items.push({
        name: feat,
        type: "feat",
        img: "icons/svg/damage/psychic.svg",
        system: {}
      });
    }

    // Build spell items
    for (const [levelKey, spellList] of Object.entries(data.spells || {})) {
      const lvl = levelKey === "cantrips" ? 0 : parseInt(levelKey.replace("level", ""), 10) || 0;
      for (const spellName of spellList) {
        items.push({
          name: spellName,
          type: "spell",
          img: "icons/svg/damage/necrotic.svg",
          system: { level: lvl }
        });
      }
    }

    return {
      name: data.name,
      type: "npc",
      img: data.img,
      system: {
        abilities: abilityMap,
        attributes: {
          hp: { value: data.combat.hp, max: data.combat.hp },
          ac: { flat: data.combat.ac, calc: "flat" },
          movement: { walk: data.combat.speed }
        },
        details: {
          level: data.level,
          cr: this._crForLevel(data.level),
          type: { value: "undead", subtype: "vampire" },
          alignment: "chaotic evil",
          biography: {
            value: `<p><strong>Rank:</strong> ${data.rank}</p><p><strong>Role:</strong> ${data.role}</p><p><strong>Class:</strong> ${data.build.primaryClass}/${data.build.subclass}</p><p><strong>Faction:</strong> ${data.integration.faction}</p>`
          }
        },
        traits: {
          di: { value: ["necrotic", "poison"] },
          dr: { value: [] },
          ci: { value: ["charmed", "poisoned"] }
        }
      },
      // Force linked prototype so canvas deploy (and later sidebar drags) always
      // resolve to this world Actor. Coven JSON still ships actorLink: false.
      prototypeToken: {
        ...(data.prototypeToken || {}),
        actorLink: true
      },
      items
    };
  }

  // ── INTERNAL GENERATORS ──────────────────────────────────────────────

  _rankForLevel(level) {
    if (level >= 26) return "Matriarch";
    if (level >= 22) return "Captain";
    if (level >= 10) return "Sergeant";
    if (level >= 6) return "Corporal";
    if (level >= 3) return "Private";
    return "Recruit";
  }

  _tierForRank(rank) {
    const map = { Matriarch: "matriarch", Captain: "captain", Sergeant: "sergeant", Corporal: "fighter", Private: "fighter", Recruit: "recruit", "Generic Fighter": "fighter" };
    return map[rank] || "recruit";
  }

  _crForLevel(level) {
    if (level >= 28) return 21;
    if (level >= 25) return 17;
    if (level >= 22) return 13;
    if (level >= 18) return 10;
    if (level >= 14) return 7;
    if (level >= 10) return 5;
    if (level >= 6) return 3;
    if (level >= 3) return 1;
    return 0.5;
  }

  _generateAbilities(level, build, buildType) {
    const base = 8;
    const pool = 4 + Math.floor(level * 0.8);

    if (buildType === "caster") {
      return {
        str: base + rndInt(0, 2),
        dex: base + 2 + Math.floor(pool * 0.3),
        con: base + 2 + Math.floor(pool * 0.4),
        int: base + 2 + Math.floor(pool * 0.9),
        wis: base + 2 + Math.floor(pool * 0.6),
        cha: base + 2 + Math.floor(pool * 0.5)
      };
    }
    if (buildType === "hybrid") {
      return {
        str: base + 2 + Math.floor(pool * 0.5),
        dex: base + 2 + Math.floor(pool * 0.4),
        con: base + 2 + Math.floor(pool * 0.5),
        int: base + rndInt(0, 3),
        wis: base + 2 + Math.floor(pool * 0.3),
        cha: base + 2 + Math.floor(pool * 0.5)
      };
    }
    // martial
    return {
      str: base + 2 + Math.floor(pool * 0.9),
      dex: base + 2 + Math.floor(pool * 0.4),
      con: base + 2 + Math.floor(pool * 0.7),
      int: base + rndInt(0, 3),
      wis: base + 2 + Math.floor(pool * 0.2),
      cha: base + 2 + Math.floor(pool * 0.3)
    };
  }

  _generateCombat(level, rank, abilities, build) {
    const conMod = mod(abilities.con);
    const dexMod = mod(abilities.dex);

    // HP scales with level and rank
    const hitDie = level <= 5 ? 8 : level <= 15 ? 10 : 12;
    const hp = (hitDie + conMod) * level + rndInt(0, level);

    // AC based on build type
    let ac;
    if (build.casterType === "martial") {
      ac = 12 + Math.min(dexMod, 2) + Math.floor(level / 5) + rndInt(0, 2);
    } else {
      ac = 10 + dexMod + Math.floor(level / 6) + rndInt(0, 2);
    }
    ac = Math.max(ac, 10);
    ac = Math.min(ac, 24);

    const speed = 30 + (rank === "Matriarch" || rank === "Captain" ? 10 : 0);
    const initiative = dexMod + Math.floor(level / 8) + rndInt(0, 2);

    return { ac, hp, speed, initiative };
  }

  _generateSkills(build) {
    const classSkills = SKILLS_BY_CLASS[build.primaryClass] || ["perception", "stealth"];
    const secondary = SKILLS_BY_CLASS[build.secondaryClass] || [];
    const combined = [...new Set([...classSkills, ...secondary.slice(0, 2)])];
    return combined.slice(0, rndInt(3, 6));
  }

  _generateEquipment(level, build, buildType) {
    const weapons = [];
    const armor = [];
    const focus = [];

    // Primary weapon
    if (buildType === "caster") {
      weapons.push({ ...rnd([WEAPON_TEMPLATES.staff, WEAPON_TEMPLATES.wand, WEAPON_TEMPLATES.dagger]) });
      weapons.push({ ...WEAPON_TEMPLATES.bite });
    } else if (buildType === "hybrid") {
      weapons.push({ ...rnd([WEAPON_TEMPLATES.longsword, WEAPON_TEMPLATES.shortsword, WEAPON_TEMPLATES.flail]) });
      weapons.push({ ...WEAPON_TEMPLATES.bite });
      if (Math.random() < 0.4) weapons.push({ ...rnd([WEAPON_TEMPLATES.crossbow, WEAPON_TEMPLATES.dagger]) });
    } else {
      weapons.push({ ...rnd([WEAPON_TEMPLATES.longsword, WEAPON_TEMPLATES.greatsword, WEAPON_TEMPLATES.axe, WEAPON_TEMPLATES.hammer, WEAPON_TEMPLATES.halberd]) });
      weapons.push({ ...WEAPON_TEMPLATES.bite });
      if (Math.random() < 0.5) weapons.push({ ...rnd([WEAPON_TEMPLATES.shield, WEAPON_TEMPLATES.dagger, WEAPON_TEMPLATES.crossbow]) });
    }

    // Prefix weapons with gothic names at higher levels
    if (level >= 10) {
      const prefixes = ["Bloodforged", "Soulbound", "Shadowsteel", "Crimson", "Dread", "Hollowed", "Nightforged", "Bonecarved"];
      weapons[0].name = `${rnd(prefixes)} ${weapons[0].name}`;
    }

    // Armor
    if (buildType === "caster") {
      armor.push({ ...rnd([ARMOR_TEMPLATES.robes, ARMOR_TEMPLATES.cloak]) });
    } else if (buildType === "martial" && level >= 10) {
      armor.push({ ...rnd([ARMOR_TEMPLATES.plate, ARMOR_TEMPLATES.half_plate, ARMOR_TEMPLATES.chain]) });
    } else {
      armor.push({ ...rnd([ARMOR_TEMPLATES.leather, ARMOR_TEMPLATES.chain, ARMOR_TEMPLATES.half_plate]) });
    }

    if (level >= 10) {
      const armorPrefixes = ["Crimson", "Nightbound", "Bloodstained", "Deathward", "Sanguine"];
      armor[0].name = `${rnd(armorPrefixes)} ${armor[0].name}`;
    }

    // Focus item
    if (buildType === "caster" || buildType === "hybrid") {
      focus.push({ ...rnd(Object.values(FOCUS_TEMPLATES)) });
    }
    if (level >= 15) {
      focus.push({ ...FOCUS_TEMPLATES.mark });
    }

    return { armor, weapons, focus };
  }

  _generateFeatures(tier, level) {
    const base = [...(FEATURES_BY_TIER[tier] || FEATURES_BY_TIER.recruit)];

    // Add extra features based on level
    if (level >= 20) base.push("Innate Spellcasting (at will: detect magic, levitate)");
    if (level >= 15) base.push("Forbiddance (cannot enter residence without invitation)");
    if (level >= 10) base.push("Harmed by Running Water (20 acid damage per turn)");
    if (level >= 5) base.push("Stake to the Heart (paralyzed if pierced while incapacitated)");

    return base;
  }

  _generateSpells(level, build) {
    if (build.casterType === "martial") {
      return { cantrips: [], level1: [] };
    }

    const spells = {};
    const maxSpellLevel = build.casterType === "full-caster"
      ? Math.min(9, Math.ceil(level / 2))
      : build.casterType === "half-caster"
        ? Math.min(5, Math.ceil(level / 4))
        : build.casterType === "pact-caster"
          ? Math.min(5, Math.ceil(level / 3))
          : Math.min(4, Math.ceil(level / 6));

    // Cantrips
    if (maxSpellLevel >= 0) {
      const cantripCount = Math.min(4, 2 + Math.floor(level / 5));
      spells.cantrips = this._pickSpells("cantrips", cantripCount);
    }

    // Spell levels
    for (let i = 1; i <= maxSpellLevel; i++) {
      const key = `level${i}`;
      const pool = SPELLS_BY_LEVEL[key];
      if (!pool) continue;
      const count = Math.max(1, Math.min(pool.length, 4 - Math.floor(i / 3)));
      spells[key] = this._pickSpells(key, count);
    }

    return spells;
  }

  _pickSpells(levelKey, count) {
    const pool = [...(SPELLS_BY_LEVEL[levelKey] || [])];
    const picked = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
  }

  _pickPortrait() {
    if (GENERATED_PORTRAITS.length === 0) {
      return "icons/svg/mystery-man.svg";
    }
    return rnd(GENERATED_PORTRAITS);
  }
}

export const vampireGeneratorService = new VampireGeneratorService();
