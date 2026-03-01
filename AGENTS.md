# AGENTS.md — dom-unify

## Project Overview

**dom-unify** — a lightweight JavaScript library for chainable DOM manipulation. Provides a fluent API for creating, navigating, manipulating, and extracting data from DOM structures.

### Structure

- `index.js` — single library file containing `DomUnify` class and `dom()` factory
- `__tests__/` — 28 test files (Jest + jsdom): 27 unit + 1 integration
- `test.html` — manual HTML page for browser testing
- ESM (`"type": "module"`)

### Class Architecture (`DomUnify`)

**Instance state:**
- `currentElements` — current context (array of DOM elements)
- `lastAdded` — last added elements
- `elementHistory` — navigation history stack (for `back()`)
- `markedElements` — named bookmarks (for `mark()`/`getMark()`)
- `buffer` — clipboard (for `copy()`/`cut()`/`paste()`)
- `lastParents` — parents of deleted/cut elements
- `_eventHandlers` — WeakMap of event handlers
- `_debugMode` — boolean flag for step-by-step debug logging
- `_syncCleanup` — Map of sync cleanup functions (lazy init)

**Static methods:**
- `safeHTMLToElements(html)` — basic HTML sanitization (script removal + on* attr removal)
- `createElementFromConfig(config, parent, sanitize, depth)` — create DOM from config object
- `_createFromConfig(config, fragment)` — extracted element creation logic for reuse
- `_cloneWithState(el)` — deep clone that preserves form state (value, checked, selected)
- `addToElements(targets, config, data, options)` — add elements to targets (array data = N copies)
- `_findDirectElements(container, selector)` — find elements not inside nested data-containers
- `_getElementValueByKey(el)` — get value from element for flat/nested modes
- `_setElementValue(target, value)` — set value on a single target element
- `_fillElement(container, data, options)` — core recursive fill logic
- `_collectFlat(container, options)` — collect flat key-value data
- `_collectNested(container, options)` — collect nested data respecting data-container
- `_idbOpen()` — open IndexedDB for sync storage
- `_idbGet(key)` — read value from IndexedDB
- `_idbSet(key, value)` — write value to IndexedDB

**Instance methods:**
- Navigation: `enter()` (index/selector), `up()`, `back()`, `find()`
- Manipulation: `add()`, `set()`, `fill()`, `delete()`, `cut()`, `copy()`, `paste()`, `duplicate()`
- Data: `get()` (modes: form, flat, nested), `downloadFile()`, `loadFile()`, `save()`, `load()`
- Storage: `sync()`, `unsync()`
- Bookmarks: `mark()`, `getMark()`
- Events: `on()`, `off()`
- Debug: `debug()`, `_logStep()`, `_describeElements()`

---

## Running

```bash
npm test                # run tests
npm run test:watch      # watch mode
npm run test:coverage   # coverage report
```

---

## Bug Fixes Applied to index.js

### Phase 1 (initial audit)

1. **`enter()` — assignment to `const` variable** (CRITICAL)
   `const entered = []` → `let entered = []`

2. **`addToElements` with DomUnify instance** — copied too much
   Now uses `config.lastAdded` instead of cloning all childNodes of `document.body`.

3. **`_applyDataToElements` — `clearMissing` didn't work for existing elements**
   Now called for `[...targets, ...elements]`, not just `elements`.

4. **Debug logs removed** — all `console.log` removed from `_applyDataToElements`, `set()`, `loadFile()`.

5. **`knownCSS` validation removed** — incomplete list was missing `flex`, `gap`, `grid-*`, `transform`, etc. All CSS properties now applied directly.

6. **`test.html`** — duplicate `</script>` removed.

7. **`addToElements` Node branch** — double-clone fix (two `cloneNode(true)` reduced to one).

### Phase 2 (code improvements)

8. **`find()` cache removed** — `_findCache` WeakMap caused stale results when DOM was modified between finds. Now always does fresh `querySelectorAll`.

