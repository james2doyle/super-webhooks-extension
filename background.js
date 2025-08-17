// Webhook queue management
const webhookQueues = new Map(); // Map of webhookUrl -> { queue: [], lastSent: timestamp, timer: timeoutId }
const queueNotifications = new Map(); // Map of notificationId -> { webhookUrl, intervalId }

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create(
    {
      id: "sendToWebhook",
      title: "Send to Webhook",
      contexts: ["page", "link", "image", "selection"],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          `Error creating parent menu: ${chrome.runtime.lastError.message}`,
        );
      }
      updateWebhookMenus();
    },
  );
  initializeQueues();
});

chrome.runtime.onStartup.addListener(() => {
  updateWebhookMenus();
  initializeQueues();
});

/**
 * Initializes webhook queues from local storage.
 * It retrieves stored webhooks and sets up their initial queue data
 * including an empty queue, last sent timestamp, timer, and rate limit.
 */
function initializeQueues() {
  chrome.storage.local.get("webhooks", (data) => {
    if (data.webhooks) {
      data.webhooks.forEach((webhook) => {
        if (!webhookQueues.has(webhook.url)) {
          webhookQueues.set(webhook.url, {
            queue: [],
            lastSent: 0,
            timer: null,
            rateLimit: webhook.rateLimit || 0,
          });
        } else {
          // Update rate limit if it changed
          const queueData = webhookQueues.get(webhook.url);
          queueData.rateLimit = webhook.rateLimit || 0;
        }
      });
    }
  });
}

/**
 * Adds a payload to a specific webhook's queue.
 * If the webhook's queue doesn't exist, it initializes it.
 * It also checks if the item will be queued due to rate limiting and
 * displays a notification if so, then attempts to process the queue.
 *
 * @param {string} webhookUrl - The URL of the webhook.
 * @param {object} payload - The data payload to send to the webhook.
 * @param {string} webhookName - The name of the webhook for display purposes.
 * @param {number} [rateLimit=0] - The rate limit in seconds for this webhook (0 for no limit).
 */
function addToQueue(webhookUrl, payload, webhookName, rateLimit = 0) {
  if (!webhookQueues.has(webhookUrl)) {
    webhookQueues.set(webhookUrl, {
      queue: [],
      lastSent: 0,
      timer: null,
      rateLimit: rateLimit,
    });
  }

  const queueData = webhookQueues.get(webhookUrl);
  queueData.rateLimit = rateLimit; // Update rate limit
  queueData.queue.push({ payload, webhookName, timestamp: Date.now() });

  // Check if this item will be queued (not sent immediately)
  const now = Date.now();
  const timeSinceLastSent = now - queueData.lastSent;
  const rateLimitMs = queueData.rateLimit * 1000;
  const willBeQueued =
    queueData.rateLimit > 0 &&
    (queueData.queue.length > 1 || timeSinceLastSent < rateLimitMs);

  if (willBeQueued) {
    showQueueNotification(webhookUrl, webhookName);
  }

  processQueue(webhookUrl);
}

/**
 * Processes the queue for a given webhook URL.
 * It sends the next item in the queue, respecting the rate limit.
 * If a rate limit is active and the last send was too recent, it schedules
 * a retry using a timer.
 *
 * @param {string} webhookUrl - The URL of the webhook whose queue needs processing.
 */
function processQueue(webhookUrl) {
  const queueData = webhookQueues.get(webhookUrl);
  if (!queueData || queueData.queue.length === 0) return;

  const now = Date.now();
  const timeSinceLastSent = now - queueData.lastSent;
  const rateLimitMs = queueData.rateLimit * 1000;

  if (queueData.rateLimit > 0 && timeSinceLastSent < rateLimitMs) {
    // Need to wait before sending
    const waitTime = rateLimitMs - timeSinceLastSent;

    if (queueData.timer) {
      clearTimeout(queueData.timer);
    }

    queueData.timer = setTimeout(() => {
      processQueue(webhookUrl);
    }, waitTime);

    return;
  }

  // Send the next item in queue
  const item = queueData.queue.shift();
  queueData.lastSent = now;

  // Clear any existing queue notification for this webhook
  clearQueueNotification(webhookUrl);

  postToWebhookDirect(webhookUrl, item.payload, 3, item.webhookName);

  // Schedule next item if queue has more items
  if (queueData.queue.length > 0) {
    if (queueData.rateLimit > 0) {
      queueData.timer = setTimeout(() => {
        processQueue(webhookUrl);
      }, rateLimitMs);
    } else {
      // No rate limit, process immediately
      processQueue(webhookUrl);
    }
  }
}

