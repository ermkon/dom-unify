import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('mark and getMark', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  it('should mark and restore elements', () => {
    unify.add({ tag: 'div', class: 'test' });
    unify.enter(); // enter into lastAdded (.test div)
    unify.mark('test-mark');
    unify.back(); // back to body
    unify.getMark('test-mark');
    const elements = unify.get();
    expect(elements).toHaveLength(1);
    expect(elements[0].className).toBe('test');
  });

  it('should ignore an invalid mark', () => {
    unify.add({ tag: 'div', class: 'test' });
    unify.getMark('nonexistent');
    const elements = unify.get();
    expect(elements).toHaveLength(1);
    expect(elements[0].tagName).toBe('BODY');
  });

  it('should overwrite an existing mark', () => {
    unify.add({ tag: 'div', class: 'test1' });
    unify.mark('mark');
    unify.add({ tag: 'div', class: 'test2' });
    unify.mark('mark');
    unify.getMark('mark');
    expect(unify.get()[0].className).toBe('test2');
  });

  it('should ignore mark with an empty name', () => {
    const result = unify.mark('');
    expect(result).toBe(unify);
  });

  it('should ignore getMark with an empty name', () => {
    const result = unify.getMark('');
    expect(result).toBe(unify);
    // context unchanged
    expect(unify.get()[0].tagName).toBe('BODY');
  });

  it('should mark lastAdded if present', () => {
    unify.add({ tag: 'span', class: 'added' });
    unify.mark('m');
    unify.getMark('m');
    expect(unify.get()[0].className).toBe('added');
  });

  it('should have a root mark by default', () => {
    unify.getMark('root');
    expect(unify.get()[0].tagName).toBe('BODY');
  });
});