import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('get flat and nested modes', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('get("flat")', () => {
    it('should collect data-key elements', () => {
      document.body.innerHTML = '<div class="card"><h3 data-key="title">Hello</h3><span data-key="subtitle">World</span></div>';
      const result = dom('.card').get('flat');
      expect(result).toEqual([{ title: 'Hello', subtitle: 'World' }]);
    });

    it('should collect input values by name', () => {
      document.body.innerHTML = '<form><input name="email" value="test@test.com"><input name="age" value="25"></form>';
      const result = dom('form').get('flat');
      expect(result).toEqual([{ email: 'test@test.com', age: '25' }]);
    });

    it('should collect by data-key, name, and id fallback', () => {
      document.body.innerHTML = `<div>
        <span data-key="a">A</span>
        <input name="b" value="B">
        <input id="c" value="C">
      </div>`;
      const result = dom('div').get('flat');
      expect(result).toEqual([{ a: 'A', b: 'B', c: 'C' }]);
    });

    it('should handle checkboxes and radios', () => {
      document.body.innerHTML = `<div>
        <input type="checkbox" name="cb" value="yes" checked>
        <input type="radio" name="rad" value="a" checked>
        <input type="radio" name="rad" value="b">
      </div>`;
      const result = dom('div').get('flat');
      expect(result[0].cb).toBe('yes');
      expect(result[0].rad).toBe('a');
    });

    it('should handle multiple select', () => {
      document.body.innerHTML = `<div>
        <select name="opts" multiple>
          <option value="x" selected>X</option>
          <option value="y" selected>Y</option>
          <option value="z">Z</option>
        </select>
      </div>`;
      const result = dom('div').get('flat');
      expect(result[0].opts).toEqual(['x', 'y']);
    });

    it('should skip disabled elements by default', () => {
      document.body.innerHTML = '<div><input name="a" value="1" disabled><input name="b" value="2"></div>';
      const result = dom('div').get('flat');
      expect(result).toEqual([{ b: '2' }]);
    });

    it('should include disabled when option set', () => {
      document.body.innerHTML = '<div><input name="a" value="1" disabled></div>';
      const result = dom('div').get({ mode: 'flat', includeDisabled: true });
      expect(result).toEqual([{ a: '1' }]);
    });

    it('should collect from nested containers (flat ignores nesting)', () => {
      document.body.innerHTML = `<div class="root">
        <span data-key="name">John</span>
        <div data-container="address">
          <input data-key="city" value="NYC">
        </div>
      </div>`;
      const result = dom('.root').get('flat');
      // flat mode collects everything regardless of nesting
      expect(result[0].name).toBe('John');
      expect(result[0].city).toBe('NYC');
    });

    it('should return one object per context element', () => {
      document.body.innerHTML = '<div class="c"><input name="x" value="1"></div><div class="c"><input name="x" value="2"></div>';
      const result = dom('.c').get('flat');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ x: '1' });
      expect(result[1]).toEqual({ x: '2' });
    });
  });

  describe('get("nested")', () => {
    it('should collect flat data without containers', () => {
      document.body.innerHTML = '<div><span data-key="name">John</span><input name="age" value="30"></div>';
      const result = dom('div').get('nested');
      expect(result).toEqual([{ name: 'John', age: '30' }]);
    });

    it('should nest data inside data-container', () => {
      document.body.innerHTML = `<div class="root">
        <span data-key="name">John</span>
        <div data-container="address">
          <input data-key="city" value="NYC">
          <input data-key="zip" value="10001">
        </div>
      </div>`;
      const result = dom('.root').get('nested');
      expect(result).toEqual([{
        name: 'John',
        address: { city: 'NYC', zip: '10001' }
      }]);
    });

    it('should handle deep nesting', () => {
      document.body.innerHTML = `<div class="root">
        <div data-container="level1">
          <span data-key="a">A</span>
          <div data-container="level2">
            <span data-key="b">B</span>
          </div>
        </div>
      </div>`;
      const result = dom('.root').get('nested');
      expect(result).toEqual([{
        level1: { a: 'A', level2: { b: 'B' } }
      }]);
    });

    it('should group same-name containers as array', () => {
      document.body.innerHTML = `<div class="root">
        <div data-container="items">
          <input data-key="val" value="A">
        </div>
        <div data-container="items">
          <input data-key="val" value="B">
        </div>
      </div>`;
      const result = dom('.root').get('nested');
      expect(result).toEqual([{
        items: [{ val: 'A' }, { val: 'B' }]
      }]);
    });

    it('should handle transparent wrappers (divs without data-container)', () => {
      document.body.innerHTML = `<div class="root">
        <div class="wrapper">
          <span data-key="title">Hello</span>
        </div>
      </div>`;
      const result = dom('.root').get('nested');
      expect(result).toEqual([{ title: 'Hello' }]);
    });

    it('should not leak nested values to parent', () => {
      document.body.innerHTML = `<div class="root">
        <span data-key="name">Root</span>
        <div data-container="child">
          <span data-key="name">Child</span>
        </div>
      </div>`;
      const result = dom('.root').get('nested');
      expect(result).toEqual([{
        name: 'Root',
        child: { name: 'Child' }
      }]);
    });

    it('should handle non-input elements with data-key using textContent', () => {
      document.body.innerHTML = '<div><h1 data-key="heading">Title</h1><p data-key="desc">Description</p></div>';
      const result = dom('div').get('nested');
      expect(result).toEqual([{ heading: 'Title', desc: 'Description' }]);
    });
  });

  describe('get() with unknown string', () => {
    it('should return null for unknown mode', () => {
      document.body.innerHTML = '<div></div>';
      const result = dom('div').get('unknown');
      expect(result).toBeNull();
    });
  });

  describe('get() symmetry: get(nested) ↔ fill()', () => {
    it('should round-trip flat data', () => {
      document.body.innerHTML = `<div class="root">
        <input data-key="name" value="John">
        <input data-key="email" value="john@test.com">
      </div>`;
      const data = dom('.root').get('nested')[0];
      // Clear values
      document.querySelectorAll('input').forEach(el => el.value = '');
      // Fill back
      dom('.root').fill(data);
      const result = dom('.root').get('nested')[0];
      expect(result).toEqual(data);
    });

    it('should round-trip nested data', () => {
      document.body.innerHTML = `<div class="root">
        <span data-key="title">Original Title</span>
        <div data-container="meta">
          <input data-key="author" value="Alice">
          <input data-key="year" value="2026">
        </div>
      </div>`;
      const data = dom('.root').get('nested')[0];
      expect(data).toEqual({ title: 'Original Title', meta: { author: 'Alice', year: '2026' } });

      // Modify, fill back
      data.title = 'New Title';
      data.meta.author = 'Bob';
      dom('.root').fill(data);

      const result = dom('.root').get('nested')[0];
      expect(result.title).toBe('New Title');
      expect(result.meta.author).toBe('Bob');
      expect(result.meta.year).toBe('2026');
    });
  });
});
