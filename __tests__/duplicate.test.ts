import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('duplicate', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  it('should duplicate elements', () => {
    unify.add({ tag: 'div', class: 'test', text: 'Original' });
    unify = dom('.test');
    unify.duplicate();
    const divs = document.body.querySelectorAll('div.test');
    expect(divs).toHaveLength(2);
    expect(divs[0].textContent).toBe('Original');
    expect(divs[1].textContent).toBe('Original');
  });

  it('should duplicate to the beginning with position=prepend', () => {
    unify.add({ tag: 'div', class: 'test', text: 'Original' });
    unify = dom('.test');
    unify.duplicate('prepend');
    const divs = document.body.querySelectorAll('div.test');
    expect(divs).toHaveLength(2);
    expect(divs[0].textContent).toBe('Original');
    expect(divs[1].textContent).toBe('Original');
    expect(document.body.firstChild.className).toBe('test');
  });

  it('should not duplicate if there is no parent (DocumentFragment)', () => {
    // After appending to a fragment, children move into it
    const container = document.createElement('div');
    const orphan = document.createElement('span');
    orphan.className = 'orphan';
    // orphan has no parent
    unify = dom(orphan);
    unify.duplicate();
    // no parent → duplicate does nothing, no crash
    expect(document.body.querySelectorAll('.orphan')).toHaveLength(0);
  });

  it('should duplicate multiple elements', () => {
    document.body.innerHTML = '<span class="d">A</span><span class="d">B</span>';
    unify = dom('.d');
    unify.duplicate();
    expect(document.body.querySelectorAll('.d')).toHaveLength(4);
  });

  it('should preserve clone content', () => {
    document.body.innerHTML = '<div class="src"><span>Inner</span></div>';
    unify = dom('.src');
    unify.duplicate();
    const divs = document.body.querySelectorAll('.src');
    expect(divs).toHaveLength(2);
    expect(divs[1].querySelector('span').textContent).toBe('Inner');
  });

  it('should return this for chaining', () => {
    document.body.innerHTML = '<div class="c">C</div>';
    unify = dom('.c');
    expect(unify.duplicate()).toBe(unify);
  });
});