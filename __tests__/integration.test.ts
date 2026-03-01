import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { dom, DomUnify } from '../index.js';

describe('Integration Tests — multi-method chains', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('add → enter → add → up chain', () => {
    it('should build a nested structure via chaining', () => {
      dom(document.body)
        .add({ tag: 'div', class: 'container' })
        .enter()
        .add({ tag: 'h1', text: 'Title' })
        .add({ tag: 'p', text: 'Content' });

      const container = document.body.querySelector('.container');
      expect(container).not.toBeNull();
      expect((container.querySelector('h1') as HTMLElement).textContent).toBe('Title');
      expect((container.querySelector('p') as HTMLElement).textContent).toBe('Content');
    });

    it('should support deep nesting', () => {
      dom(document.body)
        .add({ tag: 'div', class: 'l1' })
        .enter()
        .add({ tag: 'div', class: 'l2' })
        .enter()
        .add({ tag: 'div', class: 'l3' })
        .enter()
        .add({ tag: 'span', text: 'Deep' });

      expect((document.body.querySelector('.l1 .l2 .l3 span') as HTMLElement).textContent).toBe('Deep');
    });

    it('should navigate up after nesting', () => {
      const chain = dom(document.body)
        .add({ tag: 'div', class: 'parent' })
        .enter()
        .add({ tag: 'span', text: 'Child' })
        .up()
        .add({ tag: 'p', text: 'Sibling' });

      // p should be added to body (parent of .parent)
      expect((document.body.querySelector('p') as HTMLElement).textContent).toBe('Sibling');
    });
  });

  describe('add → mark → navigate → getMark', () => {
    it('should return to a marked element after navigation', () => {
      const chain = dom(document.body)
        .add({ tag: 'div', class: 'section-a' })
        .mark('section-a')
        .add({ tag: 'div', class: 'section-b' })
        .mark('section-b')
        .enter() // enter section-b
        .add({ tag: 'span', text: 'In B' })
        .getMark('section-a');

      const els = chain.get();
      expect(els).toHaveLength(1);
      expect((els[0] as HTMLElement).className).toBe('section-a');
    });

    it('should mark after enter to save the child element', () => {
      const chain = dom(document.body)
        .add({ tag: 'ul', class: 'list' })
        .enter()
        .add({ tag: 'li', text: 'Item 1' })
        .mark('first-item')
        .add({ tag: 'li', text: 'Item 2' })
        .getMark('first-item');

      expect(chain.get()[0].textContent).toBe('Item 1');
    });
  });

  describe('copy → paste workflow', () => {
    it('should copy an element and paste it elsewhere', () => {
      const chain = dom(document.body)
        .add({ tag: 'div', class: 'source', text: 'Original' })
        .add({ tag: 'div', class: 'target' });

      // Copy source
      chain.find('.source').copy();
      // Navigate to target and paste
      chain.back().find('.target').paste();

      const target = document.body.querySelector('.target');
      expect(target.querySelector('.source')).not.toBeNull();
      expect((target.querySelector('.source') as HTMLElement).textContent).toBe('Original');
    });

    it('should correctly paste at an index', () => {
      const chain = dom(document.body)
        .add({ tag: 'div', class: 'container' })
        .enter()
        .add({ tag: 'p', text: 'First' })
        .add({ tag: 'p', text: 'Second' });

      // Copy "First", paste at index 1 (between first and second)
      chain.back().find('.container');
      chain.find('p:first-child').copy();
      chain.back().paste(1);

      const ps = document.body.querySelectorAll('.container p');
      expect(ps).toHaveLength(3);
    });
  });

  describe('cut → back → paste workflow', () => {
    it('should cut an element and paste it elsewhere', () => {
      dom(document.body)
        .add({ tag: 'div', class: 'a', text: 'A' })
        .add({ tag: 'div', class: 'b', text: 'B' })
        .add({ tag: 'div', class: 'target' });

      const chain = dom('.a');
      chain.cut();
      expect(document.body.querySelector('.a')).toBeNull();

      chain.back(); // back to parent (.target's parent = body via lastParents)
      chain.find('.target');
      chain.paste();

      expect(document.body.querySelector('.target .a')).not.toBeNull();
      expect((document.body.querySelector('.target .a') as HTMLElement).textContent).toBe('A');
    });
  });

  describe('find → set → get round-trip', () => {
    it('should fill a form and read data back', () => {
      dom(document.body)
        .add({ tag: 'div', class: 'form' })
        .enter()
        .add({ tag: 'input', attrs: { name: 'username', type: 'text' } })
        .add({ tag: 'input', attrs: { name: 'email', type: 'email' } })
        .add({ tag: 'textarea', attrs: { name: 'bio' } });

      const formChain = dom('.form');
      formChain.set({}, { username: 'Alice', email: 'alice@test.com', bio: 'Hello world' });

      const data = formChain.get({ mode: 'form' });
      expect(data).toHaveLength(1);
      expect((data[0] as any).username).toBe('Alice');
      expect((data[0] as any).email).toBe('alice@test.com');
      expect((data[0] as any).bio).toBe('Hello world');
    });

    it('should correctly handle clearMissing', () => {
      dom(document.body)
        .add({ tag: 'div', class: 'form' })
        .enter()
        .add({ tag: 'input', attrs: { name: 'a', type: 'text' } })
        .add({ tag: 'input', attrs: { name: 'b', type: 'text' } });

      const chain = dom('.form');
      chain.set({}, { a: '1', b: '2' });
      chain.set({}, { a: 'updated' }, { clearMissing: true });

      const data = chain.get({ mode: 'form' });
      expect((data[0] as any).a).toBe('updated');
      expect((data[0] as any).b).toBe('');
    });
  });

  describe('delete → back → verify', () => {
    it('should delete and return to parent', () => {
      dom(document.body)
        .add({ tag: 'div', class: 'parent' })
        .enter()
        .add({ tag: 'span', class: 'child', text: 'Delete me' });

      const chain = dom('.child');
      chain.delete();
      chain.back(); // should go to parent via lastParents

      expect(document.body.querySelector('.child')).toBeNull();
      expect((chain.get()[0] as HTMLElement).className).toBe('parent');
    });
  });

  describe('duplicate → verify DOM state', () => {
    it('should duplicate an element and preserve attributes', () => {
      dom(document.body)
        .add({ tag: 'div', class: 'item', attrs: { 'data-id': '1' } })
        .enter()
        .add({ tag: 'span', text: 'Content' });

      dom('.item').duplicate();

      const items = document.body.querySelectorAll('.item');
      expect(items).toHaveLength(2);
      expect((items[1] as HTMLElement).getAttribute('data-id')).toBe('1');
      expect((items[1] as HTMLElement).querySelector('span').textContent).toBe('Content');
    });
  });

  describe('find with navigation chain', () => {
    it('should find → enter → add → go back', () => {
      document.body.innerHTML = `
        <div class="container">
          <ul class="list">
            <li>Item 1</li>
          </ul>
        </div>`;

      const chain = dom('.container')
        .find('.list')
        .enter(0)
        .add({ tag: 'span', text: 'Badge' })
        .back(2); // back(2) goes 2 steps: enter → find

      expect((chain.get()[0] as HTMLElement).className).toBe('container');
      expect((document.body.querySelector('li span') as HTMLElement).textContent).toBe('Badge');
    });
  });

  describe('complex form workflow', () => {
    it('should create a form, fill and read', () => {
      const form = dom(document.body)
        .add({ tag: 'form', class: 'user-form' })
        .enter()
        .add({ tag: 'input', attrs: { type: 'text', name: 'name' } })
        .add({ tag: 'input', attrs: { type: 'email', name: 'email' } })
        .add({
          tag: 'select', attrs: { name: 'role' },
          children: [
            { tag: 'option', value: 'user', text: 'User' },
            { tag: 'option', value: 'admin', text: 'Admin' }
          ]
        })
        .add({ tag: 'input', attrs: { type: 'checkbox', name: 'agree', value: 'yes' } })
        .up();

      // Fill form
      dom('.user-form').set({}, { name: 'Bob', email: 'bob@test.com', role: 'admin', agree: 'yes' });

      // Read form
      const data = dom('.user-form').get({ mode: 'form' });
      expect(data[0]).toEqual({
        name: 'Bob',
        email: 'bob@test.com',
        role: 'admin',
        agree: 'yes'
      });
    });

    it('should handle multiple select and radio', () => {
      dom(document.body)
        .add({ tag: 'div', class: 'form' })
        .enter()
        .add({
          tag: 'select', attrs: { name: 'colors', multiple: '' },
          children: [
            { tag: 'option', value: 'red', text: 'Red' },
            { tag: 'option', value: 'blue', text: 'Blue' },
            { tag: 'option', value: 'green', text: 'Green' }
          ]
        })
        .add({ tag: 'input', attrs: { type: 'radio', name: 'size', value: 'S' } })
        .add({ tag: 'input', attrs: { type: 'radio', name: 'size', value: 'M' } })
        .add({ tag: 'input', attrs: { type: 'radio', name: 'size', value: 'L' } });

      dom('.form').set({}, { colors: ['red', 'green'], size: 'M' });

      const data = dom('.form').get({ mode: 'form' });
      expect((data[0] as any).colors).toEqual(['red', 'green']);
      expect((data[0] as any).size).toBe('M');
    });
  });

  describe('on/off with navigation', () => {
    it('should add a handler after navigation', () => {
      let result = '';
      dom(document.body)
        .add({ tag: 'div', class: 'wrapper' })
        .enter()
        .add({ tag: 'button', class: 'btn', text: 'Click' });

      dom('.btn').on('click', () => { result = 'clicked'; });
      (document.querySelector('.btn') as HTMLElement).click();
      expect(result).toBe('clicked');
    });
  });

  describe('constructor edge cases', () => {
    it('should create DocumentFragment with root=null', () => {
      const chain = dom(null);
      expect(chain.get()[0]).toBeInstanceOf(DocumentFragment);
    });

    it('should use body with dom() without arguments', () => {
      const chain = dom();
      expect(chain.get()[0]).toBe(document.body);
    });

    it('should handle a CSS selector', () => {
      document.body.innerHTML = '<div class="x"></div>';
      const chain = dom('.x');
      expect(chain.get()).toHaveLength(1);
      expect((chain.get()[0] as HTMLElement).className).toBe('x');
    });

    it('should handle HTMLElement', () => {
      const div = document.createElement('div');
      const chain = dom(div);
      expect(chain.get()[0]).toBe(div);
    });

    it('should support root mark', () => {
      const chain = dom(document.body)
        .add({ tag: 'div' })
        .enter()
        .getMark('root');
      expect(chain.get()[0]).toBe(document.body);
    });
  });

  describe('chaining returns this', () => {
    it('all methods should return this for chaining', () => {
      const chain = dom(document.body);
      expect(chain.add({ tag: 'div', class: 'c' })).toBe(chain);
      expect(chain.enter()).toBe(chain);
      expect(chain.up()).toBe(chain);
      expect(chain.back()).toBe(chain);
      expect(chain.find('.c')).toBe(chain);
      expect(chain.set({ text: 'x' })).toBe(chain);
      expect(chain.copy()).toBe(chain);
      expect(chain.paste()).toBe(chain);
      expect(chain.mark('m')).toBe(chain);
      expect(chain.getMark('m')).toBe(chain);
      expect(chain.on('click', () => {})).toBe(chain);
      expect(chain.off('click')).toBe(chain);
      expect(chain.delete()).toBe(chain);
    });

    it('duplicate should return this', () => {
      dom(document.body).add({ class: 'dup-test' });
      const chain = dom('.dup-test');
      expect(chain.duplicate()).toBe(chain);
    });
  });

  describe('build full page layout', () => {
    it('should build a full layout via chaining', () => {
      dom(document.body)
        .add({ tag: 'header', class: 'header' })
        .enter()
        .add({ tag: 'nav', class: 'nav' })
        .enter()
        .add({ tag: 'a', text: 'Home', attrs: { href: '#' } })
        .add({ tag: 'a', text: 'About', attrs: { href: '#about' } })
        .up() // nav → header
        .up() // header → body
        .add({ tag: 'main', class: 'main' })
        .enter()
        .add({ tag: 'article', class: 'article' })
        .enter()
        .add({ tag: 'h1', text: 'Title' })
        .add({ tag: 'p', text: 'Content' })
        .up() // article → main
        .up() // main → body
        .add({ tag: 'footer', class: 'footer', text: '© 2026' });

      expect(document.body.querySelector('header nav')).not.toBeNull();
      expect(document.body.querySelectorAll('nav a')).toHaveLength(2);
      expect((document.body.querySelector('main article h1') as HTMLElement).textContent).toBe('Title');
      expect((document.body.querySelector('main article p') as HTMLElement).textContent).toBe('Content');
      expect((document.body.querySelector('footer') as HTMLElement).textContent).toBe('© 2026');
    });
  });

  describe('addToElements data + options combined', () => {
    it('should add elements with data and clearMissing', () => {
      document.body.innerHTML = '<div class="form"><input name="old" value="old-val"></div>';
      const chain = dom('.form');
      chain.add(
        { tag: 'input', attrs: { name: 'new', type: 'text' } },
        { new: 'new-val', old: 'updated' }
      );

      expect((document.querySelector('input[name="new"]') as HTMLInputElement).value).toBe('new-val');
      expect((document.querySelector('input[name="old"]') as HTMLInputElement).value).toBe('updated');
    });
  });

  describe('history depth management', () => {
    it('should support back(n) with different depths', () => {
      document.body.innerHTML = `
        <div class="a">
          <div class="b">
            <div class="c">
              <span class="d">Deep</span>
            </div>
          </div>
        </div>`;

      const chain = dom('.a');
      chain.find('.b');
      chain.find('.c');
      chain.find('.d');

      // History: [[.a], [.b], [.c]], current: [.d]
      expect((chain.get()[0] as HTMLElement).className).toBe('d');

      chain.back(1); // → .c, history becomes [[.a], [.b]]
      expect((chain.get()[0] as HTMLElement).className).toBe('c');

      chain.back(1); // → .b, history becomes [[.a]]
      expect((chain.get()[0] as HTMLElement).className).toBe('b');

      chain.back(1); // → .a, history becomes []
      expect((chain.get()[0] as HTMLElement).className).toBe('a');
    });
  });

  describe('complex DOM structure building', () => {
    it('should build a complete card component with header, body, and footer', () => {
      const chain = dom(document.body);
      chain
        .add({ tag: 'div', class: 'card' })
        .enter()
        .add({ tag: 'div', class: 'card-header' })
        .enter()
        .add({ tag: 'h2', text: 'Card Title', class: 'title' })
        .add({ tag: 'button', text: '×', class: 'close-btn' })
        .back()
        .add({ tag: 'div', class: 'card-body' })
        .enter()
        .add({ tag: 'p', text: 'Card content here' })
        .add({ tag: 'img', attrs: { src: 'image.jpg', alt: 'Photo' } })
        .back()
        .add({ tag: 'div', class: 'card-footer' })
        .enter()
        .add({ tag: 'button', text: 'Save', class: 'btn-primary' })
        .add({ tag: 'button', text: 'Cancel', class: 'btn-secondary' });

      const card = document.querySelector('.card');
      expect(card).not.toBeNull();
      expect((card.querySelector('.card-header .title') as HTMLElement).textContent).toBe('Card Title');
      expect((card.querySelector('.card-header .close-btn') as HTMLElement).textContent).toBe('×');
      expect((card.querySelector('.card-body p') as HTMLElement).textContent).toBe('Card content here');
      expect((card.querySelector('.card-body img') as HTMLElement).getAttribute('alt')).toBe('Photo');
      expect((card.querySelector('.card-footer .btn-primary') as HTMLElement).textContent).toBe('Save');
      expect((card.querySelector('.card-footer .btn-secondary') as HTMLElement).textContent).toBe('Cancel');
    });

    it('should build a navigation menu with nested dropdowns', () => {
      dom(document.body)
        .add({ tag: 'nav', class: 'navbar' })
        .enter()
        .add({ tag: 'ul', class: 'nav-list' })
        .enter()
        .add({ tag: 'li', class: 'nav-item' })
        .enter()
        .add({ tag: 'a', text: 'Home', attrs: { href: '/' } })
        .back()
        .add({ tag: 'li', class: 'nav-item dropdown' })
        .enter()
        .add({ tag: 'a', text: 'Products', attrs: { href: '#' } })
        .add({ tag: 'ul', class: 'dropdown-menu' })
        .enter()
        .add({ tag: 'li' })
        .enter()
        .add({ tag: 'a', text: 'Software', attrs: { href: '/software' } })
        .back()
        .add({ tag: 'li' })
        .enter()
        .add({ tag: 'a', text: 'Hardware', attrs: { href: '/hardware' } });

      const nav = document.querySelector('.navbar');
      expect(nav).not.toBeNull();
      const items = nav.querySelectorAll('.nav-item');
      expect(items).toHaveLength(2);
      const dropdown = nav.querySelector('.dropdown-menu');
      expect(dropdown).not.toBeNull();
      expect(dropdown.querySelectorAll('li')).toHaveLength(2);
      expect((dropdown.querySelector('a[href="/software"]') as HTMLElement).textContent).toBe('Software');
      expect((dropdown.querySelector('a[href="/hardware"]') as HTMLElement).textContent).toBe('Hardware');
    });

    it('should build a table with header, body rows, and data', () => {
      const chain = dom(document.body);
      chain
        .add({ tag: 'table', class: 'data-table' })
        .enter()
        .add({ tag: 'thead' })
        .enter()
        .add({ tag: 'tr' })
        .enter()
        .add({ tag: 'th', text: 'Name' })
        .add({ tag: 'th', text: 'Age' })
        .add({ tag: 'th', text: 'Email' })
        .back() // back to thead
        .back() // back to table
        .add({ tag: 'tbody' })
        .enter();

      // Add rows dynamically
      const rows = [
        { name: 'Alice', age: 30, email: 'alice@test.com' },
        { name: 'Bob', age: 25, email: 'bob@test.com' },
      ];
      for (const row of rows) {
        chain
          .add({ tag: 'tr' })
          .enter()
          .add({ tag: 'td', text: row.name })
          .add({ tag: 'td', text: String(row.age) })
          .add({ tag: 'td', text: row.email })
          .back();
      }

      const table = document.querySelector('.data-table');
      expect(table.querySelectorAll('thead th')).toHaveLength(3);
      expect(table.querySelectorAll('tbody tr')).toHaveLength(2);
      expect((table.querySelector('tbody tr:first-child td:first-child') as HTMLElement).textContent).toBe('Alice');
      expect((table.querySelector('tbody tr:last-child td:last-child') as HTMLElement).textContent).toBe('bob@test.com');
    });

    it('should build a complex form with fieldsets and validation attributes', () => {
      dom(document.body)
        .add({ tag: 'form', class: 'signup-form', attrs: { action: '/signup', method: 'POST' } })
        .enter()
        .add({ tag: 'fieldset', class: 'personal-info' })
        .enter()
        .add({ tag: 'legend', text: 'Personal Information' })
        .add({ tag: 'input', attrs: { type: 'text', name: 'firstName', placeholder: 'First Name', required: true } })
        .add({ tag: 'input', attrs: { type: 'text', name: 'lastName', placeholder: 'Last Name', required: true } })
        .add({ tag: 'input', attrs: { type: 'email', name: 'email', placeholder: 'Email' } })
        .back()
        .add({ tag: 'fieldset', class: 'preferences' })
        .enter()
        .add({ tag: 'legend', text: 'Preferences' })
        .add({ tag: 'select', attrs: { name: 'theme' }, children: [
          { tag: 'option', text: 'Light', value: 'light' },
          { tag: 'option', text: 'Dark', value: 'dark' },
        ]})
        .add({ tag: 'input', attrs: { type: 'checkbox', name: 'newsletter', value: 'yes' } })
        .back()
        .add({ tag: 'button', text: 'Sign Up', attrs: { type: 'submit' } });

      const form = document.querySelector('.signup-form');
      expect(form.getAttribute('action')).toBe('/signup');
      expect(form.querySelectorAll('fieldset')).toHaveLength(2);
      expect((form.querySelector('.personal-info legend') as HTMLElement).textContent).toBe('Personal Information');
      expect(form.querySelector('input[name="firstName"]')).not.toBeNull();
      expect((form.querySelector('input[name="email"]') as HTMLElement).getAttribute('type')).toBe('email');
      expect((form.querySelector('select[name="theme"]') as HTMLSelectElement).options).toHaveLength(2);
      expect((form.querySelector('input[name="newsletter"]') as HTMLElement).getAttribute('type')).toBe('checkbox');
      expect((form.querySelector('button[type="submit"]') as HTMLElement).textContent).toBe('Sign Up');
    });
  });

  describe('complex data workflows', () => {
    it('should fill a form, read data, modify, and read again', () => {
      dom(document.body)
        .add({ tag: 'form', class: 'test-form' })
        .enter()
        .add({ tag: 'input', attrs: { name: 'username', type: 'text' } })
        .add({ tag: 'input', attrs: { name: 'email', type: 'email' } })
        .add({ tag: 'textarea', attrs: { name: 'bio' } })
        .add({ tag: 'select', attrs: { name: 'role' }, children: [
          { tag: 'option', text: 'User', value: 'user' },
          { tag: 'option', text: 'Admin', value: 'admin' },
        ]});

      const chain = dom('.test-form');

      // Fill form
      chain.set({}, { username: 'john', email: 'john@test.com', bio: 'Hello', role: 'admin' });

      // Read data
      let data = chain.get({ mode: 'form' });
      expect((data[0] as any).username).toBe('john');
      expect((data[0] as any).email).toBe('john@test.com');
      expect((data[0] as any).bio).toBe('Hello');
      expect((data[0] as any).role).toBe('admin');

      // Modify and read again
      chain.set({}, { username: 'jane', email: 'jane@test.com' });
      data = chain.get({ mode: 'form' });
      expect((data[0] as any).username).toBe('jane');
      expect((data[0] as any).email).toBe('jane@test.com');
      expect((data[0] as any).bio).toBe('Hello'); // unchanged
    });

    it('should cut elements from one container and paste into another', () => {
      document.body.innerHTML = `
        <div class="source"><span class="item">ItemA</span><span class="item">ItemB</span></div>
        <div class="target"></div>`;

      const chain = dom(document.body);
      chain.find('.source');
      chain.find('.item');
      chain.cut();

      // Source should be empty now
      expect((document.querySelector('.source') as HTMLElement).children.length).toBe(0);

      // Navigate to target via root mark and paste
      chain.back(); // restores from lastParents → .source
      chain.getMark('root'); // back to body
      chain.find('.target');
      chain.paste();

      expect((document.querySelector('.target') as HTMLElement).children.length).toBe(2);
      expect(document.querySelector('.target').querySelector('.item').textContent).toBe('ItemA');
    });

    it('should duplicate elements and verify independent modification', () => {
      document.body.innerHTML = '<div class="container"><p class="para">Original</p></div>';

      dom('.para').duplicate();
      const paras = document.querySelectorAll('.para');
      expect(paras).toHaveLength(2);
      expect(paras[0].textContent).toBe('Original');
      expect(paras[1].textContent).toBe('Original');

      // Modify the original — duplicate should be independent
      paras[0].textContent = 'Modified';
      expect(paras[1].textContent).toBe('Original');
    });

    it('should mark, navigate away, and return with getMark', () => {
      dom(document.body)
        .add({ tag: 'div', class: 'sidebar' })
        .mark('sidebar')
        .add({ tag: 'div', class: 'main' })
        .enter()
        .add({ tag: 'h1', text: 'Main Content' })
        .getMark('sidebar')
        // After getMark, currentElements=[sidebar]. add() appends to sidebar directly.
        .add({ tag: 'ul', class: 'menu' })
        .enter()
        .add({ tag: 'li', text: 'Home' })
        .add({ tag: 'li', text: 'About' });

      expect(document.querySelector('.sidebar .menu')).not.toBeNull();
      expect((document.querySelector('.sidebar .menu') as HTMLElement).children.length).toBe(2);
      expect((document.querySelector('.main h1') as HTMLElement).textContent).toBe('Main Content');
    });

    it('should handle events across navigation', () => {
      let clickCount = 0;
      const handler = () => clickCount++;

      dom(document.body)
        .add({ tag: 'div', class: 'wrapper' })
        .enter()
        .add({ tag: 'button', class: 'btn', text: 'Click me' })
        .enter()
        .on('click', handler);

      (document.querySelector('.btn') as HTMLElement).click();
      expect(clickCount).toBe(1);
      (document.querySelector('.btn') as HTMLElement).click();
      expect(clickCount).toBe(2);
    });

    it('should chain find → set → get for attribute manipulation', () => {
      document.body.innerHTML = `
        <ul>
          <li class="active">Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>`;

      const chain = dom('ul');
      chain.find('.active');
      chain.set({ attr: { 'data-selected': 'true' }, style: { color: 'red' } });

      const active = document.querySelector('.active');
      expect(active.getAttribute('data-selected')).toBe('true');
      expect((active as HTMLElement).style.color).toBe('red');
    });

    it('should correctly handle delete → back → verify parent state', () => {
      document.body.innerHTML = '<div class="parent"><span class="a">A</span><span class="b">B</span></div>';

      const chain = dom('.parent');
      chain.find('.a');
      chain.delete();

      // After delete, context is empty, lastParents has .parent
      chain.back();
      expect((chain.get()[0] as HTMLElement).className).toBe('parent');
      expect((chain.get()[0] as HTMLElement).children.length).toBe(1); // only .b remains
      expect(chain.get()[0].querySelector('.b').textContent).toBe('B');
    });
  });

  describe('edge cases and stress tests', () => {
    it('should handle deeply nested add operations (10 levels)', () => {
      const chain = dom(document.body);
      for (let i = 0; i < 10; i++) {
        chain.add({ tag: 'div', class: `level-${i}` }).enter();
      }
      chain.add({ tag: 'span', text: 'Deep leaf' });

      let current = document.body;
      for (let i = 0; i < 10; i++) {
        current = current.querySelector(`.level-${i}`);
        expect(current).not.toBeNull();
      }
      expect((current.querySelector('span') as HTMLElement).textContent).toBe('Deep leaf');
    });

    it('should handle add with children config (nested config object)', () => {
      dom(document.body).add({
        tag: 'div',
        class: 'root',
        children: [
          {
            tag: 'header',
            children: [
              { tag: 'h1', text: 'Title' },
              { tag: 'nav', children: [
                { tag: 'a', text: 'Home', attrs: { href: '/' } },
                { tag: 'a', text: 'About', attrs: { href: '/about' } },
              ]}
            ]
          },
          {
            tag: 'main',
            children: [
              { tag: 'article', children: [
                { tag: 'h2', text: 'Article Title' },
                { tag: 'p', text: 'Article content.' },
              ]}
            ]
          },
          {
            tag: 'footer',
            text: '© 2024'
          }
        ]
      });

      const root = document.querySelector('.root');
      expect((root.querySelector('header h1') as HTMLElement).textContent).toBe('Title');
      expect(root.querySelectorAll('nav a')).toHaveLength(2);
      expect((root.querySelector('main article h2') as HTMLElement).textContent).toBe('Article Title');
      expect((root.querySelector('footer') as HTMLElement).textContent).toBe('© 2024');
    });

    it('should handle empty find → back recovery', () => {
      document.body.innerHTML = '<div class="box"><span>Content</span></div>';
      const chain = dom('.box');
      chain.find('.nonexistent');
      expect(chain.get()).toHaveLength(0);
      chain.back();
      expect((chain.get()[0] as HTMLElement).className).toBe('box');
    });

    it('should handle multiple paste operations from same buffer', () => {
      document.body.innerHTML = '<div class="source"><p class="template">Template</p></div><div class="t1"></div><div class="t2"></div><div class="t3"></div>';

      const chain = dom('.template');
      chain.copy();

      dom('.t1').paste();
      // Need to use same chain instance for buffer
      const chain2 = dom('.t1');
      chain2.buffer = chain.buffer;
      chain2.paste();

      const chain3 = dom('.t2');
      chain3.buffer = chain.buffer;
      chain3.paste();

      expect(document.querySelector('.t1').querySelector('.template')).not.toBeNull();
      expect(document.querySelector('.t2').querySelector('.template')).not.toBeNull();
    });

    it('should handle constructor with existing DOM element', () => {
      document.body.innerHTML = '<div id="app"><h1>Hello</h1></div>';
      const el = document.getElementById('app');
      const chain = dom(el);
      expect(chain.get()[0]).toBe(el);
      chain.find('h1');
      expect(chain.get()[0].textContent).toBe('Hello');
    });

    it('should support add with data applying to nested inputs', () => {
      dom(document.body)
        .add({
          tag: 'form',
          class: 'nested-form',
          children: [
            { tag: 'div', class: 'group', children: [
              { tag: 'input', attrs: { name: 'field1', type: 'text' } },
              { tag: 'input', attrs: { name: 'field2', type: 'text' } },
            ]},
          ]
        }, { field1: 'val1', field2: 'val2' });

      expect((document.querySelector('input[name="field1"]') as HTMLInputElement).value).toBe('val1');
      expect((document.querySelector('input[name="field2"]') as HTMLInputElement).value).toBe('val2');
    });

    it('should handle get(-1) returning last element', () => {
      document.body.innerHTML = '<div class="a">A</div><div class="b">B</div><div class="c">C</div>';
      const chain = dom(document.body);
      chain.find('div');
      expect((chain.get(-1) as HTMLElement).className).toBe('c');
      expect((chain.get(0) as HTMLElement).className).toBe('a');
      expect((chain.get(1) as HTMLElement).className).toBe('b');
    });
  });
});
