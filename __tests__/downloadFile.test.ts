import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('downloadFile', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
    // Mock URL.createObjectURL / revokeObjectURL (not available in jsdom)
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    delete global.URL.createObjectURL;
    delete global.URL.revokeObjectURL;
  });

  it('should create a file for download', () => {
    const clickSpy = jest.fn();
    const spy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        return { click: clickSpy, href: '', download: '' };
      }
      return document.createElement.wrappedMethod ? document.createElement.wrappedMethod(tag) : Object.getPrototypeOf(document).createElement.call(document, tag);
    });
    unify.downloadFile('test content', { filename: 'test.txt' });
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should use format for content', () => {
    const clickSpy = jest.fn();
    const spy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        return { click: clickSpy, href: '', download: '' };
      }
      return Object.getPrototypeOf(document).createElement.call(document, tag);
    });
    const format = jest.fn().mockReturnValue('formatted');
    unify.downloadFile('content', { filename: 'test.txt', format });
    expect(format).toHaveBeenCalledWith('content');
    expect(clickSpy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should handle a formatting error', () => {
    const spy = jest.spyOn(document, 'createElement').mockReturnValue({
      click: jest.fn(),
      href: '',
      download: '',
    });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const format = () => { throw new Error('Format error'); };
    unify.downloadFile('content', { filename: 'test.txt', format });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Download format error:', expect.any(Error));
    spy.mockRestore();
  });

  it('should use default values without options', () => {
    const clickSpy = jest.fn();
    const spy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        return { click: clickSpy, href: '', download: '' };
      }
      return Object.getPrototypeOf(document).createElement.call(document, tag);
    });
    unify.downloadFile('text content');
    expect(clickSpy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should use a custom mimeType', () => {
    const clickSpy = jest.fn();
    const spy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        return { click: clickSpy, href: '', download: '' };
      }
      return Object.getPrototypeOf(document).createElement.call(document, tag);
    });
    unify.downloadFile('{"a":1}', { filename: 'data.json', mimeType: 'application/json' });
    expect(clickSpy).toHaveBeenCalled();
    spy.mockRestore();
  });
});