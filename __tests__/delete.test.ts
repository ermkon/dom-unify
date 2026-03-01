import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('delete', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  it('should delete current elements', () => {
    unify.add({ tag: 'div', class: 'test' });
    unify = dom('.test');
    unify.delete();
    const divs = document.body.querySelectorAll('div.test');
    expect(divs).toHaveLength(0);
    expect(unify.get()).toHaveLength(0);
  });

  it('should save parents in lastParents', () => {
    document.body.innerHTML = `
      <div class="parent">
        <span class="child">Child</span>
      </div>`;
    unify = dom('.child');
    unify.delete();
    unify.back();
    expect((unify.get()[0] as HTMLElement).className).toBe('parent');
  });

  it('should clear lastAdded after delete', () => {
    unify.add({ tag: 'div', class: 'test' });
    expect(unify.lastAdded).toHaveLength(1);
    unify = dom('.test');
    unify.delete();
    expect(unify.lastAdded).toHaveLength(0);
  });

  it('should delete multiple elements', () => {
    document.body.innerHTML = '<span class="del">A</span><span class="del">B</span><span class="keep">C</span>';
    unify = dom('.del');
    unify.delete();
    expect(document.body.querySelectorAll('.del')).toHaveLength(0);
    expect((document.body.querySelector('.keep') as HTMLElement).textContent).toBe('C');
  });
});