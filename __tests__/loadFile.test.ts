import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('loadFile', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  it('should load a file and call the callback', async () => {
    document.body.innerHTML = '<input type="file" id="file-input">';
    const callback = jest.fn();
    unify.loadFile('#file-input', callback, { readAs: 'text' });
    const input = document.querySelector('#file-input');
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    // Wait for FileReader async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(callback).toHaveBeenCalledWith('test content');
  });

  it('should call onError when input is missing', () => {
    const onError = jest.fn();
    unify.loadFile('#nonexistent', () => {}, { onError });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should use parse for data', async () => {
    document.body.innerHTML = '<input type="file" id="file-input">';
    const callback = jest.fn();
    const parse = jest.fn().mockReturnValue('parsed');
    unify.loadFile('#file-input', callback, { readAs: 'text', parse });
    const input = document.querySelector('#file-input');
    const file = new File(['raw'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(parse).toHaveBeenCalledWith('raw');
    expect(callback).toHaveBeenCalledWith('parsed');
  });

  it('should handle a file read error', (done) => {
    document.body.innerHTML = '<input type="file" id="file-input">';
    const onError = jest.fn();
    unify.loadFile('#file-input', () => {}, { readAs: 'text', onError });
    const input = document.querySelector('#file-input');
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [file] });
    jest.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function () {
      this.onerror();
    });
    input.dispatchEvent(new Event('change'));
    setTimeout(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      done();
    }, 0);
  });
});