/**
 * Extend the basic ItemSheet
 * @extends {ItemSheetV2}
 */
import {onManageActiveEffect, prepareActiveEffectCategories} from "./effects.js";
import { BladesActiveEffect } from "./blades-active-effect.js";
import { activateRadioToggles } from "./blades-sheet.js";
import { enrichHTML } from "./compat.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class BladesItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["blades-in-the-dark", "sheet", "item", "themed", "theme-light"],
    position: {
      width: 560,
      height: "auto"
    },
    window: {
      resizable: true
    },
    form: {
      submitOnChange: true
    }
  };

  /** @override */
  static PARTS = {
    sheet: {
      template: "systems/blades-in-the-dark/templates/items/simple.html",
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /**
   * The template for this item's type.
   */
  get template() {
    const path = "systems/blades-in-the-dark/templates/items";
    let simple_item_types = ["background", "heritage", "vice", "crew_reputation"];
    let template_name = `${this.item.type}`;

    if (simple_item_types.indexOf(this.item.type) >= 0) {
      template_name = "simple";
    }

    return `${path}/${template_name}.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    parts.sheet.template = this.template;
    return parts;
  }

  /* -------------------------------------------- */

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.activateListeners(this.element);
  }

  /* -------------------------------------------- */

  /**
   * Attach the sheet's event listeners. Called after every render.
   * @param {HTMLElement} html  The sheet's root element
   */
	activateListeners(html) {
    activateRadioToggles(this);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    for (const control of html.querySelectorAll(".effect-control")) {
      control.addEventListener("click", ev => {
        if ( this.item.isOwned ) return ui.notifications.warn(game.i18n.localize("BITD.EffectWarning"))
        BladesActiveEffect.onManageActiveEffect(ev, this.item)
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Shape the context like the Application V1 sheets did (the item's own data at the
   * top level) so the Handlebars templates keep working unchanged.
   * @override
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sheetData = Object.assign(context, this.item.toObject(false), {
      item: this.item,
      owner: this.item.isOwner,
      editable: this.isEditable,
      isGM: game.user.isGM
    });

    // Prepare Active Effects
    sheetData.effects = prepareActiveEffectCategories(this.document.effects);

    // Rich text shown by the <prose-mirror> editors while they are closed
    sheetData.enriched = {};
    for (const field of ["description", "experience_clues"]) {
      const value = sheetData.system[field];
      if (value === undefined || value === null) continue;
      sheetData.enriched[field] = await enrichHTML(String(value), {
        secrets: sheetData.owner,
        relativeTo: this.item
      });
    }

    return sheetData;
  }
}
