import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DomUnify, dom } from '../index.js';

describe('save()', () => {
  let container, clickSpy, createdLink;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.id = 'form';
    document.body.appendChild(container);

    // Mock URL.createObjectURL / revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    // Capture <a> element created for download
    clickSpy = jest.fn();
    createdLink = null;
    const origCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        createdLink = { click: clickSpy, href: '', download: '' };
        return createdLink;
      }
      return origCreate(tag);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.URL.createObjectURL;
    delete global.URL.revokeObjectURL;
  });

  it('returns this for chaining', () => {
    const d = dom(container);
    expect(d.save()).toBe(d);
  });

  it('saves nested data as JSON by default', () => {
    container.innerHTML = '<span data-key="name">Alice</span><input data-key="age" value="30">';
    dom(container).save({ filename: 'test.json' });
    expect(clickSpy).toHaveBeenCalled();
    expect(createdLink.download).toBe('test.json');
    expect(URL.createObjectURL).toHaveBeenCalled();

    // Check the Blob content
    const blobArg = URL.createObjectURL.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('application/json');
  });

  it('saves flat data when mode is flat', () => {
    container.innerHTML = '<span data-key="x">hello</span>';
    dom(container).save({ mode: 'flat' });
    expect(clickSpy).toHaveBeenCalled();
  });

  it('uses custom filename', () => {
    dom(container).save({ filename: 'custom.json' });
    expect(createdLink.download).toBe('custom.json');
  });

  it('saves as CSV format', () => {
    container.innerHTML = '<span data-key="a">1</span><span data-key="b">2</span>';
    dom(container).save({ format: 'csv', filename: 'data.csv' });
    const blobArg = URL.createObjectURL.mock.calls[0][0];
    expect(blobArg.type).toBe('text/csv');
    expect(createdLink.download).toBe('data.csv');
  });

  it('saves as text format', () => {
    container.innerHTML = '<span data-key="msg">hello</span>';
    dom(container).save({ format: 'text', filename: 'out.txt' });
    const blobArg = URL.createObjectURL.mock.calls[0][0];
    expect(blobArg.type).toBe('text/plain');
  });

  it('applies transform function', () => {
    container.innerHTML = '<span data-key="val">test</span>';
    const transformFn = jest.fn(data => ({ ...data, extra: true }));
    dom(container).save({ transform: transformFn });
    expect(transformFn).toHaveBeenCalled();
  });

  it('revokes object URL after download', () => {
    dom(container).save();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});

describe('load()', () => {
  let container, fileInput;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.id = 'form';
    container.innerHTML = '<span data-key="name"></span><input data-key="email">';
    document.body.appendChild(container);

    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'file-input';
    document.body.appendChild(fileInput);
  });

  it('returns this for chaining', () => {
    const d = dom(container);
    expect(d.load('#file-input')).toBe(d);
  });

  it('calls onError when input not found', () => {
    const onError = jest.fn();
    dom(container).load('#nonexistent', { onError });
    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0].message).toContain('not found');
  });

  it('accepts DOM element as selector', () => {
    const d = dom(container).load(fileInput);
    expect(d).toBeDefined();
  });

  it('fills DOM on file load with JSON parse', (done) => {
    dom(container).load('#file-input', {
      parse: 'json',
      onLoad: (data) => {
        expect(data).toEqual({ name: 'Bob', email: 'bob@test.com' });
        expect(container.querySelector('[data-key="name"]').textContent).toBe('Bob');
        expect(container.querySelector('[data-key="email"]').value).toBe('bob@test.com');
        done();
      }
    });

    // Simulate file selection
    const jsonStr = JSON.stringify({ name: 'Bob', email: 'bob@test.com' });
    const file = new File([jsonStr], 'data.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', { value: [file], writable: true });
    fileInput.dispatchEvent(new Event('change'));
  });

  it('supports custom parse function', (done) => {
    dom(container).load('#file-input', {
      parse: (raw) => ({ name: raw.toUpperCase(), email: '' }),
      onLoad: (data) => {
        expect(data.name).toBe('HELLO');
        done();
      }
    });

    const file = new File(['hello'], 'data.txt', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: [file], writable: true });
    fileInput.dispatchEvent(new Event('change'));
  });

  it('does not fill when fill:false', (done) => {
    container.querySelector('[data-key="name"]').textContent = 'original';
    dom(container).load('#file-input', {
      fill: false,
      onLoad: (data) => {
        expect(container.querySelector('[data-key="name"]').textContent).toBe('original');
        done();
      }
    });

    const jsonStr = JSON.stringify({ name: 'changed' });
    const file = new File([jsonStr], 'data.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', { value: [file], writable: true });
    fileInput.dispatchEvent(new Event('change'));
  });

  it('handles parse error with onError callback', (done) => {
    dom(container).load('#file-input', {
      parse: 'json',
      onError: (err) => {
        expect(err).toBeDefined();
        done();
      }
    });

    const file = new File(['not valid json'], 'bad.json', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: [file], writable: true });
    fileInput.dispatchEvent(new Event('change'));
  });

  it('fills array data distributively', (done) => {
    document.body.innerHTML = '';
    const div1 = document.createElement('div');
    div1.innerHTML = '<span data-key="x"></span>';
    const div2 = document.createElement('div');
    div2.innerHTML = '<span data-key="x"></span>';
    document.body.appendChild(div1);
    document.body.appendChild(div2);

    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'fi2';
    document.body.appendChild(fileInput);

    dom([div1, div2]).load('#fi2', {
      onLoad: () => {
        expect(div1.querySelector('[data-key="x"]').textContent).toBe('A');
        expect(div2.querySelector('[data-key="x"]').textContent).toBe('B');
        done();
      }
    });

    const jsonStr = JSON.stringify([{ x: 'A' }, { x: 'B' }]);
    const file = new File([jsonStr], 'arr.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', { value: [file], writable: true });
    fileInput.dispatchEvent(new Event('change'));
  });
});