/**
 * Sanitizes a string to be used as a Chrome context menu ID.
 * Replaces non-alphanumeric characters with underscores and truncates to 50 characters.
 *
 * @param {string} name - The original string to sanitize.
 * @returns {string} The sanitized string suitable for a menu ID.
 */
function sanitizeMenuId(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
}

let updateWebhookMenusTimeout;
/**
 * Updates the Chrome context menus with the currently configured webhooks.
 * This function debounces multiple calls to avoid excessive menu rebuilds.
 * It first removes all existing custom menu items, then recreates the parent
 * "Send to Webhook" menu, and finally adds child menu items for each stored webhook.
 */
function updateWebhookMenus() {
  // Debounce to avoid excessive rebuilds
  clearTimeout(updateWebhookMenusTimeout);
  updateWebhookMenusTimeout = setTimeout(() => {
    // First remove all existing child items (if any)
    chrome.contextMenus.removeAll(() => {
      // Recreate parent menu to avoid reference errors
      chrome.contextMenus.create(
        {
          id: "sendToWebhook",
          title: "Send to Webhook",
          contexts: ["page", "link", "image", "selection"],
        },
        () => {
          // Check for errors
          if (chrome.runtime.lastError) {
            console.error(
              `Error recreating parent menu: ${chrome.runtime.lastError.message}`,
            );
            return;
          }

          // Now add child items
          chrome.storage.local.get("webhooks", (data) => {
            if (data.webhooks && data.webhooks.length > 0) {
              data.webhooks.forEach((webhook, index) => {
                const sanitizedId = sanitizeMenuId(webhook.name);

                // Create menu item for page, link, and image contexts
                chrome.contextMenus.create({
                  id: `sendTo_${sanitizedId}_${index}_normal`,
                  parentId: "sendToWebhook",
                  title: webhook.name,
                  contexts: ["page", "link", "image"],
                });

                // Create separate menu item for selection context
                chrome.contextMenus.create({
                  id: `sendTo_${sanitizedId}_${index}_selection`,
                  parentId: "sendToWebhook",
                  title: webhook.name,
                  contexts: ["selection"],
                });
              });
            }
          });
        },
      );
    });
  }, 100);
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith("sendTo_")) {
    chrome.storage.local.get(["webhooks", "settings"], (data) => {
      // Extract index from menu ID (sendTo_sanitizedName_index_type)
      const parts = info.menuItemId.split("_");
      const indexPart = parts[parts.length - 2]; // Second to last part is the index
      const index = parseInt(indexPart, 10);
      const webhook = data.webhooks[index];
      if (webhook) {
        // Check if note modal is enabled for this specific webhook
        const enableNoteModal = webhook.enableNoteModal;

        if (enableNoteModal) {
          // Store data needed for sending the webhook later
          const pendingWebhook = {
            webhook: webhook,
            info: info,
            tabId: tab.id,
          };
          chrome.storage.local.set({ pendingWebhook: pendingWebhook }, () => {
            // Open the modal window
            chrome.windows.create({
              url: "modal.html",
              type: "popup",
              width: 500,
              height: 400,
            });
          });
        } else {
          // Send webhook directly without showing modal
          let urlToSend,
            type,
            selectionText = null;

          if (info.linkUrl) {
            urlToSend = info.linkUrl;
            type = "link";
          } else if (info.srcUrl) {
            urlToSend = info.srcUrl;
            type = "image";
          } else {
            type = info.selectionText ? "selection" : "page";
            urlToSend = info.pageUrl;
            selectionText = info.selectionText;
          }

          extractDataAndSend(
            webhook.url,
            urlToSend,
            type,
            tab.id,
            selectionText,
            "",
            info.pageUrl,
          );
        }
      }
    });
  }
});

// Listener for messages from the modal
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "sendWebhookWithNote") {
    chrome.storage.local.get("pendingWebhook", (data) => {
      if (data.pendingWebhook) {
        const { webhook, info, tabId } = data.pendingWebhook;
        const additionalContent = request.note;

        // Determine context and extract data
        if (info.linkUrl) {
          extractDataAndSend(
            webhook.url,
            info.linkUrl,
            "link",
            tabId,
            null,
            additionalContent,
            info.pageUrl,
          );
        } else if (info.srcUrl) {
          extractDataAndSend(
            webhook.url,
            info.srcUrl,
            "image",
            tabId,
            null,
            additionalContent,
            info.pageUrl,
          );
        } else {
          const type = info.selectionText ? "selection" : "page";
          extractDataAndSend(
            webhook.url,
            info.pageUrl,
            type,
            tabId,
            info.selectionText,
            additionalContent,
            info.pageUrl,
          );
        }

        // Clean up the stored data
        chrome.storage.local.remove("pendingWebhook");
        sendResponse({ status: "sent" });
      }
    });
  } else if (request.type === "modalCanceled") {
    // Clean up the stored data if the user cancels
    chrome.storage.local.remove("pendingWebhook", () => {
      // This callback ensures storage is cleared before we respond
      sendResponse({ status: "canceled" });
    });
  }
  return true; // Crucial for async sendResponse
});

