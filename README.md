# dom-unify

[![npm version](https://img.shields.io/npm/v/dom-unify.svg)](https://www.npmjs.com/package/dom-unify)
[![npm downloads](https://img.shields.io/npm/dm/dom-unify.svg)](https://www.npmjs.com/package/dom-unify)
[![bundle size](https://img.shields.io/bundlephobia/minzip/dom-unify)](https://bundlephobia.com/package/dom-unify)
[![license](https://img.shields.io/npm/l/dom-unify.svg)](https://opensource.org/licenses/MIT)

Chainable library that unifies all DOM operations into one fluent API.
Context navigation with history and marks, nested data-binding for objects and forms,
unique clipboard (copy/paste subtrees preserving all input, checkbox, select values), builder and utilities.

No frameworks. No VDOM. Just plain JS — 3–5× faster to build complex interfaces, admin panels, configurators and browser extensions.

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

Modern browsers: **Chrome 80+**, **Firefox 72+**, **Safari 13.1+**, **Edge 80+**. No polyfills required.

The build output uses optional chaining (`?.`) and nullish coalescing (`??`), which sets the minimum browser floor.

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

Navigation methods (`.enter()`, `.up()`, `.find()`) push the previous context onto a stack. Use `.back()` to restore it.

### Marks

`.mark(name)` saves the current context by name. `.getMark(name)` restores it instantly. Works within the same chain instance.

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

### Dynamic Interface with Events

`.on()` targets the last added element — no need to `.enter()` and `.back()`:

```javascript
function addItem(e) {
  dom(e.target)
    .up('.list')
    .add({ class: 'item', text: 'New item' });
}

function removeItem(e) {
  dom(e.target).up('.item').delete();
}

dom()
  .add({ class: 'list' })
  .enter()
  .add({ tag: 'button', text: 'Add' })
  .on('click', addItem)              // attached to the button, not the list
  .add({ class: 'item', text: 'First item' })
  .enter()
  .add({ tag: 'button', text: '×' })
  .on('click', removeItem);
```

### Fill and Collect Nested Data

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

// Collect back
const data = dom('.user-card').get('nested');
// [{ name: 'Alice', role: 'Admin', address: { city: 'NYC', zip: '10001' } }]
```

### Create Multiple Elements from Array

```javascript
const itemConfig = {
  tag: 'div', class: 'card',
  children: [
    { tag: 'h3', 'data-key': 'title' },
    { tag: 'p', 'data-key': 'desc' }
  ]
};

dom('.list').add(itemConfig, [
  { title: 'Card 1', desc: 'First card' },
  { title: 'Card 2', desc: 'Second card' },
  { title: 'Card 3', desc: 'Third card' }
]);
// Creates 3 .card elements, each filled with its data
```

### Form: Fill and Read

```javascript
dom()
  .add({ tag: 'form', class: 'login' })
  .enter()
  .add({ tag: 'input', attrs: { name: 'email', type: 'email' } })
  .add({ tag: 'input', attrs: { name: 'password', type: 'password' } })
  .add({ tag: 'button', text: 'Submit' })
  .on('click', (e) => {
    e.preventDefault();
    const data = dom('.login').get({ mode: 'form' });
    console.log(data); // [{ email: '...', password: '...' }]
  });

// Pre-fill from code
dom('.login').fill({ email: 'user@example.com' });
```

### Copy / Paste

```javascript
dom()
  .add({ class: 'source' })
  .enter()
  .add({ class: 'widget', text: 'Clone me' })
  .copy()
  .up()
  .add({ class: 'target' })
  .enter()
  .paste()
  .paste();
```

Result: `.target` gets two copies of `.widget`.

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
  .add({ class: 'content', text: 'Main area' });
```

`.getMark('root')` jumps back to `.container` — no matter how deep you navigated.

Note: `.getMark()` does **not** push to navigation history, so `.back()` cannot undo it.

---

## API Reference

### `dom(root?)`

Creates a new instance.

| Argument | Description |
|----------|-------------|
| *(none)* | Targets `document.body` |
| `HTMLElement` | Targets that element |
| `'selector'` | Targets all matching elements |
| `Document` | Targets `document.body` |
| `null` | Creates a `DocumentFragment` (off-DOM) |
| `DocumentFragment` | Targets that fragment |
| `NodeList` or `Element[]` | Targets all elements in the list |

```javascript
dom()                          // body
dom('.card')                   // all elements with class "card"
dom(document.getElementById('app'))  // specific element
dom(null)                      // DocumentFragment (off-DOM)
dom(document.querySelectorAll('.item'))  // NodeList
```

---

### `.add(config, data?, options?)`

Adds elements to the current context. Default tag is `div`.

**Config formats:**

| Format | Example |
|--------|---------|
| Object | `{ tag: 'p', class: 'text', text: 'Hello' }` |
| Array | `[{ tag: 'li', text: 'A' }, { tag: 'li', text: 'B' }]` |
| HTML string | `'<p>Hello</p>'` |
| JSON string | `'{"tag":"p","text":"Hello"}'` |
| With children | `{ class: 'list', children: [{ tag: 'li', text: 'Item' }] }` |

**Config object properties:**

| Property | Type | Description |
|----------|------|-------------|
| `tag` | string | HTML tag (default: `'div'`) |
| `class` | string | CSS classes |
| `id` | string | Element ID |
| `text` | string | Text content |
| `html` | string | HTML content (sanitized by default) |
| `value` | string | Value for form elements |
| `attrs` | object | HTML attributes |
| `styles` | object | CSS styles |
| `dataset` | object | `data-*` attributes |
| `events` | object | Event handlers `{ click: fn }` |
| `children` | array | Nested elements |

**Data parameter** — when `data` is an object, fills form inputs by `name` (existing behavior):

```javascript
dom('.form').add(
  { tag: 'input', attrs: { name: 'city', type: 'text' } },
  { city: 'Moscow' }
);
```

When `data` is an **array**, creates one copy of the config per array item, each filled with its data:

```javascript
dom('.list').add(
  { tag: 'div', class: 'item', children: [{ tag: 'span', 'data-key': 'name' }] },
  [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }]
);
// Creates 3 .item divs. Empty array [] creates nothing.
```

**Options:** `{ clearMissing: true }` — resets form fields not present in `data`.

```javascript
// Simple
dom().add({ class: 'box', text: 'Hello' });

// Multiple
dom().add([
  { tag: 'p', text: 'One' },
  { tag: 'p', text: 'Two' }
]);

// Nested
dom().add({
  class: 'card',
  children: [
    { tag: 'h2', text: 'Title' },
    { tag: 'p', text: 'Body' }
  ]
});

// HTML
dom().add('<ul><li>Item</li></ul>');

// With styles
dom().add({ tag: 'button', text: 'Click', styles: { color: 'white', background: 'blue' } });
```

---

### `.set(props, data?, options?)`

Updates properties of all elements in the current context.

| Property | Type | Description |
|----------|------|-------------|
| `text` | string | Sets `textContent` |
| `html` | string | Sets `innerHTML` (sanitized: `<script>`, `on*` removed) |
| `class` | string | Sets `className` (or class modifier, see below) |
| `id` | string | Sets `id` |
| `style` | object | Merges CSS styles |
| `attr` | object | Sets attributes |
| `dataset` | object | Sets `data-*` attributes |

**Class modifiers** — prefix with `+`, `-`, or `!` to add, remove, or toggle classes:

```javascript
dom('.card').set({ class: '+active' });        // classList.add('active')
dom('.card').set({ class: '-hidden' });        // classList.remove('hidden')
dom('.card').set({ class: '!visible' });       // classList.toggle('visible')
dom('.card').set({ class: '+active -old !new' }); // multiple in one call
dom('.card').set({ class: 'btn primary' });    // replace (no prefix = full replace)
```

**Data parameter** — fills form inputs by `name` (same as `.add()`).

```javascript
// Set text
dom('.title').set({ text: 'Updated' });

// Set multiple props
dom('.card').set({
  class: 'card active',
  style: { background: '#f0f0f0', border: '1px solid #ccc' },
  attr: { 'data-id': '42' }
});

// Fill form
dom('.form').set({}, { username: 'Alice', role: 'admin' });

// Fill + clear missing fields
dom('.form').set({}, { username: 'Alice' }, { clearMissing: true });
```

---

### `.fill(data, options?)`

Fills existing elements with data. Finds targets by `data-key` → `name` → `id`.

For **non-form elements** (`span`, `h3`, etc. with `data-key`): sets `textContent`.
For **form elements** (`input`, `select`, `textarea`): sets `value` (smart handling for radios, checkboxes, multi-selects).

```javascript
// Flat fill
dom('.card').fill({ title: 'Hello', subtitle: 'World' });

// Nested fill via data-container
dom('.root').fill({
  name: 'John',
  address: { city: 'NYC', zip: '10001' }  // fills inside [data-container="address"]
});

// Array distribution: fills currentElements[i] with data[i]
dom('.item').fill([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
```

**Key resolution order:** `data-key` → `name` → `id`.

**Nesting:** if a data value is an object and a `[data-container]` with the matching name exists, `.fill()` recurses into it. Regular `div` wrappers without `data-container` are transparent.

**Array values of objects throw an error** — use `.add(config, array)` to create repeated elements.

---

### `.get(arg?)`

Reads elements or form data from the current context.

| Argument | Returns |
|----------|---------|
| *(none)* | Array of current DOM elements |
| `number` | Single element by index (supports negative) |
| `'flat'` | Array of flat key-value objects (data-key → name → id) |
| `'nested'` | Array of nested objects (respects `data-container` hierarchy) |
| `{ mode: 'form' }` | Array of form data objects |
| `{ mode: 'flat' }` | Same as `'flat'` with extra options |
| `{ mode: 'nested' }` | Same as `'nested'` with extra options |

```javascript
// Get DOM elements
const elements = dom('.card').get();       // [HTMLElement, HTMLElement, ...]
const first = dom('.card').get(0);         // HTMLElement
const last = dom('.card').get(-1);         // HTMLElement

// Flat: collects all data-key/name/id elements as flat key-value pairs
const flat = dom('.card').get('flat');
// [{ title: 'Hello', email: 'test@test.com' }]

// Nested: respects data-container hierarchy
const nested = dom('.root').get('nested');
// [{ name: 'John', address: { city: 'NYC', zip: '10001' } }]

// Multiple siblings with same data-container → array:
// [{ items: [{ val: 'A' }, { val: 'B' }] }]

// Read form data
const data = dom('.form').get({ mode: 'form' });
// [{ email: 'user@test.com', password: '123' }]
```

**Symmetry:** `dom(el).get('nested')` collects data that `.fill()` can write back:
```javascript
const data = dom('.root').get('nested')[0];
dom('.root').fill(data);  // idempotent round-trip
```

**Form mode options:**

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

---

### `.enter(index?)`

Moves context to child elements.

| Argument | Behavior |
|----------|----------|
| *(none)* | Enter last added elements; or all children if nothing was added |
| `number` | Enter child at index (supports negative) |
| `'selector'` | Enter direct children matching CSS selector |

`.enter('selector')` only checks **direct children** — unlike `.find()` which searches all descendants.

```javascript
// Enter last added
dom().add({ class: 'box' }).enter().add({ tag: 'p', text: 'Inside' });

// Enter by index
dom('.list').enter(0);    // first child
dom('.list').enter(-1);   // last child

// Enter by selector (direct children only)
dom('.container').enter('.item');    // only direct .item children
dom('.container').enter('span');     // only direct span children

// Enter all children (when nothing was added since last navigation)
dom('.container').enter();
```

---

### `.up(selector?)`

Moves context to parent elements.

| Argument | Behavior |
|----------|----------|
| *(none)* | Direct parent |
| `number` | Go up N levels |
| `-1` or negative | Go to topmost parent (up to `body`) |
| `'selector'` | Closest ancestor matching selector |

```javascript
dom('.deep-child').up();            // parent
dom('.deep-child').up(2);           // grandparent
dom('.deep-child').up(-1);          // body
dom('.deep-child').up('.container'); // closest .container ancestor
```

---

### `.back(steps?)`

Restores a previous context from the navigation history.

| Argument | Behavior |
|----------|----------|
| *(none)* or `1` | Go back one step |
| `number` | Go back N steps |
| negative | Go to history index from start |

Special: if current context is empty (after `.delete()` or `.cut()`), `.back()` restores parent elements.

```javascript
dom().add({ class: 'a' }).enter().back();        // back to body
dom().add({ class: 'a' }).enter()
  .add({ class: 'b' }).enter().back(2);          // back to body

dom('.item').delete().back();                      // restores parent of deleted element
```

---

### `.find(selector)`

Selects descendants matching `selector` within the current context.

| Argument | Behavior |
|----------|----------|
| CSS selector | `querySelectorAll` on each current element |
| `'*'` | All direct children |
| *(none)* | Clears context (empty selection) |

Use `.back()` to return to previous context.

```javascript
dom('.container').find('.item');          // all .items inside .container
dom('.container').find('*');             // direct children only
dom('.container').find('input[type=text]'); // text inputs
```

---

### `.mark(name)` / `.getMark(name)`

Save and restore named contexts within the same instance.

```javascript
dom()
  .add({ class: 'header' }).mark('header')
  .add({ class: 'main' }).mark('main')
  .add({ class: 'footer' }).mark('footer')
  .getMark('main')
  .add({ tag: 'h1', text: 'Welcome' });
```

A `'root'` mark is created automatically when `dom()` is instantiated.

```javascript
dom().add({ class: 'deep' }).enter().enter().getMark('root');
// back at body
```

Note: marks are overwritten if the same name is used again.

---

### `.copy()` / `.paste(position?)` / `.cut()`

Clipboard operations within the instance. All clone operations **preserve form state** (input values, checkbox/radio checked state, select options).

**`.copy()`** — clones current elements to buffer (with form state).

**`.paste(position?)`** — pastes cloned elements from buffer. Sets `lastAdded` to the pasted elements.

| Position | Behavior |
|----------|----------|
| *(none)* or `'append'` or `'end'` | Append inside at end |
| `'prepend'` or `'start'` | Insert inside at beginning |
| `'before'` | Insert before the current element (as sibling) |
| `'after'` | Insert after the current element (as sibling) |
| `number` | Insert at index (supports negative) |

**`.cut()`** — removes elements from DOM and copies them to buffer (originals, not clones). Sets context to empty; use `.back()` to get to parent.

```javascript
// Copy + paste
dom('.widget').copy().up('.target').paste();

// Paste at position
dom('.widget').copy().up('.container').paste('prepend');
dom('.widget').copy().up('.container').paste(1);

// Paste before/after (as sibling)
dom('.source').copy();
dom('.target').paste('before');  // inserts before .target
dom('.target').paste('after');   // inserts after .target

// Chain with pasted elements
dom('.widget').copy().up().paste().on('click', handler);

// Cut + paste (move element)
dom('.item').cut().back().find('.other-list').paste();
```

---

### `.duplicate(position?)`

Clones each element in the current context and inserts the clone next to the original. **Preserves form state.** Sets `lastAdded` to the cloned elements.

| Position | Behavior |
|----------|----------|
| *(none)* or `'append'` | Clone after original |
| `'prepend'` | Clone before original |

```javascript
dom('.card').duplicate();            // clone after each .card
dom('.card').duplicate('prepend');   // clone before each .card

// Chain with duplicated elements
dom('.item').duplicate().enter().set({ class: '+copy' });
```

---

### `.delete()`

Removes all elements in the current context from the DOM. Use `.back()` to navigate to parents.

```javascript
dom('.old-item').delete();
dom('.old-item').delete().back().add({ class: 'new-item', text: 'Replaced' });
```

---

### `.on(event, handler, ...args)` / `.off(event, handler?)`

Event management.

**`.on()`** and **`.off()`** target `lastAdded` if available, otherwise `currentElements`. This lets you chain `.add().on()` without `.enter()`:

```javascript
dom(container)
  .add({ tag: 'button', text: 'Delete' })
  .on('click', onDelete)    // attached to the button
  .add({ tag: 'button', text: 'Add' })
  .on('click', onAdd);      // attached to the second button
```

```javascript
// With extra args
function handle(label, e) { console.log(label, e.target); }
dom('.btn').on('click', handle, 'Button:');

// Handler as global function name (string)
dom('.btn').on('click', 'onButtonClick');

// Remove specific handler
dom('.btn').off('click', handle);

// Remove all click handlers
dom('.btn').off('click');
```

---

### `.debug(mode?)`

Debugging tool. Prints internal state or enables step-by-step logging.

| Argument | Behavior |
|----------|----------|
| *(none)* | Prints current state snapshot to console |
| `'steps'` | Enables logging for every subsequent method call |
| `false` | Disables step logging |

> **Note:** Step logging is automatically disabled when `process.env.NODE_ENV === 'production'`.

```javascript
// Print state once
dom('.card').debug();

// Enable step logging for the whole chain
dom('.container')
  .debug('steps')
  .add({ tag: 'p', text: 'Hello' })
  .enter()
  .set({ class: '+active' });
```

---

## Chaining Summary

All methods return `this` — you can chain everything:

```javascript
dom()
  .add({ tag: 'header' })
  .enter()
  .add({ tag: 'h1', text: 'Site' })
  .add({ tag: 'nav' })
  .enter()
  .add({ tag: 'a', text: 'Home', attrs: { href: '#' } })
  .add({ tag: 'a', text: 'About', attrs: { href: '#about' } })
  .up()
  .up()
  .add({ tag: 'main' })
  .enter()
  .add({ tag: 'p', text: 'Welcome' })
  .up()
  .add({ tag: 'footer', text: '© 2026' });
```

## Build

```bash
npm run build           # outputs ESM, ESM minified, UMD to dist/
```

| Output | Size |
|--------|------|
| `dist/index.js` | ~50 KB (ESM) |
| `dist/index.min.js` | ~22 KB / **~6.5 KB gzipped** (ESM) |
| `dist/index.umd.js` | ~23 KB (UMD) |
| `dist/index.d.ts` | TypeScript declarations |

## Testing

```bash
npm test                # run all tests
npm run test:watch      # watch mode
npm run test:coverage   # coverage report
```

## License

MIT License

Copyright (c) 2025 [ermkon](https://github.com/ermkon)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.