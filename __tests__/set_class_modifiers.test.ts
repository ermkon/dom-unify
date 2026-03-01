import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('set class modifiers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should add class with + prefix', () => {
    document.body.innerHTML = '<div class="existing"></div>';
    dom('div').set({ class: '+new-class' });
    expect(document.querySelector('div').classList.contains('existing')).toBe(true);
    expect(document.querySelector('div').classList.contains('new-class')).toBe(true);
  });

  it('should remove class with - prefix', () => {
    document.body.innerHTML = '<div class="a b c"></div>';
    dom('div').set({ class: '-b' });
    expect(document.querySelector('div').classList.contains('a')).toBe(true);
    expect(document.querySelector('div').classList.contains('b')).toBe(false);
    expect(document.querySelector('div').classList.contains('c')).toBe(true);
  });

  it('should toggle class with ! prefix', () => {
    document.body.innerHTML = '<div class="active"></div>';
    dom('div').set({ class: '!active' });
    expect(document.querySelector('div').classList.contains('active')).toBe(false);
    dom('div').set({ class: '!active' });
    expect(document.querySelector('div').classList.contains('active')).toBe(true);
  });

  it('should handle multiple modifiers in one string', () => {
    document.body.innerHTML = '<div class="a b"></div>';
    dom('div').set({ class: '+c -a !b' });
    const div = document.querySelector('div');
    expect(div.classList.contains('a')).toBe(false);
    expect(div.classList.contains('b')).toBe(false); // toggled off
    expect(div.classList.contains('c')).toBe(true);
  });

  it('should replace className without modifier prefix (current behavior)', () => {
    document.body.innerHTML = '<div class="old"></div>';
    dom('div').set({ class: 'new' });
    expect(document.querySelector('div').className).toBe('new');
  });

  it('should replace with multiple classes without modifier', () => {
    document.body.innerHTML = '<div class="old"></div>';
    dom('div').set({ class: 'btn primary' });
    expect(document.querySelector('div').className).toBe('btn primary');
  });

  it('should clear className with empty string', () => {
    document.body.innerHTML = '<div class="something"></div>';
    dom('div').set({ class: '' });
    expect(document.querySelector('div').className).toBe('');
  });

  it('should work on multiple elements', () => {
    document.body.innerHTML = '<div class="item"></div><div class="item"></div>';
    dom('.item').set({ class: '+active' });
    const divs = document.querySelectorAll('.item');
    expect(divs[0].classList.contains('active')).toBe(true);
    expect(divs[1].classList.contains('active')).toBe(true);
  });
});
