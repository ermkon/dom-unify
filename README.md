# dom-unify

[![npm version](https://img.shields.io/npm/v/dom-unify.svg)](https://www.npmjs.com/package/dom-unify)
[![npm downloads](https://img.shields.io/npm/dm/dom-unify.svg)](https://www.npmjs.com/package/dom-unify)
[![bundle size](https://img.shields.io/bundlephobia/minzip/dom-unify)](https://bundlephobia.com/package/dom-unify)
[![license](https://img.shields.io/npm/l/dom-unify.svg)](https://opensource.org/licenses/MIT)

dom-unify — цепочечная библиотека, которая унифицирует всю работу с DOM в одном fluent API.
Контекстная навигация с историей и метками, nested data-binding для объектов и форм, уникальный clipboard (копирует/вставляет поддеревья с сохранением всех значений input, checkbox, select), builder и утилиты.

Никаких фреймворков. Никакого VDOM. Просто чистый JS — в 3–5 раз быстрее писать сложные интерфейсы, админки, конфигураторы и браузерные расширения.

**~6.5 kB gzipped** · Zero dependencies · TypeScript declarations included

## Install

```bash
npm install dom-unify
```

```javascript
import { dom } from 'dom-unify';
// or
import dom from 'dom-unify';
```

### Browser (UMD)

```html
<script src="https://unpkg.com/dom-unify/dist/index.umd.js"></script>
<script>
  const { dom } = DomUnify;
</script>
```

## Browser Compatibility

Современные браузеры: **Chrome 90+**, **Firefox 88+**, **Safari 14+**, **Edge 90+**. Без полифиллов.

## Quick Start

Create a page with a title and two paragraphs — **from an empty body**:

```javascript
dom()
  .add({ class: 'page' })
  .enter()
  .add({ tag: 'h1', text: 'Hello' })
  .add({ tag: 'p', text: 'First paragraph' })
  .add({ tag: 'p', text: 'Second paragraph' });
```

Result:
```html
<body>
  <div class="page">
    <h1>Hello</h1>
    <p>First paragraph</p>
    <p>Second paragraph</p>
  </div>
</body>
```

That's it. `dom()` targets `<body>`, `.add()` creates elements (default tag is `div`), `.enter()` moves inside the last added element. Every method returns `this` — chain as long as you want.

## Core Concepts

### Context

`dom()` always works with a **current set of elements**. Navigation methods (`.enter()`, `.up()`, `.find()`, `.back()`) change what you're pointing at. Manipulation methods (`.add()`, `.set()`, `.delete()`) modify the elements you're pointing at.

### History

Navigation methods push the previous context onto a stack. Call `.back()` to restore it — like an undo for navigation.

### Marks

`.mark(name)` saves the current context by name. `.getMark(name)` restores it. A `'root'` mark is created automatically on instantiation.

### Each `dom()` Is Separate

Every `dom()` call creates an **independent instance** with its own context, history, marks, and buffer. They don't share state:

```javascript
const a = dom('.sidebar');
const b = dom('.content');
// a and b are completely independent — navigating in a doesn't affect b
```

To pass data between instances, use `.get()` to extract, then `.fill()` or `.add()` to apply:

```javascript
const data = dom('.source').get('nested')[0];
dom('.target').fill(data);
```

---

## Examples

### Nested Structure

```javascript
dom()
  .add({ class: 'card' })
  .enter()
  .add({ tag: 'h2', text: 'Title' })
  .add({ class: 'body' })
  .enter()
  .add({ tag: 'p', text: 'Content' })
  .up()
  .up()
  .add({ class: 'card' })
  .enter()
  .add({ tag: 'h2', text: 'Another card' });
```

### Events

`.on()` targets the last added element — no need for `.enter()` + `.back()`:

```javascript
dom()
  .add({ class: 'list' })
  .enter()
  .add({ tag: 'button', text: 'Add' })
  .on('click', (e) => {
    dom(e.target).up('.list').add({ class: 'item', text: 'New item' });
  })
  .add({ class: 'item', text: 'First item' })
  .enter()
  .add({ tag: 'button', text: '×' })
  .on('click', (e) => dom(e.target).up('.item').delete());
```

### Data Binding (fill + get)

Use `data-key` for values and `data-container` for structure:

```javascript
// Build structure
dom()
  .add({ class: 'user-card' })
  .enter()
  .add({ tag: 'h3', 'data-key': 'name' })
  .add({ tag: 'span', 'data-key': 'role' })
  .add({ tag: 'div', dataset: { container: 'address' } })
  .enter()
  .add({ tag: 'input', 'data-key': 'city' })
  .add({ tag: 'input', 'data-key': 'zip' });

// Fill with data
dom('.user-card').fill({
  name: 'Alice',
  role: 'Admin',
  address: { city: 'NYC', zip: '10001' }
});

// Collect back — round-trip preserving structure
const data = dom('.user-card').get('nested');
// [{ name: 'Alice', role: 'Admin', address: { city: 'NYC', zip: '10001' } }]
```

### Create N Elements from Array

```javascript
dom('.list').add(
  { tag: 'div', class: 'card', children: [
    { tag: 'h3', 'data-key': 'title' },
    { tag: 'p', 'data-key': 'desc' }
  ]},
  [
    { title: 'Card 1', desc: 'First' },
    { title: 'Card 2', desc: 'Second' },
    { title: 'Card 3', desc: 'Third' }
  ]
);
```

### Copy / Paste

```javascript
dom('.widget').copy().up('.target').paste();    // append copy
dom('.source').copy();
dom('.target').paste('before');                 // insert before target
dom('.item').cut().back().find('.other').paste(); // move element
```

### Mark / getMark

```javascript
dom()
  .add({ class: 'container' })
  .mark('root')
  .enter()
  .add({ class: 'sidebar' })
  .enter()
  .add({ tag: 'nav', text: 'Menu' })
  .getMark('root')
  .add({ class: 'content', text: 'Main' });
```

---

## API Reference

### `dom(root?)`

| Argument | Description |
|----------|-------------|
| *(none)* | Targets `document.body` |
| `HTMLElement` | Targets that element |
| `'selector'` | Targets all matching elements |
| `Document` | Targets `document.body` |
| `null` | Creates a `DocumentFragment` (off-DOM) |

---

### `.add(config, data?, options?)`

Adds elements to the current context. Default tag is `div`.

**Config formats:** object, array of objects, HTML string, JSON string.

**Config properties:**

| Property | Type | Description |
|----------|------|-------------|
| `tag` | string | HTML tag (default: `'div'`) |
| `class` | string | CSS classes |
| `id` | string | Element ID |
| `text` | string | Text content |
| `html` | string | HTML content (sanitized) |
| `value` | string | Value for form elements |
| `attrs` | object | HTML attributes |
| `styles` | object | CSS styles |
| `dataset` | object | `data-*` attributes |
| `events` | object | Event handlers `{ click: fn }` |
| `children` | array | Nested elements |

When `data` is an **array**, creates one copy per item, each filled:

```javascript
dom('.list').add(
  { tag: 'li', 'data-key': 'name' },
  [{ name: 'Alice' }, { name: 'Bob' }]
);
```

**Options:** `{ clearMissing: true }` — resets form fields not in `data`.

---

### `.set(props, data?, options?)`

Updates properties on current elements.

| Property | Type | Description |
|----------|------|-------------|
| `text` | string | Sets `textContent` |
| `html` | string | Sets `innerHTML` |
| `class` | string | Sets `className` (or class modifier) |
| `id` | string | Sets `id` |
| `style` | object | Merges CSS styles |
| `attr` | object | Sets attributes |
| `dataset` | object | Sets `data-*` attributes |

**Class modifiers** — prefix with `+`, `-`, or `!`:

```javascript
dom('.card').set({ class: '+active' });         // add
dom('.card').set({ class: '-hidden' });          // remove
dom('.card').set({ class: '!visible' });         // toggle
dom('.card').set({ class: '+active -old !new' }); // combined
```

---

### `.fill(data, options?)`

Fills existing elements with data. Finds targets by `data-key` → `name` → `id`.

- Non-form elements: sets `textContent`
- Form elements: sets `value` (smart radio/checkbox/select)
- Nested objects: recurses into `[data-container]` elements
- Array data: distributes `data[i]` → `currentElements[i]`

```javascript
dom('.card').fill({ title: 'Hello', subtitle: 'World' });
dom('.root').fill({ name: 'John', address: { city: 'NYC' } });
```

---

### `.get(arg?)`

Reads elements or data from the current context.

| Argument | Returns |
|----------|---------|
| *(none)* | Array of DOM elements |
| `number` | Single element by index (negative = from end) |
| `'flat'` | Array of flat key-value objects |
| `'nested'` | Array of nested objects (respects `data-container`) |
| `{ mode: 'form' }` | Array of form data objects |

**`get('nested')` ↔ `fill()` are symmetric** — collected data can be written back:

```javascript
const data = dom('.root').get('nested')[0];
dom('.root').fill(data);  // idempotent round-trip
```

<details>
<summary>Form mode options</summary>

| Option | Default | Description |
|--------|---------|-------------|
| `mode` | — | `'form'` to activate form reading |
| `selector` | `'input,select,textarea'` | CSS selector for form elements |
| `keyAttr` | `'name'` | Attribute to use as data key |
| `includeDisabled` | `false` | Include disabled fields |
| `excludeEmpty` | `false` | Skip empty fields |
| `includeButtons` | `false` | Include `<button>` elements |
| `handleDuplicates` | `'array'` | `'array'`, `'first'`, `'last'`, `'error'` |
| `fileHandling` | `'names'` | `'names'`, `'meta'`, `'none'` |
| `exclude` | `{}` | `{ classes, ids, names, types, data }` |
| `transformKey` | `null` | `fn(key) => newKey` |
| `transformValue` | `null` | `fn(value, el) => newValue` |

</details>

---

### Navigation

#### `.enter(index?)`

Moves context to children.

| Argument | Behavior |
|----------|----------|
| *(none)* | Enter last added, or all children |
| `number` | Child at index (negative = from end) |
| `'selector'` | Direct children matching selector only |

> **`enter('selector')` vs `find('selector')`** — `enter` checks only direct children; `find` searches all descendants.

#### `.up(selector?)`

Moves to parent(s).

| Argument | Behavior |
|----------|----------|
| *(none)* | Direct parent |
| `number` | Go up N levels |
| `-1` | Topmost parent (up to `body`) |
| `'selector'` | Closest ancestor matching selector |

#### `.back(steps?)`

Restores previous context from history stack. Each call **consumes** the history entry (true stack pop).

| Argument | Behavior |
|----------|----------|
| *(none)* or `1` | One step back |
| `number` | N steps back |

If context is empty (after `.delete()`/`.cut()`), `.back()` restores parent elements.

#### `.find(selector)`

Selects descendants via `querySelectorAll`. `'*'` = direct children only.

---

### Marks

#### `.mark(name)` / `.getMark(name)`

Save and restore named contexts. `'root'` mark is auto-created on instantiation.

```javascript
dom().add({ class: 'deep' }).enter().enter().getMark('root'); // back at body
```

If `lastAdded` is non-empty, `.mark()` saves those; otherwise saves `currentElements`.

---

### Clipboard

#### `.copy()` / `.paste(position?)` / `.cut()`

All operations **preserve form state** (input values, checked state, select options).

| Method | Description |
|--------|-------------|
| `.copy()` | Clones current elements to buffer |
| `.cut()` | Removes from DOM, stores originals in buffer |
| `.paste(pos?)` | Pastes from buffer. Sets `lastAdded` to pasted elements |

**Paste positions:** `'append'`/`'end'` (default), `'prepend'`/`'start'`, `'before'`, `'after'`, `number`.

#### `.duplicate(position?)`

Clones and inserts next to original. Sets `lastAdded`. Positions: `'append'` (default), `'prepend'`.

#### `.delete()`

Removes current elements from DOM. Use `.back()` to navigate to parents.

---

### Events

#### `.on(event, handler, ...args)` / `.off(event, handler?)`

Targets `lastAdded` if available, otherwise `currentElements`. This lets you chain `.add().on()`:

```javascript
dom(container)
  .add({ tag: 'button', text: 'Delete' })
  .on('click', onDelete)     // attached to the button, not the container
  .add({ tag: 'button', text: 'Add' })
  .on('click', onAdd);       // attached to this button
```

`.off()` without handler removes all handlers for that event.

---

### Sync

#### `.sync(key, options?)` / `.unsync(key)`

Bidirectional DOM ↔ storage sync. Fills DOM on init, writes on `input`/`change` with debounce.

| Option | Default | Description |
|--------|---------|-------------|
| `storage` | `'local'` | `'local'`, `'session'`, `'indexeddb'` |
| `debounce` | `300` | Debounce delay (ms) |
| `mode` | `'nested'` | `'nested'` or `'flat'` |
| `onSync` | `null` | Callback `fn(data)` after each write |

---

### Debug

#### `.debug(mode?)`

| Argument | Behavior |
|----------|----------|
| *(none)* | Print state snapshot to console |
| `'steps'` | Enable logging for every method call |
| `false` | Disable step logging |

> Step logging is disabled when `process.env.NODE_ENV === 'production'`.

---

## Build

```bash
npm run build
```

| Output | Size |
|--------|------|
| `dist/index.js` | ~50 KB (ESM) |
| `dist/index.min.js` | ~22 KB / **~6.5 KB gzipped** (ESM) |
| `dist/index.umd.js` | ~23 KB (UMD) |
| `dist/index.d.ts` | TypeScript declarations |

## Testing

```bash
npm test                # 376 tests across 26 suites
npm run test:watch      # watch mode
npm run test:coverage   # coverage report
```

## License

MIT — [ermkon](https://github.com/ermkon)