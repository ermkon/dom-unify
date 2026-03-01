import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('on and off', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  it('should add and trigger an event handler', () => {
    let clicked = false;
    unify.add({ tag: 'button', class: 'test' });
    unify = dom('.test');
    unify.on('click', () => (clicked = true));
    const button = document.body.querySelector('button');
    button.click();
    expect(clicked).toBe(true);
  });

  it('should remove an event handler', () => {
    let clicked = false;
    const handler = () => (clicked = true);
    unify.add({ tag: 'button', class: 'test' });
    unify = dom('.test');
    unify.on('click', handler);
    unify.off('click', handler);
    const button = document.body.querySelector('button');
    button.click();
    expect(clicked).toBe(false);
  });

  it('should ignore an invalid handler', () => {
    unify.add({ tag: 'button', class: 'test' });
    unify = dom('.test');
    unify.on('click', 'nonexistent');
    const button = document.body.querySelector('button');
    button.click();
    expect(true).toBe(true);
  });

  it('should add a handler with arguments', () => {
    let result = '';
    unify.add({ tag: 'button', class: 'test' });
    unify = dom('.test');
    unify.on('click', (arg, e) => (result = arg), 'test-arg');
    const button = document.body.querySelector('button');
    button.click();
    expect(result).toBe('test-arg');
  });

  it('should remove all event handlers', () => {
    let count = 0;
    unify.add({ tag: 'button', class: 'test' });
    unify = dom('.test');
    unify.on('click', () => count++);
    unify.on('click', () => count++);
    unify.off('click');
    const button = document.body.querySelector('button');
    button.click();
    expect(count).toBe(0);
  });

  it('should ignore an invalid event name', () => {
    const result = unify.on('', () => {});
    expect(result).toBe(unify);
  });

  it('should ignore off with an empty name', () => {
    const result = unify.off('');
    expect(result).toBe(unify);
  });

  it('should work with multiple elements', () => {
    let count = 0;
    document.body.innerHTML = '<button class="btn">A</button><button class="btn">B</button>';
    unify = dom('.btn');
    unify.on('click', () => count++);
    document.querySelectorAll('.btn').forEach(b => (b as HTMLElement).click());
    expect(count).toBe(2);
  });

  it('should not break on off if there are no handlers', () => {
    document.body.innerHTML = '<button class="btn">A</button>';
    unify = dom('.btn');
    // off without prior on should not throw
    expect(() => unify.off('click')).not.toThrow();
  });

  it('should attach on by string name of a window function', () => {
    let called = false;
    (globalThis as any).testOnHandler = () => { called = true; };
    document.body.innerHTML = '<button class="btn">Click</button>';
    unify = dom('.btn');
    unify.on('click', 'testOnHandler');
    (document.querySelector('.btn') as HTMLElement).click();
    expect(called).toBe(true);
    delete (globalThis as any).testOnHandler;
  });

  it('should detach off by string name of a window function', () => {
    let count = 0;
    (globalThis as any).testOffHandler = () => { count++; };
    document.body.innerHTML = '<button class="btn">Click</button>';
    unify = dom('.btn');
    unify.on('click', 'testOffHandler');
    (document.querySelector('.btn') as HTMLElement).click();
    expect(count).toBe(1);
    unify.off('click', 'testOffHandler');
    (document.querySelector('.btn') as HTMLElement).click();
    expect(count).toBe(1);
    delete (globalThis as any).testOffHandler;
  });
});