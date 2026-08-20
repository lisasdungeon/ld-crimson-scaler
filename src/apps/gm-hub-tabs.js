/**
 * GM Hub covens, generator, and scaling-rules helpers
 */
import { MODULE_ID } from "../utils/constants.js";
import { covenDataService } from "../services/coven-data-service.js";
import { vampireGeneratorService } from "../services/vampire-generator-service.js";

// ── COVENS TAB ──────────────────────────────────────────────────────

export function buildCovenContext() {
  const covens = covenDataService.covens;
  const members = covenDataService.getFilteredMembers({
    covenId: this.covenFilter === "all" ? null : this.covenFilter,
    rank: this.covenRankFilter === "all" ? null : this.covenRankFilter,
    search: this.covenSearch,
    sort: this.covenSort
  });

  const ranks = ["all", "Matriarch", "Captain", "Sergeant", "Corporal", "Private", "Recruit", "Generic Fighter"];

  return {
    covens,
    members,
    totalMembers: covenDataService.allMembers.length,
    covenFilter: this.covenFilter,
    covenRankFilter: this.covenRankFilter,
    covenSearch: this.covenSearch,
    covenSort: this.covenSort,
    ranks
  };
}

export function bindCovenEvents(root, opts) {
  root.querySelector("[data-action='coven-filter']")?.addEventListener("change", (e) => {
    this.covenFilter = e.target.value;
    this.render({ force: true });
  }, opts);

  root.querySelector("[data-action='coven-rank-filter']")?.addEventListener("change", (e) => {
    this.covenRankFilter = e.target.value;
    this.render({ force: true });
  }, opts);

  root.querySelector("[data-action='coven-search']")?.addEventListener("input", (e) => {
    this.covenSearch = String(e.target.value || "").trim();
    this.render({ force: true });
  }, opts);

  root.querySelector("[data-action='coven-sort']")?.addEventListener("change", (e) => {
    this.covenSort = e.target.value;
    this.render({ force: true });
  }, opts);

  root.querySelectorAll("[data-action='deploy-coven-member']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const memberId = btn.dataset.memberId;
      const member = covenDataService.getMember(memberId);
      if (!member) return;
      try {
        const actor = await vampireGeneratorService.deployToWorld(member);
        ui.notifications.info(`RNK Crimson Scaler: deployed ${actor.name} to world.`);
      } catch (e) {
        console.error(`${MODULE_ID} | Deploy coven member failed`, e);
        ui.notifications.error("Deploy failed. Check console.");
      }
    }, opts);
  });

  root.querySelectorAll("[data-action='deploy-coven-member-canvas']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const memberId = btn.dataset.memberId;
      const member = covenDataService.getMember(memberId);
      if (!member) return;
      try {
        const actor = await vampireGeneratorService.deployToCanvas(member);
        ui.notifications.info(`RNK Crimson Scaler: deployed ${actor.name} to canvas.`);
      } catch (e) {
        console.error(`${MODULE_ID} | Deploy to canvas failed`, e);
        ui.notifications.error("Deploy to canvas failed. Check console.");
      }
    }, opts);
  });
}

// ── GENERATOR TAB ───────────────────────────────────────────────────

export function buildGeneratorContext() {
  return {
    level: this.genLevel,
    buildType: this.genBuildType,
    rank: this.genRank,
    result: this.genResult,
    history: this.genHistory.slice(0, 8)
  };
}

export function bindGeneratorEvents(root, opts) {
  const sync = () => this.syncGeneratorInputs();
  const levelField = root.querySelector("[data-action='gen-level']");
  levelField?.addEventListener("input", sync, opts);
  levelField?.addEventListener("change", sync, opts);
  root.querySelector("[data-action='gen-build-type']")?.addEventListener("change", sync, opts);
  root.querySelector("[data-action='gen-rank']")?.addEventListener("change", sync, opts);
}

