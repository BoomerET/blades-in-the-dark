
import { BladesSheet } from "./blades-sheet.js";

/**
 * @extends {BladesSheet}
 */
export class BladesFactionSheet extends BladesSheet {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["faction"],
    position: {
      width: 900,
      height: "auto"
    }
  };

  /** @override */
  static PARTS = {
    sheet: {
      template: "systems/blades-in-the-dark/templates/faction-sheet.html",
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Update Inventory Item
    this._on('.item-body', 'click', ev => {
      const item = this.actor.items.get(this._itemIdOf(ev.currentTarget));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    this._on('.item-delete', 'click', async ev => {
      await this.actor.deleteEmbeddedDocuments("Item", [this._itemIdOf(ev.currentTarget)]);
    });

	}
}
