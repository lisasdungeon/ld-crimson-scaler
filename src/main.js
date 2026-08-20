import { CrimsonScalerHubApp } from "./apps/gm-hub-app.js";
import { DEFAULT_SCALING_RULES, MODULE_ID, SETTING_KEYS, TEMPLATE_PATHS } from "./utils/constants.js";
import { scalingRuleService } from "./services/scaling-rule-service.js";
import { classItemScalingService } from "./services/class-item-scaling-service.js";
import { playerActionsService } from "./services/player-actions-service.js";
import { migrateLegacyAssetPaths, migrateLegacyFlags, rewriteLegacyAssetPath } from "../ld-legacy-migrate.js";

const ROLL_FALLBACK_HOOK_FLAG = "__rnkCrimsonScalerRollFallbackHooked";

function tryEvaluateLegacyNumericTernary(formula) {
  const source = String(formula ?? "").replace(/\s+/g, "");
  if (!source || source.includes("@") || !source.includes("?") || !source.includes(":")) return null;

  const matcher = source.match(/^(-?\d+(?:\.\d+)?)>=(-?\d+(?:\.\d+)?)\?(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?)>=(-?\d+(?:\.\d+)?)\?(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?)>=(-?\d+(?:\.\d+)?)\?(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?)$/);
  if (!matcher) return null;

  const [
    ,
    leftA, rightA, valueA,
    leftB, rightB, valueB,
    leftC, rightC, valueC,
    valueD
  ] = matcher;

  const left = Number(leftA);
  if (!Number.isFinite(left)) return null;
  if (Number(leftB) !== left || Number(leftC) !== left) return null;

  if (left >= Number(rightA)) return Number(valueA);
  if (left >= Number(rightB)) return Number(valueB);
  if (left >= Number(rightC)) return Number(valueC);
  return Number(valueD);
}

function installRollFallbackPatch() {
  if (globalThis[ROLL_FALLBACK_HOOK_FLAG]) return;
  if (!globalThis.Roll?.prototype?.evaluateSync) return;

  const originalEvaluateSync = globalThis.Roll.prototype.evaluateSync;

  globalThis.Roll.prototype.evaluateSync = function wrappedEvaluateSync(...args) {
    try {
      return originalEvaluateSync.apply(this, args);
    } catch (error) {
      const message = String(error?.message ?? "");
      const formula = String(this?.formula ?? this?._formula ?? "");

      const isTargetError = message.includes("Unresolved StringTerm") && formula.includes("?") && formula.includes(":");
      if (!isTargetError) throw error;

      const value = tryEvaluateLegacyNumericTernary(formula);
      if (!Number.isFinite(value)) throw error;

      console.warn(`${MODULE_ID} | Recovered unresolved StringTerm formula: ${formula} => ${value}`);
      return globalThis.Roll.create(String(value)).evaluateSync(...args);
    }
  };

  globalThis[ROLL_FALLBACK_HOOK_FLAG] = true;
}

installRollFallbackPatch();

function forceRender(app) {
  if (!app?.render) return app;
  const after = () => {
    try {
      if (app.element || app.rendered) app.bringToFront?.();
    } catch (_err) {
      /* ignore pre-render bringToFront */
    }
  };
  let result;
  try {
    result = app.render({ force: true });
  } catch (_) {
    try {
      result = app.render(true);
    } catch (_err2) {
      return app;
    }
  }
  if (result && typeof result.then === "function") result.then(after).catch(() => {});
  else after();
  return app;
}

function openHub() {
  if (!game.user?.isGM) {
    ui.notifications?.warn?.("LD Crimson Scaler: GM access only.");
    return;
  }
  let app = null;
  try {
    app = foundry?.applications?.instances?.get?.("ld-crimson-scaler-hub");
  } catch (_) { /* ignore */ }
  if (!app) app = new CrimsonScalerHubApp();
  forceRender(app);
  return app;
}

