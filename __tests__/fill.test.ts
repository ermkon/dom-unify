import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('fill', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('flat fill via data-key', () => {
    it('should fill text elements by data-key', () => {
      document.body.innerHTML = '<div class="card"><h3 data-key="title"></h3><span data-key="subtitle"></span></div>';
      dom('.card').fill({ title: 'Hello', subtitle: 'World' });
      expect(document.querySelector('[data-key="title"]').textContent).toBe('Hello');
      expect(document.querySelector('[data-key="subtitle"]').textContent).toBe('World');
    });

    it('should fill input elements by data-key', () => {
      document.body.innerHTML = '<div class="form"><input data-key="email"><textarea data-key="bio"></textarea></div>';
      dom('.form').fill({ email: 'test@test.com', bio: 'Hello world' });
      expect(document.querySelector('[data-key="email"]').value).toBe('test@test.com');
      expect(document.querySelector('[data-key="bio"]').value).toBe('Hello world');
    });

    it('should fill elements by name as fallback', () => {
      document.body.innerHTML = '<div><input name="username"></div>';
      dom('div').fill({ username: 'Alice' });
      expect(document.querySelector('input').value).toBe('Alice');
    });

    it('should fill elements by id as fallback', () => {
      document.body.innerHTML = '<div><span id="status"></span></div>';
      dom('div').fill({ status: 'Active' });
      expect(document.querySelector('#status').textContent).toBe('Active');
    });

    it('should prioritize data-key over name', () => {
      document.body.innerHTML = '<div><input data-key="email" name="email"><input name="email"></div>';
      dom('div').fill({ email: 'test@test.com' });
      // Both data-key and name="email" elements should be filled
      const inputs = document.querySelectorAll('input');
      expect(inputs[0].value).toBe('test@test.com');
      expect(inputs[1].value).toBe('test@test.com');
    });
  });

  describe('form elements', () => {
    it('should handle radio buttons', () => {
      document.body.innerHTML = `<div>
        <input type="radio" name="size" value="S">
        <input type="radio" name="size" value="M">
        <input type="radio" name="size" value="L">
      </div>`;
      dom('div').fill({ size: 'M' });
      const radios = document.querySelectorAll('input[type="radio"]');
      expect(radios[0].checked).toBe(false);
      expect(radios[1].checked).toBe(true);
      expect(radios[2].checked).toBe(false);
    });

    it('should handle checkboxes with array value', () => {
      document.body.innerHTML = `<div>
        <input type="checkbox" name="colors" value="red">
        <input type="checkbox" name="colors" value="blue">
        <input type="checkbox" name="colors" value="green">
      </div>`;
      dom('div').fill({ colors: ['red', 'green'] });
      const cbs = document.querySelectorAll('input[type="checkbox"]');
      expect(cbs[0].checked).toBe(true);
      expect(cbs[1].checked).toBe(false);
      expect(cbs[2].checked).toBe(true);
    });

    it('should handle checkbox with boolean', () => {
      document.body.innerHTML = '<div><input type="checkbox" name="agree" value="yes"></div>';
      dom('div').fill({ agree: true });
      expect(document.querySelector('input').checked).toBe(true);
    });

    it('should handle multiple select', () => {
      document.body.innerHTML = `<div>
        <select name="tags" multiple>
          <option value="a">A</option>
          <option value="b">B</option>
          <option value="c">C</option>
        </select>
      </div>`;
      dom('div').fill({ tags: ['a', 'c'] });
      const select = document.querySelector('select');
      expect(Array.from(select.selectedOptions).map(o => o.value)).toEqual(['a', 'c']);
    });
  });

  describe('nested fill via data-container', () => {
    it('should recurse into data-container', () => {
      document.body.innerHTML = `<div class="root">
        <span data-key="name"></span>
        <div data-container="address">
          <input data-key="city">
          <input data-key="zip">
        </div>
      </div>`;
      dom('.root').fill({ name: 'John', address: { city: 'NYC', zip: '10001' } });
      expect(document.querySelector('[data-key="name"]').textContent).toBe('John');
      expect(document.querySelector('[data-key="city"]').value).toBe('NYC');
      expect(document.querySelector('[data-key="zip"]').value).toBe('10001');
    });

    it('should handle deep nesting', () => {
      document.body.innerHTML = `<div class="root">
        <div data-container="level1">
          <span data-key="a"></span>
          <div data-container="level2">
            <span data-key="b"></span>
          </div>
        </div>
      </div>`;
      dom('.root').fill({ level1: { a: 'A', level2: { b: 'B' } } });
      expect(document.querySelector('[data-key="a"]').textContent).toBe('A');
      expect(document.querySelector('[data-key="b"]').textContent).toBe('B');
    });

    it('should not fill elements inside nested containers from parent', () => {
      document.body.innerHTML = `<div class="root">
        <span data-key="name">Root</span>
        <div data-container="child">
          <span data-key="name">Child</span>
        </div>
      </div>`;
      dom('.root').fill({ name: 'Updated' });
      // Only the direct span should be updated, not the one inside data-container
      const spans = document.querySelectorAll('[data-key="name"]');
      expect(spans[0].textContent).toBe('Updated');
      expect(spans[1].textContent).toBe('Child');
    });
  });

  describe('transparent wrappers', () => {
    it('should find elements through divs without data-container', () => {
      document.body.innerHTML = `<div class="root">
        <div class="wrapper">
          <span data-key="title"></span>
        </div>
      </div>`;
      dom('.root').fill({ title: 'Found through wrapper' });
      expect(document.querySelector('[data-key="title"]').textContent).toBe('Found through wrapper');
    });
  });

  describe('array distribution', () => {
    it('should distribute array data to currentElements', () => {
      document.body.innerHTML = `
        <div class="item"><span data-key="name"></span></div>
        <div class="item"><span data-key="name"></span></div>
        <div class="item"><span data-key="name"></span></div>`;
      dom('.item').fill([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
      const spans = document.querySelectorAll('[data-key="name"]');
      expect(spans[0].textContent).toBe('A');
      expect(spans[1].textContent).toBe('B');
      expect(spans[2].textContent).toBe('C');
    });

    it('should handle array shorter than elements', () => {
      document.body.innerHTML = `
        <div class="item"><span data-key="val"></span></div>
        <div class="item"><span data-key="val"></span></div>
        <div class="item"><span data-key="val"></span></div>`;
      dom('.item').fill([{ val: 'X' }, { val: 'Y' }]);
      const spans = document.querySelectorAll('[data-key="val"]');
      expect(spans[0].textContent).toBe('X');
      expect(spans[1].textContent).toBe('Y');
      expect(spans[2].textContent).toBe(''); // untouched
    });
  });

  describe('edge cases', () => {
    it('should return this for chaining', () => {
      document.body.innerHTML = '<div></div>';
      const chain = dom('div');
      expect(chain.fill({ x: '1' })).toBe(chain);
    });

    it('should handle null data gracefully', () => {
      document.body.innerHTML = '<div></div>';
      const chain = dom('div');
      expect(chain.fill(null)).toBe(chain);
    });

    it('should handle undefined data gracefully', () => {
      document.body.innerHTML = '<div></div>';
      const chain = dom('div');
      expect(chain.fill(undefined)).toBe(chain);
    });

    it('should skip array-of-objects values', () => {
      document.body.innerHTML = '<div class="root"><span data-key="title"></span></div>';
      dom('.root').fill({ title: 'Hi', items: [{ a: 1 }, { b: 2 }] });
      expect(document.querySelector('[data-key="title"]').textContent).toBe('Hi');
    });

    it('should skip undefined values in data', () => {
      document.body.innerHTML = '<div><span data-key="a">Original</span></div>';
      dom('div').fill({ a: undefined });
      expect(document.querySelector('[data-key="a"]').textContent).toBe('Original');
    });
  });
});
