# Design: `.get()`, `.set()`, `.fill()`, `.add()` — Nested Data

## Core Problem

Build nested DOM structures (root → level1 → level2 → level3) and:
1. **Fill** with nested JSON data automatically
2. **Collect** back into matching nested JSON
3. Keep the API dead simple — no framework complexity

### The User's Workflow (Before)

```
addBlock1(root, data):
  create block1 in root, fill inputs with data
  data.children.forEach(child =>
    addBlock2(block1, child):
      create block2 in block1, fill inputs
      child.items.forEach(item =>
        addBlock3(block2, item):
          create block3, fill inputs
      )
  )
```

3-4 custom functions. Goal: replace with `.add()` + `.fill()`.

---

## Design Principles

1. **One concept per method** — no overloaded meaning
2. **`data-*` attributes as the bridge** between DOM and JSON
3. **Recursive by default** — nested data → nested DOM, automatically
4. **Convention over configuration** — sensible defaults, zero config needed

---

## Key Convention: `data-key` and `data-container`

```html
<!-- data-key identifies a value holder (input, span, div with text) -->
<input data-key="email" name="email">
<span data-key="label">Text here</span>

<!-- data-container identifies a structural group (maps to a JSON key) -->
<div data-container="address">
  <input data-key="city">
  <input data-key="zip">
</div>
```

**Key resolution order** (for finding element keys):
1. `data-key` — explicit, preferred
2. `name` — standard for form inputs
3. `id` — fallback
4. Skip element if no key found

**Container detection**: `[data-container]` attribute.

---

## `.get()` — Data Collection

### Current API (unchanged)
```js
.get()              // → [el1, el2, ...] (raw elements)
.get(n)             // → element at index (supports negative)
.get({ mode: 'form' })  // → flat form data [{key: val}]
```

### New: String shorthand
```js
.get('flat')        // same as .get({ mode: 'flat' })
.get('nested')      // same as .get({ mode: 'nested' })
```

### Mode: `'flat'`

Collects flat key-value pairs from inputs within each context element.
Returns array — one object per context element.

```html
<div class="card">
  <input name="title" value="Hello">
  <input name="count" value="5">
</div>
```
```js
dom('.card').get('flat')
// → [{ title: "Hello", count: "5" }]
```

Key resolution: `data-key` → `name` → `id`.
Includes: `input, select, textarea, [data-key]`.

### Mode: `'nested'`

Walks the DOM tree. Respects `data-container` hierarchy.
Returns array — one nested object per context element.

```html
<div class="root">
  <input data-key="name" value="John">
  <div data-container="address">
    <input data-key="city" value="NYC">
    <input data-key="zip" value="10001">
  </div>
</div>
```
```js
dom('.root').get('nested')
// → [{ name: "John", address: { city: "NYC", zip: "10001" } }]
```

**Array grouping**: Multiple siblings with same `data-container` value become an array:

```html
<div class="root">
  <div data-container="items">
    <input data-key="val" value="A">
  </div>
  <div data-container="items">
    <input data-key="val" value="B">
  </div>
</div>
```
```js
dom('.root').get('nested')
// → [{ items: [{ val: "A" }, { val: "B" }] }]
```

**Non-input values**: Elements with `data-key` but no `.value` property use `textContent`:

```html
<span data-key="label">Status: OK</span>
```
→ `{ label: "Status: OK" }`

**Container own data**: Containers can have data-* attributes stored in a `_data` key:

```html
<div data-container="user" data-time="2023" data-role="admin">
  <input data-key="name" value="John">
</div>
```
```js
// → { user: { name: "John", _data: { time: "2023", role: "admin" } } }
```

### Default options for modes:

```js
DomUnify.config.modes.flat = {
  selector: 'input,select,textarea,[data-key]',
  keyAttr: 'auto',           // data-key → name → id
  includeDisabled: false,
  excludeEmpty: false,
  handleDuplicates: 'array',
};

DomUnify.config.modes.nested = {
  containerSelector: '[data-container]',
  containerKeyAttr: 'dataset.container',
  inputSelector: 'input,select,textarea,[data-key]',
  keyAttr: 'auto',           // data-key → name → id
  includeDisabled: false,
  collectContainerData: true, // include _data from container's dataset
  excludeEmpty: false,
};
```

