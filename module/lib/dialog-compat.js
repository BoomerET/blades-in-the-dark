function normalizeFormData(form) {
  if (!form) return {};
  const formData = new FormData(form);
  const result = {};
  for (const [key, value] of formData.entries()) {
    if (key in result) {
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Open a form dialog using Foundry's Application V2 DialogV2 helper. The
 * content's fields are serialized and returned to the caller.
 *
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.content  - HTML rendered inside the dialog window
 * @param {string} options.okLabel
 * @param {string} [options.cancelLabel]
 * @param {string} [options.okIcon="fas fa-check"]
 * @param {string} [options.cancelIcon="fas fa-times"]
 * @param {"ok"|"cancel"} [options.defaultButton="ok"]
 * @param {Object} [options.window]
 * @returns {Promise<object|undefined>} Serialized form values or `undefined`
 * if the dialog was canceled/closed.
 */
export async function openFormDialog({
  title,
  content,
  okLabel,
  cancelLabel,
  okIcon = "fas fa-check",
  cancelIcon = "fas fa-times",
  defaultButton = "ok",
  window: windowOptions = {},
} = {}) {
  if (!title) throw new Error("openFormDialog requires a title");
  if (!content) throw new Error("openFormDialog requires dialog content");
  if (!okLabel) throw new Error("openFormDialog requires an okLabel");

  const { DialogV2 } = foundry.applications.api;

  const buttons = [
    {
      action: "ok",
      label: okLabel,
      icon: okIcon,
      default: defaultButton === "ok",
      callback: (event, button) => normalizeFormData(button.form),
    },
  ];

  if (cancelLabel) {
    buttons.push({
      action: "cancel",
      label: cancelLabel,
      icon: cancelIcon,
      default: defaultButton === "cancel",
      callback: () => undefined,
    });
  }

  const result = await DialogV2.wait({
    window: { title, ...windowOptions },
    content,
    buttons,
  });

  // Handle action string returns and close button
  if (result === undefined || result === "cancel" || result === null) {
    return undefined;
  }
  return result;
}
