import { TEMPLATE_PATHS } from "../utils/constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CrimsonScalerClassDetailApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "ld-crimson-scaler-class-detail",
    tag: "section",
    classes: ["ld-crimson-scaler", "ld-crimson-scaler-detail"],
    position: {
      width: 1180,
      height: 860
    },
    window: {
      title: "RNK Crimson Scaler - Class Detail",
      icon: "fa-solid fa-book-open",
      resizable: true
    }
  };

  static PARTS = {
    main: {
      template: TEMPLATE_PATHS.CLASS_DETAIL
    }
  };

  constructor(classData, options = {}) {
    super(options);
    this.classData = classData;
  }

  async _prepareContext(_options = {}) {
    return {
      classData: this.classData
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
