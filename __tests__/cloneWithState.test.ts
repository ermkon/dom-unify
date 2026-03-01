import { DomUnify, dom } from '../index.js';

describe('_cloneWithState()', () => {
  test('clones input text value', () => {
    const input = document.createElement('input');
    input.type = 'text';
    (input as HTMLInputElement).value = 'hello';
    const clone = DomUnify._cloneWithState(input);
    expect((clone as any).value).toBe('hello');
    expect((clone as any).tagName).toBe('INPUT');
  });

  test('clones checkbox checked state', () => {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    const clone = DomUnify._cloneWithState(cb);
    expect((clone as HTMLInputElement).checked).toBe(true);
  });

  test('clones radio checked state', () => {
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.checked = true;
    const clone = DomUnify._cloneWithState(radio);
    expect((clone as HTMLInputElement).checked).toBe(true);
  });

  test('clones textarea value', () => {
    const textarea = document.createElement('textarea');
    (textarea as unknown as HTMLInputElement).value = 'some text content';
    const clone = DomUnify._cloneWithState(textarea);
    expect((clone as any).value).toBe('some text content');
  });

  test('clones select selectedIndex', () => {
    const select = document.createElement('select');
    for (let i = 0; i < 3; i++) {
      const opt = document.createElement('option');
      opt.value = `opt${i}`;
      opt.textContent = `Option ${i}`;
      select.appendChild(opt);
    }
    select.selectedIndex = 2;
    const clone = DomUnify._cloneWithState(select);
    expect((clone as HTMLSelectElement).options[2].selected).toBe(true);
  });

  test('clones multiple select state', () => {
    const select = document.createElement('select');
    select.multiple = true;
    for (let i = 0; i < 3; i++) {
      const opt = document.createElement('option');
      opt.value = `opt${i}`;
      select.appendChild(opt);
    }
    select.options[0].selected = true;
    select.options[2].selected = true;
    const clone = DomUnify._cloneWithState(select);
    expect((clone as HTMLSelectElement).options[0].selected).toBe(true);
    expect((clone as HTMLSelectElement).options[1].selected).toBe(false);
    expect((clone as HTMLSelectElement).options[2].selected).toBe(true);
  });

  test('clones nested form elements inside a container', () => {
    const div = document.createElement('div');
    const input = document.createElement('input');
    input.type = 'text';
    (input as HTMLInputElement).value = 'nested value';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    div.appendChild(input);
    div.appendChild(cb);

    const clone = DomUnify._cloneWithState(div);
    expect(((clone as HTMLElement).querySelector('input[type="text"]') as HTMLInputElement).value).toBe('nested value');
    expect(((clone as HTMLElement).querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(true);
  });

  test('cloneNode(true) alone does NOT preserve input value — _cloneWithState does', () => {
    const input = document.createElement('input');
    (input as HTMLInputElement).value = 'changed';
    // cloneNode doesn't copy the programmatic value
    const naiveClone = input.cloneNode(true);
    // _cloneWithState does
    const smartClone = DomUnify._cloneWithState(input);
    expect((smartClone as HTMLInputElement).value).toBe('changed');
  });
});

describe('copy() preserves form state', () => {
  test('copy() preserves input values in buffer', () => {
    document.body.innerHTML = '<div id="box"><input type="text" value="init"></div>';
    const d = dom('#box input');
    (d.get(0) as HTMLInputElement).value = 'modified';
    d.copy();
    expect((d.buffer[0] as HTMLInputElement).value).toBe('modified');
  });

  test('copy() preserves checkbox state in buffer', () => {
    document.body.innerHTML = '<div><input type="checkbox"></div>';
    const cb = document.querySelector('input');
    cb.checked = true;
    const d = dom('input');
    d.copy();
    expect((d.buffer[0] as HTMLInputElement).checked).toBe(true);
  });
});

describe('paste() preserves form state', () => {
  test('paste() clones with form state', () => {
    document.body.innerHTML = '<div id="src"><input type="text"></div><div id="dest"></div>';
    const input = document.querySelector('#src input');
    (input as HTMLInputElement).value = 'pasted value';
    const d = dom('#src input');
    d.copy();
    // Transfer buffer to destination instance
    const d2 = dom('#dest');
    d2.buffer = d.buffer;
    d2.paste();
    const pasted = document.querySelector('#dest input') as HTMLInputElement;
    expect(pasted.value).toBe('pasted value');
  });
});

describe('duplicate() preserves form state', () => {
  test('duplicate() clones with form state', () => {
    document.body.innerHTML = '<div id="wrap"><div id="item"><input type="text"></div></div>';
    const input = document.querySelector('#item input');
    (input as HTMLInputElement).value = 'dup value';
    dom('#item').duplicate();
    const items = document.querySelectorAll('#wrap > div');
    expect(items.length).toBe(2);
    expect((items[1] as HTMLElement).querySelector('input').value).toBe('dup value');
  });
});

describe('paste() position extensions', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.id = 'wrap';
    document.body.appendChild(container);
  });

  test('paste("before") inserts before the current element', () => {
    container.innerHTML = '<p id="a">A</p><p id="b">B</p>';
    const d = dom('#a');
    d.copy();
    const d2 = dom('#b');
    d2.buffer = d.buffer;
    d2.paste('before');
    const children = Array.from(container.children);
    expect(children.length).toBe(3);
    expect((children[0] as HTMLElement).id).toBe('a');
    expect((children[1] as HTMLElement).tagName).toBe('P'); // pasted clone of #a
    expect((children[1] as HTMLElement).textContent).toBe('A');
    expect((children[2] as HTMLElement).id).toBe('b');
  });

  test('paste("after") inserts after the current element', () => {
    container.innerHTML = '<p id="a">A</p><p id="b">B</p>';
    const d = dom('#b');
    d.copy();
    const d2 = dom('#a');
    d2.buffer = d.buffer;
    d2.paste('after');
    const children = Array.from(container.children);
    expect(children.length).toBe(3);
    expect((children[0] as HTMLElement).id).toBe('a');
    expect((children[1] as HTMLElement).tagName).toBe('P'); // pasted clone of #b
    expect((children[1] as HTMLElement).textContent).toBe('B');
    expect((children[2] as HTMLElement).id).toBe('b');
  });

  test('paste("start") is alias for prepend', () => {
    container.innerHTML = '<p>existing</p>';
    const d = dom(container);
    d.add({ tag: 'span', text: 'src' });
    const srcSpan = container.querySelector('span');
    const d2 = dom(container);
    d2.buffer = [srcSpan.cloneNode(true)];
    d2.paste('start');
    expect(container.firstElementChild.tagName).toBe('SPAN');
    expect(container.firstElementChild.textContent).toBe('src');
  });

  test('paste("end") is alias for append', () => {
    container.innerHTML = '<p>existing</p>';
    const d = dom(container);
    d.add({ tag: 'span', text: 'src' });
    const srcSpan = container.querySelector('span');
    const d2 = dom(container);
    d2.buffer = [srcSpan.cloneNode(true)];
    d2.paste('end');
    expect(container.lastElementChild.tagName).toBe('SPAN');
  });

  test('paste() sets lastAdded to pasted elements', () => {
    container.innerHTML = '<p>src</p>';
    const d = dom('p');
    d.copy();
    dom(container).paste();
    // We need a fresh instance to check
    const d2 = dom(container);
    d2.buffer = d.buffer;
    d2.paste();
    expect(d2.lastAdded.length).toBe(1);
    expect((d2.lastAdded[0] as HTMLElement).tagName).toBe('P');
  });
});

describe('duplicate() sets lastAdded', () => {
  test('duplicate() sets lastAdded to cloned elements', () => {
    document.body.innerHTML = '<div id="w"><p>item</p></div>';
    const d = dom('p');
    d.duplicate();
    expect(d.lastAdded.length).toBe(1);
    expect((d.lastAdded[0] as HTMLElement).tagName).toBe('P');
    expect(d.lastAdded[0]).not.toBe(d.currentElements[0]);
  });
});
