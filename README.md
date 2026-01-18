# Obsidian Git Mobile

A React Native app for syncing Obsidian vaults via Git.

<p align="center">
  <img src="docs/screenshots/ui-improvements-final.png" width="220" alt="Vault" />
  <img src="docs/screenshots/final-03-editor.png" width="220" alt="Editor" />
  <img src="docs/screenshots/final-settings.png" width="220" alt="Settings" />
</p>

## Features

- 📝 Markdown editing with syntax dimming & toolbar
- 📁 File tree with rename, move, delete, folder creation
- 🔗 Wikilinks with `[[autocomplete]]` and backlinks
- 🔍 Full-text search (SQLite FTS5)
- 🔄 Git sync with auto-sync intervals
- 📱 Haptic feedback & spring animations
- ♿ WCAG AA accessible

## Install

Download APK from [Releases](https://github.com/yongkangc/obsidian-git-mobile/releases).

## Build

```bash
npm install
npx react-native bundle --platform android --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
cd android && ./gradlew assembleDebug
```

## Development

```bash
npm start          # Metro bundler
npm run android    # Run app
npm run typecheck  # TypeScript
npm run test       # 235 tests
```

## License

MIT
