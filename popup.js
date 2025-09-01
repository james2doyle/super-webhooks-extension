/**
 * Parses a single line of the DSL into a structured field object.
 * Handles various input types and their specific syntaxes.
 * @param {string} line The raw string for a single line from the DSL input.
 * @param {number} index The line number, used to generate unique IDs and for error reporting.
 * @returns {object|null} A structured object representing the form field, an error object if parsing fails, or null if the line is empty.
 */
function parseDslLine(line, index) {
  if (!line.trim()) return null;

  // This regex splits the line by spaces, but keeps quoted strings together.
  const tokens = line.match(/"[^"]+"|\S+/g) || [];
  if (tokens.length < 2)
    return {
      id: `error-${index}`,
      type: "error",
      message: `Invalid line: "${line}". Requires at least a type and a name.`,
    };

  const [fullType, rawName, ...rest] = tokens;
  const name = rawName.charAt(0).toLowerCase() + rawName.slice(1);
  const id = `${name}-${index}`;
  const label = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const isRequired = fullType.includes("*");

  const type = fullType.replace("*", "");

  const baseField = { id, type: type.toLowerCase(), name, label };
  if (isRequired) {
    baseField.required = true;
  }
  let currentTokens = [...rest];

  try {
    switch (baseField.type) {
      case "text":
      case "password":
      case "email":
      case "date":
      case "color":
      case "url":
      case "hidden": {
        // Syntax: type name [defaultValue] "placeholder"
        let placeholder = '""';
        const lastToken = currentTokens[currentTokens.length - 1];
        // Check if the last token is a quoted string, assume it's the placeholder
        if (lastToken?.startsWith('"')) {
          placeholder = currentTokens.pop(); // remove and get the last element
        }

        // Whatever is left is the default value. For these types, it should be a single token.
        const defaultValue = currentTokens[0] || "";
        return {
          ...baseField,
          defaultValue: defaultValue.replace(/"/g, ""),
          placeholder: placeholder.replace(/"/g, ""),
        };
      }

      case "textarea": {
        // Syntax: textarea name [defaultValue] "placeholder"
        let placeholder = '""';
        const lastToken = currentTokens[currentTokens.length - 1];
        // Check if the last token is a quoted string, assume it's the placeholder
        if (lastToken?.startsWith('"')) {
          placeholder = currentTokens.pop(); // remove and get the last element
        }

        // Everything else is the default value, joined by spaces.
        const defaultValue = currentTokens.join(" ").replace(/"/g, "");
        return {
          ...baseField,
          defaultValue,
          placeholder: placeholder.replace(/"/g, ""),
        };
      }

      case "number":
      case "range": {
        // Syntax: number name [defaultValue] [min] [max] [step] "label (optional)"
        const labelOverride = currentTokens.find((t) => t.startsWith('"'));
        if (labelOverride) {
          baseField.label = labelOverride.replace(/"/g, "");
          currentTokens = currentTokens.filter((t) => !t.startsWith('"'));
        }
        const [defaultValue = 0, min = "", max = "", step = ""] = currentTokens;
        return { ...baseField, defaultValue, min, max, step };
      }

      case "checkbox": {
        // Syntax: checkbox name [checked?] "label"
        const labelText = (
          currentTokens.find((t) => t.startsWith('"')) || `"${label}"`
        ).replace(/"/g, "");
        currentTokens = currentTokens.filter((t) => !t.startsWith('"'));
        const isChecked =
          currentTokens[0] === "true" || currentTokens[0] === "checked";
        return { ...baseField, label: labelText, isChecked };
      }

      case "select": {
        // Syntax: select name [defaultValue] [options] "placeholder"
        const placeholder = (
          currentTokens.find((t) => t.startsWith('"')) || '""'
        ).replace(/"/g, "");
        currentTokens = currentTokens.filter((t) => !t.startsWith('"'));
        const optionsString =
          currentTokens.find((t) => t.startsWith("[") && t.endsWith("]")) ||
          "[]";
        currentTokens = currentTokens.filter((t) => !t.startsWith("["));
        const options = optionsString
          .slice(1, -1)
          .split(",")
          .map((opt) => opt.trim());
        const defaultValue = currentTokens[0] || "";
        return { ...baseField, defaultValue, options, placeholder };
      }

      case "radio": {
        // Syntax: radio name [defaultValue] [options] "Group Label"
        const groupLabel = (
          currentTokens.find((t) => t.startsWith('"')) || `"${label}"`
        ).replace(/"/g, "");
        currentTokens = currentTokens.filter((t) => !t.startsWith('"'));
        const optionsString =
          currentTokens.find((t) => t.startsWith("[") && t.endsWith("]")) ||
          "[]";
        currentTokens = currentTokens.filter((t) => !t.startsWith("["));
        const options = optionsString
          .slice(1, -1)
          .split(",")
          .map((opt) => opt.trim());
        const defaultValue = currentTokens[0] || "";
        return {
          ...baseField,
          type: "radioGroup",
          label: groupLabel,
          options,
          defaultValue,
        };
      }

      default:
        return {
          id: `error-${index}`,
          type: "error",
          message: `Unknown field type: "${type}"`,
        };
    }
  } catch (e) {
    return {
      id: `error-${index}`,
      type: "error",
      message: `Error parsing line: "${line}". Details: ${e.message}`,
    };
  }
}

/**
 * Parses a all lines of the DSL into a structured array of field objects.
 * @param {string} multilineString The raw string for a all lines from the DSL input.
 * @returns {array} A structured array of objects representing the form fields.
 */
function parseAllLinesAsDSL(multilineString) {
  return (
    multilineString
      .split("\n")
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map(parseDslLine)
      // removes bad lines
      .filter(Boolean)
  );
}

/**
 * Validates if a given URL is a valid HTTP or HTTPS URL.
 * @param {string} url - The URL string to validate.
 * @returns {boolean} True if the URL is valid (http/https), false otherwise.
 */
function validateURL(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch (e) {
    console.error(e);
    return false;
  }
}

/**
 * Displays a temporary message to the user in a designated container.
 * The message will automatically hide after a short delay.
 * @param {string} message - The message text to display.
 * @param {"error"|"success"} [type="error"] - The type of message, which influences its styling.
 */
function showMessage(message, type = "error") {
  const container = document.getElementById("message-container");
  const messageDiv = document.createElement("div");
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = message;

  // Clear existing messages
  container.innerHTML = "";
  container.appendChild(messageDiv);

  setTimeout(() => {
    messageDiv.classList.add("hidden");
    setTimeout(() => messageDiv.remove(), 300);
  }, 5000);
}

/**
 * Displays an error message to the user.
 * This is a convenience function that calls `showMessage` with the type set to "error".
 * @param {string} message - The error message text to display.
 */
function showError(message) {
  showMessage(message, "error");
}

/**
 * Displays a success message to the user.
 * This is a convenience function that calls `showMessage` with the type set to "success".
 * @param {string} message - The success message text to display.
 */
function showSuccess(message) {
  showMessage(message, "success");
}

/**
 * Switches the active tab in the user interface.
 * Updates the active state of tab buttons and displays the corresponding tab content.
 * @param {string} tabName - The name of the tab to switch to (corresponds to `data-tab` attribute and element ID).
 */
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.tab === tabName) {
      btn.classList.add("active");
    }
  });

  // Update tab content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });
  document.getElementById(`${tabName}-tab`).classList.add("active");
}

/**
 * Creates and returns a DOM element representing a webhook card for display in the list.
 * Includes webhook details, meta badges, and action buttons (test, edit, delete).
 * @param {object} hook - The webhook object containing properties like `name`, `url`, `rateLimit`, `customFields`.
 * @param {number} index - The index of the webhook in the array, used for actions like editing and deleting.
 * @returns {HTMLElement} The created webhook card DOM element.
 */
function createWebhookCard(hook, index) {
  const card = document.createElement("div");
  card.className = "webhook-card";

  const header = document.createElement("div");
  header.className = "webhook-header";

  const titleContainer = document.createElement("div");
  const title = document.createElement("h4");
  title.className = "webhook-title";
  title.textContent = hook.name;

  const url = document.createElement("div");
  url.className = "webhook-url";
  url.textContent = hook.url;

  titleContainer.appendChild(title);
  titleContainer.appendChild(url);

  // Meta badges
  const meta = document.createElement("div");
  meta.className = "webhook-meta";

  if (hook.rateLimit && hook.rateLimit > 0) {
    const rateBadge = document.createElement("span");
    rateBadge.className = "badge badge-rate-limit";
    rateBadge.textContent = `${hook.rateLimit}s limit`;
    meta.appendChild(rateBadge);
  }

  if (hook.customFields) {
    const customBadge = document.createElement("span");
    customBadge.className = "badge badge-customs-enabled";
    customBadge.innerHTML = '<i class="fa fa-pen-field"></i> Fields';
    meta.appendChild(customBadge);
  }

  // Actions
  const actions = document.createElement("div");
  actions.className = "webhook-actions";

  const testButton = document.createElement("button");
  testButton.className = "btn btn-sm btn-secondary";
  testButton.innerHTML = '<i class="fa fa-vial"></i> Test';
  testButton.onclick = () => {
    testWebhook(index, testButton);
  };

  const editButton = document.createElement("button");
  editButton.className = "btn btn-sm btn-secondary";
  editButton.innerHTML = '<i class="fa fa-edit"></i> Edit';
  editButton.onclick = () => {
    editWebhook(index);
  };

  const deleteButton = document.createElement("button");
  deleteButton.className = "btn btn-sm btn-danger";
  deleteButton.innerHTML = '<i class="fa fa-trash"></i>';
  deleteButton.onclick = () => {
    handleDeleteClick(deleteButton, index);
  };

  actions.appendChild(testButton);
  actions.appendChild(editButton);
  actions.appendChild(deleteButton);

  header.appendChild(titleContainer);
  card.appendChild(header);
  if (meta.children.length > 0) {
    card.appendChild(meta);
  }
  card.appendChild(actions);

  return card;
}

/**
 * Loads webhooks from Chrome local storage and renders them in the UI.
 * Displays an empty state message if no webhooks are found.
 */
function loadWebhooks() {
  chrome.storage.local.get("webhooks", (data) => {
    if (chrome.runtime.lastError) {
      console.error("Failed to load webhooks:", chrome.runtime.lastError);
      showError("Error loading webhooks. Please try again.");
      return;
    }

    const list = document.getElementById("webhookList");
    const emptyState = document.getElementById("empty-state");
    list.innerHTML = "";

    if (data.webhooks && data.webhooks.length > 0) {
      emptyState.classList.add("hidden");
      data.webhooks.forEach((hook, index) => {
        const card = createWebhookCard(hook, index);
        list.appendChild(card);
      });
    } else {
      emptyState.classList.remove("hidden");
    }
  });
}

/**
 * Handles the click event for a delete button, implementing a confirmation step.
 * On first click, it changes the button text to "Confirm?". On second click, it performs the deletion.
 * If the user clicks outside the button after the first click, the button reverts to its original state.
 * @param {HTMLElement} button - The delete button element that was clicked.
 * @param {number} index - The index of the webhook to be deleted.
 */
function handleDeleteClick(button, index) {
  if (button.classList.contains("confirm-delete")) {
    // If button already clicked once, perform the deletion
    deleteWebhook(index);
  } else {
    // First click, prompt for confirmation
    button.innerHTML = '<i class="fa fa-check"></i> Confirm?';
    button.classList.add("confirm-delete", "btn-warning");
    button.classList.remove("btn-danger");

    // Revert if clicked elsewhere
    document.addEventListener(
      "click",
      function eventListener(e) {
        if (!button.contains(e.target)) {
          button.innerHTML = '<i class="fa fa-trash"></i>';
          button.classList.remove("confirm-delete", "btn-warning");
          button.classList.add("btn-danger");
          document.removeEventListener("click", eventListener);
        }
      },
      { once: true },
    );
  }
}

/**
 * Populates the webhook form with the details of an existing webhook for editing.
 * Switches to the webhooks tab, shows the form, and updates its UI for an edit operation.
 * @param {number} index - The index of the webhook to be edited.
 */
function editWebhook(index) {
  chrome.storage.local.get("webhooks", (data) => {
    const webhooks = data.webhooks;
    const webhook = webhooks[index];

    // Switch to webhooks tab if not already there
    switchTab("webhooks");

    // Show and expand form
    if (window.formToggleFunctions) {
      window.formToggleFunctions.showForm();
    }

    // Fill form
    document.getElementById("url").value = webhook.url;
    document.getElementById("name").value = webhook.name;
    document.getElementById("rateLimit").value = webhook.rateLimit || "";
    document.getElementById("customFieldsRaw").value =
      webhook.customFieldsRaw || "";
    document.getElementById("customFields").value = JSON.stringify(
      webhook.customFields || "",
    );

    // Update form UI for editing
    document.getElementById("form-title").innerHTML =
      '<i class="fa fa-edit"></i> Edit Webhook';
    document.getElementById("save-btn-text").textContent = "Update Webhook";
    const form = document.getElementById("webhookForm");
    form.dataset.index = index;

    // Scroll to form
    setTimeout(() => {
      document
        .getElementById("webhook-form-section")
        .scrollIntoView({ behavior: "smooth" });
    }, 100);
  });
}

/**
 * Deletes a webhook from Chrome local storage at the specified index.
 * After deletion, it refreshes the list of webhooks in the UI and shows a success message.
 * @param {number} index - The index of the webhook to be deleted.
 */
function deleteWebhook(index) {
  chrome.storage.local.get("webhooks", (data) => {
    if (chrome.runtime.lastError) {
      console.error("Failed to fetch webhooks:", chrome.runtime.lastError);
      showError("Error fetching webhooks. Please try again.");
      return;
    }

    const webhooks = data.webhooks;
    const deletedWebhook = webhooks[index];
    webhooks.splice(index, 1);
    chrome.storage.local.set({ webhooks: webhooks }, () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to delete webhook:", chrome.runtime.lastError);
        showError("Error deleting webhook. Please try again.");
        return;
      }
      console.log("Webhook deleted!");
      showSuccess(`Webhook "${deletedWebhook.name}" deleted successfully!`);
      loadWebhooks(); // Refresh list after deleting
    });
  });
}

/**
 * Sends a test payload to a specified webhook URL.
 * Updates the provided button element to show testing status and then success/failure.
 * @param {number} index - The index of the webhook to test.
 * @param {HTMLElement} buttonElement - The button element that triggered the test, used for UI feedback.
 */
function testWebhook(index, buttonElement) {
  chrome.storage.local.get("webhooks", (data) => {
    if (chrome.runtime.lastError) {
      console.error("Failed to fetch webhooks:", chrome.runtime.lastError);
      showError("Error fetching webhooks. Please try again.");
      return;
    }

    const webhook = data.webhooks[index];
    if (!webhook) {
      showError("Webhook not found.");
      return;
    }

    // Update button to show testing state
    const originalContent = buttonElement.innerHTML;
    buttonElement.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Testing`;
    buttonElement.disabled = true;

    const startTime = Date.now();
    const testPayload = {
      url: "https://example.com/image.jpg",
      pageUrl: "https://example.com/article",
      timestamp: new Date().toISOString(),
      type: "test",
      title: "Testing",
      description: "Testing description from meta tag",
      keywords: "technology, programming, tutorial",
      favicon: "https://example.com/favicon.ico",
      linkTitle: "Title if it was a link type",
      altText: "Image alt text if it was a link type",
      customFields: { note: "Additional note content if there was some" },
      selectedText: "The selected text if there was a selection",
      browser: "Chrome/139.0.0.0",
      operatingSystem: "mac",
      deviceType: "Desktop",
      screenResolution: "1920x1080",
      windowSize: "1200x800",
    };

    fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    })
      .then((response) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Reset button
        buttonElement.innerHTML = originalContent;
        buttonElement.disabled = false;

        if (response.ok) {
          buttonElement.innerHTML = `<i class="fa fa-check" style="color: var(--success-color);"></i> Success`;
          showSuccess(`${webhook.name} test successful (${responseTime}ms)`);
          setTimeout(() => {
            buttonElement.innerHTML = originalContent;
          }, 3000);
        } else {
          buttonElement.innerHTML = `<i class="fa fa-times" style="color: var(--danger-color);"></i> Failed`;
          showError(
            `${webhook.name} test failed: HTTP ${response.status} (${responseTime}ms)`,
          );
          setTimeout(() => {
            buttonElement.innerHTML = originalContent;
          }, 3000);
        }
      })
      .catch((error) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Reset button
        buttonElement.innerHTML = `<i class="fa fa-times" style="color: var(--danger-color);"></i> Error`;
        buttonElement.disabled = false;

        showError(
          `${webhook.name} test error: ${error.message} (${responseTime}ms)`,
        );
        setTimeout(() => {
          buttonElement.innerHTML = originalContent;
        }, 3000);
      });
  });
}

/**
 * Clears all input fields in the webhook form and resets its UI state
 * to that of adding a new webhook.
 */
function clearForm() {
  // Reset form UI
  document.getElementById("form-title").innerHTML =
    '<i class="fa fa-plus"></i> Add New Webhook';
  document.getElementById("save-btn-text").textContent = "Save Webhook";

  // Get form element and clear dataset
  const form = document.getElementById("webhookForm");
  delete form.dataset.index;

  // Reset form fields
  form.reset();
}

/**
 * Loads extension settings from Chrome local storage and populates the settings form fields.
 * If no settings are found, default values are used.
 */
function loadSettings() {
  chrome.storage.local.get(
    { settings: { notificationInterval: 5 } },
    (data) => {
      if (chrome.runtime.lastError) {
        console.error("Failed to load settings:", chrome.runtime.lastError);
        return;
      }

      document.getElementById("notificationInterval").value =
        data.settings.notificationInterval;
    },
  );
}

/**
 * Initializes event listeners for all tab buttons, allowing them to switch tabs when clicked.
 */
function initializeTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });
}

function initializeCustomFields() {
  document.querySelectorAll(".custom-fields-input").forEach((field) => {
    const originalRowCount = parseInt(field.getAttribute("rows") || 3, 10);
    field.addEventListener("focus", () => {
      field.setAttribute("rows", originalRowCount + 7);
    });
    field.addEventListener("blue", () => {
      field.setAttribute("rows", originalRowCount);
    });
    field.addEventListener("input", () => {
      const value = field.value || "";
      const parseField = field.nextElementSibling;
      const parseError = parseField.nextElementSibling;
      parseError.innerHTML = "";
      if (value.length > 0 && parseField && parseError) {
        const newValue = parseAllLinesAsDSL(value);
        newValue.forEach((val) => {
          if (val.type === "error") {
            parseError.innerHTML = val.message;
          }
        });
        parseField.value = JSON.stringify(newValue);
      }
    });
  });
}

/**
 * Initializes the functionality for showing and hiding the webhook form.
 * It sets up event listeners for the "Add Webhook" button and the form's close button.
 * It also exposes `showForm` and `hideForm` functions globally via `window.formToggleFunctions`.
 */
function initializeFormToggle() {
  const addButton = document.getElementById("add-webhook-trigger");
  const formSection = document.getElementById("webhook-form-section");
  const closeButton = document.getElementById("form-close-btn");

  /**
   * Shows the webhook form and hides the "Add Webhook" button.
   * Also focuses on the first input field in the form.
   */
  function showForm() {
    addButton.style.display = "none";
    formSection.style.display = "block";

    // Focus first input
    setTimeout(() => {
      document.getElementById("url").focus();
    }, 100);
  }

  /**
   * Hides the webhook form and shows the "Add Webhook" button.
   * Also clears the form fields.
   */
  function hideForm() {
    addButton.style.display = "flex";
    formSection.style.display = "none";
    clearForm();
  }

  // Add webhook button click
  addButton.addEventListener("click", showForm);

  // Close button click
  closeButton.addEventListener("click", hideForm);

  // Store references for other functions
  window.formToggleFunctions = {
    showForm,
    hideForm,
    isFormVisible: () => formSection.style.display !== "none",
  };
}

// No longer needed - using close button instead

/**
 * Event listener for when the DOM content is fully loaded.
 * Initializes tabs, form toggle functionality, and sets up submission handlers
 * for the webhook and settings forms. Also loads initial webhooks and settings.
 */
document.addEventListener("DOMContentLoaded", () => {
  initializeTabs();
  initializeCustomFields();
  initializeFormToggle();

  /**
   * Handles the submission of the webhook form.
   * Validates input, saves new or updates existing webhooks to Chrome local storage,
   * and refreshes the webhook list.
   */
  document.getElementById("webhookForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get("url").trim();
    const name = formData.get("name").trim();

    if (!url || !name) {
      showError("Both URL and name are required.");
      return;
    }

    if (!validateURL(url)) {
      showError("Please enter a valid HTTP or HTTPS URL.");
      return;
    }

    const rateLimit = formData.get("rateLimit").trim();
    const rateLimitValue = rateLimit ? parseInt(rateLimit, 10) : 0;
    const customFieldsRaw = formData.get("customFieldsRaw").trim();
    const customFields = JSON.parse(formData.get("customFields").trim());

    if (rateLimit && (Number.isNaN(rateLimitValue) || rateLimitValue < 0)) {
      showError("Rate limit must be a positive number (seconds).");
      return;
    }

    chrome.storage.local.get({ webhooks: [] }, (data) => {
      if (chrome.runtime.lastError) {
        console.error("Error retrieving webhooks:", chrome.runtime.lastError);
        showError("Error retrieving webhooks. Please try again.");
        return;
      }

      const webhooks = data.webhooks;
      const index = e.target.dataset.index;
      const isEditing = index !== undefined;

      if (isEditing) {
        // Update existing webhook
        webhooks[index] = {
          url,
          name,
          rateLimit: rateLimitValue,
          customFieldsRaw,
          customFields,
        };
      } else {
        // Add new webhook
        webhooks.push({
          url,
          name,
          rateLimit: rateLimitValue,
          customFieldsRaw,
          customFields,
        });
      }

      chrome.storage.local.set({ webhooks: webhooks }, () => {
        if (chrome.runtime.lastError) {
          console.error(
            "Failed to save the webhook:",
            chrome.runtime.lastError,
          );
          showError("Error saving webhook. Please try again.");
          return;
        }

        console.log("Webhook saved!");
        const action = isEditing ? "updated" : "added";
        showSuccess(`Webhook "${name}" ${action} successfully!`);
        loadWebhooks();

        // Hide form after successful save
        if (window.formToggleFunctions) {
          window.formToggleFunctions.hideForm();
        } else {
          clearForm();
        }
      });
    });
  });

  /**
   * Handles the submission of the settings form.
   * Validates the notification interval and saves settings to Chrome local storage.
   */
  document.getElementById("settingsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const notificationInterval = parseInt(
      document.getElementById("notificationInterval").value,
      10,
    );

    if (
      Number.isNaN(notificationInterval) ||
      notificationInterval < 1 ||
      notificationInterval > 60
    ) {
      showError("Notification interval must be between 1 and 60 seconds.");
      return;
    }

    const settings = { notificationInterval };

    chrome.storage.local.set({ settings }, () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to save settings:", chrome.runtime.lastError);
        showError("Error saving settings. Please try again.");
        return;
      }

      showSuccess("Settings saved successfully!");
    });
  });

  loadWebhooks();
  loadSettings();
});
