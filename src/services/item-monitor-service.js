import { MODULE_ID, SETTING_KEYS, UI_LIMITS } from "../utils/constants.js";
import { scalingValidatorService } from "./scaling-validator-service.js";
import { classItemScalingService } from "./class-item-scaling-service.js";

export class ItemMonitorService {
  async collectClassScalingSnapshot(rules) {
    const includeCompendiums = game.settings.get(MODULE_ID, SETTING_KEYS.INCLUDE_COMPENDIUM_ITEMS);

    const classItems = Array.from(game.items ?? []).filter((item) => item.type === "class");
    const groups = this.initializeGroupsFromClasses(classItems);

    const flaggedWorldItems = this.collectWorldItems();
    const flaggedCompendiumItems = includeCompendiums ? await this.collectCompendiumItems() : [];

    this.addFlagLinkedItemsToGroups(groups, [...flaggedWorldItems, ...flaggedCompendiumItems], rules);
    await this.addClassSheetGrantItemsToGroups(groups, rules);

    const classes = Object.values(groups)
      .sort((a, b) => a.classLabel.localeCompare(b.classLabel))
      .map((entry) => this.finalizeGroup(entry));

    return {
      source: {
        worldItems: flaggedWorldItems.length,
        compendiumItems: flaggedCompendiumItems.length,
        includeCompendiums
      },
      classes
    };
  }

  initializeGroupsFromClasses(classItems) {
    const groups = {};

    for (const classItem of classItems) {
      const classKey = this.normalizeKey(classItem.system?.identifier)
        || this.normalizeKey(classItem.name)
        || "unlinked";

      groups[classKey] = {
        classKey,
        classLabel: classItem.name,
        classSubName: this.extractClassSubName(classItem),
        classItem: {
          id: classItem.id,
          name: classItem.name,
          identifier: classItem.system?.identifier ?? ""
        },
        linkedContent: this.extractClassLinkedContent(classItem),
        weapons: this.emptyCategory(),
        armor: this.emptyCategory(),
        dedupe: {
          weapons: new Set(),
          armor: new Set()
        }
      };
    }

    if (!Object.keys(groups).length) {
      groups.unlinked = {
        classKey: "unlinked",
        classLabel: "Unlinked",
        classSubName: "",
        classItem: null,
        linkedContent: this.emptyLinkedContent(),
        weapons: this.emptyCategory(),
        armor: this.emptyCategory(),
        dedupe: {
          weapons: new Set(),
          armor: new Set()
        }
      };
    }

    return groups;
  }

  emptyCategory() {
    return {
      rows: [],
      summary: { total: 0, healthy: 0, withIssues: 0 }
    };
  }

  addFlagLinkedItemsToGroups(groups, items, rules) {
    for (const item of items) {
      const classKey = item?.flags?.[MODULE_ID]?.scaling?.classKey || "unlinked";
      const role = item?.flags?.[MODULE_ID]?.scaling?.itemRole || this.inferRole(item);
      this.pushEvaluatedItem(groups, classKey, role, item, rules, "flag");
    }
  }

  async addClassSheetGrantItemsToGroups(groups, rules) {
    const classKeys = Object.keys(groups);

    for (const classKey of classKeys) {
      const group = groups[classKey];
      const grants = group.linkedContent?.grants ?? [];
      const uuids = [...new Set(grants.flatMap((g) => g.uuids || []))];

      for (const uuid of uuids) {
        try {
          const doc = await fromUuid(uuid);
          if (!doc || doc.documentName !== "Item") continue;

          const role = this.inferRole(doc);
          if (role !== "weapon" && role !== "armor") continue;

          this.pushEvaluatedItem(groups, classKey, role, doc, rules, "class-sheet");
        } catch (error) {
          console.warn(`${MODULE_ID} | Failed to resolve class grant UUID: ${uuid}`, error);
        }
      }
    }
  }

  pushEvaluatedItem(groups, classKey, role, item, rules, source) {
    const ensureUnlinked = () => {
      if (groups.unlinked) return;
      groups.unlinked = {
        classKey: "unlinked",
        classLabel: "Unlinked",
        classSubName: "",
        classItem: null,
        linkedContent: this.emptyLinkedContent(),
        weapons: this.emptyCategory(),
        armor: this.emptyCategory(),
        dedupe: {
          weapons: new Set(),
          armor: new Set()
        }
      };
    };

    if (!(classKey in groups)) ensureUnlinked();
    const group = groups[classKey] || groups.unlinked;

    if (role === "weapon") {
      const row = scalingValidatorService.evaluateWeaponItem(item, rules);
      row.source = source;
      const rowKey = this.itemRowKey(item, row.name, "weapon");
      if (!group.dedupe.weapons.has(rowKey)) {
        group.dedupe.weapons.add(rowKey);
        group.weapons.rows.push(row);
      }
      return;
    }

    if (role === "armor") {
      const row = scalingValidatorService.evaluateArmorItem(item, rules);
      row.source = source;
      const rowKey = this.itemRowKey(item, row.name, "armor");
      if (!group.dedupe.armor.has(rowKey)) {
        group.dedupe.armor.add(rowKey);
        group.armor.rows.push(row);
      }
    }
  }

