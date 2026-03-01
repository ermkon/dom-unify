import { dom } from '../../dist/index.js';

const boxStyle = { border: '2px solid #333', padding: '10px', margin: '8px 0' };
const innerStyle = { background: '#e0f0ff', padding: '8px', margin: '4px 0' };
const btnStyle = { margin: '4px', padding: '6px 14px', cursor: 'pointer' };

// Page setup
dom(document.body).set({ style: { fontFamily: 'sans-serif', padding: '20px' } });

dom()
  .add({ tag: 'h1', text: 'Navigation & History' })

  // Build workspace from JS
  .add({ tag: 'div', id: 'workspace' })
  .enter()
  .add({ tag: 'div', class: 'box', id: 'a', styles: boxStyle })
  .enter()
  .add({ tag: 'strong', text: 'Box A' })
  .add({ class: 'inner', text: 'A-inner-1', styles: innerStyle })
  .add({ class: 'inner', text: 'A-inner-2', styles: innerStyle })
  .up()
  .add({ tag: 'div', class: 'box', id: 'b', styles: boxStyle })
  .enter()
  .add({ tag: 'strong', text: 'Box B' })
  .add({ class: 'inner', text: 'B-inner-1', styles: innerStyle })
  .up()
  .up();

// Buttons
dom(document.body)
  .add({ tag: 'div', styles: { marginTop: '16px' } })
  .enter()
  .add({ tag: 'button', text: 'enter(#a) → find(.inner)', styles: btnStyle })
  .on('click', () => {
    const d = dom('#workspace').enter('#a');
    log(`enter(#a) → context: ${desc(d)}`);
    d.find('.inner');
    log(`find(.inner) → ${d.currentElements.length} elements`);
  })
  .add({ tag: 'button', text: 'back()', styles: btnStyle })
  .on('click', () => {
    const d = dom('#workspace').enter('#a').find('.inner');
    d.back(1);
    log(`back(1) → context: ${desc(d)}`);
  })
  .add({ tag: 'button', text: 'mark → navigate → getMark', styles: btnStyle })
  .on('click', () => {
    const d = dom('#a');
    d.mark('saved');
    log(`Marked #a as "saved"`);
    d.find('.inner');
    log(`find(.inner) → ${d.currentElements.length} elements`);
    d.getMark('saved');
    log(`getMark("saved") → back to ${desc(d)}`);
  });

// Log output
dom(document.body)
  .add({
    tag: 'pre', id: 'log',
    styles: { background: '#f5f5f5', padding: '12px', borderRadius: '4px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', minHeight: '100px', marginTop: '12px' }
  });

function log(msg) {
  const el = document.getElementById('log');
  el.textContent += msg + '\n';
}

function desc(d) {
  return d.currentElements.map(e => e.id || e.className || e.tagName.toLowerCase()).join(', ');
}
