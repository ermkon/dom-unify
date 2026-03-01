import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('cut', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  it('should cut elements and store them in the buffer', () => {
    unify.add({ tag: 'div', class: 'test', text: 'Cut' });
    const chain = dom('.test');
    chain.cut();
    const divs = document.body.querySelectorAll('div.test');
    expect(divs).toHaveLength(0);
    // Use back() to return to parents, then paste from same instance
    chain.back();
    chain.paste();
    const pasted = document.body.querySelectorAll('div.test');
    expect(pasted).toHaveLength(1);
    expect(pasted[0].textContent).toBe('Cut');
  });

  it('should save parents in lastParents', () => {
    document.body.innerHTML = `
      <div class="parent">
        <span class="child">Child</span>
      </div>`;
    const chain = dom('.child');
    chain.cut();
    // back() restores lastParents when currentElements is empty
    chain.back();
    expect((chain.get()[0] as HTMLElement).className).toBe('parent');
  });

  it('should clear currentElements after cut', () => {
    unify.add({ tag: 'div', class: 'test' });
    const chain = dom('.test');
    chain.cut();
    expect(chain.get()).toHaveLength(0);
    expect(chain.lastAdded).toHaveLength(0);
  });

  it('should store originals in buffer (not clones)', () => {
    unify.add({ tag: 'div', class: 'test', text: 'X' });
    const el = document.body.querySelector('.test');
    const chain = dom('.test');
    chain.cut();
    // buffer contains actual elements (not clones)
    expect(chain.buffer[0]).toBe(el);
  });
});