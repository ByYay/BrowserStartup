<div align="center">

<img src="icons/icon128.png" alt="Browser Startup icon" width="96" height="96">

# Browser Startup

**A calm, customizable new-tab dashboard for Chrome and Edge.**

Shortcuts, English–Turkish vocabulary cards, a calendar, a password generator, weather, and a Pomodoro timer, all on one page.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?logo=javascript&logoColor=black)
![No build step](https://img.shields.io/badge/build-none-2ea44f)
![Languages](https://img.shields.io/badge/UI-English%20%7C%20T%C3%BCrk%C3%A7e-8A2BE2)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[Features](#features) · [Screenshots](#screenshots) · [Installation](#installation) · [Usage](#usage) · [Privacy](#privacy-and-external-connections)

![Browser Startup in the light theme](screenshots/hero.png)

</div>

## Features

- 🔗 **Shortcuts:** add, edit, and delete links with a right-click. Pick colors and use Font Awesome icons, image URLs, or your own PNG, JPEG, or WebP files. Uploaded icons are resized to 128 px and stored locally.
- 🔍 **Web and AI search:** search Google, or toggle AI mode to send your query to ChatGPT or Claude. AI mode opens the provider's website; no model runs inside the dashboard.
- 📚 **Vocabulary cards:** save English words with Turkish meanings and practice them as flip cards in a shuffled order that never shows the same word twice in a row. Meanings come from the browser's built-in Translator or can be typed by hand.
- 🧩 **Five widgets:** calendar, vocabulary cards, password generator, weather, and Pomodoro timer, switched from a single tab bar.
- 🎨 **Themes and backgrounds:** Light, Dark, Midnight, or Auto (follows sunrise and sunset). Upload your own backgrounds, adjust blur, brightness, and contrast, and rotate between them.
- 📐 **Fits any window:** landscape windows keep the two-column layout and scale it to fit; portrait windows stack the panels.
- 💾 **Backup and restore:** export everything (settings, shortcuts, vocabulary, backgrounds) to a single `.yay` file and import it in another browser.

### Widgets

| Widget | What it does |
| --- | --- |
| **Calendar** | Current month with week numbers, today, and weekends highlighted. |
| **Words** | Flip cards: click once to reveal the meaning, click again to fade to the next word. Add, edit, and delete words in the management view. |
| **Password** | 4–50 character passwords from Web Crypto, with character-set options, similar-character exclusion, a strength meter, and one-click copy. |
| **Weather** | Current conditions and a forecast for your IP-based location. Uses an optional WeatherAPI.com key, with Open-Meteo and wttr.in as fallbacks. |
| **Pomodoro** | Configurable work and break durations, start/pause and skip, and a session counter. |

## Screenshots

| Dark | Midnight |
| --- | --- |
| ![Dark theme](screenshots/dark.png) | ![Midnight theme](screenshots/midnight.png) |

| Vocabulary cards | Password generator |
| --- | --- |
| ![Vocabulary cards with example English and Turkish words](screenshots/vocabulary.png) | ![Password generator showing a disposable demonstration password](screenshots/password.png) |

| Weather (sample data) | Pomodoro |
| --- | --- |
| ![Weather widget with fictional Demo City and sample conditions](screenshots/weather.png) | ![Pomodoro focus timer](screenshots/pomodoro.png) |

![Settings panel with language, AI provider, and theme options](screenshots/settings.png)

<details>
<summary><b>Custom backgrounds and shortcuts</b></summary>

<br>

![Alpine lake background with public example shortcuts and Claude search](screenshots/custom-dashboard.png)

![Coastal dusk background with the same example shortcut collection](screenshots/custom-coastal.png)

![Background settings with two landscape images and image filters](screenshots/custom-background.png)

Want to try them? Download [Alpine lake](screenshots/backgrounds/alpine-lake.webp) or [Coastal dusk](screenshots/backgrounds/coastal-dusk.webp) and choose **Settings → Background → Upload Images**. Both images are AI-generated; their [prompts](screenshots/backgrounds/prompts.json) are included.

</details>

> Screenshots were taken in a fresh browser profile with a demo name, public example shortcuts, and example words. The weather screenshot uses sample data.

## Installation

1. Clone the repository, or download it as a ZIP and extract it:

   ```bash
   git clone https://github.com/ByYay/BrowserStartup.git
   ```

2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Turn on **Developer mode** and click **Load unpacked**.
4. Select the `BrowserStartup` folder (the one containing `manifest.json`).
5. Open a new tab. 🎉

There is no build step and nothing to install. Other Chromium-based browsers should work too, but automatic translation needs a browser with the built-in Translator API (recent Chrome).

## Usage

| Task | How |
| --- | --- |
| Search | Type and press **Enter** (**Shift+Enter** for a new line). Click the AI logo to toggle AI mode. |
| Choose the AI provider | **Settings → Search AI** |
| Add a shortcut | **Settings → Shortcuts**, or edit the defaults with a right-click. |
| Use your own icon | In the shortcut editor, click **Choose file**, or enter a Font Awesome class (`fas fa-star`) or `img:https://…` URL. |
| Add words | Open the **Words** tab and click the pen icon. Type a word; the meaning fills in automatically when translation is available. |
| Practice | Click a card to see the meaning, click again for the next word. |
| Switch widgets | Click a tab, or use **←** / **→**, **Home**, and **End** on the tab bar. |
| Change the look | **Settings** (bottom-right corner): greeting, language, theme, backgrounds, filters. |
| Back up | **Settings → Data Management → Export / Import** |

## Privacy and external connections

Browser Startup has no backend, account, or analytics. Your preferences, shortcuts, and vocabulary stay in the browser's `localStorage`; backgrounds are stored in IndexedDB.

Some features still need the network:

| Service | Used for |
| --- | --- |
| Google Fonts, cdnjs (Font Awesome) | Fonts and icons, loaded when the page opens. |
| Shortcut icon hosts | Default Google/Gmail icons and any image URLs you add. Uploaded icons stay local. |
| ipapi.co / ipwho.is | Approximate location for weather and Auto theme. |
| sunrise-sunset.org | Sunrise and sunset times for Auto theme. |
| WeatherAPI.com, Open-Meteo, wttr.in | Weather for your coordinates. Your API key, if set, goes only to WeatherAPI.com. |
| Google, ChatGPT, Claude | Your search text, when you submit a search. |
| Browser Translator | May download a language pack once. Translation itself runs on your device. |

> [!WARNING]
> **Backups are not encrypted.** A `.yay` file is Base64-encoded JSON that contains your weather API key, name, shortcuts, uploaded icons, vocabulary, and backgrounds. Keep it private and do not commit it; `.gitignore` already excludes `*.yay`.

## Project structure

```text
BrowserStartup/
├── assets/ai-logos/      # ChatGPT and Claude logos for the search bar
├── css/                  # Styles per feature, plus themes
├── icons/                # Extension icons (16, 32, 48, 128 px)
├── js/
│   ├── app.js            # Start-up and delegated UI actions
│   ├── scale.js          # Window scaling and portrait layout
│   ├── search.js         # Google and AI search
│   ├── shortcuts.js      # Shortcut editor and uploaded icons
│   ├── vocab.js          # Vocabulary storage, practice, and translation
│   ├── calendar.js       # Calendar and date/time
│   ├── password.js       # Password generator
│   ├── weather.js        # Location, weather providers, and caching
│   ├── clock.js          # Pomodoro timer
│   ├── widgets.js        # Widget tabs and keyboard navigation
│   ├── themes.js         # Themes and sunrise/sunset logic
│   ├── background.js     # Background storage, filters, and rotation
│   ├── settings.js       # Preferences, backup, restore, and reset
│   └── translations.js   # English and Turkish UI text
├── screenshots/          # README images
├── index.html
└── manifest.json
```

The extension page follows Manifest V3's content security policy: no inline scripts or handlers. Buttons use `data-action` attributes that `app.js` routes to the matching function.

## License

[MIT](LICENSE) © 2026 ByYay

Third-party names, logos, fonts, and icons belong to their respective owners and remain subject to their own terms.
