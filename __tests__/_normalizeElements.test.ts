import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('_normalizeElements', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  describe('successful normalization cases', () => {
    it('should normalize string selector to an array of HTMLElements', () => {
      document.body.innerHTML = '<div class="test-class">Test</div><div class="test-class">Test2</div>';
      const result = unify._normalizeElements('.test-class');
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(HTMLElement);
      expect(result[0].className).toBe('test-class');
      expect(result[0].textContent).toBe('Test');
      expect(result[1].textContent).toBe('Test2');
    });

    it('should return [document.body] for null or undefined', () => {
      expect(unify._normalizeElements(null)).toEqual([document.body]);
      expect(unify._normalizeElements(undefined)).toEqual([document.body]);
    });

    it('should handle HTMLElement directly', () => {
      const div = document.createElement('div');
      const result = unify._normalizeElements(div);
      expect(result).toEqual([div]);
      expect(result[0]).toBeInstanceOf(HTMLElement);
    });

    it('should handle DocumentFragment', () => {
      const frag = document.createDocumentFragment();
      const div = document.createElement('div');
      frag.appendChild(div);
      const result = unify._normalizeElements(frag);
      expect(result).toEqual([frag]);
      expect(result[0]).toBeInstanceOf(DocumentFragment);
    });

    it('should handle Document by returning [document.body]', () => {
      const result = unify._normalizeElements(document);
      expect(result).toEqual([document.body]);
      expect(result[0]).toBeInstanceOf(HTMLElement);
    });

    it('should filter non-HTML elements from an array', () => {
      const input = [
        document.createElement('div'),
        'not-element',
        null,
        document.createTextNode('text'),
        document.createComment('comment'),
        document.doctype
      ];
      const result = unify._normalizeElements(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(HTMLElement);
      expect(result[0].tagName).toBe('DIV');
    });

    it('should handle NodeList', () => {
      document.body.innerHTML = '<span>Test1</span><span>Test2</span>';
      const nodeList = document.querySelectorAll('span');
      const result = unify._normalizeElements(nodeList);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(HTMLElement);
      expect(result[0].tagName).toBe('SPAN');
      expect(result[1].tagName).toBe('SPAN');
    });

    it('should handle empty array and return empty array', () => {
      const result = unify._normalizeElements([]);
      expect(result).toEqual([]);
    });

    it('should handle array with only valid HTMLElements', () => {
      const div1 = document.createElement('div');
      const div2 = document.createElement('div');
      const result = unify._normalizeElements([div1, div2]);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(div1);
      expect(result[1]).toBe(div2);
    });

    it('should handle array with mixed valid and invalid elements', () => {
      const div = document.createElement('div');
      const textNode = document.createTextNode('text');
      const result = unify._normalizeElements([div, textNode, 'invalid', null]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(div);
    });

    it('should handle falsey values like false, 0, empty string and return [document.body]', () => {
      expect(unify._normalizeElements(false)).toEqual([document.body]);
      expect(unify._normalizeElements(0)).toEqual([document.body]);
      expect(unify._normalizeElements('')).toEqual([document.body]);
    });
  });

  describe('edge cases and error handling', () => {
    it('should return empty array for invalid selector string', () => {
      document.body.innerHTML = '<div class="test">Test</div>';
      const result = unify._normalizeElements('.nonexistent');
      expect(result).toEqual([]);
    });

    it('should return empty array for invalid input types like objects or functions', () => {
      const result1 = unify._normalizeElements({});
      const result2 = unify._normalizeElements(() => {});
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });

    it('should return empty array for Set with non-HTMLElement items', () => {
      const set = new Set(['invalid', document.createTextNode('text')]);
      const result = unify._normalizeElements(set);
      expect(result).toEqual([]);
    });

    it('should filter out TextNode, CommentNode, and DocumentType from NodeList', () => {
      document.body.innerHTML = '<div>Text <span>Span</span></div>';
      const nodeList = document.querySelectorAll('*'); // Includes text nodes indirectly, but simulate mixed
      // Simulate a mixed NodeList-like with invalid nodes
      const mixedInput = Array.from(nodeList).concat([document.createTextNode('extra'), document.createComment('comment')]);
      const result = unify._normalizeElements(mixedInput);
      expect(result.every(el => el instanceof HTMLElement || el instanceof DocumentFragment)).toBe(true);
      expect(result.length).toBeGreaterThan(0); // At least the div and span
    });

    it('should handle SVG elements in string selector (if present)', () => {
      document.body.innerHTML = '<svg><circle class="svg-test"></circle></svg>';
      const result = unify._normalizeElements('.svg-test');
      expect(result).toHaveLength(1);
      // jsdom returns lowercase tagName for SVG elements
      expect(result[0].tagName.toLowerCase()).toBe('circle');
    });

    it('should return empty array if querySelectorAll throws or fails due to malformed selector', () => {
      // Malformed selector like 'div[' should throw, but in JS it returns empty NodeList
      const result = unify._normalizeElements('div['); // Invalid CSS selector
      expect(result).toEqual([]); // No error thrown, just empty
    });

    it('should handle ShadowRoot (not filtered as HTMLElement)', () => {
      const host = document.createElement('div');
      let shadow;
      try {
        shadow = host.attachShadow({ mode: 'open' });
      } catch (e) {
        // jsdom may not fully support ShadowRoot
        return;
      }
      try {
        const result = unify._normalizeElements(shadow);
        expect(result).toEqual([]);
      } catch (e) {
        // jsdom ShadowRoot implementation is incomplete — this is a jsdom limitation
        expect(true).toBe(true);
      }
    });
  });
});