/**
 * Extracts relevant data from the current tab based on the context type
 * (page, link, image, selection) and then sends it to the specified webhook.
 * It uses `chrome.scripting.executeScript` to get page-specific details.
 *
 * @param {string} webhookUrl - The URL of the webhook to send data to.
 * @param {string} urlToSend - The URL related to the context (e.g., page URL, link URL, image URL).
 * @param {'page'|'link'|'image'|'selection'} type - The context type of the data.
 * @param {number} tabId - The ID of the tab where the action originated.
 * @param {string|null} selectionText - The selected text, if the context is 'selection'.
 * @param {string} additionalContent - Any additional user-provided content (e.g., a note from the modal).
 * @param {string} pageUrl - The URL of the page where the context menu was clicked.
 */
function extractDataAndSend(
  webhookUrl,
  urlToSend,
  type,
  tabId,
  selectionText,
  additionalContent,
  pageUrl,
) {
  let codeToExecute;

  if (type === "page" || type === "selection") {
    codeToExecute = () => ({
      title: document.title,
      description:
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content") || null,
      keywords:
        document
          .querySelector('meta[name="keywords"]')
          ?.getAttribute("content") || null,
      favicon:
        document.querySelector('link[rel="icon"]')?.href ||
        document.querySelector('link[rel="shortcut icon"]')?.href ||
        null,
    });
  } else if (type === "link") {
    codeToExecute = (...rest) => {
      let linkTitle = null;
      const links = document.querySelectorAll("a");
      for (const link of links) {
        if (link.href === rest[0]) {
          linkTitle =
            link.title ||
            link.getAttribute("aria-label") ||
            link.innerText ||
            null;
        }
      }

      return {
        title: document.title,
        description:
          document
            .querySelector('meta[name="description"]')
            ?.getAttribute("content") || null,
        keywords:
          document
            .querySelector('meta[name="keywords"]')
            ?.getAttribute("content") || null,
        favicon:
          document.querySelector('link[rel="icon"]')?.href ||
          document.querySelector('link[rel="shortcut icon"]')?.href ||
          null,
        linkTitle,
      };
    };
  } else if (type === "image") {
    codeToExecute = (...rest) => {
      let altText = null;
      const images = document.querySelectorAll("img");

      console.error({ images });
      for (const img of images) {
        if (img.src === rest[0]) {
          altText = img.alt || img.title || null;
        }
      }

      return {
        title: document.title,
        description:
          document
            .querySelector('meta[name="description"]')
            ?.getAttribute("content") || null,
        keywords:
          document
            .querySelector('meta[name="keywords"]')
            ?.getAttribute("content") || null,
        favicon:
          document.querySelector('link[rel="icon"]')?.href ||
          document.querySelector('link[rel="shortcut icon"]')?.href ||
          null,
        altText,
      };
    };
  }

  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      func: codeToExecute,
      args: [urlToSend],
    },
    (injectionResults) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Script injection failed:",
          chrome.runtime.lastError.message,
        );
      }
      const extractedData = injectionResults?.[0]
        ? injectionResults[0].result
        : null;

      // Find webhook name for notification
      chrome.storage.local.get("webhooks", (data) => {
        const webhook = data.webhooks?.find((wh) => wh.url === webhookUrl);
        const webhookName = webhook ? webhook.name : "Webhook";

        // Build enhanced payload
        const payload = {
          url: urlToSend,
          pageUrl,
          type,
          timestamp: new Date().toISOString(),
          title: extractedData?.title || null,
          description: extractedData?.description || null,
          keywords: extractedData?.keywords || null,
          favicon: extractedData?.favicon || null,
          linkTitle: extractedData?.linkTitle || null,
          altText: extractedData?.altText || null,
          note: String(additionalContent).length > 0 ? additionalContent : null,
        };

        if (type === "selection") {
          payload.selectedText = selectionText;
        }

        // Find webhook to get rate limit
        chrome.storage.local.get("webhooks", (webhooksData) => {
          const webhook = webhooksData.webhooks?.find(
            (wh) => wh.url === webhookUrl,
          );
          const rateLimit = webhook ? webhook.rateLimit || 0 : 0;

          addToQueue(webhookUrl, payload, webhookName, rateLimit);
        });
      });
    },
  );
}

/**
 * Displays a basic Chrome notification.
 *
 * @param {string} title - The title of the notification.
 * @param {string} message - The main message content of the notification.
 * @param {boolean} [isSuccess=true] - Whether the notification indicates success (influences icon, if different).
 */