function createHubTool() {
  return {
    name: "ld-crimson-scaler-hub",
    title: "LD Crimson Scaler Hub",
    icon: "fas fa-scale-balanced",
    button: true,
    visible: true,
    onChange: (active) => {
      if (active) openHub();
    }
  };
}

function ensureToolInArrayControls(controls) {
  const tokenControl = controls.find((c) => c?.name === "token" || c?.name === "tokens");
  const tool = createHubTool();

  if (tokenControl) {
    if (Array.isArray(tokenControl.tools)) {
      if (!tokenControl.tools.some((t) => t?.name === tool.name)) tokenControl.tools.push(tool);
      return;
    }

    if (tokenControl.tools && typeof tokenControl.tools === "object") {
      if (!tokenControl.tools[tool.name]) tokenControl.tools[tool.name] = tool;
      return;
    }

    tokenControl.tools = [tool];
    return;
  }

  controls.push({
    name: "ld-crimson-scaler",
    title: "LD Crimson Scaler",
    icon: "fas fa-scale-balanced",
    layer: "token",
    order: 180,
    visible: true,
    tools: [tool]
  });
}

function ensureToolInObjectControls(controls) {
  const tokenControl = controls.token || controls.tokens;
  const tool = createHubTool();

  if (tokenControl) {
    if (Array.isArray(tokenControl.tools)) {
      if (!tokenControl.tools.some((t) => t?.name === tool.name)) tokenControl.tools.push(tool);
      return;
    }

    tokenControl.tools ??= {};
    if (!tokenControl.tools[tool.name]) tokenControl.tools[tool.name] = tool;
    return;
  }

  controls["ld-crimson-scaler"] = {
    name: "ld-crimson-scaler",
    title: "LD Crimson Scaler",
    icon: "fas fa-scale-balanced",
    layer: "token",
    order: 180,
    visible: true,
    tools: {
      [tool.name]: tool
    }
  };
}

function stripHubToolFromControls(controls) {
  if (Array.isArray(controls)) {
    for (const control of controls) {
      if (!control) continue;

      if (Array.isArray(control.tools)) {
        control.tools = control.tools.filter((t) => t?.name !== "ld-crimson-scaler-hub");
      } else if (control.tools && typeof control.tools === "object") {
        delete control.tools["ld-crimson-scaler-hub"];
      }
    }

    const idx = controls.findIndex((c) => c?.name === "ld-crimson-scaler");
    if (idx >= 0) controls.splice(idx, 1);
    return;
  }

  if (controls && typeof controls === "object") {
    const tokenControl = controls.token || controls.tokens;
    if (tokenControl) {
      if (Array.isArray(tokenControl.tools)) {
        tokenControl.tools = tokenControl.tools.filter((t) => t?.name !== "ld-crimson-scaler-hub");
      } else if (tokenControl.tools && typeof tokenControl.tools === "object") {
        delete tokenControl.tools["ld-crimson-scaler-hub"];
      }
    }

    delete controls["ld-crimson-scaler"];
  }
}

