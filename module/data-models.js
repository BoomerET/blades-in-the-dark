import { systemDataDefaults } from "./data-defaults.js";

const fields = foundry.data.fields;

/**
 * Build the field for one top-level system key from its default value.
 *
 * The data used to come from template.json, which never type-checked anything, and the
 * sheets rely on that: radio pips replace `[0]` arrays with single values, numbers arrive
 * as strings, and so on. So objects become ObjectFields (which merge nested updates such
 * as "system.harm.light.one") and every other value is an untyped AnyField.
 * @param {*} value
 */
function fieldFor(value) {
  const initial = () => foundry.utils.deepClone(value);
  if (foundry.utils.getType(value) === "Object") return new fields.ObjectField({ initial });
  return new fields.AnyField({ initial });
}

/**
 * Create the TypeDataModel for one Actor or Item type.
 * @param {object} defaults  The type's default system data
 */
function createDataModel(defaults) {
  return class BladesDataModel extends foundry.abstract.TypeDataModel {

    /** @override */
    static defineSchema() {
      const schema = {};
      for (const [key, value] of Object.entries(defaults)) schema[key] = fieldFor(value);
      return schema;
    }

    /**
     * Fill in defaults missing from the data, nested keys included, whenever complete data is
     * cleaned (document construction and creation) - the same point at which Foundry merged
     * template.json. Partial update data is left alone: filling it in would overwrite stored values.
     * @override
     */
    static cleanData(source = {}, options = {}, _state = {}) {
      if (!options.partial && (foundry.utils.getType(source) === "Object")) {
        source = foundry.utils.mergeObject(foundry.utils.deepClone(defaults), source, {inplace: false});
      }
      return super.cleanData(source, options, _state);
    }
  };
}

/**
 * Register a data model for every Actor and Item type.
 */
export function registerDataModels() {
  for (const [documentName, types] of Object.entries(systemDataDefaults)) {
    for (const [type, defaults] of Object.entries(types)) {
      CONFIG[documentName].dataModels[type] = createDataModel(defaults);
    }
  }
}