Users can override globally: `DomUnify.config.modes.nested.excludeEmpty = true;`

---

## `.fill()` — New Method (Data → DOM)

Separated from `.set()` for clarity:
- **`.set(props)`** — set DOM properties (text, html, class, style, attr, dataset)
- **`.fill(data, options)`** — fill elements with data (inputs, text nodes, containers)

### Flat fill

Match data keys to elements by `data-key` / `name` / `id`:

```js
dom('.form').fill({ name: 'John', email: 'john@test.com' });
```

For inputs: sets `.value`.
For non-inputs with `data-key`: sets `.textContent`.
For checkboxes/radios/selects: smart handling (same as current `_applyDataToElements`).

### Nested fill

If a data value is an **object** and a matching `[data-container]` exists, recurse into it:

```js
dom('.root').fill({
  name: 'John',
  address: { city: 'NYC', zip: '10001' }
});
```

Logic:
1. Find all direct inputs in context → match by key → fill
2. Find all `[data-container]` in context → match by container name
3. For each match: recurse fill into the container with the nested data

### Array fill (the key feature)

If a data value is an **array** and a matching `[data-container]` exists:
- Use the first matching container as a **template**
- Clone the template for each array item (beyond the first)
- Fill each clone with its data item

```html
<div class="root">
  <div data-container="items">
    <input data-key="title">
    <input data-key="value">
  </div>
</div>
```

```js
dom('.root').fill({
  items: [
    { title: 'Item A', value: '1' },
    { title: 'Item B', value: '2' },
    { title: 'Item C', value: '3' }
  ]
});
```

Result: 3 `[data-container="items"]` divs, each filled with its data.

### Deep nesting (the user's exact use case)

```html
<div class="root">
  <div data-container="blocks">
    <input data-key="name">
    <div data-container="sub">
      <input data-key="val">
    </div>
  </div>
</div>
```

```js
dom('.root').fill({
  blocks: [
    { name: 'Block 1', sub: [{ val: 'A' }, { val: 'B' }] },
    { name: 'Block 2', sub: [{ val: 'C' }] }
  ]
});
```

Result:
```html
<div class="root">
  <div data-container="blocks">
    <input data-key="name" value="Block 1">
    <div data-container="sub"><input data-key="val" value="A"></div>
    <div data-container="sub"><input data-key="val" value="B"></div>
  </div>
  <div data-container="blocks">
    <input data-key="name" value="Block 2">
    <div data-container="sub"><input data-key="val" value="C"></div>
  </div>
</div>
```

### Options

```js
.fill(data, {
  clearMissing: false,    // clear fields not in data
  keyAttr: 'auto',        // key resolution: 'auto' | 'name' | 'data-key'
  containerAttr: 'data-container',
  inputSelector: 'input,select,textarea,[data-key]',
})
```

### Symmetry: `.get('nested')` ↔ `.fill()`

The contract: `dom(el).fill(dom(el).get('nested')[0])` is idempotent.
What you collect with `.get('nested')` can be filled back with `.fill()`.

---

## `.set()` — DOM Properties (Enhanced)

