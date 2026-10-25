/**
 * Thin wrappers around the namespaced Foundry VTT V14 APIs. They keep call sites
 * short and give the system one place to update if core moves an API again.
 */
function getSheetConfig() {
  return foundry.applications.apps.DocumentSheetConfig;
}

export function registerActorSheet(namespace, sheetClass, options) {
  return getSheetConfig().registerSheet(CONFIG.Actor.documentClass, namespace, sheetClass, options);
}

export function registerItemSheet(namespace, sheetClass, options) {
  return getSheetConfig().registerSheet(CONFIG.Item.documentClass, namespace, sheetClass, options);
}

export function loadHandlebarsTemplates(paths) {
  return foundry.applications.handlebars.loadTemplates(paths);
}

export function renderHandlebarsTemplate(...args) {
  return foundry.applications.handlebars.renderTemplate(...args);
}

export function enrichHTML(...args) {
  const textEditor = foundry.applications.ux.TextEditor.implementation;
  return textEditor.enrichHTML(...args);
}

export function generateRandomId() {
  return foundry.utils.randomID();
}