9. **`back()` now consumes history** — `elementHistory.slice(0, index + 1)` → `elementHistory.slice(0, index)`. Sequential `back(1)` calls properly step back through history.

10. **`safeHTMLToElements` simplified** — reduced from 10+ regex passes to 3 basic ones (script removal + on* event attribute removal). For untrusted HTML, use DOMPurify.

11. **`JSON.stringify` circular ref check removed** — expensive operation on every call; removed.

12. **`getSize() > 100000` check removed** — arbitrary limit; removed.

13. **All Russian strings translated to English** — error messages in `downloadFile()`, `loadFile()`, `get()`.

---

## Test Status

```
Test Suites: 28 passed, 28 total
Tests:       401 passed, 401 total
```

---

## Features Added (Phase 3)

### 1. `.fill(data, options)` — data → DOM
New method: fills existing elements with data recursively.
- Finds targets by: `data-key` → `name` → `id`
- Non-form elements: sets `textContent`
- Form elements: sets `value` (smart radio/checkbox/select handling)
- Nested objects: recurses into `[data-container]` elements
- Array data: distributes `currentElements[i]` ← `data[i]`
- Skips array-of-objects values (use `.add(config, array)` instead)

### 2. `.get('flat')` / `.get('nested')` — DOM → data
- `get('flat')` — collects all keyed elements as flat key-value pairs
- `get('nested')` — respects `[data-container]` hierarchy, builds nested objects
- Multiple siblings with same `data-container` name → array
- Divs without `data-container` are transparent (data collapses to parent)
- Symmetry: `dom(el).get('nested')` ↔ `.fill()` round-trip

### 3. `.set()` class modifiers
- `+className` → `classList.add()`
- `-className` → `classList.remove()`
- `!className` → `classList.toggle()`
- Multiple: `'+active -old !visible'`
- No prefix → replace `className` (existing behavior)

### 4. `.add(config, arrayData)` — create N copies
- Array data creates one element per item, each filled via `_fillElement`
- Empty array `[]` creates nothing
- Non-array data preserves existing behavior

### 5. `.on()` / `.off()` target `lastAdded`
- If `lastAdded` is not empty → attach/detach on those elements
- Otherwise → fall back to `currentElements`
- Does NOT clear `lastAdded` (multiple `.on()` calls target same element)
- Enables: `.add({ tag: 'button' }).on('click', fn)` without `.enter()`

### 6. Code refactoring
- Extracted `_createFromConfig()` static helper from `addToElements`
- `addToElements` now handles array data path separately from object data

---

## Features Added (Phase 4)

### 1. `.debug(mode?)` — debugging tool
- `.debug()` — prints state snapshot to console (currentElements, lastAdded, history, marks, buffer)
- `.debug('steps')` — enables step-by-step logging for all subsequent method calls
- `.debug(false)` — disables step logging
- `_logStep(method)` called at end of every chainable method (only logs when `_debugMode` is true)
- `_describeElements(els)` — formats elements as `tag#id.class` for readable output
- Warns `⚠ EMPTY CONTEXT` when currentElements is empty

### 2. `_cloneWithState(el)` — form-state-preserving clone
- Static helper that replaces `cloneNode(true)` where form state matters
- Copies: input.value, checkbox.checked, radio.checked, select option.selected, textarea.value
- Handles both nested form elements and the element itself if it's a form element
- Used by: `copy()`, `paste()`, `duplicate()`, `_createFromConfig()`

### 3. `enter(selector)` — CSS selector for direct children
- When argument is a string, filters `el.children` via `child.matches(selector)`
- Only matches direct children — different from `find()` which uses `querySelectorAll` (deep)
- Falls back to currentElements if no matches found (same as index behavior)

### 4. `paste('before'/'after')` — sibling positioning
- `'before'` — inserts pasted elements before each current element (as sibling)
- `'after'` — inserts pasted elements after each current element (as sibling)
- `'start'` — alias for `'prepend'`
- `'end'` — alias for `'append'`
- `paste()` now sets `lastAdded` to the pasted elements