export function syncGeneratorInputs() {
  const root = this.element;
  if (!root) return;
  const levelInput = root.querySelector("[data-action='gen-level']");
  const buildTypeInput = root.querySelector("[data-action='gen-build-type']");
  const rankInput = root.querySelector("[data-action='gen-rank']");

  const parsedLevel = Number.parseInt(levelInput?.value ?? this.genLevel, 10);
  this.genLevel = Number.isFinite(parsedLevel) ? Math.max(1, Math.min(30, parsedLevel)) : 10;
  this.genBuildType = buildTypeInput?.value || this.genBuildType || "random";
  this.genRank = rankInput?.value || this.genRank || "auto";
}
// ── SCALING RULES INPUT FIELDS ──────────────────────────────────────

export function buildRulesData(rules) {
  return {
    metadata: {
      name: rules?.metadata?.name ?? "RNK Crimson Baseline",
      version: rules?.metadata?.version ?? 1
    },
    weapons: {
      tierLevel0: rules?.weapons?.tierLevels?.[0] ?? 1,
      tierLevel1: rules?.weapons?.tierLevels?.[1] ?? 5,
      tierLevel2: rules?.weapons?.tierLevels?.[2] ?? 11,
      tierLevel3: rules?.weapons?.tierLevels?.[3] ?? 17,
      denom0: rules?.weapons?.denominationIncrements?.[0] ?? 0,
      denom1: rules?.weapons?.denominationIncrements?.[1] ?? 2,
      denom2: rules?.weapons?.denominationIncrements?.[2] ?? 4,
      denom3: rules?.weapons?.denominationIncrements?.[3] ?? 4,
      minDenomination: rules?.weapons?.minDenomination ?? 4,
      maxDenomination: rules?.weapons?.maxDenomination ?? 12,
      enforceEmptyCustomFormula: rules?.weapons?.enforceEmptyCustomFormula ?? true
    },
    armor: {
      tierLevel0: rules?.armor?.tierLevels?.[0] ?? 1,
      tierLevel1: rules?.armor?.tierLevels?.[1] ?? 5,
      tierLevel2: rules?.armor?.tierLevels?.[2] ?? 11,
      tierLevel3: rules?.armor?.tierLevels?.[3] ?? 17,
      acBonus0: rules?.armor?.acBonusByTier?.[0] ?? 0,
      acBonus1: rules?.armor?.acBonusByTier?.[1] ?? 1,
      acBonus2: rules?.armor?.acBonusByTier?.[2] ?? 2,
      acBonus3: rules?.armor?.acBonusByTier?.[3] ?? 3,
      baseAcDefault: rules?.armor?.baseAcDefault ?? 11,
      requireArmorValue: rules?.armor?.requireArmorValue ?? true
    }
  };
}

export function collectRulesFromInputs(root) {
  const val = (path, fallback) => {
    const el = root.querySelector(`[data-rule-path="${path}"]`);
    if (!el) return fallback;
    if (el.type === "checkbox") return el.checked;
    if (el.type === "number") return Number(el.value) || fallback;
    return el.value || fallback;
  };

  return {
    metadata: {
      name: val("metadata.name", "RNK Crimson Baseline"),
      version: val("metadata.version", 1)
    },
    weapons: {
      tierLevels: [
        val("weapons.tierLevels.0", 1),
        val("weapons.tierLevels.1", 5),
        val("weapons.tierLevels.2", 11),
        val("weapons.tierLevels.3", 17)
      ],
      denominationIncrements: [
        val("weapons.denominationIncrements.0", 0),
        val("weapons.denominationIncrements.1", 2),
        val("weapons.denominationIncrements.2", 4),
        val("weapons.denominationIncrements.3", 4)
      ],
      minDenomination: val("weapons.minDenomination", 4),
      maxDenomination: val("weapons.maxDenomination", 12),
      enforceEmptyCustomFormula: val("weapons.enforceEmptyCustomFormula", true)
    },
    armor: {
      tierLevels: [
        val("armor.tierLevels.0", 1),
        val("armor.tierLevels.1", 5),
        val("armor.tierLevels.2", 11),
        val("armor.tierLevels.3", 17)
      ],
      acBonusByTier: [
        val("armor.acBonusByTier.0", 0),
        val("armor.acBonusByTier.1", 1),
        val("armor.acBonusByTier.2", 2),
        val("armor.acBonusByTier.3", 3)
      ],
      baseAcDefault: val("armor.baseAcDefault", 11),
      requireArmorValue: val("armor.requireArmorValue", true)
    }
  };
}
