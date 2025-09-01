# Super Webhooks Chrome Extension

![project logo](images/logo_w_text.jpeg)

![main form with cards](images/demo-1.png)

![editing a single card](images/demo-2.png)

![edit care with many fields](images/demo-3.png)

![resulting modal for many fields](images/demo-4.png)

### 🎨 **Complete UI Redesign**
- **Modern card-based interface** with professional design system
- **Tabbed navigation** separating Webhooks and Settings
- **Collapsible forms** to maximize space for webhook management
- **Enhanced typography** and consistent spacing throughout
- **Responsive design** optimized for Chrome extension popup

### ⚡ **Rate Limiting & Queue System**
- **Configurable rate limits** per webhook (in seconds)
- **Intelligent queueing** prevents spam and respects API limits
- **Queue notifications** with ⏳ emoji and countdown timers
- **Configurable notification intervals** (1-60 seconds)

### 🔧 **Enhanced User Experience**
- **Improved form workflows** with better validation feedback
- **Success/error messaging** with auto-dismissal
- **Enhanced button states** for test/edit/delete actions
- **Keyboard accessibility** throughout the interface
- **Author attribution** with link to developer
- **New 'Custom Fields' Modal**: Seamlessly [attach optional custom fields to any webhook payload](CUSTOM_FIELDS.md), enhancing context and flexibility.

## Features

### Core Functionality
- **Register and Manage Webhooks**: Add, edit, and delete webhooks with friendly names, URLs, and rate limits
- **Context Menu Integration**: Right-click on any page, link, image, or selected text to send data to registered webhooks. This now includes an optional modal for adding custom fields.
- **Enhanced Data Collection**: Automatically extracts page metadata, timestamps, and context-specific information including device details (browser window size and screen resolution)
- **Webhook Testing**: Test webhooks directly from the popup with response time and status feedback
- **Smart Notifications**: Desktop notifications with emoji feedback (✅/❌/⏳) for webhook status and queue updates
- **Add Custom Fields to Webhooks**: Attach optional [custom fields to any webhook payload](CUSTOM_FIELDS.md) via a dedicated modal window.
- **Device Details**: Includes browser, operating system, device type, screen resolution, and browser window size

### Advanced Features
- **Rate Limiting**: Configure per-webhook rate limits to prevent API abuse
- **Queue Management**: Intelligent queueing system with real-time status updates
- **URL Validation**: Built-in validation ensures only valid HTTP/HTTPS URLs are accepted
- **Retry Mechanism**: Automatic retry (up to 3 attempts) for failed webhook calls with progressive delays
- **Secure Storage**: All webhook information is securely stored using Chrome's local storage
- **Settings Management**: Configurable notification update intervals and future expandability

### Custom fields

Read about custom fields in the [CUSTOM_FIELDS.md](CUSTOM_FIELDS.md) file.

## Installation

### From Source
1. Clone the repository or download the ZIP file
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer Mode** at the top right
4. Click **"Load unpacked"** and select the extension directory where the `manifest.json` file is located

### Requirements
- Chrome browser with Manifest V3 support
- Developer mode enabled for unpacked extensions

## Usage

### Managing Webhooks
- **Adding a Webhook**: Click the "➕ Add New Webhook" button, fill in the URL, name, and optional rate limit
- **Testing a Webhook**: Click the "🧪 Test" button next to any webhook to verify connectivity
- **Editing a Webhook**: Click the "✏️ Edit" button to modify webhook details
- **Deleting a Webhook**: Click the "🗑️ Delete" button, then confirm by clicking "Confirm?"

### Using Webhooks
Right-click on any webpage element:
- **Pages**: Right-click anywhere on the page
- **Links**: Right-click on any link
- **Images**: Right-click on any image  
- **Text**: Select text and right-click
- **Video**: Select video and right-click
- Choose **"Send to Webhook"** → Select your desired webhook

### Settings
- **Notification Intervals**: Configure how often queue notifications update (1-60 seconds)
- Access via the **"Settings"** tab in the extension popup

## Webhook Payload Examples

The extension sends different payload structures depending on the context.

### Page Context (right-click on page)
```json
{
  "url": "https://example.com/article",
  "pageUrl": "https://example.com/article",
  "timestamp": "2024-06-28T15:30:45.123Z",
  "type": "page",
  "title": "Article Title",
  "description": "Article description from meta tag",
  "keywords": "technology, programming, tutorial",
  "favicon": "https://example.com/favicon.ico",
  "linkTitle": null,
  "altText": null,
  "customFields": { "note": "Additional note content from a custom note field if there was one" },
  "browser": "Chrome/139.0.0.0",
  "operatingSystem": "mac",
  "deviceType": "Desktop",
  "screenResolution": "1920x1080",
  "windowSize": "1200x800"
}
```

### Selected Text Context (right-click on selected text)
```json
{
  "url": "https://example.com/article",
  "pageUrl": "https://example.com/article",
  "timestamp": "2024-06-28T15:30:45.123Z",
  "type": "selection",
  "title": "Article Title",
  "description": "Article description from meta tag",
  "keywords": "technology, programming, tutorial",
  "favicon": "https://example.com/favicon.ico",
  "linkTitle": null,
  "altText": null,
  "customFields": { "note": "Additional note content from a custom note field if there was one" },
  "selectedText": "This is the selected text from the page",
  "browser": "Chrome/139.0.0.0",
  "operatingSystem": "mac",
  "deviceType": "Desktop",
  "screenResolution": "1920x1080",
  "windowSize": "1200x800"
}
```