function showNotification(title, message, isSuccess = true) {
  const iconPath = isSuccess ? "images/icon48.png" : "images/icon48.png"; // Currently same icon for success/failure
  chrome.notifications.create({
    type: "basic",
    iconUrl: iconPath,
    title: title,
    message: message,
  });
}

/**
 * Displays and updates a dynamic Chrome notification for a webhook queue.
 * This notification shows the number of items in the queue and estimated time remaining.
 * It updates at a configurable interval and auto-clears after 60 seconds.
 *
 * @param {string} webhookUrl - The URL of the webhook associated with the queue.
 * @param {string} webhookName - The name of the webhook for display in the notification.
 */
function showQueueNotification(webhookUrl, webhookName) {
  const notificationId = `queue_${webhookUrl}_${Date.now()}`;

  // Clear any existing notification for this webhook
  clearQueueNotification(webhookUrl);

  // Get notification interval from settings
  chrome.storage.local.get(
    { settings: { notificationInterval: 5 } },
    (data) => {
      const updateIntervalMs = data.settings.notificationInterval * 1000;

      function updateNotification() {
        const queueData = webhookQueues.get(webhookUrl);
        if (!queueData || queueData.queue.length === 0) {
          clearQueueNotification(webhookUrl);
          return;
        }

        const now = Date.now();
        const timeSinceLastSent = now - queueData.lastSent;
        const rateLimitMs = queueData.rateLimit * 1000;
        const waitTime = Math.max(0, rateLimitMs - timeSinceLastSent);
        const queuePosition = queueData.queue.length;
        const totalWait = Math.ceil(
          (waitTime + (queuePosition - 1) * rateLimitMs) / 1000,
        );

        chrome.notifications.create(notificationId, {
          type: "basic",
          iconUrl: "images/icon48.png",
          title: `⏳ ${webhookName} - Queued`,
          message: `${queuePosition} in queue, ~${totalWait}s remaining`,
        });
      }

      // Initial notification
      updateNotification();

      // Update at configured interval
      const intervalId = setInterval(updateNotification, updateIntervalMs);

      queueNotifications.set(webhookUrl, { notificationId, intervalId });

      // Auto-clear after 60 seconds to prevent indefinite notifications
      setTimeout(() => clearQueueNotification(webhookUrl), 60000);
    },
  );
}

/**
 * Clears a specific queue notification and its associated update interval.
 *
 * @param {string} webhookUrl - The URL of the webhook whose queue notification should be cleared.
 */
function clearQueueNotification(webhookUrl) {
  const notification = queueNotifications.get(webhookUrl);
  if (notification) {
    clearInterval(notification.intervalId);
    chrome.notifications.clear(notification.notificationId);
    queueNotifications.delete(webhookUrl);
  }
}

/**
 * Sends a POST request to a webhook URL with a JSON payload.
 * Includes retry logic for failed requests.
 * Displays success or failure notifications upon completion.
 *
 * @param {string} webhookUrl - The URL of the webhook.
 * @param {object} payload - The JSON payload to send.
 * @param {number} [retryCount=3] - The number of retries remaining.
 * @param {string} [webhookName="Webhook"] - The name of the webhook for notifications.
 */
function postToWebhookDirect(
  webhookUrl,
  payload,
  retryCount = 3,
  webhookName = "Webhook",
) {
  fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok && retryCount > 0) {
        console.log(
          `Webhook failed with status ${response.status}, retrying... (${retryCount} attempts left)`,
        );
        setTimeout(
          () =>
            postToWebhookDirect(
              webhookUrl,
              payload,
              retryCount - 1,
              webhookName,
            ),
          1000,
        );
      } else if (response.ok) {
        console.log("Webhook sent with response status:", response.status);
        showNotification(
          `✅ ${webhookName} - Success`,
          `Data sent successfully to ${webhookName}`,
          true,
        );
      } else {
        console.log("Webhook failed after all retries");
        showNotification(
          `❌ ${webhookName} - Failed`,
          `Failed to send data after 3 attempts`,
          false,
        );
      }
    })
    .catch((error) => {
      console.error("Error sending webhook:", error);
      if (retryCount > 0) {
        console.log(
          `Retrying webhook in 2 seconds... (${retryCount} attempts left)`,
        );
        setTimeout(
          () =>
            postToWebhookDirect(
              webhookUrl,
              payload,
              retryCount - 1,
              webhookName,
            ),
          2000,
        );
      } else {
        showNotification(
          `❌ ${webhookName} - Error`,
          `Network error: ${error.message}`,
          false,
        );
      }
    });
}

// Listen for changes in the webhooks data to update context menus and queues
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.webhooks) {
    updateWebhookMenus();
    initializeQueues();
  }
});
