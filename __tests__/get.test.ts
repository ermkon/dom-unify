import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('get', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  it('should return current elements without arguments', () => {
    unify.add({ tag: 'div', class: 'test' });
    unify = dom('.test');
    expect(unify.get()).toHaveLength(1);
    expect(unify.get()[0].className).toBe('test');
  });

  it('should return an element by index', () => {
    unify.add({ tag: 'div', class: 'test1' });
    unify.add({ tag: 'div', class: 'test2' });
    unify = dom('div');
    expect(unify.get(0).className).toBe('test1');
    expect(unify.get(-1).className).toBe('test2');
  });

  it('should get data from input', () => {
    document.body.innerHTML = '<input name="test" value="input-value">';
    unify = dom(document.body);
    const result = unify.get({ mode: 'form' });
    expect(result).toEqual([{ test: 'input-value' }]);
  });

  it('should get data from multiple select', () => {
    document.body.innerHTML = `
      <select name="options" multiple>
        <option value="a" selected>A</option>
        <option value="b" selected>B</option>
      </select>`;
    unify = dom(document.body);
    const result = unify.get({ mode: 'form' });
    expect(result).toEqual([{ options: ['a', 'b'] }]);
  });

  it('should ignore disabled elements', () => {
    document.body.innerHTML = '<input name="test" value="disabled-value" disabled>';
    unify = dom(document.body);
    const result = unify.get({ mode: 'form', includeDisabled: false });
    expect(result).toEqual([{}]);
  });

  it('should handle file input', () => {
    document.body.innerHTML = '<input type="file" name="file">';
    unify = dom(document.body);
    const input = document.body.querySelector('input');
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [file] });
    const result = unify.get({ mode: 'form', fileHandling: 'names' });
    expect(result).toEqual([{ file: ['test.txt'] }]);
  });

  it('should handle handleDuplicates as array', () => {
    document.body.innerHTML = `
      <input name="test" value="value1">
      <input name="test" value="value2">`;
    unify = dom(document.body);
    const result = unify.get({ mode: 'form', handleDuplicates: 'array' });
    expect(result).toEqual([{ test: ['value1', 'value2'] }]);
  });

  it('should use transformKey and transformValue', () => {
    document.body.innerHTML = '<input name="test" value="value">';
    unify = dom(document.body);
    const result = unify.get({
      mode: 'form',
      transformKey: k => k.toUpperCase(),
      transformValue: v => v.toUpperCase(),
    });
    expect(result).toEqual([{ TEST: 'VALUE' }]);
  });

  it('should return null for an out-of-bounds index', () => {
    unify.add({ tag: 'div', class: 'test' });
    unify = dom('.test');
    expect(unify.get(99)).toBeNull();
    expect(unify.get(-99)).toBeNull();
  });

  it('should return null for an empty context with index', () => {
    unify = dom('.nonexistent');
    expect(unify.get(0)).toBeNull();
  });

  it('should handle handleDuplicates: last', () => {
    document.body.innerHTML = '<input name="x" value="1"><input name="x" value="2">';
    unify = dom(document.body);
    const result = unify.get({ mode: 'form', handleDuplicates: 'last' });
    expect(result).toEqual([{ x: '2' }]);
  });

  it('should handle handleDuplicates: first', () => {
    document.body.innerHTML = '<input name="x" value="1"><input name="x" value="2">';
    unify = dom(document.body);
    const result = unify.get({ mode: 'form', handleDuplicates: 'first' });
    expect(result).toEqual([{ x: '1' }]);
  });

  it('should throw an error on handleDuplicates: error', () => {
    document.body.innerHTML = '<input name="x" value="1"><input name="x" value="2">';
    unify = dom(document.body);
    expect(() => unify.get({ mode: 'form', handleDuplicates: 'error' })).toThrow('Duplicate key: x');
  });

  it('should exclude empty values with excludeEmpty', () => {
    document.body.innerHTML = '<input name="empty" value=""><input name="full" value="ok">';
    unify = dom(document.body);
    const result = unify.get({ mode: 'form', excludeEmpty: true });
    expect(result).toEqual([{ full: 'ok' }]);
  });

  it('should exclude by class', () => {
    document.body.innerHTML = '<input name="a" value="1" class="skip"><input name="b" value="2">';
    unify = dom(document.body);
    const result = unify.get({ mode: 'form', exclude: { classes: ['skip'], ids: [], names: [], types: [], data: {} } });
    expect(result).toEqual([{ b: '2' }]);
  });

  it('should include disabled with includeDisabled', () => {
    document.body.innerHTML = '<input name="test" value="val" disabled>';
    unify = dom(document.body);
    const result = unify.get({ mode: 'form', includeDisabled: true });
    expect(result).toEqual([{ test: 'val' }]);
  });

  it('should include buttons with includeButtons', () => {
    document.body.innerHTML = '<button name="btn" value="click">Click</button>';
    unify = dom(document.body);
    const result = unify.get({ mode: 'form', includeButtons: true });
    expect(result).toEqual([{ btn: 'click' }]);
  });

  it('should handle checkbox and radio', () => {
    document.body.innerHTML = `
      <input type="checkbox" name="cb" value="yes" checked>
      <input type="radio" name="rad" value="a" checked>
      <input type="radio" name="rad" value="b">`;
    unify = dom(document.body);
    const result = unify.get({ mode: 'form' });
    expect(result).toEqual([{ cb: 'yes', rad: 'a' }]);
  });

  it('should handle fileHandling: meta', () => {
    document.body.innerHTML = '<input type="file" name="file">';
    const input = document.body.querySelector('input');
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [file] });
    unify = dom(document.body);
    const result = unify.get({ mode: 'form', fileHandling: 'meta' });
    expect(result[0].file[0]).toHaveProperty('name', 'test.txt');
    expect(result[0].file[0]).toHaveProperty('type', 'text/plain');
    expect(result[0].file[0]).toHaveProperty('size');
  });

  it('should handle fileHandling: none', () => {
    document.body.innerHTML = '<input type="file" name="file">';
    const input = document.body.querySelector('input');
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [file] });
    unify = dom(document.body);
    const result = unify.get({ mode: 'form', fileHandling: 'none' });
    expect(result).toEqual([{}]);
  });

  it('should exclude by ids', () => {
    document.body.innerHTML = '<input id="skip" name="a" value="1"><input name="b" value="2">';
    unify = dom(document.body);
    const result = unify.get({ mode: 'form', exclude: { classes: [], ids: ['skip'], names: [], types: [], data: {} } });
    expect(result).toEqual([{ b: '2' }]);
  });

  it('should exclude by names', () => {
    document.body.innerHTML = '<input name="secret" value="1"><input name="ok" value="2">';
    unify = dom(document.body);
    const result = unify.get({ mode: 'form', exclude: { classes: [], ids: [], names: ['secret'], types: [], data: {} } });
    expect(result).toEqual([{ ok: '2' }]);
  });

  it('should exclude by types', () => {
    document.body.innerHTML = '<input type="hidden" name="h" value="1"><input type="text" name="t" value="2">';
    unify = dom(document.body);
    const result = unify.get({ mode: 'form', exclude: { classes: [], ids: [], names: [], types: ['hidden'], data: {} } });
    expect(result).toEqual([{ t: '2' }]);
  });

  it('should skip empty values with excludeEmpty', () => {
    document.body.innerHTML = '<input name="filled" value="ok"><input name="empty" value="">';
    unify = dom(document.body);
    const result = unify.get({ mode: 'form', excludeEmpty: true });
    expect(result).toEqual([{ filled: 'ok' }]);
  });
});