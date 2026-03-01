import { dom } from '../../dist/index.js';

// Complete mini-app — zero HTML, everything from JS

dom(document.body).set({
  style: { fontFamily: 'sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto' }
});

dom()
  .add({ tag: 'h1', text: 'Todo App' })
  .add({ tag: 'p', text: 'Built entirely with dom-unify — no HTML needed', styles: { color: '#888' } })

  // Input row
  .add({ tag: 'div', styles: { display: 'flex', gap: '8px', marginBottom: '16px' } })
  .enter()
  .add({
    tag: 'input', id: 'todo-input',
    attrs: { type: 'text', placeholder: 'Add a task...' },
    styles: { flex: '1', padding: '8px', fontSize: '14px' }
  })
  .add({
    tag: 'button', text: 'Add', id: 'add-btn',
    styles: { padding: '8px 16px', fontSize: '14px', cursor: 'pointer' }
  })
  .on('click', addTodo)
  .up()

  // Todo list
  .add({ tag: 'div', id: 'todo-list' })

  // Counter
  .add({ tag: 'div', id: 'counter', text: '0 tasks', styles: { marginTop: '12px', color: '#888' } });

// Enter on input
dom('#todo-input').on('keydown', (e) => {
  if (e.key === 'Enter') addTodo();
});

function addTodo() {
  const input = document.getElementById('todo-input');
  const text = input.value.trim();
  if (!text) return;

  dom('#todo-list')
    .add({
      class: 'todo-item',
      styles: {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px', borderBottom: '1px solid #eee'
      },
      children: [
        {
          tag: 'input', attrs: { type: 'checkbox' },
          styles: { cursor: 'pointer' }
        },
        {
          tag: 'span', class: 'todo-text', text,
          styles: { flex: '1' }
        },
        {
          tag: 'button', text: '×',
          styles: {
            border: 'none', background: 'none', color: '#cc0000',
            fontSize: '18px', cursor: 'pointer', padding: '0 4px'
          }
        }
      ]
    })
    .enter()
    // Toggle strikethrough on checkbox
    .find('input[type=checkbox]')
    .on('change', (e) => {
      const item = e.target.closest('.todo-item');
      const span = item.querySelector('.todo-text');
      span.style.textDecoration = e.target.checked ? 'line-through' : 'none';
      span.style.opacity = e.target.checked ? '0.5' : '1';
      updateCounter();
    })
    // Delete button
    .back()
    .find('button')
    .on('click', (e) => {
      dom(e.target).up('.todo-item').delete();
      updateCounter();
    });

  input.value = '';
  updateCounter();
}

function updateCounter() {
  const total = document.querySelectorAll('.todo-item').length;
  const done = document.querySelectorAll('.todo-item input:checked').length;
  dom('#counter').set({ text: `${total} tasks, ${done} done` });
}
