import { HUB_TABS, MODULE_ID, TEMPLATE_PATHS } from "../utils/constants.js";
import { scalingRuleService } from "../services/scaling-rule-service.js";
import { scalingValidatorService } from "../services/scaling-validator-service.js";
import { itemMonitorService } from "../services/item-monitor-service.js";
import { CrimsonScalerClassDetailApp } from "./class-detail-app.js";
import { CrimsonScalerArchetypeDetailApp } from "./archetype-detail-app.js";
import { playerActionsService } from "../services/player-actions-service.js";
import { covenDataService } from "../services/coven-data-service.js";
import { vampireGeneratorService } from "../services/vampire-generator-service.js";
import { PLAYER_CONTENT_TYPES } from "./gm-hub-constants.js";
import { bindUiEvents } from "./gm-hub-bind.js";
import { buildCovenContext, bindCovenEvents, buildGeneratorContext, bindGeneratorEvents, syncGeneratorInputs, buildRulesData, collectRulesFromInputs } from "./gm-hub-tabs.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CrimsonScalerHubApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "ld-crimson-scaler-hub",
    tag: "section",
    classes: ["ld-crimson-scaler"],
    position: {
      width: 1024,
      height: 780
    },
    window: {
      title: "LD Crimson Scaler - GM Hub",
      icon: "fa-solid fa-scale-balanced",
      resizable: true
    },
    actions: {
      "gen-generate": this.#onGenerateVampire,
      "gen-reroll": this.#onGenerateVampire,
      "gen-deploy-world": this.#onDeployGeneratedWorld,
      "gen-deploy-canvas": this.#onDeployGeneratedCanvas,
      "gen-load-history": this.#onLoadGeneratedHistory
    }
  };

  static PARTS = {
    main: {
      template: TEMPLATE_PATHS.GM_HUB
    }
  };

  constructor(options = {}) {
    super(options);
    this.activeTab = HUB_TABS.CLASSES;
    this.selectedClassKey = null;
    this.searchText = "";
    this.rulesJsonDraft = scalingRuleService.getRulesAsJson();
    this.lastValidation = { valid: true, errors: [] };
    this.snapshot = null;
    this.selectedUserId = null;
    this.selectedActorId = null;
    this.selectedContentType = PLAYER_CONTENT_TYPES.CLASS;
    this.selectedItemId = null;

    // Covens tab state
    this.covenFilter = "all";
    this.covenRankFilter = "all";
    this.covenSearch = "";
    this.covenSort = "level-desc";
    this.covensLoaded = false;

    // Generator tab state
    this.genLevel = 10;
    this.genBuildType = "random";
    this.genRank = "auto";
    this.genResult = null;
    this.genHistory = [];
  }

  async _prepareContext(options = {}) {
    const rules = scalingRuleService.getRules();
    this.lastValidation = scalingValidatorService.validateRules(rules);
    this.snapshot = await itemMonitorService.collectClassScalingSnapshot(rules);
    const archetypeSummary = this.getArchetypeSummary(this.searchText);

    const filtered = this.getFilteredSnapshot(this.snapshot, this.searchText);
    const selectedClass = this.getSelectedClass(filtered.classes);
    const playerControls = this.buildPlayerControlsContext();

    // Load covens lazily
    if (!this.covensLoaded) {
      try {
        await covenDataService.load();
        this.covensLoaded = true;
      } catch (e) {
        console.warn(`${MODULE_ID} | Failed to load coven data`, e);
      }
    }

    const covenContext = this.buildCovenContext();
    const genContext = this.buildGeneratorContext();
    const rulesData = this.buildRulesData(rules);

    return {
      activeTab: this.activeTab,
      selectedClassKey: this.selectedClassKey,
      selectedClass,
      searchText: this.searchText,
      rulesJsonDraft: this.rulesJsonDraft,
      rulesData,
      validation: this.lastValidation,
      snapshot: filtered,
      archetypeSummary,
      playerControls,
      covenContext,
      genContext,
      tabs: HUB_TABS
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._domAbort?.abort();
    this._domAbort = new AbortController();
    this.bindUiEvents(this._domAbort.signal);
  }

  async close(options) {
    this._domAbort?.abort();
    this._domAbort = null;
    return super.close(options);
  }


  getFilteredSnapshot(snapshot, searchText) {
    if (!searchText) {
      return {
        ...snapshot,
        classes: snapshot.classes
      };
    }

    const needle = searchText.toLowerCase();

    const filteredClasses = snapshot.classes.filter((cls) => {
      if (String(cls.classLabel || "").toLowerCase().includes(needle)) return true;
      const weaponHit = cls.weapons.rows.some((r) => String(r.name || "").toLowerCase().includes(needle));
      const armorHit = cls.armor.rows.some((r) => String(r.name || "").toLowerCase().includes(needle));
      return weaponHit || armorHit;
    });

    return {
      ...snapshot,
      classes: filteredClasses
    };
  }

  getSelectedClass(classes) {
    if (!Array.isArray(classes) || classes.length === 0) return null;

    if (!this.selectedClassKey) {
      this.selectedClassKey = classes[0].classKey;
      return classes[0];
    }

    const selected = classes.find((cls) => cls.classKey === this.selectedClassKey);
    if (selected) return selected;

    this.selectedClassKey = classes[0].classKey;
    return classes[0];
  }

  getPlayerTargets() {
    const users = Array.from(game.users ?? []);
    const playerUsers = users.filter((u) => !u.isGM);

    const actorTargets = Array.from(game.actors ?? [])
      .filter((a) => a.hasPlayerOwner)
      .map((a) => {
        const ownerUserIds = playerUsers
          .filter((u) => a.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
          .map((u) => u.id);

        return {
          id: `actor:${a.id}`,
          name: `${a.name} (Actor)`,
          ownerUserIds,
          sortName: a.name
        };
      });

    const userTargets = playerUsers.map((u) => ({
      id: `user:${u.id}`,
      name: `${u.name} (User)`,
      ownerUserIds: [u.id],
      sortName: u.name
    }));

    const merged = [...actorTargets, ...userTargets]
      .sort((a, b) => a.sortName.localeCompare(b.sortName));

    return merged;
  }

  buildPlayerControlsContext() {
    const players = this.getPlayerTargets();

    if (this.selectedUserId && !players.some((p) => p.id === this.selectedUserId)) {
      this.selectedUserId = null;
    }

    if (!this.selectedUserId && players.length) {
      this.selectedUserId = players[0].id;
    }

    const selectedUser = players.find((p) => p.id === this.selectedUserId);
    const ownerUserIds = selectedUser?.ownerUserIds ?? [];

    const actors = Array.from(game.actors ?? [])
      .filter((a) => {
        if (!ownerUserIds.length) return true;
        return ownerUserIds.some((uid) => {
          const userDoc = game.users.get(uid);
          return userDoc ? a.testUserPermission(userDoc, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) : false;
        });
      })
      .map((a) => ({ id: a.id, name: a.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Ensure the selected actor is still valid; if not, pick the first actor.
    if (this.selectedActorId && !actors.some((a) => a.id === this.selectedActorId)) {
      this.selectedActorId = null;
    }
    if (!this.selectedActorId && actors.length) {
      this.selectedActorId = actors[0].id;
    }

    const contentTypes = [
      { id: PLAYER_CONTENT_TYPES.CLASS, label: "Class" },
      { id: PLAYER_CONTENT_TYPES.ARCHETYPE, label: "Archetype" },
      { id: PLAYER_CONTENT_TYPES.WEAPON, label: "Weapon" },
      { id: PLAYER_CONTENT_TYPES.ARMOR, label: "Armor" },
      { id: PLAYER_CONTENT_TYPES.SPELL, label: "Spell" }
    ];

    const typeMap = {
      [PLAYER_CONTENT_TYPES.CLASS]: "class",
      [PLAYER_CONTENT_TYPES.ARCHETYPE]: "subclass",
      [PLAYER_CONTENT_TYPES.WEAPON]: "weapon",
      [PLAYER_CONTENT_TYPES.ARMOR]: "equipment",
      [PLAYER_CONTENT_TYPES.SPELL]: "spell"
    };

    const targetType = typeMap[this.selectedContentType] || "class";
    const items = Array.from(game.items ?? [])
      .filter((i) => i.type === targetType)
      .map((i) => ({ id: i.id, name: i.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Ensure the selected item is still present; if not, reset to the first available item.
    if (this.selectedItemId && !items.some((i) => i.id === this.selectedItemId)) {
      this.selectedItemId = null;
    }
    if (!this.selectedItemId && items.length) {
      this.selectedItemId = items[0].id;
    }

    return {
      players,
      actors,
      contentTypes,
      items,
      selectedUserId: this.selectedUserId,
      selectedActorId: this.selectedActorId,
      selectedContentType: this.selectedContentType,
      selectedItemId: this.selectedItemId
    };
  }

  async handleActorLevelAdjust(delta) {
    if (!game.user.isGM) return;
    if (!this.selectedActorId) {
      ui.notifications.warn("LD Crimson Scaler: select an actor first.");
      return;
    }

    try {
      const result = await playerActionsService.adjustActorLevel({
        actorId: this.selectedActorId,
        delta
      });

      ui.notifications.info(
        `LD Crimson Scaler: ${result.actorName} level adjusted. ` +
        `Current level ${result.level}, HP max ${result.hpMax}. ` +
        `ASI ${result.asiApplied}/${result.asiEarned} applied. ` +
        `${result.nextAsiLevel ? `Next ASI at level ${result.nextAsiLevel}. ` : "No further ASI milestones. "}` +
        `Auto-scaled ${result.scaled}/${result.checked} class-linked items.`
      );
      await this.render({ force: true });
    } catch (error) {
      console.error(`${MODULE_ID} | Level adjustment failed`, error);
      ui.notifications.error("LD Crimson Scaler: failed to adjust level.");
    }
  }

  getArchetypeSummary(searchText) {
    const allItems = Array.from(game.items ?? []);
    const subclasses = allItems.filter((i) => i.type === "subclass");
    const feats = allItems.filter((i) => i.type === "feat");

    const buckets = new Map();
    for (const sub of subclasses) {
      const classIdentifier = String(sub?.system?.classIdentifier || "unassigned").trim() || "unassigned";
      if (!buckets.has(classIdentifier)) {
        buckets.set(classIdentifier, {
          classIdentifier,
          subclassCount: 0,
          featCount: 0,
          subclasses: [],
          feats: []
        });
      }

      buckets.get(classIdentifier).subclassCount += 1;
      const levels = Array.isArray(sub?.system?.advancement)
        ? sub.system.advancement.filter((a) => a?.type === "ItemGrant").map((a) => a.level).filter((l) => Number.isFinite(Number(l)))
        : [];
      buckets.get(classIdentifier).subclasses.push({
        id: sub.id,
        name: sub.name,
        identifier: sub?.system?.identifier || "",
        levelGates: levels.length ? levels.sort((a, b) => a - b).join(", ") : "-"
      });
    }

    for (const feat of feats) {
      const req = String(feat?.system?.requirements || "").toLowerCase();
      const idHit = [...buckets.keys()].find((id) => id !== "unassigned" && req.includes(id.toLowerCase()));
      const key = idHit || "unassigned";

      if (!buckets.has(key)) {
        buckets.set(key, {
          classIdentifier: key,
          subclassCount: 0,
          featCount: 0,
          subclasses: [],
          feats: []
        });
      }

      buckets.get(key).featCount += 1;
      buckets.get(key).feats.push({
        id: feat.id,
        name: feat.name,
        identifier: feat?.system?.identifier || "",
        requirements: String(feat?.system?.requirements || "")
      });
    }

    let rows = [...buckets.values()].sort((a, b) => a.classIdentifier.localeCompare(b.classIdentifier));

    if (searchText) {
      const needle = searchText.toLowerCase();
      rows = rows.filter((r) => r.classIdentifier.toLowerCase().includes(needle));
    }

    return {
      totals: {
        subclasses: subclasses.length,
        feats: feats.length,
        classBuckets: rows.length
      },
      rows
    };
  }

  openArchetypeDetail(classIdentifier) {
    const summary = this.getArchetypeSummary(this.searchText);
    const group = summary.rows.find((r) => r.classIdentifier === classIdentifier);
    if (!group) {
      ui.notifications.warn("LD Crimson Scaler: archetype group not found.");
      return;
    }

    new CrimsonScalerArchetypeDetailApp(group).render({ force: true });
  }

  openClassDetail(classKey) {
    const classes = this.snapshot?.classes ?? [];
    const selected = classes.find((cls) => cls.classKey === classKey);
    if (!selected) {
      ui.notifications.warn("LD Crimson Scaler: class data not found.");
      return;
    }

    new CrimsonScalerClassDetailApp(selected).render({ force: true });
  }


  static #onGenerateVampire(event, _target) {
    event?.preventDefault?.();
    this.syncGeneratorInputs();
    try {
      const genOpts = {
        level: this.genLevel,
        buildType: this.genBuildType === "random" ? undefined : this.genBuildType,
        rank: this.genRank === "auto" ? undefined : this.genRank
      };
      this.genResult = vampireGeneratorService.generate(genOpts);
      this.genHistory.unshift(this.genResult);
      if (this.genHistory.length > 20) this.genHistory.pop();
      this.render({ force: true });
    } catch (error) {
      console.error(`${MODULE_ID} | Generate vampire failed`, error);
      ui.notifications.error("LD Crimson Scaler: generate failed. Check console.");
    }
  }

  static async #onDeployGeneratedWorld(event, _target) {
    event?.preventDefault?.();
    if (!this.genResult) return;
    try {
      const actor = await vampireGeneratorService.deployToWorld(this.genResult);
      ui.notifications.info(`LD Crimson Scaler: ${actor.name} created in world as NPC.`);
    } catch (error) {
      console.error(`${MODULE_ID} | Deploy generated vampire failed`, error);
      ui.notifications.error("Deploy failed. Check console.");
    }
  }

  static async #onDeployGeneratedCanvas(event, _target) {
    event?.preventDefault?.();
    if (!this.genResult) return;
    try {
      const actor = await vampireGeneratorService.deployToCanvas(this.genResult);
      ui.notifications.info(`LD Crimson Scaler: ${actor.name} deployed to canvas.`);
    } catch (error) {
      console.error(`${MODULE_ID} | Deploy to canvas failed`, error);
      ui.notifications.error("Deploy to canvas failed. Check console.");
    }
  }

  static #onLoadGeneratedHistory(event, target) {
    event?.preventDefault?.();
    const idx = Number.parseInt(target?.dataset?.historyIndex, 10);
    if (!Number.isFinite(idx) || !this.genHistory[idx]) return;
    this.genResult = this.genHistory[idx];
    this.render({ force: true });
  }

}

CrimsonScalerHubApp.prototype.bindUiEvents = bindUiEvents;
CrimsonScalerHubApp.prototype.buildCovenContext = buildCovenContext;
CrimsonScalerHubApp.prototype.bindCovenEvents = bindCovenEvents;
CrimsonScalerHubApp.prototype.buildGeneratorContext = buildGeneratorContext;
CrimsonScalerHubApp.prototype.bindGeneratorEvents = bindGeneratorEvents;
CrimsonScalerHubApp.prototype.syncGeneratorInputs = syncGeneratorInputs;
CrimsonScalerHubApp.prototype.buildRulesData = buildRulesData;
CrimsonScalerHubApp.prototype.collectRulesFromInputs = collectRulesFromInputs;
