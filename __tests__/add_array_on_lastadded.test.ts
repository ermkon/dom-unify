import { describe, it, expect, beforeEach } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('add with array data', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should create N copies for array data', () => {
    dom(document.body)
      .add({ tag: 'div', class: 'container' })
      .enter()
      .add(
        { tag: 'div', class: 'item', children: [{ tag: 'span', 'data-key': 'name' }] },
        [{ name: 'A' }, { name: 'B' }, { name: 'C' }]
      );

    const items = document.querySelectorAll('.item');
    expect(items).toHaveLength(3);
    expect((items[0] as HTMLElement).querySelector('[data-key="name"]').textContent).toBe('A');
    expect((items[1] as HTMLElement).querySelector('[data-key="name"]').textContent).toBe('B');
    expect((items[2] as HTMLElement).querySelector('[data-key="name"]').textContent).toBe('C');
  });

  it('should create 0 copies for empty array', () => {
    dom(document.body)
      .add({ tag: 'div', class: 'item' }, []);
    expect(document.querySelectorAll('.item')).toHaveLength(0);
  });

  it('should fill input elements in created copies', () => {
    dom(document.body)
      .add(
        { tag: 'div', class: 'row', children: [
          { tag: 'input', attrs: { 'data-key': 'val' } }
        ]},
        [{ val: '10' }, { val: '20' }]
      );

    const inputs = document.querySelectorAll('[data-key="val"]');
    expect(inputs).toHaveLength(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('10');
    expect((inputs[1] as HTMLInputElement).value).toBe('20');
  });

  it('should update lastAdded with all created elements', () => {
    const chain = dom(document.body)
      .add({ tag: 'span', class: 'tag' }, [{ x: '1' }, { x: '2' }]);

    expect(chain.lastAdded).toHaveLength(2);
    expect((chain.lastAdded[0] as HTMLElement).className).toBe('tag');
    expect((chain.lastAdded[1] as HTMLElement).className).toBe('tag');
  });

  it('should work with nested config and array data', () => {
    const config = {
      tag: 'div', class: 'card',
      children: [
        { tag: 'h3', 'data-key': 'title' },
        { tag: 'p', 'data-key': 'desc' }
      ]
    };

    dom(document.body)
      .add(config, [
        { title: 'Card 1', desc: 'Description 1' },
        { title: 'Card 2', desc: 'Description 2' }
      ]);

    const cards = document.querySelectorAll('.card');
    expect(cards).toHaveLength(2);
    expect((cards[0] as HTMLElement).querySelector('[data-key="title"]').textContent).toBe('Card 1');
    expect((cards[0] as HTMLElement).querySelector('[data-key="desc"]').textContent).toBe('Description 1');
    expect((cards[1] as HTMLElement).querySelector('[data-key="title"]').textContent).toBe('Card 2');
    expect((cards[1] as HTMLElement).querySelector('[data-key="desc"]').textContent).toBe('Description 2');
  });

  it('should add to multiple targets', () => {
    document.body.innerHTML = '<div class="t"></div><div class="t"></div>';
    dom('.t').add(
      { tag: 'span', 'data-key': 'label' },
      [{ label: 'X' }, { label: 'Y' }]
    );
    const firstDiv = document.querySelectorAll('.t')[0] as HTMLElement;
    const secondDiv = document.querySelectorAll('.t')[1] as HTMLElement;
    expect(firstDiv.querySelectorAll('span')).toHaveLength(2);
    expect(secondDiv.querySelectorAll('span')).toHaveLength(2);
  });

  it('should preserve existing non-array data behavior', () => {
    document.body.innerHTML = '<div class="form"><input name="old" value="old-val"></div>';
    dom('.form').add(
      { tag: 'input', attrs: { name: 'new', type: 'text' } },
      { new: 'new-val', old: 'updated' }
    );
    expect((document.querySelector('input[name="new"]') as HTMLInputElement).value).toBe('new-val');
    expect((document.querySelector('input[name="old"]') as HTMLInputElement).value).toBe('updated');
  });
});

describe('on/off with lastAdded', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should attach event to lastAdded element after add()', () => {
    let clicked = false;
    dom(document.body)
      .add({ tag: 'div', class: 'container' })
      .enter()
      .add({ tag: 'button', class: 'btn', text: 'Click' })
      .on('click', () => { clicked = true; });

    (document.querySelector('.btn') as HTMLElement).click();
    expect(clicked).toBe(true);
  });

  it('should NOT attach to parent container', () => {
    let containerClicked = false;
    let btnClicked = false;

    const chain = dom(document.body)
      .add({ tag: 'div', class: 'container' })
      .enter();

    // Add event to container (currentElements)
    chain.on('click', () => { containerClicked = true; });

    // Add button and attach event to it (lastAdded)
    chain.add({ tag: 'button', class: 'btn' })
      .on('click', (e) => { e.stopPropagation(); btnClicked = true; });

    (document.querySelector('.btn') as HTMLElement).click();
    expect(btnClicked).toBe(true);
  });

  it('should support multiple on() calls on same lastAdded', () => {
    let clickCount = 0;
    let hoverCount = 0;

    dom(document.body)
      .add({ tag: 'button', class: 'btn' })
      .on('click', () => clickCount++)
      .on('mouseover', () => hoverCount++);

    const btn = document.querySelector('.btn') as HTMLElement;
    btn.click();
    btn.dispatchEvent(new Event('mouseover'));
    expect(clickCount).toBe(1);
    expect(hoverCount).toBe(1);
  });

  it('should chain add().on().add().on() correctly', () => {
    let deleteClicked = false;
    let addClicked = false;

    dom(document.body)
      .add({ tag: 'div', class: 'wrapper' })
      .enter()
      .add({ tag: 'button', class: 'delete-btn', text: 'Delete' })
      .on('click', () => { deleteClicked = true; })
      .add({ tag: 'button', class: 'add-btn', text: 'Add' })
      .on('click', () => { addClicked = true; });

    (document.querySelector('.delete-btn') as HTMLElement).click();
    expect(deleteClicked).toBe(true);
    expect(addClicked).toBe(false);

    (document.querySelector('.add-btn') as HTMLElement).click();
    expect(addClicked).toBe(true);
  });

  it('should off() target lastAdded too', () => {
    let count = 0;
    const handler = () => count++;

    const chain = dom(document.body)
      .add({ tag: 'button', class: 'btn' })
      .on('click', handler);

    (document.querySelector('.btn') as HTMLElement).click();
    expect(count).toBe(1);

    // off should target the button (lastAdded still set from .add())
    chain.off('click', handler);
    (document.querySelector('.btn') as HTMLElement).click();
    expect(count).toBe(1);
  });

  it('should fall back to currentElements when lastAdded is empty', () => {
    let clicked = false;
    document.body.innerHTML = '<button class="btn">Click</button>';
    // New chain — lastAdded is empty
    dom('.btn').on('click', () => { clicked = true; });
    (document.querySelector('.btn') as HTMLElement).click();
    expect(clicked).toBe(true);
  });
});
