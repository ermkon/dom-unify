import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('up', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  it('should go to the parent element', () => {
    document.body.innerHTML = `
      <div class="parent">
        <span class="child">Child</span>
      </div>`;
    unify = dom('.child');
    unify.up();
    const elements = unify.get();
    expect(elements).toHaveLength(1);
    expect((elements[0] as HTMLElement).className).toBe('parent');
  });

  it('should go up multiple levels', () => {
    document.body.innerHTML = `
      <div class="grandparent">
        <div class="parent">
          <span class="child">Child</span>
        </div>
      </div>`;
    unify = dom('.child');
    unify.up(2);
    const elements = unify.get();
    expect(elements).toHaveLength(1);
    expect((elements[0] as HTMLElement).className).toBe('grandparent');
  });

  it('should find a parent by selector', () => {
    document.body.innerHTML = `
      <div class="parent">
        <span class="child">Child</span>
      </div>`;
    unify = dom('.child');
    unify.up('.parent');
    const elements = unify.get();
    expect(elements).toHaveLength(1);
    expect((elements[0] as HTMLElement).className).toBe('parent');
  });

  it('should go to body with selector=-1', () => {
    document.body.innerHTML = `
      <div class="parent">
        <span class="child">Child</span>
      </div>`;
    unify = dom('.child');
    unify.up(-1);
    const elements = unify.get();
    expect(elements).toHaveLength(1);
    expect((elements[0] as HTMLElement).tagName).toBe('BODY');
  });

  it('should save history on up', () => {
    document.body.innerHTML = '<div class="parent"><span class="child">C</span></div>';
    unify = dom('.child');
    unify.up();
    unify.back();
    expect((unify.get()[0] as HTMLElement).className).toBe('child');
  });

  it('should clear lastAdded on up', () => {
    document.body.innerHTML = '<div><span>C</span></div>';
    unify = dom('span');
    unify.add({ tag: 'b', text: 'x' });
    expect(unify.lastAdded.length).toBeGreaterThan(0);
    unify.up();
    expect(unify.lastAdded).toHaveLength(0);
  });

  it('should deduplicate parents', () => {
    document.body.innerHTML = '<div class="p"><span>A</span><span>B</span></div>';
    unify = dom('span');
    unify.up();
    // Both spans have same parent — should deduplicate
    expect(unify.get()).toHaveLength(1);
    expect((unify.get()[0] as HTMLElement).className).toBe('p');
  });
});