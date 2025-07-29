# dom-unify
A JavaScript library for manipulating the DOM with a chainable, intuitive API. It simplifies creating, modifying, and navigating DOM elements.

## Installation

```bash
npm install dom-unify
```

## Usage

Import and use the `dom` function to start manipulating the DOM:

```javascript
import { dom } from 'dom-unify';

const root = document.getElementById('root');

dom(root)
  .add({ tag: 'div', class: 'item', text: 'Item 1' })
  .add({ tag: 'div', class: 'item', text: 'Item 2' })
  .find('.item')
  .set({ style: { color: 'blue' } })
  .copy()
  .back()
  .paste('prepend');
```

This example:
1. Adds two `<div>` elements with class `item` and text content to the `root` element.
2. Finds all `.item` elements.
3. Sets their text color to blue.
4. Copies them to a buffer.
5. Goes back to the `root` context.
6. Pastes the copied elements at the start of `root`.

Resulting DOM:
```html
<div id="root">
  <div class="item" style="color: blue;">Item 1</div>
  <div class="item" style="color: blue;">Item 2</div>
  <div class="item" style="color: blue;">Item 1</div>
  <div class="item" style="color: blue;">Item 2</div>
</div>
```

## API

### `dom(root)`

Creates a `DomUnify` instance with an initial context (`root`).

- **Arguments**:
  - `root` (optional): An `HTMLElement`, `Document`, `NodeList`, array of elements, or omitted (defaults to `document.body`).
- **Returns**: `DomUnify` instance for chaining.

**Examples**:
```javascript
// Single element
dom(document.getElementById('root')).add({ tag: 'div', text: 'Hello' });

// Multiple elements
dom(document.querySelectorAll('.item')).set({ text: 'Updated' });

// Document
dom(document).add({ tag: 'div', text: 'Added to body' });

// Default (body)
dom().add({ tag: 'div', text: 'Added to body' });
```

### `.add(config)`

Adds new elements to the current context.

- **Arguments**:
  - `config`: Object, array of objects, JSON string, or HTML string.
    - Object: `{ tag: 'div', class: 'name', id: 'id', text: 'text', html: 'html', attrs: {}, styles: {}, dataset: {}, events: {}, children: [] }`.
    - Array: Multiple elements via array of config objects.
    - JSON: Parsed as object or array.
    - HTML: Sanitized (removes `<script>` and `on*` attributes).
- **Returns**: `DomUnify` instance.

**Examples**:
```javascript
// Single element
dom(root).add({ tag: 'div', class: 'card', text: 'Card' });

// Multiple elements
dom(root).add([
  { tag: 'div', text: 'Item 1' },
  { tag: 'div', text: 'Item 2' }
]);

// Nested elements
dom(root).add({
  tag: 'div',
  class: 'card',
  children: [{ tag: 'button', text: 'Click' }]
});

// HTML string
dom(root).add('<div class="card">HTML Card</div>');
```

### `.set(props)`

Modifies properties of all elements in the current context.

- **Arguments**:
  - `props`: Object with properties to set:
    - `text`: Sets `textContent`.
    - `html`: Sets `innerHTML`.
    - `class`: Sets `className`.
    - `id`: Sets `id`.
    - `style`: Applies styles via `Object.assign`.
    - `attr`: Sets attributes via `setAttribute`.
    - `dataset`: Sets `dataset` properties.
- **Returns**: `DomUnify` instance.

**Example**:
```javascript
dom(root)
  .find('.card')
  .set({
    text: 'New Text',
    class: 'card card--new',
    style: { background: 'red' },
    attr: { 'data-id': '123' }
  });
```

### `.find(selector)`

Selects elements matching the selector within the current context.

- **Arguments**:
  - `selector`: CSS selector or `'*'` for all children.
- **Returns**: `DomUnify` instance with matched elements as the new context.

**Example**:
```javascript
dom(root).find('.item').set({ text: 'Found' });
```

### `.enter(index?)`

Moves the context to child elements.

- **Arguments**:
  - `index` (optional): Index of child element (supports negative indices). If omitted, uses last added elements or all children.
- **Returns**: `DomUnify` instance.

**Example**:
```javascript
dom(root)
  .add({ tag: 'div', class: 'box' })
  .enter() // Moves to .box
  .add({ tag: 'span', text: 'Inside' });
```

### `.back(arg?)`

Moves the context to parent elements or elements matching a selector.

- **Arguments**:
  - `arg` (optional): Number of levels to go up (default: 1) or a CSS selector.
- **Returns**: `DomUnify` instance.

**Example**:
```javascript
dom(root)
  .find('.item')
  .back() // Moves to parent
  .add({ tag: 'div', text: 'Sibling' });
```

### `.copy()`

Copies all elements in the current context to a buffer.

- **Returns**: `DomUnify` instance.

**Example**:
```javascript
dom(root).find('.item').copy().back().paste();
```

### `.paste(position?)`

Pastes elements from the buffer into the current context.

- **Arguments**:
  - `position` (optional): `'append'` (default), `'prepend'`, or a number (index, supports negative).
- **Returns**: `DomUnify` instance.

**Example**:
```javascript
dom(root).find('.item').copy().back().paste('prepend');
```

### `.duplicate(position?)`

Duplicates elements in the current context and inserts them next to the originals.

- **Arguments**:
  - `position` (optional): `'append'` (default) or `'prepend'`.
- **Returns**: `DomUnify` instance.

**Example**:
```javascript
dom(root).find('.item').duplicate('prepend');
```

### `.delete()`

Removes all elements in the current context and stores their parents.

- **Returns**: `DomUnify` instance with empty context.

**Example**:
```javascript
dom(root).find('.item').delete();
```

### `.cut()`

Removes elements from the DOM and copies them to the buffer.

- **Returns**: `DomUnify` instance with empty context.

**Example**:
```javascript
dom(root).find('.item').cut().back().paste();
```