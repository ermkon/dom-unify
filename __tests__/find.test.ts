import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('find', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  it('should find elements by selector', () => {
    document.body.innerHTML = `
      <div class="parent">
        <span class="child">Child1</span>
        <span class="child">Child2</span>
      </div>`;
    unify = dom('.parent');
    unify.find('.child');
    const elements = unify.get();
    expect(elements).toHaveLength(2);
    expect((elements[0] as HTMLElement).className).toBe('child');
    expect((elements[1] as HTMLElement).className).toBe('child');
  });

  it('should return an empty array for an invalid selector', () => {
    document.body.innerHTML = '<div class="parent"></div>';
    unify = dom('.parent');
    unify.find('.nonexistent');
    expect(unify.get()).toHaveLength(0);
  });

  it('should find all elements with selector *', () => {
    document.body.innerHTML = `
      <div class="parent">
        <span>Child1</span>
        <p>Child2</p>
      </div>`;
    unify = dom('.parent');
    unify.find('*');
    expect(unify.get()).toHaveLength(2);
  });

  it('should clear context without a selector', () => {
    document.body.innerHTML = '<div class="parent"></div>';
    unify = dom('.parent');
    unify.find();
    expect(unify.get()).toHaveLength(0);
  });

  it('should always get fresh results (no stale cache)', () => {
    document.body.innerHTML = '<div class="parent"><span class="child">A</span></div>';
    unify = dom('.parent');
    unify.find('.child');
    expect(unify.get()).toHaveLength(1);
    unify.back();
    // Dynamically add another .child
    const newChild = document.createElement('span');
    newChild.className = 'child';
    newChild.textContent = 'B';
    document.querySelector('.parent').appendChild(newChild);
    unify.find('.child');
    expect(unify.get()).toHaveLength(2);
  });

  it('should push history on each find call', () => {
    document.body.innerHTML = '<div class="a"><div class="b"><span class="c"></span></div></div>';
    unify = dom('.a');
    unify.find('.b');
    unify.find('.c');
    // History: [.a], [.b], current: [.c]
    expect((unify.get()[0] as HTMLElement).className).toBe('c');
    unify.back(1);
    expect((unify.get()[0] as HTMLElement).className).toBe('b');
    unify.back(1);
    expect((unify.get()[0] as HTMLElement).className).toBe('a');
  });

  it('should find nested elements from multiple parents', () => {
    document.body.innerHTML = `
      <div class="box"><span class="item">1</span></div>
      <div class="box"><span class="item">2</span></div>`;
    unify = dom(document.body);
    unify.find('.box');
    expect(unify.get()).toHaveLength(2);
    unify.find('.item');
    expect(unify.get()).toHaveLength(2);
    expect(unify.get()[0].textContent).toBe('1');
    expect(unify.get()[1].textContent).toBe('2');
  });

  it('should handle find with attribute selectors', () => {
    document.body.innerHTML = '<div><input name="email" /><input name="phone" /></div>';
    unify = dom(document.body);
    unify.find('[name="email"]');
    expect(unify.get()).toHaveLength(1);
    expect((unify.get()[0] as HTMLElement).getAttribute('name')).toBe('email');
  });

  it('should return empty for find inside empty elements', () => {
    document.body.innerHTML = '<div class="empty"></div>';
    unify = dom('.empty');
    unify.find('span');
    expect(unify.get()).toHaveLength(0);
  });
});