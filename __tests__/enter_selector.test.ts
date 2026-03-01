import { DomUnify, dom } from '../index.js';

describe('enter(selector)', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);
  });

  test('enter(selector) selects direct children matching selector', () => {
    container.innerHTML = '<span class="a">1</span><div class="b">2</div><span class="a">3</span>';
    const d = dom(container).enter('span');
    expect(d.currentElements.length).toBe(2);
    expect(d.currentElements[0].textContent).toBe('1');
    expect(d.currentElements[1].textContent).toBe('3');
  });

  test('enter(selector) only matches direct children, not deeper descendants', () => {
    container.innerHTML = '<div><span class="deep">nested</span></div><span class="direct">top</span>';
    const d = dom(container).enter('span');
    expect(d.currentElements.length).toBe(1);
    expect(d.currentElements[0].textContent).toBe('top');
  });

  test('enter(selector) with class selector', () => {
    container.innerHTML = '<div class="item">1</div><div class="other">2</div><div class="item">3</div>';
    const d = dom(container).enter('.item');
    expect(d.currentElements.length).toBe(2);
  });

  test('enter(selector) with id selector', () => {
    container.innerHTML = '<div id="target">found</div><div>other</div>';
    const d = dom(container).enter('#target');
    expect(d.currentElements.length).toBe(1);
    expect(d.currentElements[0].id).toBe('target');
  });

  test('enter(selector) falls back to currentElements when no match', () => {
    container.innerHTML = '<div>1</div><div>2</div>';
    const d = dom(container).enter('.nonexistent');
    // Falls back to currentElements since entered is empty
    expect(d.currentElements.length).toBe(1);
    expect(d.currentElements[0]).toBe(container);
  });

  test('enter(selector) pushes to history', () => {
    container.innerHTML = '<span>a</span>';
    const d = dom(container);
    expect(d.elementHistory.length).toBe(0);
    d.enter('span');
    expect(d.elementHistory.length).toBe(1);
  });

  test('enter(selector) works with multiple current elements', () => {
    document.body.innerHTML = '<div class="box"><span>a</span><p>b</p></div><div class="box"><span>c</span><p>d</p></div>';
    const d = dom('.box').enter('span');
    expect(d.currentElements.length).toBe(2);
    expect(d.currentElements[0].textContent).toBe('a');
    expect(d.currentElements[1].textContent).toBe('c');
  });

  test('enter(selector) with attribute selector', () => {
    container.innerHTML = '<div data-type="active">1</div><div>2</div>';
    const d = dom(container).enter('[data-type="active"]');
    expect(d.currentElements.length).toBe(1);
    expect(d.currentElements[0].textContent).toBe('1');
  });

  test('enter(number) still works after adding selector support', () => {
    container.innerHTML = '<div>0</div><div>1</div><div>2</div>';
    const d = dom(container).enter(1);
    expect(d.currentElements.length).toBe(1);
    expect(d.currentElements[0].textContent).toBe('1');
  });

  test('enter() without args still enters lastAdded or all children', () => {
    container.innerHTML = '<div>a</div><div>b</div>';
    const d = dom(container).enter();
    expect(d.currentElements.length).toBe(2);
  });
});
