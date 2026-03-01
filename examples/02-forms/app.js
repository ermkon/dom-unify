import { dom } from '../../dist/index.js';

// Style the page
dom(document.body).set({ style: { fontFamily: 'sans-serif', padding: '20px', maxWidth: '500px' } });

// Build the entire form from JS — no HTML needed
dom()
  .add({ tag: 'h1', text: 'Form & Data Binding' })
  .add({ tag: 'div', class: 'form-container' })
  .enter()

  // Name field
  .add({ tag: 'label', text: 'Name', styles: { display: 'block', marginTop: '8px', fontWeight: 'bold' } })
  .add({ tag: 'input', attrs: { type: 'text' }, dataset: { key: 'name' }, styles: { width: '100%', padding: '6px', boxSizing: 'border-box' } })

  // Email field
  .add({ tag: 'label', text: 'Email', styles: { display: 'block', marginTop: '8px', fontWeight: 'bold' } })
  .add({ tag: 'input', attrs: { type: 'email' }, dataset: { key: 'email' }, styles: { width: '100%', padding: '6px', boxSizing: 'border-box' } })

  // Nested address
  .add({ tag: 'fieldset', dataset: { container: 'address' }, styles: { marginTop: '12px' } })
  .enter()
  .add({ tag: 'legend', text: 'Address' })
  .add({ tag: 'label', text: 'City', styles: { display: 'block', marginTop: '4px' } })
  .add({ tag: 'input', attrs: { type: 'text' }, dataset: { key: 'city' }, styles: { width: '100%', padding: '6px', boxSizing: 'border-box' } })
  .add({ tag: 'label', text: 'Zip', styles: { display: 'block', marginTop: '4px' } })
  .add({ tag: 'input', attrs: { type: 'text' }, dataset: { key: 'zip' }, styles: { width: '100%', padding: '6px', boxSizing: 'border-box' } })
  .up()

  // Buttons
  .add({ tag: 'div', styles: { marginTop: '12px', display: 'flex', gap: '8px' } })
  .enter()
  .add({ tag: 'button', text: 'Fill Sample Data', styles: { padding: '8px 16px' } })
  .on('click', () => {
    dom('.form-container').fill({
      name: 'John Doe',
      email: 'john@example.com',
      address: { city: 'New York', zip: '10001' }
    });
  })
  .add({ tag: 'button', text: 'Read → JSON', styles: { padding: '8px 16px' } })
  .on('click', () => {
    const data = dom('.form-container').get('nested');
    dom('.output').set({ text: JSON.stringify(data, null, 2) });
  })
  .add({ tag: 'button', text: 'Clear', styles: { padding: '8px 16px' } })
  .on('click', () => {
    dom('.form-container').fill({ name: '', email: '', address: { city: '', zip: '' } });
    dom('.output').set({ text: '' });
  });

// Output area
dom(document.body)
  .add({ tag: 'pre', class: 'output', styles: { background: '#f5f5f5', padding: '12px', borderRadius: '4px', marginTop: '16px', minHeight: '60px' } });
