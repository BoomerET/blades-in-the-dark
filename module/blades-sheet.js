import { BladesActiveEffect } from "./blades-active-effect.js";
import { BladesHelpers } from "./blades-helpers.js";
import { openFormDialog } from "./lib/dialog-compat.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Read a data-* attribute value the way jQuery's .data() did: "true"/"false",
 * "null" and numeric strings become their JS values, anything else stays a string.
 * @param {string|undefined} value
 */
export function parseDataValue(value) {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (value !== "" && String(Number(value)) === value) return Number(value);
  return value;
}

/**
 * Wire the "radio-toggle" pip behaviour shared by actor and item sheets: clicking an
 * unchecked pip selects it, clicking the selected pip (or right-clicking) steps back one.
 * @param {foundry.applications.api.ApplicationV2} app
 */
export function activateRadioToggles(app) {
  const toggles = app.element.querySelectorAll("input.radio-toggle, label.radio-toggle");
  const onToggle = (event) => onRadioToggle(app, event);

	//for compatibility with bitd-alternate-sheets v1.0.10
	let alt_sheets = false;
	try {alt_sheets = game.modules.get("bitd-alternate-sheets").active;} catch {}
  for (const toggle of toggles) {
    if (alt_sheets) {
      toggle.addEventListener("click", (e) => e.preventDefault());
      toggle.addEventListener("mousedown", onToggle);
    } else {
      toggle.addEventListener("click", onToggle);
    }
    toggle.addEventListener("contextmenu", onToggle);
  }
}

function onRadioToggle(app, event) {
  event.preventDefault();
  const target = event.currentTarget.control ?? event.currentTarget;
  if (!target) return;

  let input = target;
  if (target.checked || (event.type == "contextmenu")) {
    //find the next lowest-value input with the same name and select that one instead
    const value = parseInt(target.value) - 1;
    input = app.element.querySelector(`input[name="${target.name}"][value="${value}"]`);
  }
  // A real click on the input fires its change event, which submits the sheet form.
  input?.click();
}

/**
 * Base Actor sheet for every Blades in the Dark actor type.
 * @extends {ActorSheetV2}
 */