  finalizeGroup(group) {
    group.weapons.summary = scalingValidatorService.summarize(group.weapons.rows);
    group.armor.summary = scalingValidatorService.summarize(group.armor.rows);

    return {
      classKey: group.classKey,
      classLabel: group.classLabel,
      classSubName: group.classSubName,
      classItem: group.classItem,
      linkedContent: group.linkedContent,
      summary: {
        total: group.weapons.summary.total + group.armor.summary.total,
        healthy: group.weapons.summary.healthy + group.armor.summary.healthy,
        withIssues: group.weapons.summary.withIssues + group.armor.summary.withIssues
      },
      weapons: {
        summary: group.weapons.summary,
        rows: group.weapons.rows.slice(0, UI_LIMITS.LIST_PREVIEW_COUNT)
      },
      armor: {
        summary: group.armor.summary,
        rows: group.armor.rows.slice(0, UI_LIMITS.LIST_PREVIEW_COUNT)
      }
    };
  }

  itemRowKey(item, fallbackName, role) {
    return [
      role,
      item?.uuid || "",
      item?.id || "",
      fallbackName || item?.name || ""
    ].join("|");
  }

  emptyLinkedContent() {
    return {
      grants: [],
      features: [],
      progression: []
    };
  }

  extractClassLinkedContent(classItem) {
    const advancement = Array.isArray(classItem?.system?.advancement)
      ? classItem.system.advancement
      : [];

    const content = this.emptyLinkedContent();
    const featureSeen = new Set();

    for (const entry of advancement) {
      const type = String(entry?.type ?? "");
      const level = Number(entry?.level ?? 0) || 0;
      const title = String(entry?.title ?? "Untitled Entry");

      if (type === "ItemGrant") {
        const items = Array.isArray(entry?.configuration?.items)
          ? entry.configuration.items
          : [];

        content.grants.push({
          title,
          level,
          count: items.length,
          uuids: items.map((it) => it?.uuid).filter(Boolean)
        });

        const normalizedTitle = title.trim().toLowerCase();
        const skipAsFeature = ["starting equipment", "asi", "ability score improvement"].includes(normalizedTitle);
        if (!skipAsFeature && !featureSeen.has(`${level}|${normalizedTitle}`)) {
          content.features.push({
            title,
            level,
            sourceType: "ItemGrant"
          });
          featureSeen.add(`${level}|${normalizedTitle}`);
        }
        continue;
      }

      if (type === "ClassFeature") {
        const normalizedTitle = title.trim().toLowerCase();
        if (!featureSeen.has(`${level}|${normalizedTitle}`)) {
          content.features.push({ title, level, sourceType: "ClassFeature" });
          featureSeen.add(`${level}|${normalizedTitle}`);
        }
        continue;
      }

      content.progression.push({ title, level, type });
    }

    content.grants.sort((a, b) => a.level - b.level || a.title.localeCompare(b.title));
    content.features.sort((a, b) => a.level - b.level || a.title.localeCompare(b.title));
    content.progression.sort((a, b) => a.level - b.level || a.title.localeCompare(b.title));

    return content;
  }

  extractClassSubName(classItem) {
    const html = String(classItem?.system?.description?.value ?? "");
    const text = html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    if (!text) return "";

    const classes = [
      "artificer", "barbarian", "bard", "cleric", "druid", "fighter",
      "monk", "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard"
    ];

    const found = [];
    for (const baseClass of classes) {
      const regex = new RegExp(`\\b${baseClass}\\b`, "g");
      const idx = text.search(regex);
      if (idx >= 0) found.push({ baseClass, idx });
    }

    if (!found.length) return "";

    found.sort((a, b) => a.idx - b.idx);
    const ordered = [];
    for (const f of found) {
      if (!ordered.includes(f.baseClass)) ordered.push(f.baseClass);
    }

    const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const hasHybridHint = /\bhybrid\b|\bcombining\b|\bblend\b|\bmix\b/.test(text);

    if (hasHybridHint && ordered.length >= 2) {
      return `Hybrid: ${titleCase(ordered[0])} / ${titleCase(ordered[1])}`;
    }

    return `Official: ${titleCase(ordered[0])}`;
  }

  normalizeKey(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  inferRole(item) {
    if (item?.type === "weapon") return "weapon";
    if (item?.type === "equipment" && item?.system?.armor) return "armor";
    return "unknown";
  }

  collectWorldItems() {
    return Array.from(game.items ?? []).filter((item) => classItemScalingService.isManagedClassItem(item));
  }

  async collectCompendiumItems() {
    const packs = Array.from(game.packs ?? []).filter((pack) => pack.documentName === "Item");
    const docs = [];

    for (const pack of packs) {
      try {
        const index = await pack.getIndex({ fields: ["name", "type", "system", "flags"] });
        for (const record of index) {
          const pseudoDoc = { ...record, id: `${pack.collection}.${record._id}` };
          if (classItemScalingService.isManagedClassItem(pseudoDoc)) {
            docs.push(pseudoDoc);
          }
        }
      } catch (error) {
        console.warn(`${MODULE_ID} | Failed reading pack ${pack.collection}`, error);
      }
    }

    return docs;
  }
}

export const itemMonitorService = new ItemMonitorService();