Hooks.once("init", async () => {
  // Register Handlebars helpers for template conditionals
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("neq", (a, b) => a !== b);

  // Register scene control button hook
  Hooks.on("getSceneControlButtons", (controls) => {
    if (!game.user?.isGM) {
      stripHubToolFromControls(controls);
      return;
    }

    if (Array.isArray(controls)) {
      console.log(`${MODULE_ID} | getSceneControlButtons(array) fired; controls=${controls.length}`);
      ensureToolInArrayControls(controls);
      return;
    }

    if (controls && typeof controls === "object") {
      console.log(`${MODULE_ID} | getSceneControlButtons(object) fired; keys=${Object.keys(controls).length}`);
      ensureToolInObjectControls(controls);
      return;
    }

    console.warn(`${MODULE_ID} | getSceneControlButtons fired with unsupported controls shape.`);
  });

  // Style the scene control button to match the Crimson theme
  Hooks.on("renderSceneControls", () => {
    const btn = document.querySelector('[data-control="ld-crimson-scaler"], [data-tool="ld-crimson-scaler-hub"]');
    if (!btn) return;
    btn.style.setProperty("color", "#cc0000", "important");
    btn.style.setProperty("text-shadow", "0 0 8px rgba(180, 0, 0, 0.8)", "important");
  });

  // Register settings
  game.settings.register(MODULE_ID, SETTING_KEYS.RULES_JSON, {
    name: "Scaling Rules JSON",
    hint: "GM-editable scaling rule object for LD Crimson Scaler.",
    scope: "world",
    config: false,
    type: String,
    default: JSON.stringify(DEFAULT_SCALING_RULES, null, 2)
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.INCLUDE_COMPENDIUM_ITEMS, {
    name: "Include Compendium Items",
    hint: "Include compendium item indexes when building scaling snapshots.",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  try {
    await foundry.applications.handlebars.loadTemplates([
      TEMPLATE_PATHS.ITEMS_SCALING_EDITOR,
      TEMPLATE_PATHS.CLASS_DETAIL,
      TEMPLATE_PATHS.ARCHETYPE_DETAIL
    ]);
  } catch (error) {
    console.error(`${MODULE_ID} | Template preload failed`, error);
  }
});

Hooks.once("ready", async () => {
  if (game.user?.isGM) {
    try {
      const flagsMoved = await migrateLegacyFlags("ld-crimson-scaler", "rnk-crimson-scaler");
      const assetsMoved = await migrateLegacyAssetPaths();
      if (flagsMoved || assetsMoved) {
        console.log(`${MODULE_ID} | legacy migrate flags=${flagsMoved} assets=${assetsMoved}`);
      }
    } catch (err) {
      console.warn(`${MODULE_ID} | legacy migrate failed`, err);
    }
  }

  playerActionsService.registerSocketListener();

  if (!game.user?.isGM) {
    try {
      stripHubToolFromControls(ui.controls?.controls);
      ui.controls?.render({ reset: true });
    } catch (error) {
      console.warn(`${MODULE_ID} | Failed enforcing player control visibility`, error);
    }
    return;
  }

  ui.controls?.render({ reset: true });
  try {
    const cleanup = await playerActionsService.sanitizeWorldAndActorItemEffects();
    if (cleanup.fixes > 0) {
      console.log(`${MODULE_ID} | Sanitized unsafe AC-bonus formulas: fixes=${cleanup.fixes}, worldItems=${cleanup.worldItems}, actorItems=${cleanup.actorItems}`);
      ui.notifications.info("LD Crimson Scaler: sanitized legacy AC-bonus formulas. Reload once more if errors were already present.");
    }
  } catch (error) {
    console.error(`${MODULE_ID} | Failed sanitizing legacy formulas`, error);
  }
  console.log("LD Crimson Scaler | Ready");
});

function rewriteDeadIconNodes(root) {
  const node = root instanceof HTMLElement ? root : root?.[0];
  if (!node?.querySelectorAll) return;
  for (const img of node.querySelectorAll("img")) {
    const src = img.getAttribute("src") || "";
    const next = rewriteLegacyAssetPath(src);
    if (next && next !== src) img.setAttribute("src", next);
  }
}

Hooks.on("renderChatMessage", (_message, html) => rewriteDeadIconNodes(html));
Hooks.on("renderChatMessageHTML", (_message, html) => rewriteDeadIconNodes(html));

Hooks.on("updateActor", async (actor, changed) => {
  if (!game.user.isGM) return;

  const levelChanged =
    Object.prototype.hasOwnProperty.call(changed ?? {}, "system") &&
    Object.prototype.hasOwnProperty.call(changed?.system?.details ?? {}, "level");

  if (!levelChanged) return;

  const rules = scalingRuleService.getRules();
  const result = await classItemScalingService.applyScalingForActor(actor, rules);

  if (result.updated > 0) {
    console.log(`${MODULE_ID} | Applied scaling to ${result.updated}/${result.checked} class-linked items for actor ${actor.name}.`);
  }
});
