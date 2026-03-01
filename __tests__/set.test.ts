import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('set', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  it('should set text and class for current elements', () => {
    document.body.innerHTML = '<div></div>';
    unify = dom('div');
    unify.set({ text: 'New Text', class: 'new-class' });
    const div = document.body.querySelector('div');
    expect(div.textContent).toBe('New Text');
    expect(div.className).toBe('new-class');
  });

  it('should set attributes and styles', () => {
    document.body.innerHTML = '<div></div>';
    unify = dom('div');
    unify.set({
      attr: { 'data-test': 'value' },
      style: { color: 'blue' },
    });
    const div = document.body.querySelector('div');
    expect(div.getAttribute('data-test')).toBe('value');
    expect(div.style.color).toBe('blue');
  });

  it('should apply data to input', () => {
    document.body.innerHTML = '<input name="test">';
    unify = dom('input');
    unify.set({}, { test: 'set-value' });
    const input = document.body.querySelector('input');
    expect(input.value).toBe('set-value');
  });

  it('should handle checkbox', () => {
    document.body.innerHTML = '<input type="checkbox" name="check" value="yes">';
    unify = dom('input');
    unify.set({}, { check: 'yes' });
    const input = document.body.querySelector('input');
    expect(input.checked).toBe(true);
  });

  it('should handle radio', () => {
    document.body.innerHTML = '<input type="radio" name="radio" value="yes">';
    unify = dom('input');
    unify.set({}, { radio: 'yes' });
    const input = document.body.querySelector('input');
    expect(input.checked).toBe(true);
  });

  it('should handle multiple select', () => {
    document.body.innerHTML = `
      <select name="options" multiple>
        <option value="a">A</option>
        <option value="b">B</option>
      </select>`;
    unify = dom('select');
    unify.set({}, { options: ['a', 'b'] });
    const select = document.body.querySelector('select');
    expect(Array.from(select.selectedOptions).map(opt => opt.value)).toEqual(['a', 'b']);
  });

  it('should clear elements with clearMissing', () => {
    document.body.innerHTML = '<input name="test" value="value">';
    unify = dom('input');
    unify.set({}, {}, { clearMissing: true });
    const input = document.body.querySelector('input');
    expect(input.value).toBe('');
  });

  it('should set id', () => {
    document.body.innerHTML = '<div></div>';
    unify = dom('div');
    unify.set({ id: 'my-id' });
    expect(document.body.querySelector('div').id).toBe('my-id');
  });

  it('should set html', () => {
    document.body.innerHTML = '<div></div>';
    unify = dom('div');
    unify.set({ html: '<span>Hi</span>' });
    expect(document.body.querySelector('span').textContent).toBe('Hi');
  });

  it('should set dataset', () => {
    document.body.innerHTML = '<div></div>';
    unify = dom('div');
    unify.set({ dataset: { key: 'val' } });
    expect(document.body.querySelector('div').dataset.key).toBe('val');
  });

  it('should work with multiple elements', () => {
    document.body.innerHTML = '<div class="a"></div><div class="a"></div>';
    unify = dom('.a');
    unify.set({ text: 'updated' });
    const divs = document.body.querySelectorAll('.a');
    expect(divs[0].textContent).toBe('updated');
    expect(divs[1].textContent).toBe('updated');
  });

  it('should handle textarea via data', () => {
    document.body.innerHTML = '<textarea name="bio"></textarea>';
    unify = dom('textarea');
    unify.set({}, { bio: 'Hello world' });
    const ta = document.body.querySelector('textarea');
    expect(ta.value).toBe('Hello world');
    expect(ta.textContent).toBe('Hello world');
  });

  it('should return this for chaining', () => {
    document.body.innerHTML = '<div></div>';
    unify = dom('div');
    const result = unify.set({ text: 'test' });
    expect(result).toBe(unify);
  });
});