### Link Context (right-click on a link)
```json
{
  "url": "https://linked-page.com",
  "pageUrl": "https://example.com/article",
  "timestamp": "2024-06-28T15:30:45.123Z",
  "type": "link",
  "title": "Article Title",
  "description": "Article description from meta tag",
  "keywords": "technology, programming, tutorial",
  "favicon": "https://example.com/favicon.ico",
  "linkTitle": "Link title attribute",
  "altText": null,
  "customFields": { "note": "Additional note content from a custom note field if there was one" },
  "selectedText": "This is the selected text from the page",
  "browser": "Chrome/139.0.0.0",
  "operatingSystem": "mac",
  "deviceType": "Desktop",
  "screenResolution": "1920x1080",
  "windowSize": "1200x800"
}
```

### Image Context (right-click on an image)
```json
{
  "url": "https://example.com/image.jpg",
  "pageUrl": "https://example.com/article",
  "timestamp": "2024-06-28T15:30:45.123Z",
  "type": "image",
  "title": "Article Title",
  "description": "Article description from meta tag",
  "keywords": "technology, programming, tutorial",
  "favicon": "https://example.com/favicon.ico",
  "linkTitle": null,
  "altText": "Image alt text",
  "customFields": { "note": "Additional note content from a custom note field if there was one" },
  "selectedText": "This is the selected text from the page",
  "browser": "Chrome/139.0.0.0",
  "operatingSystem": "android",
  "deviceType": "Tablet",
  "screenResolution": "1920x1080",
  "windowSize": "1200x800"
}
```

### Video Context (right-click on a video)
```json
{
  "url": "https://example.com/video.mp4",
  "pageUrl": "https://example.com/article",
  "timestamp": "2024-06-28T15:30:45.123Z",
  "type": "video",
  "title": "Article Title",
  "description": "Article description from meta tag",
  "keywords": "technology, programming, tutorial",
  "favicon": "https://example.com/favicon.ico",
  "linkTitle": null,
  "altText": null,
  "customFields": { "note": "Additional note content from a custom note field if there was one" },
  "selectedText": "This is the selected text from the page",
  "browser": "Chrome/139.0.0.0",
  "operatingSystem": "android",
  "deviceType": "Mobile",
  "screenResolution": "1920x1080",
  "windowSize": "1200x800"
}
```

### Test Webhook Payload
```json
{
  "url": "https://example.com/image.jpg",
  "pageUrl": "https://example.com/article",
  "timestamp": "2024-06-28T15:30:45.123Z",
  "type": "test",
  "title": "Testing",
  "description": "Testing description from meta tag",
  "keywords": "technology, programming, tutorial",
  "favicon": "https://example.com/favicon.ico",
  "linkTitle": "Title if it was a link type",
  "altText": "Image alt text if it was a link type",
  "customFields": { "note": "Additional note content from a custom note field if there was one" },
  "selectedText": "The selected text if there was a selection",
  "browser": "Chrome/139.0.0.0",
  "operatingSystem": "win",
  "deviceType": "Desktop",
  "screenResolution": "1920x1080",
  "windowSize": "1200x800"
}
```

## Rate Limiting

Configure rate limits per webhook to prevent API abuse:
- **0 seconds**: No rate limiting (immediate sending)
- **1-999 seconds**: Webhooks will be queued and sent at the specified interval
- **Queue notifications**: Get real-time updates when webhooks are queued
- **Smart queueing**: Only items that are actually delayed will show queue notifications

## Architecture

### Core Components
- **manifest.json**: Chrome extension manifest (Manifest V3)
- **background.js**: Service worker handling context menus, webhook management, and queue processing
- **popup.html/popup.js**: Modern tabbed UI for webhook registration and settings management
- **modal.html/modal.js**: Additional modal that is shown where there are additional details to attach
- **Chrome Storage**: Local storage for webhook persistence and settings

### Queue System
- **Independent queues** per webhook URL with configurable rate limits
- **Asynchronous processing** with setTimeout-based scheduling
- **Memory-efficient** cleanup of completed notifications
- **Persistent storage** integration for queue state management

## Development

### File Structure
```
chrome-webhook-extension/
├── manifest.json          # Extension manifest
├── background.js          # Service worker (queue system, context menus)
├── popup.html             # Modern tabbed UI
├── popup.js               # UI logic and form handling
├── modal.html             # HTML for the 'Custom Fields' modal
├── modal.js               # Logic for the 'Custom Fields' modal
├── images/                # Extension icons
├── AGENTS.md              # Development guide
└── README.md              # This file
```

### Key Technologies
- **Chrome Extension Manifest V3**
- **Service Workers** for background processing
- **Chrome Storage API** for data persistence
- **Chrome Context Menus API** for right-click integration
- **Chrome Notifications API** for queue status updates
- **Modern CSS** with custom properties and flexbox
- **Vanilla JavaScript** with ES6+ features

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request with detailed description

### Development Setup
1. Clone the repository
2. Load unpacked extension in Chrome
3. Make changes and reload extension
4. Test across different webpage contexts

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- **Font Awesome** for icons used throughout the interface
- **PureCSS** for the foundational CSS framework
- **Claude Code (Anthropic)** for AI-assisted development and architecture guidance
- The **ADHD developer community** for inspiration and hyperfocus superpowers

Logo is from https://www.thiings.co/things/crochet-hook

Forked from [clawfire/chrome-webhook-extension by Thibault Milan](https://github.com/clawfire/chrome-webhook-extension)
