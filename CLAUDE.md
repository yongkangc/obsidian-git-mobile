# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian Git Mobile is a React Native mobile app for syncing Obsidian vaults via Git. It provides markdown editing, file management, full-text search, wikilink support, and bidirectional Git sync.

## Build & Development Commands

```bash
# Start Metro bundler
npm start

# Run on device/emulator
npm run android
npm run ios

# For iOS, install CocoaPods first (once per native dep update)
bundle install && bundle exec pod install

# Linting and type checking
npm run lint
npm run typecheck

# Unit tests
npm run test
npm run test:watch           # Watch mode
npm run test:coverage        # With coverage
npm run test:perf            # Performance tests only

# E2E tests (Detox)
npm run detox:build:android  # Build Android test APK
npm run detox:test:android   # Run Android E2E tests
npm run detox:build:ios      # Build iOS test app
npm run detox:test:ios       # Run iOS E2E tests
```

## Building Release APK

**Important**: Android build requires Java 17 (not Java 21). Set JAVA_HOME before building:

```bash
# Build release APK (Linux)
export JAVA_HOME=/usr/lib/jvm/java-1.17.0-openjdk-amd64
cd android && ./gradlew assembleRelease

# Build release APK (macOS with Homebrew)
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
cd android && ./gradlew assembleRelease

# Output APK location
# android/app/build/outputs/apk/release/app-release.apk
```

## Creating a GitHub Release with APK

```bash
# 1. Run typecheck
npm run typecheck

# 2. Commit and push changes
git add -A && git commit -m "fix: description"
git push origin main

# 3. Build release APK
export JAVA_HOME=/usr/lib/jvm/java-1.17.0-openjdk-amd64
cd android && ./gradlew assembleRelease && cd ..

# 4. Create GitHub release with APK attached
gh release create v1.x.x \
  --title "v1.x.x - Release title" \
  --notes "## Changes
- Change 1
- Change 2" \
  android/app/build/outputs/apk/release/app-release.apk
```

## Architecture

### Core Services (`src/services/`)

- **vault-fs.ts**: File system abstraction over react-native-fs. Handles all vault file operations with caching. Ignores `.git` and `.obsidian` directories.
- **git-sync.ts**: Git operations using isomorphic-git with RNFS adapter. Handles clone, pull, push with LWW (last-writer-wins) conflict resolution. Uses same `DocumentDirectoryPath/vault` path as vault-fs.
- **index-db.ts**: SQLite database (react-native-quick-sqlite) for file metadata, wikilink graph, and FTS5 full-text search.
- **indexer.ts**: Indexes vault files, extracts wikilinks, updates search index.
- **sync-queue.ts**: Queues local changes (add/modify/delete) for batch sync.

### State Management (`src/store/`)

Single Zustand store managing: current note, file tree, recent notes, sync status, sync queue, expanded folders, vault path.

### Navigation

React Navigation native stack with four screens:
- **VaultScreen**: File tree browser with FAB for actions
- **EditorScreen**: Markdown editor with toolbar, wikilink autocomplete, image embeds
- **SearchScreen**: Full-text search
- **SettingsScreen**: Git auth configuration

### Key Types (`src/types/`)

- `VaultFS`: File system interface
- `IndexDB`: Database interface
- `GitSync`: Git operations interface
- `FileMeta`: File metadata (path, title, modifiedAt, contentHash)
- `FileNode`: Tree node for file browser
- `SyncStatus`: Sync state (synced/pending/offline/error)

### Test Structure

- `src/__tests__/smoke/`: Basic sanity tests
- `src/__tests__/integration/`: Service integration tests
- `src/__tests__/perf/`: Performance benchmarks
- `src/__tests__/hooks/`: React hook tests
- `src/__tests__/components/`: Component tests
- `src/services/__tests__/`: Service unit tests
- `e2e/`: Detox E2E tests
