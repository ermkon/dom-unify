import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('add', () => {
  let unify: InstanceType<typeof DomUnify>;

  beforeEach(() => {
    document.body.innerHTML = '';
    unify = dom(document.body);
  });

  it('should add an element from config to document.body', () => {
    const config = { tag: 'div', class: 'test', text: 'Hello' };
    unify.add(config);
    const div = document.body.querySelector('div.test');
    expect(div).not.toBeNull();
    expect(div.textContent).toBe('Hello');
    expect(div.className).toBe('test');
    expect(unify.lastAdded).toHaveLength(1);
  });

  it('should add multiple elements from an array of configs', () => {
    const config = [
      { tag: 'span', text: 'Span1' },
      { tag: 'span', text: 'Span2' },
    ];
    unify.add(config);
    const spans = document.body.querySelectorAll('span');
    expect(spans).toHaveLength(2);
    expect(spans[0].textContent).toBe('Span1');
    expect(spans[1].textContent).toBe('Span2');
    expect(unify.lastAdded).toHaveLength(2);
  });

  it('should apply data to input', () => {
    const config = { tag: 'input', attrs: { name: 'test' } };
    const data = { test: 'filled-value' };
    unify.add(config, data);
    const input = document.body.querySelector('input[name="test"]');
    expect(input).not.toBeNull();
    expect((input as HTMLInputElement).value).toBe('filled-value');
  });

  it('should handle an HTML string', () => {
    const config = '<div class="html-test">From HTML</div>';
    unify.add(config);
    const div = document.body.querySelector('div.html-test');
    expect(div).not.toBeNull();
    expect(div.textContent).toBe('From HTML');
  });

  it('should handle a JSON string', () => {
    const config = JSON.stringify({ tag: 'div', class: 'json-test', text: 'From JSON' });
    unify.add(config);
    const div = document.body.querySelector('div.json-test');
    expect(div).not.toBeNull();
    expect(div.textContent).toBe('From JSON');
  });

  it('should ignore invalid JSON', () => {
    const config = '{invalid: json}';
    unify.add(config);
    const div = document.body.querySelector('div');
    expect(div).toBeNull();
  });

  it('should add elements from another DomUnify instance', () => {
    const other = dom().add({ tag: 'div', class: 'other', text: 'Other' });
    unify.add(other);
    const div = document.body.querySelector('div.other');
    expect(div).not.toBeNull();
    expect(div.textContent).toBe('Other');
  });

  it('should return this for chaining', () => {
    const result = unify.add({ tag: 'div' });
    expect(result).toBe(unify);
  });

  it('should update lastAdded', () => {
    unify.add({ tag: 'span', class: 'a' });
    expect(unify.lastAdded).toHaveLength(1);
    expect((unify.lastAdded[0] as HTMLElement).className).toBe('a');
    unify.add({ tag: 'span', class: 'b' });
    expect(unify.lastAdded).toHaveLength(1);
    expect((unify.lastAdded[0] as HTMLElement).className).toBe('b');
  });

  it('should add a Node directly', () => {
    const span = document.createElement('span');
    span.textContent = 'Direct';
    unify.add(span);
    expect((document.body.querySelector('span') as HTMLElement).textContent).toBe('Direct');
  });

  it('should add to multiple targets', () => {
    document.body.innerHTML = '<div class="t"></div><div class="t"></div>';
    unify = dom('.t');
    unify.add({ tag: 'span', text: 'In' });
    const divs = document.body.querySelectorAll('.t');
    expect((divs[0] as HTMLElement).querySelector('span').textContent).toBe('In');
    expect((divs[1] as HTMLElement).querySelector('span').textContent).toBe('In');
  });
});