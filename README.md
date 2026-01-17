# Obsidian Git Mobile

A React Native mobile app for syncing Obsidian vaults via Git.

## Features

- Markdown editing with toolbar
- File tree browser
- Wikilink support with autocomplete
- Backlinks panel
- Full-text search (FTS5)
- Git sync (clone, pull, push)
- Quick switcher

## Getting Started

> Make sure you have completed the [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment).

### Install dependencies

```bash
npm install
```

### iOS setup

```bash
bundle install
bundle exec pod install
```

### Run the app

```bash
# Start Metro
npm start

# In another terminal
npm run android  # or
npm run ios
```

## Development

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run test        # Jest tests
```

## E2E Tests

```bash
npm run detox:build:android
npm run detox:test:android
```
