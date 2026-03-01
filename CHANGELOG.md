# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] — 2025-07-18

### Removed
- `downloadFile()`, `loadFile()`, `save()`, `load()` — outside core DOM scope

### Added
- TypeScript source + declarations (`dist/index.d.ts`)
- Rollup build: ESM, ESM minified, UMD
- `.fill(data)` — data → DOM binding
- `.get('flat')` / `.get('nested')` — DOM → data extraction
- `.set({ class: '+active -old !toggle' })` — class modifiers
- `.add(config, arrayData)` — create N copies from array
- `.on()` / `.off()` target `lastAdded` first
- `.paste('before'/'after')` — sibling positioning
- `.paste()` / `.duplicate()` set `lastAdded`
- `.debug()` / `.debug('steps')` — state inspector + step logging
- `.enter(selector)` — filter direct children by CSS selector
- `_cloneWithState()` — form-state-preserving clone
- `.sync(key)` / `.unsync(key)` — DOM ↔ storage (local/session/indexeddb)
- `debug('steps')` disabled in production (`NODE_ENV=production`)

### Fixed
- `enter()` — assignment to `const` variable
- `addToElements` — Node branch double-clone
- `back()` — now consumes history entries (true stack pop)
- `safeHTMLToElements` — simplified sanitization
- Removed expensive `JSON.stringify` circular-ref check
- Removed arbitrary `getSize() > 100000` check
- All error messages in English

## [1.1.0] — 2025-07-10

### Added
- Initial public release
- `dom()` factory, `DomUnify` class
- Core: `.add()`, `.set()`, `.get()`, `.delete()`
- Navigation: `.enter()`, `.up()`, `.back()`, `.find()`
- Bookmarks: `.mark()`, `.getMark()`
- Clipboard: `.copy()`, `.paste()`, `.cut()`, `.duplicate()`
- Events: `.on()`, `.off()`
