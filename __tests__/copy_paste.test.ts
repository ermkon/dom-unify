import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('copy and paste', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  it('should copy and paste elements', () => {
    unify.add({ tag: 'div', class: 'test', text: 'Original' });
    unify.copy();
    unify.paste();
    const divs = document.body.querySelectorAll('div.test');
    expect(divs).toHaveLength(2);
    expect((divs[0] as HTMLElement).textContent).toBe('Original');
    expect((divs[1] as HTMLElement).textContent).toBe('Original');
  });

  it('should insert elements at the beginning with position=prepend', () => {
    unify.add({ tag: 'div', class: 'first', text: 'First' });
    unify.add({ tag: 'div', class: 'second', text: 'Second' });
    // copy .first, then paste into body at prepend position
    dom(document.body).find('.first').copy();
    const u2 = dom(document.body);
    u2.buffer = dom(document.body).find('.first').copy().buffer;
    // Simpler approach: copy first, go back to body, paste prepend
    const chain = dom(document.body);
    chain.find('.first');
    chain.copy();
    chain.back(); // back to body
    chain.paste('prepend');
    const divs = document.body.querySelectorAll('div');
    expect(divs).toHaveLength(3);
    expect((divs[0] as HTMLElement).className).toBe('first');
    expect((divs[0] as HTMLElement).textContent).toBe('First');
    expect((divs[1] as HTMLElement).className).toBe('first');
    expect((divs[2] as HTMLElement).className).toBe('second');
  });

  it('should paste at a specific index', () => {
    unify.add({ tag: 'div', class: 'first', text: 'First' });
    unify.add({ tag: 'div', class: 'second', text: 'Second' });
    unify = dom(document.body);
    unify.find('.first').copy().paste(1);
    const divs = document.body.querySelectorAll('div');
    expect(divs).toHaveLength(3);
    expect((divs[0] as HTMLElement).className).toBe('first');
    expect((divs[1] as HTMLElement).className).toBe('first');
    expect((divs[2] as HTMLElement).className).toBe('second');
  });

  it('should do nothing if the buffer is empty', () => {
    unify.paste();
    expect(document.body.children).toHaveLength(0);
  });

  it('should preserve the original when copying', () => {
    unify.add({ tag: 'div', class: 'orig', text: 'Original' });
    unify = dom('.orig');
    unify.copy();
    // original should still be in DOM
    expect(document.body.querySelector('.orig')).not.toBeNull();
    // buffer should have cloned copies
    expect(unify.buffer).toHaveLength(1);
    expect(unify.buffer[0]).not.toBe(document.body.querySelector('.orig'));
  });

  it('should paste multiple times', () => {
    unify.add({ tag: 'span', class: 'src', text: 'S' });
    unify = dom(document.body);
    unify.copy();
    unify.paste();
    unify.paste();
    // body had 1 span, pasted 2x copies of body content (each paste adds 1 span clone)
    expect(document.body.querySelectorAll('.src').length).toBeGreaterThanOrEqual(2);
  });

  it('should return this for chaining', () => {
    expect(unify.copy()).toBe(unify);
    unify.buffer = [document.createElement('div')];
    expect(unify.paste()).toBe(unify);
  });

  it('should paste at a negative index', () => {
    document.body.innerHTML = '<div class="container"><p>First</p><p>Second</p><p>Third</p></div>';
    const chain = dom('.container');
    chain.find('p:first-child').copy();
    chain.back().paste(-1);
    const ps = document.body.querySelectorAll('.container p');
    expect(ps).toHaveLength(4);
    // negative -1 inserts before last child
    expect(ps[2].textContent).toBe('First');
  });
});