### 5. `paste()` and `duplicate()` set `lastAdded`
- Both methods now set `lastAdded` to the new cloned elements
- Enables chaining: `.paste().on('click', fn)` or `.duplicate().enter()`

### 6. `_logStep` tracing in all methods
- Added `_logStep('methodName')` to: add, set, fill, enter, up, back, mark, getMark, delete, cut, copy, paste, duplicate, find, on, off

---

## Features Added (Phase 5)

### 1. `.save(options)` — collect data and download
- Collects from currentElements via `_collectFlat`/`_collectNested`/`get()`
- Formats: `'json'` (default), `'csv'`, `'text'`
- Options: `filename`, `mode`, `format`, `space`, `transform`
- CSV: auto-generates headers from object keys, escapes quotes
- Downloads via Blob + `URL.createObjectURL` + `<a>` click

### 2. `.load(selector, options)` — read file and fill DOM
- Takes file input selector or DOM element
- Parse modes: `'json'` (default) or custom `fn(raw) => data`
- Auto-fills currentElements via `_fillElement` (toggleable with `fill: false`)
- Array data distributes across currentElements (data[i] → element[i])
- Captures targets at call time for async safety
- Callbacks: `onLoad(data)`, `onError(err)`

### 3. `.sync(key, options)` / `.unsync(key)` — DOM ↔ storage
- On init: reads storage and fills DOM
- On input/change: collects data with debounce and writes to storage
- Storage backends: `'local'` (default), `'session'`, `'indexeddb'`
- IndexedDB uses async wrappers (`_idbOpen`, `_idbGet`, `_idbSet`)
- `unsync(key)` removes listeners and cleanup
- Options: `storage`, `debounce` (300ms default), `mode`, `onSync(data)`

---

## Future Ideas (from user)

### 1. `.toTemplate()` / `.template(name)` — template system
Create reusable templates from chains. Register globally by name. Deferred from current scope.

### 2. `downloadFile()` / `loadFile()`
These work but are somewhat outside the core DOM manipulation scope. Keep them for now.

### 3. TypeScript
Library stays in JavaScript. Users can get types via `.d.ts` declaration files.

---

## Key Behaviors to Document

### `back()` consumes history
`back(1)` called three times from 3-deep history goes: D→C→B→A (each call removes the used history entry). This is different from browser history — it's a true stack pop.

### `enter()`, `on()`, `off()` prioritize `lastAdded`
If `lastAdded` is non-empty, these methods operate on those elements instead of `currentElements`. `enter()` clears `lastAdded` after use; `on()`/`off()` do not, allowing multiple event attachments on the same element.

### Data convention: `data-key` and `data-container`
- `data-key="name"` — marks an element as a value holder (for fill/get)
- `data-container="address"` — marks a structural group (maps to nested object key)
- `name` attribute — fallback for form inputs
- `id` — last fallback
- Divs without `data-container` are transparent — data collapses through them

### `mark()` saves `lastAdded` if available
If `lastAdded` has elements, `mark()` saves those. Otherwise saves `currentElements`.

### `safeHTMLToElements` is basic
Only removes `<script>` tags and `on*` event attributes. Does NOT protect against `javascript:` URLs, `<iframe>`, `<object>`, encoded XSS, etc. For untrusted input, use DOMPurify.

### `enter(selector)` vs `find(selector)`
- `enter('span')` — only direct children matching selector
- `find('span')` — all descendants matching selector (querySelectorAll)

### `paste()` and `duplicate()` set `lastAdded`
After paste or duplicate, `lastAdded` contains the new cloned elements. This enables immediate chaining with `.on()`, `.enter()`, etc.

### `copy()`/`paste()`/`duplicate()` preserve form state
Uses `_cloneWithState()` instead of raw `cloneNode(true)`. Programmatically set values on inputs, checkboxes, radios, selects, and textareas are preserved in clones.
