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
