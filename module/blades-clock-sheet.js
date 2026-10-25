
import { BladesSheet } from "./blades-sheet.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {BladesSheet}
 */
export class BladesClockSheet extends BladesSheet {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["clock"],
    position: {
      width: 360,
      height: 400
    }
  };

  /** @override */
  static PARTS = {
    sheet: {
      template: "systems/blades-in-the-dark/templates/actors/clock-sheet.html"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const sheetData = await super._prepareContext(options);
	sheetData.sizeDropdown = {
		"4": "4",
		"6": "6",
		"8": "8",
		"10": "10",
		"12": "12",
	};
	sheetData.colorDropdown = {
		"black": "BITD.Colors.Black",
		"blue": "BITD.Colors.Blue",
		"green": "BITD.Colors.Green",
		"grey": "BITD.Colors.Grey",
		"red": "BITD.Colors.Red",
		"white": "BITD.Colors.White",
		"yellow": "BITD.Colors.Yellow"
	};

    return sheetData;
  }

    /* -------------------------------------------- */

  /** @override */
  async _processSubmitData(event, form, submitData, options) {
    const formData = foundry.utils.flattenObject(submitData);
    let image_path = `systems/blades-in-the-dark/themes/${formData['system.color']}/${formData['system.type']}clock_${formData['system.value']}.svg`;
    formData['img'] = image_path;
    formData['prototypeToken.texture.src'] = image_path;
    let data = [];
    let update = {
      "texture.src": image_path
    };

    let tokens = this.actor.getActiveTokens();
    tokens.forEach( function( token ) {
      data.push(
        foundry.utils.mergeObject(
          { _id: token.id },
          update
        )
      );
    });
    if(game.scenes.current){
      await TokenDocument.updateDocuments( data, { parent: game.scenes.current } )
    }

    // Update the Actor
    return super._processSubmitData(event, form, foundry.utils.expandObject(formData), options);
  }

  /* -------------------------------------------- */

}
