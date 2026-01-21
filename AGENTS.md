# Obsidian Git Mobile

React Native app for syncing Obsidian vaults via Git. Provides markdown editing, file management, full-text search, wikilink support, and bidirectional Git sync.

## Commands

```bash
# Development
npm start                    # Metro bundler
npm run android              # Run on Android
npm run ios                  # Run on iOS

# Validation (run before commits)
npm run typecheck            # TypeScript check
npm run lint                 # ESLint

# Testing
npm run test                 # Unit tests
npm run test:coverage        # With coverage
npm run detox:test:android   # E2E tests
```

## Building Release APK

**Requires Java 17** (not Java 21):

```bash
export JAVA_HOME=/usr/lib/jvm/java-1.17.0-openjdk-amd64  # Linux
# export JAVA_HOME=$(/usr/libexec/java_home -v 17)       # macOS
cd android && ./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

## GitHub Release

```bash
npm run typecheck
git add -A && git commit -m "fix: description"
git push origin main
export JAVA_HOME=/usr/lib/jvm/java-1.17.0-openjdk-amd64
cd android && ./gradlew assembleRelease && cd ..
gh release create v1.x.x \
  --title "v1.x.x - Title" \
  --notes "## Changes
- Change 1" \
  android/app/build/outputs/apk/release/app-release.apk
```

## Architecture

### Services (`src/services/`)
- **vault-fs.ts** - File system over react-native-fs, ignores `.git`/`.obsidian`
- **git-sync.ts** - isomorphic-git with RNFS adapter, LWW conflict resolution
- **index-db.ts** - SQLite for metadata, wikilinks, FTS5 search
- **sync-queue.ts** - Queues local changes for batch sync

### State (`src/store/`)
Zustand store: current note, file tree, sync status, sync queue

### Screens
- **VaultScreen** - File tree browser
- **EditorScreen** - Markdown editor with wikilink autocomplete
- **SearchScreen** - Full-text search
- **SettingsScreen** - Git auth

### Tests
- `src/__tests__/` - Unit/integration tests
- `e2e/` - Detox E2E tests
