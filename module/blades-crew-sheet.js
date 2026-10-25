import { BladesSheet, parseDataValue } from "./blades-sheet.js";
import { BladesActiveEffect } from "./blades-active-effect.js";
import { BladesHelpers } from "./blades-helpers.js";

/**
 * @extends {BladesSheet}
 */
export class BladesCrewSheet extends BladesSheet {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["crew"],
    position: {
      width: 940,
      height: 940
    }
  };

  /** @override */
  static PARTS = {
    sheet: {
      template: "systems/blades-in-the-dark/templates/crew-sheet.html",
      scrollable: [""]
    }
  };

  /** @override */
  tabGroups = {
    primary: "turfs"
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const sheetData = await super._prepareContext(options);
	
    // Prepare active effects
    sheetData.effects = BladesActiveEffect.prepareActiveEffectCategories(this.actor.effects);

    // Calculate Turfs amount.
    let turfs_amount = 0;
	let turfs_max = sheetData.system.turf.max;

    sheetData.items.forEach(item => {

      if (item.type === "crew_type") {
        Object.entries(item.system.turfs).forEach(([key, turf]) => {
          if (turf.name === 'BITD.Turf') {
            turfs_amount += (turf.value === true) ? 1 : 0;
          }
        });
      }

    });
	
	turfs_amount = turfs_amount + sheetData.system.turf.bonus;
	if (turfs_amount > turfs_max) {turfs_amount = turfs_max;};
    sheetData.system.turfs_amount = turfs_amount;
	
	//return data
    return sheetData;
	
  }
  
  /** @override **/
  async _onDropActor(event, droppedActor){
    const result = await super._onDropActor(event, droppedActor);
    if (!this.actor.isOwner) {
      ui.notifications.error(`You do not have sufficient permissions to edit this character. Please speak to your GM if you feel you have reached this message in error.`, {permanent: true});
      return false;
    }
    await this.handleDrop(event, droppedActor);
    return result ?? droppedActor;
  }
  
  /** @override **/
  async handleDrop(event, droppedEntity){
    let droppedEntityFull = await fromUuid(droppedEntity.uuid);
    switch (droppedEntityFull.type) {
      case "npc":
        await BladesHelpers.addAcquaintance(this.actor, droppedEntityFull);
        break;
      case "item":
        break;
      case "crew_type":
        break;
      case "ability":
        break;
      case "class":
        break ;
      default:
        break;
    }
  }
  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Crew Type
    this._on(".crew-class", "click", this._onItemAddClick.bind(this));

    // Add a new Cohort
    this._on('.add-item', 'click', ev => {
      BladesHelpers._addOwnedItem(ev, this.actor);
    });

    // Toggle Turf
    this._on('.turf-select', 'click', async ev => {
      let item_id = this._itemIdOf(ev.currentTarget);
      let turf_id = parseDataValue(ev.currentTarget.dataset.turfId);
      let turf_current_status = parseDataValue(ev.currentTarget.dataset.turfStatus);
      let turf_checkbox_name = 'system.turfs.' + turf_id + '.value';

      await this.actor.updateEmbeddedDocuments('Item', [{
        _id: item_id,
        [turf_checkbox_name]: !turf_current_status}]);
      this.render();
    });

    // Cohort Block Harm handler
    this._on('.cohort-block-harm input[type="radio"]', 'change', async ev => {
      let item_id = this._itemIdOf(ev.currentTarget);
      let harm_id = ev.currentTarget.value;

      await this.actor.updateEmbeddedDocuments('Item', [{
        _id: item_id,
        "system.harm": [harm_id]}]);
      this.render();
    });

    // Add custom contact
    this._on('.add-custom-contact', 'click', () => {
      BladesHelpers.addCustomContact(this.actor);
    });

  }


  /* -------------------------------------------- */
  /*  Form Submission                             */
	/* -------------------------------------------- */

  /** @override */
  async _processSubmitData(event, form, submitData, options) {

    // Update the Actor
    const result = await super._processSubmitData(event, form, submitData, options);

    if (event.target && event.target.name === "system.tier") {
      this.render();
    }
    return result;
  }
  /* -------------------------------------------- */

}
