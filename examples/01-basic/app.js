import { dom } from '../../dist/index.js';

// Everything is built from JS — no HTML markup needed

// 1. Page structure
dom()
  .add({ tag: 'h1', text: 'dom-unify — Basic Example' })
  .add({ class: 'container' })
  .enter();

// 2. Cards from array data
dom('.container').add(
  {
    class: 'card',
    styles: { border: '1px solid #ccc', padding: '12px', margin: '8px 0', borderRadius: '6px' },
    children: [
      { tag: 'h3', 'data-key': 'title' },
      { tag: 'p', 'data-key': 'desc', styles: { color: '#666' } }
    ]
  },
  [
    { title: 'Create', desc: 'Use .add() with config objects to create elements' },
    { title: 'Navigate', desc: 'Use .enter(), .up(), .back() to move through the tree' },
    { title: 'Modify', desc: 'Use .set() to change attributes, classes, and styles' }
  ]
);

// 3. Add a highlight to the first card
dom('.card').enter(0).set({ class: '+highlight', style: { background: '#ffffcc' } });

// 4. Find and modify
dom('.container').find('h3').set({ style: { color: '#333', margin: '0 0 4px 0' } });

// 5. Set body font
dom(document.body).set({ style: { fontFamily: 'sans-serif', padding: '20px' } });
