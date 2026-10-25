
import { BladesSheet } from "./blades-sheet.js";

/**
 * @extends {BladesSheet}
 */
export class BladesNPCSheet extends BladesSheet {

  /** @override */
  static DEFAULT_OPTIONS = {
    position: {
      width: 900,
      height: "auto"
    }
  };

  /** @override */
  static PARTS = {
    sheet: {
      template: "systems/blades-in-the-dark/templates/npc-sheet.html",
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
    // html.find('.item-body').click(ev => {
    //   const element = $(ev.currentTarget).parents(".item");
    //   const item = this.actor.items.get(element.data("itemId"));
    //   item.sheet.render(true);
    // });

    // // Delete Inventory Item
    // html.find('.item-delete').click(ev => {
    //   const element = $(ev.currentTarget).parents(".item");
    //   this.actor.deleteEmbeddedDocuments("Item", [element.data("itemId")]);
    //   element.slideUp(200, () => this.render(false));
    // });

	}
}
