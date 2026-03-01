import { dom } from '../../dist/index.js';

const boxStyle = { border: '2px solid #333', padding: '12px', margin: '8px 0', minHeight: '40px' };
const itemStyle = { background: '#d4edda', padding: '6px 10px', margin: '4px 0', borderRadius: '4px' };
const btnStyle = { margin: '4px', padding: '6px 14px', cursor: 'pointer' };

dom(document.body).set({ style: { fontFamily: 'sans-serif', padding: '20px' } });

dom()
  .add({ tag: 'h1', text: 'Clipboard: copy / paste / cut / duplicate' })

  // Source box
  .add({ tag: 'h3', text: 'Source' })
  .add({ tag: 'div', class: 'source', styles: boxStyle })
  .enter()
  .add({ class: 'item', text: 'Item 1', styles: itemStyle })
  .add({ class: 'item', text: 'Item 2', styles: itemStyle })
  .add({ class: 'item', text: 'Item 3', styles: itemStyle })
  .up()

  // Target box
  .add({ tag: 'h3', text: 'Target' })
  .add({ tag: 'div', class: 'target', styles: boxStyle });

// Buttons
dom(document.body)
  .add({ tag: 'div', styles: { marginTop: '12px' } })
  .enter()
  .add({ tag: 'button', text: 'Copy source → paste to target', styles: btnStyle })
  .on('click', () => {
    dom('.source .item').copy();
    dom('.target').paste();
    log('Copied items into target');
  })
  .add({ tag: 'button', text: 'Cut first source item → paste to target', styles: btnStyle })
  .on('click', () => {
    const first = dom('.source').find('.item').get(0);
    if (first) {
      dom(first).cut();
      dom('.target').paste();
      log('Cut first item and pasted to target');
    } else {
      log('No items left in source');
    }
  })
  .add({ tag: 'button', text: 'Duplicate first target item', styles: btnStyle })
  .on('click', () => {
    const first = dom('.target').find('.item').get(0);
    if (first) {
      dom(first).duplicate();
      log('Duplicated first target item');
    } else {
      log('Nothing in target to duplicate');
    }
  })
  .add({ tag: 'button', text: 'Paste before target (as sibling)', styles: btnStyle })
  .on('click', () => {
    dom('.source .item').copy();
    dom('.target').paste('before');
    log('Pasted items before .target as siblings');
  })
  .add({ tag: 'button', text: 'Clear target', styles: btnStyle })
  .on('click', () => {
    dom('.target').find('*').delete();
    log('Cleared target');
  });

// Log
dom(document.body)
  .add({
    tag: 'pre', id: 'log',
    styles: { background: '#f5f5f5', padding: '12px', borderRadius: '4px', marginTop: '12px', minHeight: '60px', fontFamily: 'monospace' }
  });

function log(msg) {
  document.getElementById('log').textContent += msg + '\n';
}
