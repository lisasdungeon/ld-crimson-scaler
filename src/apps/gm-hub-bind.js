/**
 * GM Hub DOM event binding
 */
import { MODULE_ID } from "../utils/constants.js";
import { deployDatasetService } from "../services/deploy-dataset-service.js";
import { playerActionsService } from "../services/player-actions-service.js";
import { PLAYER_CONTENT_TYPES } from "./gm-hub-constants.js";

export function bindUiEvents(signal) {
  const root = this.element;
  if (!root) return;
  const opts = signal ? { signal } : undefined;

  root.querySelectorAll("[data-action='switch-tab']").forEach((button) => {
    button.addEventListener("click", () => {
      this.activeTab = button.dataset.tab;
      this.render({ force: true });
    }, opts);
  });

  // Dispatch panel collapse toggle
  root.querySelector("[data-action='toggle-dispatch']")?.addEventListener("click", () => {
    const body = root.querySelector(".cs-dispatch-body");
    const icon = root.querySelector(".cs-dispatch-toggle i");
    if (body) {
      const hidden = body.style.display === "none";
      body.style.display = hidden ? "" : "none";
      if (icon) icon.className = hidden ? "fas fa-chevron-down" : "fas fa-chevron-right";
    }
  }, opts);

  root.querySelectorAll("[data-action='select-class']").forEach((card) => {
    card.addEventListener("click", () => {
      const classKey = card.dataset.classKey || null;
      this.openClassDetail(classKey);
    }, opts);
  });

  root.querySelectorAll("[data-action='open-archetype-group']").forEach((card) => {
    card.addEventListener("click", () => {
      const classIdentifier = card.dataset.classIdentifier || null;
      this.openArchetypeDetail(classIdentifier);
    }, opts);
  });

  root.querySelector("[data-action='refresh-items']")?.addEventListener("click", async () => {
    await this.render({ force: true });
    ui.notifications.info("RNK Crimson Scaler: item snapshot refreshed.");
  }, opts);

  root.querySelector("[data-action='deploy-dataset']")?.addEventListener("click", async () => {
    if (!game.user.isGM) return;

    ui.notifications.info("RNK Crimson Scaler: syncing archetype datasets (update-only, UUID-preserving mode)...");
    try {
      const result = await deployDatasetService.deployAll({ allowCreate: true });
      await this.render({ force: true });
      ui.notifications.info(
        `RNK Crimson Scaler: sync complete | ` +
        `archetypes updated ${result.archetypes.updated}, skipped ${result.archetypes.skipped}, created ${result.archetypes.created} | ` +
        `subclasses ${result.archetypes.subclass}, feats ${result.archetypes.feat}.`
      );
    } catch (error) {
      console.error(`${MODULE_ID} | Dataset deployment failed`, error);
      ui.notifications.error("RNK Crimson Scaler: dataset deployment failed. Check console.");
    }
  }, opts);

  root.querySelector("[data-action='cleanup-duplicates']")?.addEventListener("click", async () => {
    if (!game.user.isGM) return;

    const confirmed = typeof Dialog?.confirm === "function"
      ? await Dialog.confirm({
        title: "RNK Crimson Scaler",
        content: "<p>Cleanup duplicate archetype subclass/feat items created by prior deployments?</p>",
        yes: () => true,
        no: () => false,
        defaultYes: false
      })
      : true;

    if (!confirmed) return;

    ui.notifications.info("RNK Crimson Scaler: cleaning duplicate archetype items...");
    try {
      const result = await deployDatasetService.purgeDatasetDuplicates();
      await this.render({ force: true });
      if (result.deletedTotal > 0) {
        ui.notifications.info(
          `RNK Crimson Scaler: duplicate cleanup complete | ` +
          `archetype groups ${result.archetypes.duplicateGroups}, deleted ${result.archetypes.deleted} | ` +
          `total deleted ${result.deletedTotal}.`
        );
      } else {
        ui.notifications.warn(
          "RNK Crimson Scaler: cleanup ran but deleted 0 archetype items. If duplicates remain, run Sync first, then Cleanup again."
        );
      }
    } catch (error) {
      console.error(`${MODULE_ID} | Duplicate cleanup failed`, error);
      ui.notifications.error("RNK Crimson Scaler: duplicate cleanup failed. Check console.");
    }
  }, opts);

  root.querySelector("[data-action='search-items']")?.addEventListener("input", (event) => {
    this.searchText = String(event.target.value || "").trim();
    this.render({ force: true });
  }, opts);

  root.querySelector("[data-action='select-player']")?.addEventListener("change", (event) => {
    this.selectedUserId = String(event.target.value || "") || null;
    this.selectedActorId = null;
    this.render({ force: true });
  }, opts);

  root.querySelector("[data-action='select-actor']")?.addEventListener("change", (event) => {
    this.selectedActorId = String(event.target.value || "") || null;
    this.render({ force: true });
  }, opts);

  root.querySelector("[data-action='select-content-type']")?.addEventListener("change", (event) => {
    this.selectedContentType = String(event.target.value || PLAYER_CONTENT_TYPES.CLASS);
    this.selectedItemId = null;
    this.render({ force: true });
  }, opts);

  root.querySelector("[data-action='select-content-item']")?.addEventListener("change", (event) => {
    this.selectedItemId = String(event.target.value || "") || null;
  }, opts);

  root.querySelector("[data-action='send-popup-to-player']")?.addEventListener("click", async () => {
    if (!game.user.isGM) return;
    if (!this.selectedUserId || !this.selectedItemId) {
      ui.notifications.warn("RNK Crimson Scaler: select a player and item first.");
      return;
    }

    const item = game.items?.get(this.selectedItemId);
    if (!item) {
      ui.notifications.error("RNK Crimson Scaler: selected item not found.");
      return;
    }

    const targets = this.getPlayerTargets();
    const selectedTarget = targets.find((t) => t.id === this.selectedUserId);
    const targetUserIds = selectedTarget?.ownerUserIds ?? [];

    if (!targetUserIds.length) {
      ui.notifications.warn("RNK Crimson Scaler: selected player has no owning user accounts.");
      return;
    }

    for (const userId of targetUserIds) {
      await playerActionsService.sendItemPopupToUser({
        userId,
        itemUuid: item.uuid
      });
    }

    ui.notifications.info(`RNK Crimson Scaler: sent ${item.name} popup to ${selectedTarget?.name || "selected player"}.`);
  }, opts);

  root.querySelector("[data-action='add-item-to-actor']")?.addEventListener("click", async () => {
    if (!game.user.isGM) return;
    if (!this.selectedActorId || !this.selectedItemId) {
      ui.notifications.warn("RNK Crimson Scaler: select an actor and item first.");
      return;
    }

    try {
      const result = await playerActionsService.addItemToActorSheet({
        actorId: this.selectedActorId,
        itemId: this.selectedItemId
      });
      ui.notifications.info(`RNK Crimson Scaler: added ${result.itemName} to ${result.actorName}.`);
    } catch (error) {
      console.error(`${MODULE_ID} | Add item to actor failed`, error);
      ui.notifications.error("RNK Crimson Scaler: failed adding item to actor sheet.");
    }
  }, opts);

  root.querySelector("[data-action='level-up-actor']")?.addEventListener("click", async () => {
    await this.handleActorLevelAdjust(1);
  }, opts);

  root.querySelector("[data-action='level-down-actor']")?.addEventListener("click", async () => {
    await this.handleActorLevelAdjust(-1);
  }, opts);

  root.querySelector("[data-action='save-rules']")?.addEventListener("click", async () => {
    try {
      const rules = this.collectRulesFromInputs(root);
      const jsonText = JSON.stringify(rules, null, 2);
      await scalingRuleService.saveRulesFromJson(jsonText);
      this.rulesJsonDraft = scalingRuleService.getRulesAsJson();
      this.lastValidation = { valid: true, errors: [] };
      ui.notifications.info("RNK Crimson Scaler: scaling rules saved.");
      await this.render({ force: true });
    } catch (error) {
      ui.notifications.error("RNK Crimson Scaler: failed to save rules. Check console.");
      console.error(`${MODULE_ID} | Failed to save scaling rules`, error);
    }
  }, opts);

  root.querySelector("[data-action='reset-rules']")?.addEventListener("click", async () => {
    this.rulesJsonDraft = null;
    await this.render({ force: true });
    ui.notifications.info("RNK Crimson Scaler: rules reset to defaults.");
  }, opts);

  // Archetype inline expand toggle
  root.querySelectorAll("[data-action='toggle-archetype']").forEach((header) => {
    header.addEventListener("click", () => {
      const group = header.closest(".cs-archetype-group");
      const detail = group?.querySelector(".cs-archetype-detail");
      const chevron = header.querySelector(".cs-archetype-chevron i");
      if (detail) {
        const hidden = detail.style.display === "none";
        detail.style.display = hidden ? "" : "none";
        if (chevron) chevron.className = hidden ? "fas fa-chevron-down" : "fas fa-chevron-right";
      }
    }, opts);
  });

  // Archetype popup to player
  root.querySelectorAll("[data-action='arch-popup']").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!game.user.isGM) return;
      const itemId = btn.dataset.itemId;
      const item = game.items?.get(itemId);
      if (!item) { ui.notifications.error("Item not found."); return; }
      if (!this.selectedUserId) { ui.notifications.warn("Select a player in Dispatch first."); return; }
      const targets = this.getPlayerTargets();
      const target = targets.find((t) => t.id === this.selectedUserId);
      for (const userId of (target?.ownerUserIds ?? [])) {
        await playerActionsService.sendItemPopupToUser({ userId, itemUuid: item.uuid });
      }
      ui.notifications.info(`Sent ${item.name} popup to ${target?.name || "player"}.`);
    }, opts);
  });

  // Archetype assign to actor
  root.querySelectorAll("[data-action='arch-assign']").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!game.user.isGM) return;
      const itemId = btn.dataset.itemId;
      if (!this.selectedActorId) { ui.notifications.warn("Select an actor in Dispatch first."); return; }
      try {
        const result = await playerActionsService.addItemToActorSheet({ actorId: this.selectedActorId, itemId });
        ui.notifications.info(`Added ${result.itemName} to ${result.actorName}.`);
      } catch (error) {
        console.error(`${MODULE_ID} | Assign archetype failed`, error);
        ui.notifications.error("Failed to assign item. Check console.");
      }
    }, opts);
  });

  // Covens + Generator tabs
  this.bindCovenEvents(root, opts);
  this.bindGeneratorEvents(root, opts);
}
