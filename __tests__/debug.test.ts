import { jest } from '@jest/globals';
import { DomUnify, dom } from '../index.js';

describe('debug()', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);
  });

  test('debug() prints state to console.log and returns this', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const d = dom(container);
    const result = d.debug();
    expect(result).toBe(d);
    expect(spy).toHaveBeenCalledTimes(1);
    const call = spy.mock.calls[0];
    expect(call[0]).toBe('[dom-unify] state:');
    expect(call[1]).toHaveProperty('currentElements');
    expect(call[1]).toHaveProperty('lastAdded');
    expect(call[1]).toHaveProperty('historyDepth');
    expect(call[1]).toHaveProperty('marks');
    expect(call[1]).toHaveProperty('buffer');
    spy.mockRestore();
  });

  test('debug() shows element description with tag#id.class', () => {
    container.className = 'main active';
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    dom(container).debug();
    const state = spy.mock.calls[0][1];
    expect(state.currentElements).toEqual(['div#root.main.active']);
    spy.mockRestore();
  });

  test('debug() warns when currentElements is empty', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const d = dom(container);
    d.currentElements = [];
    d.debug();
    expect(warnSpy).toHaveBeenCalledWith('[dom-unify] ⚠ EMPTY CONTEXT');
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  test('debug("steps") enables step logging', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const d = dom(container);
    d.debug('steps');
    expect(d._debugMode).toBe(true);
    // Now each method should log
    d.add({ tag: 'span' });
    expect(spy).toHaveBeenCalled();
    const addCall = spy.mock.calls.find(c => c[0].includes('.add()'));
    expect(addCall).toBeTruthy();
    spy.mockRestore();
  });

  test('debug(false) disables step logging', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const d = dom(container);
    d.debug('steps');
    d.debug(false);
    expect(d._debugMode).toBe(false);
    d.add({ tag: 'span' });
    // Should NOT have an .add() log call
    const addCall = spy.mock.calls.find(c => c[0]?.includes?.('.add()'));
    expect(addCall).toBeUndefined();
    spy.mockRestore();
  });

  test('_logStep logs method name with state info', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const d = dom(container);
    d._debugMode = true;
    d.enter();
    const enterCall = spy.mock.calls.find(c => c[0].includes('.enter()'));
    expect(enterCall).toBeTruthy();
    expect(enterCall[1]).toHaveProperty('current');
    expect(enterCall[1]).toHaveProperty('lastAdded');
    expect(enterCall[1]).toHaveProperty('history');
    expect(enterCall[1]).toHaveProperty('buffer');
    spy.mockRestore();
  });

  test('_logStep does nothing when debugMode is off', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const d = dom(container);
    d.add({ tag: 'span' });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('debug() shows marks', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const d = dom(container);
    d.mark('test');
    d.debug();
    const state = spy.mock.calls[0][1];
    expect(state.marks).toContain('root');
    expect(state.marks).toContain('test');
    spy.mockRestore();
  });

  test('debug() shows buffer info', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const d = dom(container);
    d.debug();
    expect(spy.mock.calls[0][1].buffer).toBe('empty');
    spy.mockRestore();

    const spy2 = jest.spyOn(console, 'log').mockImplementation(() => {});
    d.copy();
    d.debug();
    expect(spy2.mock.calls[0][1].buffer).toContain('element');
    spy2.mockRestore();
  });

  test('_describeElements handles DocumentFragment', () => {
    const d = dom(null); // creates DocumentFragment
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    d.debug();
    const state = spy.mock.calls[0][1];
    expect(state.currentElements).toEqual(['#fragment']);
    spy.mockRestore();
  });

  test('step logging works for multiple chained methods', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    dom(container)
      .debug('steps')
      .add({ tag: 'div', class: 'child' })
      .enter()
      .set({ text: 'hello' })
      .up()
      .find('div');
    
    const methods = spy.mock.calls
      .filter(c => c[0]?.startsWith?.('[dom-unify] .'))
      .map(c => c[0].match(/\.(\w+)\(\)/)?.[1]);
    
    expect(methods).toContain('add');
    expect(methods).toContain('enter');
    expect(methods).toContain('set');
    expect(methods).toContain('up');
    expect(methods).toContain('find');
    spy.mockRestore();
  });
});
