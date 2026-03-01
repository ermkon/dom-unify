import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DomUnify, dom } from '../index.js';

describe('sync() / unsync()', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.id = 'settings';
    container.innerHTML = '<input data-key="theme" value=""><input data-key="lang" value="">';
    document.body.appendChild(container);
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns this for chaining', () => {
    const d = dom(container);
    expect(d.sync('test-key')).toBe(d);
  });

  it('fills DOM from existing localStorage data', () => {
    localStorage.setItem('prefs', JSON.stringify({ theme: 'dark', lang: 'en' }));
    dom(container).sync('prefs');
    expect((container.querySelector('[data-key="theme"]') as HTMLInputElement).value).toBe('dark');
    expect((container.querySelector('[data-key="lang"]') as HTMLInputElement).value).toBe('en');
  });

  it('fills DOM from existing sessionStorage data', () => {
    sessionStorage.setItem('prefs', JSON.stringify({ theme: 'light' }));
    dom(container).sync('prefs', { storage: 'session' });
    expect((container.querySelector('[data-key="theme"]') as HTMLInputElement).value).toBe('light');
  });

  it('writes to localStorage on input event', (done) => {
    dom(container).sync('form-data', { debounce: 10 });
    const input = container.querySelector('[data-key="theme"]') as HTMLInputElement;
    (input as HTMLInputElement).value = 'blue';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      const saved = JSON.parse(localStorage.getItem('form-data')!);
      expect(saved.theme).toBe('blue');
      done();
    }, 50);
  });

  it('writes to sessionStorage when storage is session', (done) => {
    dom(container).sync('sess-data', { storage: 'session', debounce: 10 });
    const input = container.querySelector('[data-key="lang"]') as HTMLInputElement;
    (input as HTMLInputElement).value = 'ru';
    input.dispatchEvent(new Event('change', { bubbles: true }));

    setTimeout(() => {
      const saved = JSON.parse(sessionStorage.getItem('sess-data')!);
      expect(saved.lang).toBe('ru');
      done();
    }, 50);
  });

  it('debounces writes', (done) => {
    dom(container).sync('debounce-test', { debounce: 50 });
    const input = container.querySelector('[data-key="theme"]') as HTMLInputElement;

    (input as HTMLInputElement).value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    (input as HTMLInputElement).value = 'ab';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    (input as HTMLInputElement).value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      const saved = JSON.parse(localStorage.getItem('debounce-test')!);
      expect(saved.theme).toBe('abc');
      done();
    }, 100);
  });

  it('calls onSync callback', (done) => {
    const onSync = jest.fn();
    dom(container).sync('cb-test', { debounce: 10, onSync });
    const input = container.querySelector('[data-key="theme"]') as HTMLInputElement;
    (input as HTMLInputElement).value = 'green';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      expect(onSync).toHaveBeenCalledWith(expect.objectContaining({ theme: 'green' }));
      done();
    }, 50);
  });

  it('unsync removes event listeners', (done) => {
    const d = dom(container);
    d.sync('unsync-test', { debounce: 10 });
    d.unsync('unsync-test');

    const input = container.querySelector('[data-key="theme"]') as HTMLInputElement;
    (input as HTMLInputElement).value = 'red';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      expect(localStorage.getItem('unsync-test')).toBeNull();
      done();
    }, 50);
  });

  it('unsync returns this', () => {
    const d = dom(container);
    d.sync('x');
    expect(d.unsync('x')).toBe(d);
  });

  it('unsync is safe to call without sync', () => {
    const d = dom(container);
    expect(() => d.unsync('nonexistent')).not.toThrow();
  });

  it('ignores invalid key', () => {
    const d = dom(container);
    expect(d.sync('')).toBe(d);
  });

  it('supports flat mode', (done) => {
    dom(container).sync('flat-test', { mode: 'flat', debounce: 10 });
    const input = container.querySelector('[data-key="theme"]') as HTMLInputElement;
    (input as HTMLInputElement).value = 'mono';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      const saved = JSON.parse(localStorage.getItem('flat-test')!);
      expect(saved.theme).toBe('mono');
      done();
    }, 50);
  });

  it('does not fail when localStorage has invalid JSON', () => {
    localStorage.setItem('bad', 'not-json{{{');
    expect(() => dom(container).sync('bad')).not.toThrow();
  });
});
