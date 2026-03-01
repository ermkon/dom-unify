import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('back', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  it('should return to the previous state', () => {
    document.body.innerHTML = `
      <div class="parent">
        <span class="child">Child</span>
      </div>`;
    unify = dom('.parent');
    unify.find('.child');
    unify.back();
    const elements = unify.get();
    expect(elements).toHaveLength(1);
    expect(elements[0].className).toBe('parent');
  });

  it('should go back multiple steps', () => {
    document.body.innerHTML = `
      <div class="grandparent">
        <div class="parent">
          <span class="child">Child</span>
        </div>
      </div>`;
    unify = dom('.grandparent');
    unify.find('.parent');
    unify.find('.child');
    unify.back(2);
    const elements = unify.get();
    expect(elements).toHaveLength(1);
    expect(elements[0].className).toBe('grandparent');
  });

  it('should restore lastParents when context is empty', () => {
    document.body.innerHTML = `
      <div class="parent">
        <span class="child">Child</span>
      </div>`;
    unify = dom('.child');
    unify.delete();
    unify.back();
    const elements = unify.get();
    expect(elements).toHaveLength(1);
    expect(elements[0].className).toBe('parent');
  });

  it('should ignore if history is empty', () => {
    unify.back();
    expect(unify.get()).toEqual([document.body]);
  });

  it('should handle negative steps as an absolute index', () => {
    document.body.innerHTML = `
      <div class="level1">
        <div class="level2">
          <span class="level3">Deep</span>
        </div>
      </div>`;
    unify = dom('.level1');
    unify.find('.level2');
    unify.find('.level3');
    // negative steps: back(-1) goes to index 0 (first history entry)
    unify.back(-1);
    expect(unify.get()[0].className).toBe('level1');
  });

  it('should clear lastAdded on back', () => {
    unify.add({ tag: 'div', class: 'test' });
    expect(unify.lastAdded).toHaveLength(1);
    unify.find('.test');
    unify.back();
    expect(unify.lastAdded).toHaveLength(0);
  });

  it('should consume history on sequential back(1) calls', () => {
    document.body.innerHTML = '<div class="a"><div class="b"><div class="c"><span class="d"></span></div></div></div>';
    unify = dom('.a');
    unify.find('.b');
    unify.find('.c');
    unify.find('.d');
    // History: [[.a], [.b], [.c]], current: [.d]
    unify.back(1); // → .c, history shrinks to [[.a], [.b]]
    expect(unify.get()[0].className).toBe('c');
    unify.back(1); // → .b, history shrinks to [[.a]]
    expect(unify.get()[0].className).toBe('b');
    unify.back(1); // → .a, history shrinks to []
    expect(unify.get()[0].className).toBe('a');
    unify.back(1); // empty history, no-op
    expect(unify.get()[0].className).toBe('a');
  });

  it('should handle back(3) jumping multiple steps at once', () => {
    document.body.innerHTML = '<div class="a"><div class="b"><div class="c"><span class="d"></span></div></div></div>';
    unify = dom('.a');
    unify.find('.b');
    unify.find('.c');
    unify.find('.d');
    // History: [[.a], [.b], [.c]], current: [.d]
    unify.back(3); // → .a, history becomes []
    expect(unify.get()[0].className).toBe('a');
    // History is now empty
    unify.back(1);
    expect(unify.get()[0].className).toBe('a');
  });

  it('should back() after enter() correctly', () => {
    document.body.innerHTML = '<div class="parent"><span class="child">Test</span></div>';
    unify = dom('.parent');
    unify.enter(0);
    expect(unify.get()[0].className).toBe('child');
    unify.back();
    expect(unify.get()[0].className).toBe('parent');
  });

  it('should back() after up() correctly', () => {
    document.body.innerHTML = '<div class="parent"><span class="child">Test</span></div>';
    unify = dom('.child');
    unify.up();
    expect(unify.get()[0].className).toBe('parent');
    unify.back();
    expect(unify.get()[0].className).toBe('child');
  });
});