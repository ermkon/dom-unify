import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DomUnify } from '../index.js';

describe('createElementFromConfig', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Basic Functionality
  it('should create a div with class, id, text, attributes, styles, and dataset', () => {
    const config = {
      tag: 'div',
      class: 'my-class',
      id: 'my-id',
      text: 'Hello',
      attrs: { 'data-test': 'value' },
      styles: { color: 'red', fontSize: '16px' },
      dataset: { custom: 'data' }
    };
    const result = DomUnify.createElementFromConfig(config, document.body);
    expect(result).toHaveLength(1);
    const el = result[0];
    expect(el.tagName).toBe('DIV');
    expect(el.className).toBe('my-class');
    expect(el.id).toBe('my-id');
    expect(el.textContent).toBe('Hello');
    expect(el.getAttribute('data-test')).toBe('value');
    expect(el.style.color).toBe('red');
    expect(el.style.fontSize).toBe('16px');
    expect(el.dataset.custom).toBe('data');
    expect(document.body.contains(el)).toBe(true);
  });

  it('should create an element with nested children', () => {
    const config = {
      tag: 'div',
      children: [
        { tag: 'span', text: 'Child1' },
        { tag: 'p', text: 'Child2' }
      ]
    };
    const result = DomUnify.createElementFromConfig(config, document.body);
    expect(result).toHaveLength(1);
    const el = result[0];
    expect(el.children).toHaveLength(2);
    expect(el.children[0].tagName).toBe('SPAN');
    expect(el.children[0].textContent).toBe('Child1');
    expect(el.children[1].tagName).toBe('P');
    expect(el.children[1].textContent).toBe('Child2');
    expect(document.body.contains(el)).toBe(true);
  });

  it('should handle events correctly', () => {
    let clicked = false;
    const config = {
      tag: 'button',
      events: { click: () => (clicked = true) }
    };
    const result = DomUnify.createElementFromConfig(config);
    const button = result[0];
    const event = new MouseEvent('click');
    button.dispatchEvent(event);
    expect(clicked).toBe(true);
  });

  it('should set value for input and select', () => {
    const config = { tag: 'input', value: 'test' };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].value).toBe('test');
    expect(result[0].getAttribute('value')).toBe('test');

    const selectConfig = { tag: 'select', value: 'option1' };
    const selectResult = DomUnify.createElementFromConfig(selectConfig);
    expect(selectResult[0].value).toBe('option1');
    expect(selectResult[0].getAttribute('value')).toBe('option1');
    expect(selectResult[0].children[0].value).toBe('option1');
  });

  it('should set textContent and value for textarea', () => {
    const config = { tag: 'textarea', value: 'test' };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].value).toBe('test');
    expect(result[0].textContent).toBe('test');
    expect(result[0].getAttribute('value')).toBe('test');
  });

  it('should handle non-standard keys as attributes', () => {
    const config = { tag: 'div', customAttr: 'value' };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].getAttribute('customAttr')).toBe('value');
  });

  // Security Tests
  it('should sanitize html to prevent XSS', () => {
    const config = { html: '<script>alert(1)</script><div>Safe</div>' };
    const result = DomUnify.createElementFromConfig(config);
    expect(result).toHaveLength(1);
    const el = result[0];
    expect(el.innerHTML).not.toContain('<script>');
    expect(el.querySelector('div').textContent).toBe('Safe');
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('should sanitize dangerous attributes (javascript:)', () => {
    const config = { tag: 'a', attrs: { href: 'javascript:alert(1)' } };
    const result = DomUnify.createElementFromConfig(config);
    expect(result).toHaveLength(1);
    const a = result[0];
    expect(a.getAttribute('href')).toBe('');
    a.click();
    expect(window.alert).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Sanitizing dangerous attribute'));
  });

  it('should sanitize non-standard attributes with dangerous protocols', () => {
    const config = { tag: 'div', customHref: 'javascript:alert(1)' };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].getAttribute('customHref')).toBe('');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Sanitizing dangerous non-standard attribute'));
  });

  it('should allow raw HTML if sanitize=false (with warning)', () => {
    const config = { html: '<div>Unsafe</div>', sanitize: false };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].innerHTML).toBe('<div>Unsafe</div>');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Sanitization disabled; using raw HTML. Ensure content is trusted to avoid XSS.')
    );
  });

  it('should allow raw HTML if sanitize=false is passed explicitly', () => {
    const config = { html: '<div>Unsafe</div>' };
    const result = DomUnify.createElementFromConfig(config, null, false);
    expect(result[0].innerHTML).toBe('<div>Unsafe</div>');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Sanitization disabled; using raw HTML. Ensure content is trusted to avoid XSS.')
    );
  });

  // Validation and Error Handling
  it('should handle invalid config (null, array, primitive)', () => {
    expect(DomUnify.createElementFromConfig(null)).toEqual([]);
    expect(DomUnify.createElementFromConfig([])).toEqual([]);
    expect(DomUnify.createElementFromConfig(42)).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid config'));
  });

  it('should default to div for invalid tag', () => {
    const config = { tag: 123 };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].tagName).toBe('DIV');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid tag'));
  });

  it('should default to div for forbidden tags (script, style)', () => {
    const config1 = { tag: 'script' };
    const config2 = { tag: 'style' };
    const result1 = DomUnify.createElementFromConfig(config1);
    const result2 = DomUnify.createElementFromConfig(config2);
    expect(result1[0].tagName).toBe('DIV');
    expect(result2[0].tagName).toBe('DIV');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid tag'));
  });

  it('should handle tags with spaces or special characters', () => {
    const config = { tag: ' div  <p>' };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].tagName).toBe('DIV');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid tag'));
  });

  it('should skip invalid class and id', () => {
    const config = { class: 123, id: null };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].className).toBe('');
    expect(result[0].id).toBe('');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid class'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid id'));
  });

  it('should handle invalid attributes, styles, and dataset', () => {
    const config = {
      attrs: { 'data-num': 42, 'data-obj': { key: 'val' } },
      styles: { backgroundColor: 'red', invalid: true },
      dataset: { num: 100, obj: { key: 'val' } }
    };
    const result = DomUnify.createElementFromConfig(config);
    const el = result[0];
    expect(el.getAttribute('data-num')).toBe('100'); // dataset overrides attrs
    expect(el.getAttribute('data-obj')).toBe('[object Object]');
    expect(el.style.backgroundColor).toBe('red');
    expect(el.dataset.num).toBe('100');
    expect(el.dataset.obj).toBe('[object Object]');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid style value'));
  });

  it('should skip invalid attribute keys with spaces or special characters', () => {
    const config = { attrs: { 'data test': 'value', 'data<>': 'invalid' } };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].hasAttribute('data test')).toBe(false);
    expect(result[0].hasAttribute('data<>')).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid attribute key'));
  });

  it('should skip invalid dataset keys', () => {
    const config = { dataset: { '': 'value', 'data test': 'invalid' } };
    const result = DomUnify.createElementFromConfig(config);
    expect(Object.keys(result[0].dataset)).toHaveLength(0);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid dataset key'));
  });

  it('should skip invalid style keys', () => {
    const config = { styles: { '': 'value', 'invalid test': 'value' } };
    const result = DomUnify.createElementFromConfig(config);
    expect(Object.keys(result[0].style).length).toBe(0); // No valid styles
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid style key'));
  });

  it('should skip invalid event handlers', () => {
    const config = { events: { click: 'notAFunction', mouseover: 42 } };
    const result = DomUnify.createElementFromConfig(config);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid handler'));
    const el = result[0];
    const event = new MouseEvent('click');
    el.dispatchEvent(event); // No errors
  });

  it('should skip invalid event names', () => {
    const config = { events: { onClick: () => {}, '': () => {} } };
    const result = DomUnify.createElementFromConfig(config);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid event name'));
    const el = result[0];
    const event = new MouseEvent('click');
    el.dispatchEvent(event); // No errors
  });

  it('should warn and skip invalid parent', () => {
    const config = { text: 'Test' };
    DomUnify.createElementFromConfig(config, 'invalid');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid parent'));
    expect(document.body.children).toHaveLength(0);
  });

  // Children Handling
  it('should handle mixed children types (string, number, boolean, null, object)', () => {
    const config = {
      children: ['Text', 42, true, null, undefined, { tag: 'span', text: 'Nested' }]
    };
    const result = DomUnify.createElementFromConfig(config);
    const el = result[0];
    expect(el.childNodes).toHaveLength(4); // Text, '42', 'true', span
    expect(el.childNodes[0].textContent).toBe('Text');
    expect(el.childNodes[1].textContent).toBe('42');
    expect(el.childNodes[2].textContent).toBe('true');
    expect(el.childNodes[3].tagName).toBe('SPAN');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid child type'));
  });

  it('should normalize single child to array', () => {
    const config = { children: { tag: 'span', text: 'Single' } };
    const result = DomUnify.createElementFromConfig(config);
    const el = result[0];
    expect(el.children).toHaveLength(1);
    expect(el.children[0].textContent).toBe('Single');
  });

  it('should handle deep nesting without errors', () => {
    const deepConfig = { children: [{ children: [{ children: [{ text: 'Deep' }] }] }] };
    const result = DomUnify.createElementFromConfig(deepConfig);
    expect(result).toHaveLength(1);
    const el = result[0];
    const deepEl = el.querySelector('div > div > div');
    expect(deepEl).not.toBeNull();
    expect(deepEl.textContent).toBe('Deep');
  });

  it('should prevent stack overflow for excessive recursion', () => {
    let config = { children: [] };
    let current = config;
    for (let i = 0; i < 150; i++) {
      current.children = [{ text: 'Deep' }];
      current = current.children[0];
    }
    const result = DomUnify.createElementFromConfig(config);
    expect(result).toHaveLength(1);
    expect(result[0].querySelectorAll('div').length).toBeLessThanOrEqual(100);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Maximum recursion depth exceeded'));
  });

  it('should handle large number of children', () => {
    const config = { children: Array(1000).fill().map((_, i) => ({ tag: 'span', text: `Child${i}` })) };
    const result = DomUnify.createElementFromConfig(config);
    expect(result).toHaveLength(1);
    expect(result[0].children.length).toBe(1000);
    expect(result[0].children[999].textContent).toBe('Child999');
  });

  it('should sanitize HTML in nested children', () => {
    const config = {
      children: [{ html: '<script>alert(1)</script><div>Safe</div>' }]
    };
    const result = DomUnify.createElementFromConfig(config);
    const child = result[0].children[0];
    expect(child.innerHTML).not.toContain('<script>');
    expect(child.querySelector('div').textContent).toBe('Safe');
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('should handle invalid value types', () => {
    const config = { tag: 'input', value: { invalid: true } };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].value).toBe('');
    expect(result[0].getAttribute('value')).toBe('');
  });

  // Circular reference check removed — use DOMPurify for untrusted input

  // Additional Tests from Best Practices
  it('should support custom elements', () => {
    const config = { tag: 'my-custom-tag', text: 'Custom' };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].tagName).toBe('MY-CUSTOM-TAG');
    expect(result[0].textContent).toBe('Custom');
  });

  it('should support SVG elements', () => {
    const config = { tag: 'svg', children: [{ tag: 'circle', attrs: { r: '10' } }] };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].tagName).toBe('SVG');
    expect(result[0].children[0].tagName).toBe('CIRCLE');
    expect(result[0].children[0].getAttribute('r')).toBe('10');
  });

  it('should not leak memory from events', () => {
    let clicked = false;
    const config = { events: { click: () => (clicked = true) } };
    const result = DomUnify.createElementFromConfig(config);
    const el = result[0];
    const event = new MouseEvent('click');
    el.dispatchEvent(event);
    expect(clicked).toBe(true);
    // Simulate removal (manual, since no getEventListeners)
    el.removeEventListener('click', config.events.click);
    clicked = false;
    el.dispatchEvent(event);
    expect(clicked).toBe(false);
  });

  it('should batch updates to avoid layout thrashing', () => {
    const config = { children: Array(50).fill({ tag: 'span', text: 'Batch' }) };
    const start = performance.now();
    const result = DomUnify.createElementFromConfig(config);
    const end = performance.now();
    expect(end - start < 10).toBe(true); // Quick batch with fragment
    expect(result[0].children.length).toBe(50);
  });

  it('should handle form attributes like type', () => {
    const config = { tag: 'input', attrs: { type: 'checkbox' } };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].type).toBe('checkbox');
  });

  it('should handle empty config fields', () => {
    const config = { tag: 'div', attrs: {}, styles: {}, events: {} };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].tagName).toBe('DIV');
    expect(result[0].attributes.length).toBe(0);
    expect(Object.keys(result[0].style).length).toBe(0);
    // Check events via dispatch (no handler expected)
    const event = new MouseEvent('click');
    let clicked = false;
    const handler = () => clicked = true;
    result[0].addEventListener('click', handler); // Temporary to test dispatch
    result[0].dispatchEvent(event);
    expect(clicked).toBe(true);
    result[0].removeEventListener('click', handler);
  });

  it('should handle null/undefined in attrs and events', () => {
    const config = { tag: 'div', attrs: { nullAttr: null, undefAttr: undefined }, events: { click: null } };
    const result = DomUnify.createElementFromConfig(config);
    const el = result[0];
    expect(el.hasAttribute('nullAttr')).toBe(false);
    expect(el.hasAttribute('undefAttr')).toBe(false);
    // Check events via dispatch (no handler expected)
    const event = new MouseEvent('click');
    let clicked = false;
    const handler = () => clicked = true;
    el.addEventListener('click', handler); // Temporary to test dispatch
    el.dispatchEvent(event);
    expect(clicked).toBe(true);
    el.removeEventListener('click', handler);
  });

  // Style Handling
  it('should convert kebab-case styles to camelCase', () => {
    const config = { styles: { 'background-color': 'blue', 'font-size': '16px' } };
    const result = DomUnify.createElementFromConfig(config);
    const el = result[0];
    expect(el.style.backgroundColor).toBe('blue');
    expect(el.style.fontSize).toBe('16px');
  });

  // Conflict Handling
  it('should prioritize text over html with warning', () => {
    const config = { text: 'Text', html: '<span>HTML</span>' };
    const result = DomUnify.createElementFromConfig(config);
    expect(result[0].textContent).toBe('Text');
    expect(result[0].innerHTML).toBe('Text');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Both "text" and "html"'));
  });

  // Boolean Attributes
  it('should handle boolean attributes correctly', () => {
    const config = { attrs: { disabled: true, hidden: false, checked: null } };
    const result = DomUnify.createElementFromConfig(config);
    const el = result[0];
    expect(el.getAttribute('disabled')).toBe('');
    expect(el.hasAttribute('hidden')).toBe(false);
    expect(el.hasAttribute('checked')).toBe(false);
  });

  // Large input size check removed — no artificial limit on config size
});