describe('sync() / unsync()', () => {
  let container;

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
    expect(container.querySelector('[data-key="theme"]').value).toBe('dark');
    expect(container.querySelector('[data-key="lang"]').value).toBe('en');
  });

  it('fills DOM from existing sessionStorage data', () => {
    sessionStorage.setItem('prefs', JSON.stringify({ theme: 'light' }));
    dom(container).sync('prefs', { storage: 'session' });
    expect(container.querySelector('[data-key="theme"]').value).toBe('light');
  });

  it('writes to localStorage on input event', (done) => {
    dom(container).sync('form-data', { debounce: 10 });
    const input = container.querySelector('[data-key="theme"]');
    input.value = 'blue';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      const saved = JSON.parse(localStorage.getItem('form-data'));
      expect(saved.theme).toBe('blue');
      done();
    }, 50);
  });

  it('writes to sessionStorage when storage is session', (done) => {
    dom(container).sync('sess-data', { storage: 'session', debounce: 10 });
    const input = container.querySelector('[data-key="lang"]');
    input.value = 'ru';
    input.dispatchEvent(new Event('change', { bubbles: true }));

    setTimeout(() => {
      const saved = JSON.parse(sessionStorage.getItem('sess-data'));
      expect(saved.lang).toBe('ru');
      done();
    }, 50);
  });

  it('debounces writes', (done) => {
    dom(container).sync('debounce-test', { debounce: 50 });
    const input = container.querySelector('[data-key="theme"]');

    // Fire multiple events rapidly
    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = 'ab';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      const saved = JSON.parse(localStorage.getItem('debounce-test'));
      expect(saved.theme).toBe('abc'); // Only last value saved
      done();
    }, 100);
  });

  it('calls onSync callback', (done) => {
    const onSync = jest.fn();
    dom(container).sync('cb-test', { debounce: 10, onSync });
    const input = container.querySelector('[data-key="theme"]');
    input.value = 'green';
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

    const input = container.querySelector('[data-key="theme"]');
    input.value = 'red';
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
    expect(d.sync(null)).toBe(d);
  });

  it('supports flat mode', (done) => {
    dom(container).sync('flat-test', { mode: 'flat', debounce: 10 });
    const input = container.querySelector('[data-key="theme"]');
    input.value = 'mono';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      const saved = JSON.parse(localStorage.getItem('flat-test'));
      expect(saved.theme).toBe('mono');
      done();
    }, 50);
  });

  it('does not fail when localStorage has invalid JSON', () => {
    localStorage.setItem('bad', 'not-json{{{');
    expect(() => dom(container).sync('bad')).not.toThrow();
  });
});
