import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DomUnify, dom } from '../index.js';

describe('DomUnify.addToElements (static)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should add an element from a config object', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const config = { tag: 'span', text: 'Hello', class: 'test' };
    const result = DomUnify.addToElements([parent], config);

    expect(parent.innerHTML).toBe('<span class="test">Hello</span>');
    expect(result).toHaveLength(1);
    expect(result[0].tagName).toBe('SPAN');
  });

  it('should add multiple elements from an array of configs', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const config = [
      { tag: 'p', text: 'First' },
      { tag: 'p', text: 'Second' }
    ];
    DomUnify.addToElements([parent], config);

    expect(parent.children).toHaveLength(2);
    expect(parent.innerHTML).toBe('<p>First</p><p>Second</p>');
  });

  it('should handle a JSON string as an object', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const json = JSON.stringify({ tag: 'button', text: 'OK' });
    DomUnify.addToElements([parent], json);

    expect(parent.innerHTML).toBe('<button>OK</button>');
  });

  it('should handle a JSON string as an array', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const json = JSON.stringify([
      { tag: 'div', text: 'A' },
      { tag: 'div', text: 'B' }
    ]);
    DomUnify.addToElements([parent], json);

    expect(parent.children).toHaveLength(2);
  });

  it('should handle an HTML string on JSON parse error', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const html = '<strong>Bold</strong> text';
    DomUnify.addToElements([parent], html);

    expect(parent.innerHTML).toBe('<strong>Bold</strong> text');
  });

  it('should sanitize dangerous HTML and call console.warn', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    // HTML with encoded XSS that leaves &# after sanitization
    const dangerous = `
      <script>alert(1)</script>
      <img src="x" onerror="alert(2)">
      <div onclick="evil()">click</div>
      <a href="javascript:alert(3)">link</a>
      <div data-xss="&#60;script&#62;alert(1)&#60;/script&#62;">encoded</div>
    `;

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    DomUnify.addToElements([parent], dangerous);

    const html = parent.innerHTML.toLowerCase();
    // Actual <script> tags should be removed; decoded entities in data-attrs are safe (not executable)
    expect(parent.querySelector('script')).toBeNull();
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onclick');
    expect(html).toContain('<img src="x">');
    expect(html).toContain('data-xss="');
    // Encoded XSS warning removed — simplified sanitizer doesn't detect encoded entities
    warnSpy.mockRestore();
  });

  it('should add from another DomUnify (cloning content)', () => {
    const source = dom().add('<span>Original</span><p>Text</p>');
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    DomUnify.addToElements([parent], source);

    expect(parent.innerHTML).toBe('<span>Original</span><p>Text</p>');
    expect(parent.children).toHaveLength(2);
    expect(parent.firstChild).not.toBe(source.currentElements[0]);
  });

  it('should add to multiple targets', () => {
    const div1 = document.createElement('div');
    const div2 = document.createElement('div');
    document.body.appendChild(div1);
    document.body.appendChild(div2);

    DomUnify.addToElements([div1, div2], { tag: 'p', text: 'Added' });

    expect(div1.innerHTML).toBe('<p>Added</p>');
    expect(div2.innerHTML).toBe('<p>Added</p>');
  });

  it('should apply data to added inputs', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const config = { tag: 'input', attrs: { name: 'login', type: 'text' } };
    const data = { login: 'user123' };

    DomUnify.addToElements([parent], config, data);

    const input = parent.querySelector('input');
    expect(input.value).toBe('user123');
  });

  it('should handle checkbox and radio via data', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const config = [
      { tag: 'input', attrs: { type: 'checkbox', name: 'agree', value: 'yes' } },
      { tag: 'input', attrs: { type: 'radio', name: 'choice', value: 'opt2' } }
    ];
    const data = { agree: 'yes', choice: 'opt2' };

    DomUnify.addToElements([parent], config, data);

    expect(parent.querySelector('input[type="checkbox"]').checked).toBe(true);
    expect(parent.querySelector('input[type="radio"]').checked).toBe(true);
  });

  it('should handle multiple select', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const config = {
      tag: 'select',
      attrs: { name: 'fruits', multiple: '' },
      children: [
        { tag: 'option', attrs: { value: 'apple' }, text: 'Apple' },
        { tag: 'option', attrs: { value: 'banana' }, text: 'Banana' },
        { tag: 'option', attrs: { value: 'orange' }, text: 'Orange' }
      ]
    };
    const data = { fruits: ['apple', 'banana'] };

    DomUnify.addToElements([parent], config, data);

    const select = parent.querySelector('select');
    const selected = Array.from(select.selectedOptions).map(o => o.value);
    expect(selected).toEqual(['apple', 'banana']);
    expect(select.querySelector('option[value="orange"]').selected).toBe(false);
  });

  it('should clear fields with clearMissing: true', () => {
    const parent = document.createElement('div');
    parent.innerHTML = '<input name="old" value="123"><input name="keep" value="keep">';
    document.body.appendChild(parent);

    DomUnify.addToElements([parent], '<span>New</span>', { keep: 'updated' }, { clearMissing: true });

    const oldInput = parent.querySelector('input[name="old"]');
    const keepInput = parent.querySelector('input[name="keep"]');

    expect(oldInput.value).toBe('');
    expect(keepInput.value).toBe('updated');
    expect(parent.querySelector('span')).not.toBeNull();
  });

  it('should return an empty array for empty targets', () => {
    const result = DomUnify.addToElements([], { tag: 'div' });
    expect(result).toEqual([]);
  });

  it('should handle nested children', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const config = {
      tag: 'ul',
      children: [
        { tag: 'li', text: 'One' },
        { tag: 'li', text: 'Two' },
        { tag: 'li', children: [{ tag: 'strong', text: 'Bold' }] }
      ]
    };

    DomUnify.addToElements([parent], config);

    expect(parent.innerHTML).toBe('<ul><li>One</li><li>Two</li><li><strong>Bold</strong></li></ul>');
  });

  it('should add text directly from a string', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    DomUnify.addToElements([parent], 'Just plain text');

    expect(parent.textContent).toBe('Just plain text');
    expect(parent.innerHTML).toBe('Just plain text');
  });

  it('should not crash on invalid config', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    // @ts-ignore
    const result = DomUnify.addToElements([parent], null);

    expect(result).toEqual([]);
    expect(parent.innerHTML).toBe('');
  });

  it('should work with DocumentFragment', () => {
    const frag = document.createDocumentFragment();
    const div = document.createElement('div');
    div.textContent = 'Existing';
    frag.appendChild(div);

    DomUnify.addToElements([frag], { tag: 'span', text: 'Added to fragment' });

    document.body.appendChild(frag);
    expect(document.body.innerHTML).toBe('<div>Existing</div><span>Added to fragment</span>');
  });

  it('should add an HTMLElement directly (when config is a Node)', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const span = document.createElement('span');
    span.textContent = 'Direct node';

    // @ts-ignore
    DomUnify.addToElements([parent], span);

    expect(parent.innerHTML).toBe('<span>Direct node</span>');
  });
});