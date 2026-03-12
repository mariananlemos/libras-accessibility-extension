# 🤟 Libras Translator - Accessibility Extension
Captures captions from video conferencing platforms (Google Meet, Microsoft Teams, Zoom) and videos (YouTube) and automatically translates them to Brazilian Sign Language (Libras) using VLibras.

## How to Use
1. Open a meeting or video on a supported platform
2. Enable captions on the platform (CC button)
3. Click the extension icon and then "Open Translation Panel"
4. VLibras will automatically translate the captions to Libras

## Project Structure
```
├── manifest.json              # Manifest for Chrome/Edge
├── manifest-firefox.json      # Manifest for Firefox
├── background.js              # Service Worker / Background Script
├── contentScript.js           # Script injected into pages
├── popup.html / popup.js      # Extension popup
├── styles.css                 # Content script styles
├── build.js                   # Multi-browser build script
├── icons/                     # Extension icons
├── sidepanel/                 # Side panel
│   ├── sidepanel.html
│   ├── sidepanel.js
│   └── sidepanel.css
└── vlibras-widget/            # VLibras widget (iframe)
    ├── widget.html
    └── widget.js
```

---
Built with ❤️ for accessibility | Powered by [VLibras](https://www.vlibras.gov.br/)