Stays focused on **DOM properties** only. No data filling (that's `.fill()`).

### Current (unchanged)
```js
.set({ text: 'Hello', class: 'active', style: { color: 'red' } })
.set({ attr: { disabled: true }, dataset: { id: '5' } })
.set({ html: '<b>Bold</b>', id: 'main' })
```

### New: Class modifiers
```js
.set({ class: '+active' })    // addClass
.set({ class: '-active' })    // removeClass
.set({ class: '!active' })    // toggleClass
.set({ class: 'btn primary' }) // replace (current behavior)
```

Implementation: check first char of class value:
- `+` → `el.classList.add(rest)`
- `-` → `el.classList.remove(rest)`
- `!` → `el.classList.toggle(rest)`
- otherwise → `el.className = value` (current behavior)

Multiple classes: `.set({ class: '+active +visible' })` — split by space, apply each.

### New: Template interpolation
```js
.set({ text: 'Hello, ${name}!' }, { name: 'World' })
// → textContent = "Hello, World!"

.set({ html: '<b>${title}</b>' }, { title: 'News' })
// → innerHTML = "<b>News</b>"
```

Only `text` and `html` support `${key}` interpolation.
Second argument is the data object for substitution.
If key not found in data, `${key}` stays as-is (or becomes empty string — configurable).

### Combined with `.fill()`?

No. Keep them separate:
```js
dom('.card').set({ class: '+highlighted' })  // DOM properties
dom('.card').fill({ title: 'New Title' })    // data values
```

This is clearer than the current `.set(props, data, options)` overload.

---

## `.add()` — Element Creation (Enhanced)

### Current (unchanged)
```js
.add(configObject)        // create from config
.add(configObject, data)  // create + fill
.add(htmlString)          // create from HTML
.add(arrayOfConfigs)      // create multiple
.add(domUnifyInstance)    // clone from another instance
.add(domNode)             // clone existing node
```

### New: Array data = repeat

If `data` is an **array**, create the config element once per data item:

```js
dom('.list').add(
  { tag: 'div', class: 'item', children: [
    { tag: 'input', attrs: { 'data-key': 'name' } },
    { tag: 'input', attrs: { 'data-key': 'value' } }
  ]},
  [
    { name: 'Item 1', value: 'A' },
    { name: 'Item 2', value: 'B' },
    { name: 'Item 3', value: 'C' }
  ]
);
```

Result: 3 `.item` divs in `.list`, each filled with its data.

Implementation: if `Array.isArray(data)`, loop over data items, for each:
1. Create element from config
2. Call `.fill(item)` on the created element
3. Append to target

### New: Template support

```js
// Create template offscreen
const card = dom(null)
  .add({ tag: 'div', class: 'card', dataset: { container: 'card' } })
  .enter()
  .add({ tag: 'h3', dataset: { key: 'title' } })
  .add({ tag: 'input', attrs: { 'data-key': 'value' } })
  .toTemplate();

// Use locally
dom('.container').add(card, { title: 'Card 1', value: '100' });
dom('.container').add(card, [
  { title: 'Card 2', value: '200' },
  { title: 'Card 3', value: '300' }
]);

// Register globally
dom(null)
  .add({ tag: 'div', class: 'card' })
  .enter()
  .add({ tag: 'h3', dataset: { key: 'title' } })
  .template('card');

// Use by name
dom('.container').add('card', { title: 'Card 4', value: '400' });
```

**How `.add()` distinguishes strings:**
- If string matches a registered template name → use template
- If string contains `<` → treat as HTML
- If string starts with `{` or `[` → try JSON.parse
- Otherwise → treat as CSS selector (querySelectorAll + clone)

### New method: `.toTemplate()`

Returns a template object: `{ fragment: DocumentFragment }`.
The fragment stores the offscreen DOM tree created via chaining.

```js
const tmpl = dom(null)
  .add({ tag: 'div', class: 'widget' })
  .enter()
  .add({ tag: 'span', dataset: { key: 'label' } })
  .toTemplate();

// tmpl = { fragment: DocumentFragment }
```

### New method: `.template(name)`

Saves current structure as a named global template in `DomUnify.templates`.

```js
dom(null).add({...}).enter().add({...}).template('widget');
// DomUnify.templates.get('widget') now holds the fragment
```

---

## The User's Full Use Case — Solved

### Structure: Root → Block1[] → Block2[] → Block3[]

#### 1. Define templates

```js
const block3 = dom(null)
  .add({ tag: 'div', class: 'block3', dataset: { container: 'items' } })
  .enter()
  .add({ tag: 'input', attrs: { 'data-key': 'value', type: 'text' } })
  .toTemplate();

const block2 = dom(null)
  .add({ tag: 'div', class: 'block2', dataset: { container: 'children' } })
  .enter()
  .add({ tag: 'input', attrs: { 'data-key': 'label', type: 'text' } })
  .add({ tag: 'div', class: 'block3-container' })
  .toTemplate();

const block1 = dom(null)
  .add({ tag: 'div', class: 'block1', dataset: { container: 'blocks' } })
  .enter()
  .add({ tag: 'input', attrs: { 'data-key': 'name', type: 'text' } })
  .add({ tag: 'div', class: 'block2-container' })
  .toTemplate();
```

#### 2. Add with nested data

```js
dom('.root').add(block1, [
  {
    name: 'First Block',
    children: [
      { label: 'Sub A', items: [{ value: '1' }, { value: '2' }] },
      { label: 'Sub B', items: [{ value: '3' }] }
    ]
  },
  {
    name: 'Second Block',
    children: [
      { label: 'Sub C', items: [{ value: '4' }] }
    ]
  }
]);
```

#### 3. Collect back

```js
const data = dom('.root').get('nested');
// → [{
//   blocks: [
//     { name: 'First Block', children: [
//       { label: 'Sub A', items: [{ value: '1' }, { value: '2' }] },
//       { label: 'Sub B', items: [{ value: '3' }] }
//     ]},
//     { name: 'Second Block', children: [
//       { label: 'Sub C', items: [{ value: '4' }] }
//     ]}
//   ]
// }]
```

#### 4. Add single block manually + button

```js
// Button adds a block to root
dom('.add-btn').on('click', () => {
  dom('.root').add(block1);
});

// Button inside block1 adds sub-block
dom('.root').on('click', (e) => {
  if (e.target.matches('.add-sub-btn')) {
    dom(e.target).up('.block1').find('.block2-container').add(block2);
  }
});
```

---

## Summary: What Changes

| Method | Current | New |
|--------|---------|-----|
| `.get('flat')` | — | String shorthand for flat collection |
| `.get('nested')` | — | Recursive collection via `data-container` |
| `.fill(data)` | — | **New method**: recursive data → DOM |
| `.set(props)` | Works | + class modifiers (`+`, `-`, `!`) |
| `.set(props, data)` | Works | + `${key}` interpolation in text/html |
| `.add(config, arrayData)` | — | Repeat config for each array item |
| `.add(template, data)` | — | Clone template + fill |
| `.add('name', data)` | — | Use registered template by name |
| `.toTemplate()` | — | Returns template object |
| `.template('name')` | — | Registers global template |

### New methods: 3
- `.fill(data, options)` — data filling
- `.toTemplate()` — create template from chain
- `.template(name)` — register named template

### Changed methods: 3
- `.get()` — added string shorthand + 'nested' mode
- `.set()` — class modifiers + interpolation
- `.add()` — template support + array data repeat

### Unchanged: everything else
`enter()`, `up()`, `back()`, `find()`, `delete()`, `cut()`, `copy()`, `paste()`,
`duplicate()`, `mark()`, `getMark()`, `on()`, `off()`, `downloadFile()`, `loadFile()`

---

## Implementation Order

1. **`.fill()`** — core recursive fill logic (most value, enables everything)
2. **`.get('nested')`** — symmetric collection
3. **`.get('flat')`** — improved flat mode with string shorthand
4. **`.set()` class modifiers** — small, high-impact
5. **`.set()` interpolation** — small, useful
6. **`.add()` array data** — enables repeat creation
7. **`.toTemplate()` + `.template()`** — template system
8. **`.add()` template support** — uses templates in creation

---

## Not Included (Deferred)

These ideas from the notes are **not** part of this design. They can be added later separately:

- **`.fetch(url)`** — HTTP requests (separate concern, use native fetch)
- **`.animate()`** — CSS animations (separate concern, use CSS)
- **`.validate(rules)`** — Form validation (can be a plugin)
- **`.loop(n)`** — Repeat modifier (interesting but complex, revisit later)
- **`.replace(config)`** — Replace elements (can use `.delete().add()`)
- **`.watch()` / reactivity** — State management (framework territory)
- **Event delegation** — `.on(event, selector, handler)` (good idea, separate PR)
- **`.data()` / `.val()` shortcuts** — Not needed with `.fill()` and `.get()`