export class BladesSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["blades-in-the-dark", "sheet", "actor", "themed", "theme-light"],
    window: {
      resizable: true
    },
    form: {
      submitOnChange: true
    }
  };

  /* -------------------------------------------- */

  /**
   * Shape the context like the Application V1 sheets did (the actor's own data at the
   * top level) so the Handlebars templates keep working unchanged.
   * @override
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sheetData = this.actor.toObject(false);
    sheetData.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    return Object.assign(context, sheetData, {
      actor: this.actor,
      owner: this.actor.isOwner,
      editable: this.isEditable,
      isGM: game.user.isGM
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async _onRender(context, options) {
    // Application V1 sheets made owned item rows draggable; ActorSheetV2 drags ".draggable".
    for (const row of this.element.querySelectorAll(".item-list .item[data-item-id]")) {
      row.classList.add("draggable");
    }
    await super._onRender(context, options);
    this._restoreTabs();
    this.activateListeners(this.element);
  }

  /* -------------------------------------------- */

  /**
   * Re-apply the active tab of each tab group after the template has been re-rendered.
   */
  _restoreTabs() {
    for (const [group, tab] of Object.entries(this.tabGroups)) {
      const navSelector = `.tabs [data-group="${group}"]`;
      const nav = this.element.querySelector(`${navSelector}[data-tab="${tab}"]`)
        ?? this.element.querySelector(navSelector);
      if (nav) this.changeTab(nav.dataset.tab, group, {force: true, updatePosition: false});
    }
  }

  /* -------------------------------------------- */

  /**
   * Add an event listener to every element in the sheet matching a selector.
   * @param {string} selector
   * @param {string} type
   * @param {(event: Event) => void} handler
   */
  _on(selector, type, handler) {
    for (const element of this.element.querySelectorAll(selector)) {
      element.addEventListener(type, handler);
    }
  }

  /* -------------------------------------------- */

  /**
   * The owned Item id of the ".item" row containing an element.
   * @param {HTMLElement} element
   */
  _itemIdOf(element) {
    return element.parentElement?.closest(".item")?.dataset.itemId;
  }

  /* -------------------------------------------- */

  /**
   * Attach the sheet's event listeners. Called after every render.
   * @param {HTMLElement} html  The sheet's root element
   */
	activateListeners(html) {
    this._on(".item-add-popup", "click", this._onItemAddClick.bind(this));
    this._on(".update-box", "click", this._onUpdateBoxClick.bind(this));

    activateRadioToggles(this);

    // Post item to chat
    this._on(".item-post", "click", (ev) => {
      const item = this.actor.items.get(this._itemIdOf(ev.currentTarget));
      item.sendToChat();
    });

    this._on(".roll-die-attribute", "click", (event) => {
      const attributeName = event.currentTarget?.dataset?.rollAttribute;
      let defaultDice = 0;
      try {
        const rollData = this.actor.getRollData?.();
        defaultDice = Number(rollData?.dice_amount?.[attributeName] ?? 0);
      } catch (err) {
        console.warn("Failed to determine dice amount for roll.", err);
        defaultDice = 0;
      }

      const sanitizedDice = Number.isNaN(defaultDice) ? 0 : defaultDice;

      this.actor.rollAttributePopup(attributeName, sanitizedDice);
    });

    // Update Inventory Item
    this._on(".item-body", "click", ev => {
      const item = this.actor.items.get(this._itemIdOf(ev.currentTarget));
      item.sheet.render(true);
    });
    // Update Inventory Item
    this._on(".item-sheet-open", "click", ev => {
      const item = this.actor.items.get(this._itemIdOf(ev.currentTarget));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    this._on(".item-delete", "click", async ev => {
      await this.actor.deleteEmbeddedDocuments("Item", [this._itemIdOf(ev.currentTarget)]);
    });

    // manage active effects
    this._on(".effect-control", "click", ev => BladesActiveEffect.onManageActiveEffect(ev, this.actor));


		// acquaintance status toggle
    this._on(".standing-toggle", "click", ev => {
      let acquaintances = this.actor.system.acquaintances;
      let acqId = ev.target.closest('.acquaintance').dataset.acquaintance;
      let clickedAcqIdx = acquaintances.findIndex(item => item.id == acqId);
      let clickedAcq = acquaintances[clickedAcqIdx];
      let oldStanding = clickedAcq.standing;
      let newStanding;
      switch(oldStanding){
        case "friend":
          newStanding = "rival";
          break;
        case "rival":
          newStanding = "neutral";
          break;
        case "neutral":
          newStanding = "friend";
          break;
      }
      clickedAcq.standing = newStanding;
      acquaintances.splice(clickedAcqIdx, 1, clickedAcq);
      this.actor.update({system: {acquaintances : acquaintances}});
    });
	this._on(".standing-toggle", "keydown", ev => {
	  if (ev.key === " " || ev.key === "Spacebar" || ev.key === "Enter") {
		 ev.preventDefault();
		 ev.currentTarget.click();
	  }
	});

	  // Open Acquaintance
    this._on(".open-friend", "click", ev => {
		//acqId is the UUID of the Acquaintance
	  let acqId = this._itemIdOf(ev.currentTarget);
		// if the Acquaintance is not in the world the if loop will trigger
	  if (game.actors.get(acqId) == undefined) {
		  //send the UUID and this actor to a helper fuction
		  BladesHelpers.importAcquaintance(this.actor, acqId);
	  } else {
      const actor = game.actors.get(acqId);
      actor?.sheet.render(true);
	  }
    });

	// Remove Acquaintance from character sheet
    this._on(".acquaintance-delete", "click", ev => {
	  let acqId = this._itemIdOf(ev.currentTarget);
	  BladesHelpers.removeAcquaintance(this.actor, acqId);
    });

	  // Import Acquaintance by playbook
    this._on(".import-contacts", "click", ev => {
	  const actor_type = this.actor.type;
	  let item_type;
	  if (actor_type=="character") {item_type = "class";}
		else if (actor_type=="crew") {item_type = "crew_type";}
	  const playbook = this.actor.items.filter(i=> i.type === item_type)[0]?.name;
	  BladesHelpers.import_pb_contacts(this.actor, playbook);

    });

		// Increment Exp Clock
	this._on(".up-exp-clock", "click", ev => {
		let value = this.actor.system.exp_clock.value;
		let number = this.actor.system.exp_clock.number;
		value = value + 1;
		if (value >= this.actor.system.exp_clock.size) {
			value = 0;
			number = number + 1;
		}
		this.actor.update({"system.exp_clock": {value : value, number : number}});
	});

			// Decrement Exp Clock
	this._on(".down-exp-clock", "click", ev => {
		let value = this.actor.system.exp_clock.value;
		let number = this.actor.system.exp_clock.number;
		value = value - 1;
		if (value < 0) {
			value = this.actor.system.exp_clock.size - 1;
			number = number - 1;
		}
		this.actor.update({"system.exp_clock": {value : value, number : number}});
	});

			// Add a whole Exp Clock
	this._on(".add-exp-clock", "click", ev => {
		let number = this.actor.system.exp_clock.number;
		number = number + 1;
		this.actor.update({"system.exp_clock": {number : number}});
	});

				// Remove a whole Exp Clock
	this._on(".minus-exp-clock", "click", ev => {
		let number = this.actor.system.exp_clock.number;
		if (number > 0) {number = number - 1;}
		else {number = 0;}
		this.actor.update({"system.exp_clock": {number : number}});
	});


  }

  /* -------------------------------------------- */

  async _onItemAddClick(event) {
    event.preventDefault();
    const item_type = event.currentTarget.dataset.itemType;
    const distinct = event.currentTarget.dataset.distinct;
    let input_type = "checkbox";

    if (typeof distinct !== "undefined") {
      input_type = "radio";
    }

    let items = await BladesHelpers.getAllItemsByType(item_type, game);

    // Filter out "Veteran" items and group by class
    items = items.filter(i => !i.name.includes("Veteran"));
    const grouped_items = BladesHelpers.groupItemsByClass(items);

    // Build HTML with grouped items
    let items_html = '<div class="items-list">';
    for (const [itemclass, group] of Object.entries(grouped_items)) {
      items_html += `<div class="item-group"><header>${itemclass}</header>`;
      for (const item of group) {
        const trimmedName = BladesHelpers.trimClassFromName(item.name);
        const description = BladesHelpers.stripHtml(item.system?.description || "");

        items_html += `
          <div class="item-block">
            <input id="select-item-${item._id}" type="${input_type}" name="select_items" value="${item._id}">
            <label for="select-item-${item._id}" title="${description}">
              ${game.i18n.localize(trimmedName)}
            </label>
          </div>`;
      }
      items_html += "</div>";
    }
    items_html += "</div>";

    const content = `
      <form class="items-to-add">
        ${items_html}
      </form>
    `;

    const formResult = await openFormDialog({
      title: `${game.i18n.localize('Add')} ${item_type}`,
      content,
      okLabel: game.i18n.localize('Add'),
      cancelLabel: game.i18n.localize('Cancel'),
    });

    if (!formResult || !formResult.select_items) {
      return;
    }

    await this.addItemsToSheet(item_type, formResult.select_items);
  }

  /* -------------------------------------------- */

  async addItemsToSheet(item_type, selections) {

    let items = await BladesHelpers.getAllItemsByType(item_type, game);
    let selectedIds = selections;
    if (!Array.isArray(selectedIds)) {
      selectedIds = selectedIds ? [selectedIds] : [];
    }

    const items_to_add = selectedIds
      .map((selectedId) => items.find((e) => e._id === selectedId))
      .filter((item) => Boolean(item));

    if (items_to_add.length === 0) {
      return;
    }

    if (item_type == "crew") {
		let actor = this.actor;
		await BladesHelpers.addCrew(actor,items_to_add[0]);
	}
	else {
		await Item.create(items_to_add, {parent: this.document});
	}
  }
  /* -------------------------------------------- */

  /**
   * Roll an Attribute die.
   * @param {*} event
   */
  async _onRollAttributeDieClick(event) {

    const attribute_name = event.currentTarget.dataset.rollAttribute;
    this.actor.rollAttributePopup(attribute_name);

  }

  /* -------------------------------------------- */

  async _onUpdateBoxClick(event) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const item_id = dataset.item;
    var update_value = parseDataValue(dataset.value);
      const update_type = dataset.utype;
      if ( update_value === undefined) {
      update_value = document.getElementById('fac-' + update_type + '-' + item_id).value;
    };
    var update;
    if ( update_type === "status" ) {
      update = {_id: item_id, system:{status:{value: update_value}}};
    }
    else if (update_type == "hold") {
      update = {_id: item_id, system:{hold:{value: update_value}}};
    } else {
      console.log("update attempted for type undefined in blades-sheet.js onUpdateBoxClick function");
      return;
    };

    await this.actor.updateEmbeddedDocuments("Item", [update]);


    }

}
