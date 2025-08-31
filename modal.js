/** Take a value from the customFields array and render it to HTML */
function renderField(field) {
  if (field.type === "error") {
    return `<div class="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">${field.message}</div>`;
  }

  if (field.type === "hidden") {
    return `<input type="hidden" name="${field.name}" id="${field.id}" value="${field.defaultValue}">`;
  }

  const commonInputProps =
    "w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 outline-none";
  const commonLabelProps = "block mb-2 font-semibold text-gray-700";

  switch (field.type) {
    case "text":
    case "password":
    case "email":
    case "date":
    case "color":
      return `<div>
          <label for="${field.id}" class="${commonLabelProps}">${field.label}</label>
          <input type="${field.type}" name="${field.name}" id="${field.id}" value="${field.defaultValue}" placeholder="${field.placeholder}" class="${commonInputProps}">
      </div>`;

    case "textarea":
      return `<div>
          <label for="${field.id}" class="${commonLabelProps}">${field.label}</label>
          <textarea name="${field.name}" id="${field.id}" placeholder="${field.placeholder}" class="${commonInputProps} h-28">${field.defaultValue}</textarea>
      </div>`;

    case "number":
    case "range": {
      const displayValue =
        field.type === "range"
          ? `<span class="ml-4 font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded">${field.defaultValue}</span>`
          : "";
      return `<div>
          <label for="${field.id}" class="${commonLabelProps}">${field.label} ${displayValue}</label>
          <input type="${field.type}" name="${field.name}" id="${field.id}" value="${field.defaultValue}" min="${field.min}" max="${field.max}" step="${field.step}" class="${commonInputProps}">
      </div>`;
    }

    case "checkbox":
      return `<div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border">
          <input type="checkbox" name="${field.name}" id="${field.id}" ${field.isChecked ? "checked" : ""} class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
          <label for="${field.id}" class="text-gray-800">${field.label}</label>
      </div>`;

    case "select": {
      const optionsHtml = field.options
        .map(
          (opt) =>
            `<option value="${opt}" ${opt === field.defaultValue ? "selected" : ""}>${opt}</option>`,
        )
        .join("");
      const placeholderOption = field.placeholder
        ? `<option value="" disabled ${!field.defaultValue ? "selected" : ""}>${field.placeholder}</option>`
        : "";

      return `<div>
          <label for="${field.id}" class="${commonLabelProps}">${field.label}</label>
          <select name="${field.name}" id="${field.id}" class="${commonInputProps}">
              ${placeholderOption}
              ${optionsHtml}
          </select>
      </div>`;
    }

    case "radioGroup": {
      const radioButtonsHtml = field.options
        .map(
          (opt) => `<div class="flex items-center gap-3">
            <input type="radio" id="${field.id}-${opt}" name="${field.name}" value="${opt}" ${opt === field.defaultValue ? "checked" : ""} class="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500">
            <label for="${field.id}-${opt}" class="text-gray-800">${opt}</label>
        </div>`,
        )
        .join("");

      return `<fieldset class="border border-gray-300 p-4 rounded-lg">
          <legend class="px-2 font-semibold text-gray-700">${field.label}</legend>
          <div class="space-y-3 mt-2">
              ${radioButtonsHtml}
          </div>
      </fieldset>`;
    }

    default:
      return "";
  }
}

/** Take the values from the customFields and render each field to HTML */
function renderFieldsFromCustomFields(fields) {
  return fields.map(renderField).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const noteForm = document.getElementById("note-form");
  const noteTextarea = document.getElementById("note-content"); // Keep this for initial focus

  // Focus the textarea automatically when the modal opens
  noteTextarea.focus();

  // Function to handle form submission
  function handleFormSubmit(event) {
    event.preventDefault(); // Prevent the default form submission

    // Use FormData to easily get all form values
    const formData = new FormData(noteForm);
    // Get the value by the 'name' attribute of the textarea
    const note = formData.get("note-content").trim();

    // Send the note content back to the background script
    chrome.runtime.sendMessage(
      {
        type: "sendWebhookWithNote",
        note: note,
      },
      () => {
        // Close the modal window after the message has been sent
        window.close();
      },
    );
  }

  // Handle form submission
  noteForm.addEventListener("submit", handleFormSubmit);

  // Handle Cancel button click
  const cancelButton = document.getElementById("cancel-btn");
  cancelButton.addEventListener("click", () => {
    // Let the background script know the action was canceled
    chrome.runtime.sendMessage({ type: "modalCanceled" }, () => {
      window.close();
    });
  });
});
