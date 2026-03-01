import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('enter', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  it('should enter children by index', () => {
    document.body.innerHTML = `
      <div class="parent">
        <span class="child1">Child1</span>
        <span class="child2">Child2</span>
      </div>`;
    unify = dom('.parent');
    unify.enter(0);
    const elements = unify.get();
    expect(elements).toHaveLength(1);
    expect(elements[0].className).toBe('child1');
  });

  it('should enter the last added elements', () => {
    unify.add({ tag: 'div', class: 'parent' });
    unify.add({ tag: 'span', class: 'child' });
    unify.enter();
    const elements = unify.get();
    expect(elements).toHaveLength(1);
    expect(elements[0].className).toBe('child');
  });

  it('should keep current elements if there are no children', () => {
    unify.add({ tag: 'div', class: 'parent' });
    unify.enter();
    const elements = unify.get();
    expect(elements).toHaveLength(1);
    expect(elements[0].className).toBe('parent');
  });

  it('should handle a negative index', () => {
    document.body.innerHTML = `
      <div class="parent">
        <span class="child1">Child1</span>
        <span class="child2">Child2</span>
      </div>`;
    unify = dom('.parent');
    unify.enter(-1);
    const elements = unify.get();
    expect(elements).toHaveLength(1);
    expect(elements[0].className).toBe('child2');
  });

  it('should enter all children if no lastAdded and no index', () => {
    document.body.innerHTML = `
      <div class="parent">
        <span class="child1">Child1</span>
        <span class="child2">Child2</span>
      </div>`;
    unify = dom('.parent');
    unify.enter();
    const elements = unify.get();
    expect(elements).toHaveLength(2);
    expect(elements[0].className).toBe('child1');
    expect(elements[1].className).toBe('child2');
  });

  it('should save history on enter', () => {
    document.body.innerHTML = '<div class="parent"><span>Child</span></div>';
    unify = dom('.parent');
    unify.enter(0);
    unify.back();
    expect(unify.get()[0].className).toBe('parent');
  });

  it('should handle an out-of-bounds index', () => {
    document.body.innerHTML = '<div class="parent"><span>Child</span></div>';
    unify = dom('.parent');
    unify.enter(99);
    // No child at index 99, entered stays empty, fallback to currentElements
    expect(unify.get()[0].className).toBe('parent');
  });
});