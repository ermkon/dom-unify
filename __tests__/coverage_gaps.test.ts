import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

/**
 * Tests for uncovered code paths identified by coverage report.
 * Covers: _createFromConfig edge cases, _setElementValue, _collectFlat/Nested
 * duplicate keys, _fillElement clearMissing paths, _cloneWithState select/textarea,
 * get() invalid args, get() exclude.data filter.
 */

describe('coverage gaps', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // Lines 392-393: _createFromConfig — invalid attribute keys
  describe('_createFromConfig invalid attr keys', () => {
    it('should skip attribute keys with whitespace', () => {
      dom().add({ tag: 'div', attrs: { 'bad key': 'value', 'good': 'ok' } });
      const el = document.body.querySelector('div') as HTMLElement;
      expect(el).toBeTruthy();
      expect(el.getAttribute('good')).toBe('ok');
      // 'bad key' should be skipped (not set)
      expect(el.getAttribute('bad key')).toBeNull();
    });

    it('should skip attribute keys with angle brackets', () => {
      dom().add({ tag: 'div', attrs: { '<script>': 'xss', 'valid': 'yes' } });
      const el = document.body.querySelector('div') as HTMLElement;
      expect(el.getAttribute('valid')).toBe('yes');
    });
  });

  // Line 456: _createFromConfig — raw Node child
  describe('_createFromConfig raw Node child', () => {
    it('should append a raw DOM Node passed as child', () => {
      const rawSpan = document.createElement('span');
      rawSpan.textContent = 'raw node';
      dom().add({ tag: 'div', class: 'parent', children: [rawSpan] });
      const parent = document.body.querySelector('.parent') as HTMLElement;
      expect(parent).toBeTruthy();
      expect(parent.querySelector('span')!.textContent).toBe('raw node');
    });
  });

  // Line 529: _setElementValue — checkbox with string value matching inputEl.value
  describe('_setElementValue checkbox string value', () => {
    it('should check checkbox when string value matches input value', () => {
      document.body.innerHTML = '<div class="root"><input type="checkbox" data-key="agree" value="yes"></div>';
      dom('.root').fill({ agree: 'yes' });
      const cb = document.querySelector('input') as HTMLInputElement;
      expect(cb.checked).toBe(true);
    });

    it('should not check checkbox when string value does not match', () => {
      document.body.innerHTML = '<div class="root"><input type="checkbox" data-key="agree" value="yes"></div>';
      dom('.root').fill({ agree: 'no' });
      const cb = document.querySelector('input') as HTMLInputElement;
      expect(cb.checked).toBe(false);
    });
  });

  // Lines 628-629: _collectFlat — duplicate key → array
  describe('_collectFlat duplicate keys', () => {
    it('should group duplicate data-key values into an array', () => {
      document.body.innerHTML = `<div class="root">
        <span data-key="tag">Alpha</span>
        <span data-key="tag">Beta</span>
        <span data-key="tag">Gamma</span>
      </div>`;
      const result = dom('.root').get('flat');
      expect(result).toEqual([{ tag: ['Alpha', 'Beta', 'Gamma'] }]);
    });

    it('should handle two duplicate keys correctly', () => {
      document.body.innerHTML = `<div class="root">
        <input data-key="color" value="red">
        <input data-key="color" value="blue">
      </div>`;
      const result = dom('.root').get('flat');
      expect(result).toEqual([{ color: ['red', 'blue'] }]);
    });
  });

  // Lines 665-666: _collectNested — duplicate key → array in nested context
  describe('_collectNested duplicate keys', () => {
    it('should group duplicate data-key in nested context', () => {
      document.body.innerHTML = `<div class="root">
        <div data-container="info">
          <span data-key="val">X</span>
          <span data-key="val">Y</span>
        </div>
      </div>`;
      const result = dom('.root').get('nested');
      expect(result).toEqual([{ info: { val: ['X', 'Y'] } }]);
    });
  });

  // Lines 752-754: _cloneWithState — select option.selected (inner form elements)
  describe('_cloneWithState select', () => {
    it('should preserve selected option in select inside a cloned container', () => {
      document.body.innerHTML = `<div class="wrap"><select id="sel">
        <option value="a">A</option>
        <option value="b">B</option>
        <option value="c">C</option>
      </select></div><div class="target"></div>`;
      const sel = document.getElementById('sel') as HTMLSelectElement;
      sel.value = 'b';
      // duplicate inserts a clone next to original – uses _cloneWithState internally
      dom('.wrap').duplicate();
      const clonedSelects = document.body.querySelectorAll('select');
      expect(clonedSelects.length).toBe(2);
      expect((clonedSelects[1] as HTMLSelectElement).value).toBe('b');
    });
  });

  // Lines 762-763: _cloneWithState — textarea value (inner form elements)
  describe('_cloneWithState textarea', () => {
    it('should preserve textarea value in cloned container', () => {
      document.body.innerHTML = '<div class="wrap"><textarea id="ta"></textarea></div>';
      const ta = document.getElementById('ta') as HTMLTextAreaElement;
      ta.value = 'Hello world';
      dom('.wrap').duplicate();
      const cloned = document.body.querySelectorAll('textarea');
      expect(cloned.length).toBe(2);
      expect(cloned[1].value).toBe('Hello world');
    });
  });

  // Line 994: _fillElement — fill input with array value takes first element
  describe('_fillElement array value on text input', () => {
    it('should take first element when filling text input with array', () => {
      document.body.innerHTML = '<div class="root"><input type="text" data-key="val"></div>';
      dom('.root').fill({ val: ['hello', 'world'] } as any);
      const input = document.querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('hello');
    });

    it('should set empty string when filling with empty array', () => {
      document.body.innerHTML = '<div class="root"><input type="text" data-key="val"></div>';
      dom('.root').fill({ val: [] } as any);
      const input = document.querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  // Lines 1004, 1009-1010, 1015: _applyDataToElements clearMissing
  // clearMissing is handled in _applyDataToElements, called via .set(props, data, options)
  describe('_applyDataToElements clearMissing', () => {
    it('should uncheck checkbox when clearMissing is true and key missing', () => {
      document.body.innerHTML = '<div class="root"><input type="checkbox" name="agree" checked></div>';
      const cb = document.querySelector('input') as HTMLInputElement;
      expect(cb.checked).toBe(true);
      dom('.root').set({}, { other: 'value' }, { clearMissing: true });
      expect(cb.checked).toBe(false);
    });

    it('should uncheck radio when clearMissing is true and key missing', () => {
      document.body.innerHTML = '<div class="root"><input type="radio" name="choice" checked></div>';
      const radio = document.querySelector('input') as HTMLInputElement;
      expect(radio.checked).toBe(true);
      dom('.root').set({}, { other: 'value' }, { clearMissing: true });
      expect(radio.checked).toBe(false);
    });

    it('should deselect all options in multi-select when clearMissing', () => {
      document.body.innerHTML = `<div class="root">
        <select name="colors" multiple>
          <option value="red" selected>Red</option>
          <option value="blue" selected>Blue</option>
        </select>
      </div>`;
      const select = document.querySelector('select') as HTMLSelectElement;
      expect(select.selectedOptions.length).toBe(2);
      dom('.root').set({}, { other: 'value' }, { clearMissing: true });
      expect(select.selectedOptions.length).toBe(0);
    });

    it('should clear textarea when clearMissing is true and key missing', () => {
      document.body.innerHTML = '<div class="root"><textarea name="notes">Some text</textarea></div>';
      const ta = document.querySelector('textarea') as HTMLTextAreaElement;
      ta.value = 'Some text';
      dom('.root').set({}, { other: 'value' }, { clearMissing: true });
      expect(ta.value).toBe('');
    });

    it('should clear text input when clearMissing is true and key missing', () => {
      document.body.innerHTML = '<div class="root"><input type="text" name="name" value="Alice"></div>';
      dom('.root').set({}, { other: 'value' }, { clearMissing: true });
      const input = document.querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  // Line 1425: get() exclude.data filter
  describe('get() form mode exclude.data', () => {
    it('should exclude elements matching data attribute filter', () => {
      document.body.innerHTML = `<form>
        <input name="visible" value="yes">
        <input name="hidden" value="no" data-role="skip">
      </form>`;
      const result = dom('form').get({
        mode: 'form',
        exclude: { data: { role: 'skip' } }
      } as any);
      expect(result[0]).toHaveProperty('visible', 'yes');
      expect(result[0]).not.toHaveProperty('hidden');
    });
  });

  // Lines 1464-1465: get() invalid argument
  describe('get() invalid argument', () => {
    it('should return null for invalid argument type', () => {
      document.body.innerHTML = '<div></div>';
      const result = dom('div').get(true as any);
      expect(result).toBeNull();
    });
  });
});
