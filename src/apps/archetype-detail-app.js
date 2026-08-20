import { TEMPLATE_PATHS } from "../utils/constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CrimsonScalerArchetypeDetailApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "ld-crimson-scaler-archetype-detail",
    tag: "section",
    classes: ["ld-crimson-scaler", "ld-crimson-scaler-detail"],
    position: {
      width: 1080,
      height: 820
    },
    window: {
      title: "LD Crimson Scaler - Archetype Detail",
      icon: "fa-solid fa-shield-halved",
      resizable: true
    }
  };

  static PARTS = {
    main: {
      template: TEMPLATE_PATHS.ARCHETYPE_DETAIL
    }
  };

  constructor(archetypeGroup, options = {}) {
    super(options);
    this.archetypeGroup = archetypeGroup;
  }

  async _prepareContext() {
    return {
      group: this.archetypeGroup
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.element;
    if (!root) return;

    this._domAbort?.abort();
    this._domAbort = new AbortController();
    const { signal } = this._domAbort;

    root.querySelector("[data-action='back-to-hub']")?.addEventListener("click", () => {
      this.close();
    }, { signal });
  }

  async close(options) {
    this._domAbort?.abort();
    this._domAbort = null;
    return super.close(options);
  }
}
