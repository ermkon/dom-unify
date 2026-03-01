// --- Type Definitions ---

export interface ElementConfig {
  tag?: string;
  class?: string;
  id?: string;
  text?: string;
  html?: string;
  attrs?: Record<string, string | number | boolean | null | undefined>;
  styles?: Record<string, string | number>;
  dataset?: Record<string, string | number>;
  events?: Record<string, EventListener>;
  children?: ElementConfig[] | ElementConfig;
  value?: string | number;
  sanitize?: boolean;
  [key: string]: unknown;
}

export interface FormModeConfig {
  mode: 'form';
  selector?: string;
  keyAttr?: string;
  includeDisabled?: boolean;
  excludeEmpty?: boolean;
  includeButtons?: boolean;
  handleDuplicates?: 'array' | 'first' | 'last' | 'error';
  fileHandling?: 'names' | 'meta' | 'none';
  exclude?: {
    classes?: string[];
    ids?: string[];
    names?: string[];
    types?: string[];
    data?: Record<string, string>;
  };
  transformKey?: ((key: string) => string) | null;
  transformValue?: ((value: unknown, el: Element) => unknown) | null;
}

export interface FlatModeConfig {
  mode: 'flat';
  includeDisabled?: boolean;
  excludeEmpty?: boolean;
}

export interface NestedModeConfig {
  mode: 'nested';
  includeDisabled?: boolean;
  excludeEmpty?: boolean;
}

export type GetOptions = FormModeConfig | FlatModeConfig | NestedModeConfig;

export interface SetProps {
  text?: string;
  html?: string;
  class?: string;
  id?: string;
  style?: Partial<CSSStyleDeclaration>;
  attr?: Record<string, string | boolean | null | undefined>;
  dataset?: Record<string, string>;
}

export interface DownloadOptions {
  filename?: string;
  mimeType?: string;
  format?: ((content: unknown) => unknown) | null;
}

export interface LoadFileOptions {
  readAs?: 'text' | 'dataURL' | 'arrayBuffer' | 'binaryString';
  parse?: ((result: unknown) => unknown) | null;
  onError?: (err: Error) => void;
}

export interface SaveOptions {
  filename?: string;
  mode?: 'nested' | 'flat' | string;
  format?: 'json' | 'csv' | 'text';
  space?: number;
  transform?: ((data: unknown) => unknown) | null;
}

export interface LoadOptions {
  parse?: 'json' | ((raw: string) => unknown);
  fill?: boolean;
  onLoad?: ((data: unknown) => void) | null;
  onError?: (err: Error) => void;
}

export interface SyncOptions {
  storage?: 'local' | 'session' | 'indexeddb';
  debounce?: number;
  mode?: 'nested' | 'flat';
  onSync?: ((data: unknown) => void) | null;
}

export interface CollectOptions {
  includeDisabled?: boolean;
  excludeEmpty?: boolean;
}

export interface AddDataOptions {
  clearMissing?: boolean;
}

interface MarkedContext {
  elements: (Element | DocumentFragment)[];
  name: string;
}

interface HandlerEntry {
  handler: Function;
  wrappedHandler: EventListener;
}

type DomRoot = Element | DocumentFragment | Document | string | NodeList | (Element | DocumentFragment)[] | null | undefined;

// --- Class Implementation ---

class DomUnify {
  static config = {
    modes: {
      form: {
        selector: 'input,select,textarea',
        keyAttr: 'name',
        includeDisabled: false,
        excludeEmpty: false,
        includeButtons: false,
        handleDuplicates: 'array' as const,
        exclude: {
          classes: [] as string[],
          ids: [] as string[],
          names: [] as string[],
          types: [] as string[],
          data: {} as Record<string, string>,
        },
        transformKey: null as ((key: string) => string) | null,
        transformValue: null as ((value: unknown, el: Element) => unknown) | null,
        fileHandling: 'names' as const,
      },
    },
  };

  currentElements: (Element | DocumentFragment)[];
  lastAdded: Element[];
  markedElements: MarkedContext[];
  lastParents: Element[];
  buffer: (Element | DocumentFragment)[] | null;
  elementHistory: (Element | DocumentFragment)[][];
  _eventHandlers: WeakMap<Element, Record<string, HandlerEntry[]>>;
  _debugMode: boolean;
  _syncCleanup?: Map<string, () => void>;

  constructor(root?: DomRoot) {
    this.currentElements =
      root === null
        ? [document.createDocumentFragment()]
        : this._normalizeElements(root);
    this.lastAdded = [];
    this.markedElements = [];
    this.lastParents = [];
    this.buffer = null;
    this.elementHistory = [];
    this._eventHandlers = new WeakMap();
    this._debugMode = false;
    this.markedElements.push({ elements: [...this.currentElements], name: 'root' });
  }

  _normalizeElements(input: DomRoot): (Element | DocumentFragment)[] {
    if (!input) return [document.body];
    if (typeof input === 'string') {
      try {
        return Array.from(document.querySelectorAll(input)).filter(
          (el): el is Element => el instanceof Element
        );
      } catch (error) {
        console.warn(`Invalid selector "${input}": ${(error as Error).message}`);
        return [];
      }
    }
    if (input instanceof HTMLElement || input instanceof DocumentFragment) return [input];
    if (input instanceof Document) return [input.body];
    if (input instanceof ShadowRoot) return [];
    if (NodeList.prototype.isPrototypeOf(input) || Array.isArray(input)) {
      return Array.from(input as Iterable<Node>).filter(
        (el): el is Element | DocumentFragment =>
          el instanceof Element || el instanceof DocumentFragment
      );
    }
    return [];
  }

  _describeElements(els: (Element | DocumentFragment)[]): string[] {
    return els.map((el) => {
      if (el instanceof DocumentFragment) return '#fragment';
      let s = el.tagName?.toLowerCase() || '?';
      if ((el as Element).id) s += '#' + (el as Element).id;
      if (
        (el as Element).className &&
        typeof (el as Element).className === 'string'
      ) {
        s +=
          '.' +
          ((el as Element).className as string)
            .trim()
            .split(/\s+/)
            .join('.');
      }
      return s;
    });
  }

  _logStep(method: string): void {
    if (!this._debugMode) return;
    console.log(`[dom-unify] .${method}()`, {
      current: this._describeElements(this.currentElements),
      lastAdded: this._describeElements(this.lastAdded),
      history: this.elementHistory.length,
      buffer: this.buffer ? this.buffer.length : 0,
    });
  }

  debug(mode?: 'steps' | false): this {
    if (mode === false) {
      this._debugMode = false;
      return this;
    }
    if (mode === 'steps') {
      this._debugMode = true;
      return this;
    }
    const state = {
      currentElements: this._describeElements(this.currentElements),
      lastAdded: this._describeElements(this.lastAdded),
      historyDepth: this.elementHistory.length,
      marks: this.markedElements.map((m) => m.name),
      buffer: this.buffer ? this.buffer.length + ' element(s)' : 'empty',
    };
    console.log('[dom-unify] state:', state);
    if (this.currentElements.length === 0) {
      console.warn('[dom-unify] ⚠ EMPTY CONTEXT');
    }
    return this;
  }

  static safeHTMLToElements(htmlString: unknown): Node[] {
    if (htmlString == null) return [];
    let str = String(htmlString);

    let cleaned = str
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
      .replace(/\son\w+\s*=\s*[^\s>]+/gi, '');

    const container = document.createElement('div');
    container.innerHTML = cleaned;
    return Array.from(container.childNodes);
  }

  static createElementFromConfig(
    config: unknown,
    parent?: Node | null,
    sanitize = true,
    recursionDepth = 0
  ): Element[] {
    if (recursionDepth > 100) {
      console.warn('Maximum recursion depth exceeded; skipping child processing.');
      return [];
    }

    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      console.warn(
        'Invalid config: must be a non-null object, not an array; returning empty array.'
      );
      return [];
    }

    const cfg = config as ElementConfig;
    const {
      tag = 'div',
      class: className,
      id,
      text,
      html,
      attrs = {},
      styles = {},
      dataset = {},
      events = {},
      children = [],
      value,
      sanitize: configSanitize = sanitize,
    } = cfg;

    let safeTag = tag ? tag.toString().trim().toLowerCase() : 'div';
    const tagRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/i;
    const forbiddenTags = ['script', 'style', 'iframe', 'object', 'embed'];
    if (!tagRegex.test(safeTag) || forbiddenTags.includes(safeTag)) {
      console.warn(`Invalid tag "${tag}"; defaulting to "div".`);
      safeTag = 'div';
    }

    let el: HTMLElement;
    try {
      el = document.createElement(safeTag);
    } catch (e) {
      console.warn(
        `Failed to create element for tag "${safeTag}": ${(e as Error).message}; defaulting to "div".`
      );
      el = document.createElement('div');
    }

    if (className !== undefined) {
      if (typeof className === 'string') {
        el.className = className.trim();
      } else {
        console.warn(`Invalid class "${className}"; skipping.`);
      }
    }

    if (id !== undefined) {
      if (typeof id === 'string') {
        el.id = id.trim();
      } else {
        console.warn(`Invalid id "${id}"; skipping.`);
      }
    }

    if (text !== undefined && html !== undefined) {
      console.warn(
        'Both "text" and "html" provided; prioritizing "text" for security.'
      );
    }
    if (text !== undefined) {
      el.textContent = String(text);
    } else if (html !== undefined) {
      if (configSanitize) {
        const safeNodes = DomUnify.safeHTMLToElements(html);
        safeNodes.forEach((node) => el.appendChild(node));
      } else {
        console.warn(
          'Sanitization disabled; using raw HTML. Ensure content is trusted to avoid XSS.'
        );
        el.innerHTML = html;
      }
    }

    if (value !== undefined) {
      const safeValue =
        typeof value === 'string' || typeof value === 'number'
          ? String(value)
          : '';
      const lowerTag = safeTag.toLowerCase();
      if (lowerTag === 'input') {
        (el as HTMLInputElement).value = safeValue;
        el.setAttribute('value', safeValue);
      } else if (lowerTag === 'select') {
        if (!(children as ElementConfig[]).length && safeValue) {
          const option = document.createElement('option');
          option.value = safeValue;
          option.textContent = safeValue;
          el.appendChild(option);
        }
        (el as HTMLSelectElement).value = safeValue;
        el.setAttribute('value', safeValue);
      } else if (lowerTag === 'textarea') {
        (el as HTMLTextAreaElement).value = safeValue;
        el.textContent = safeValue;
        el.setAttribute('value', safeValue);
      } else {
        el.setAttribute('value', safeValue);
      }
    }

    for (const [key, attrValue] of Object.entries(attrs as Record<string, unknown>)) {
      if (attrValue === false || attrValue == null) continue;
      let safeKey = typeof key === 'string' ? key.trim() : '';
      if (!safeKey || /[\s<>]/.test(safeKey)) {
        console.warn(`Invalid attribute key "${key}"; skipping.`);
        continue;
      }
      let safeValue = attrValue === true ? '' : String(attrValue);
      if (
        configSanitize &&
        ['href', 'src', 'action', 'formaction'].some((prop) =>
          safeKey.toLowerCase().includes(prop)
        ) &&
        /(javascript|vbscript|data\s*:\s*text\/html)/i.test(safeValue)
      ) {
        console.warn(
          `Sanitizing dangerous attribute "${safeKey}": "${safeValue}" removed to prevent XSS.`
        );
        safeValue = '';
      }
      el.setAttribute(safeKey, safeValue);
    }

    const standardKeys = [
      'tag',
      'class',
      'id',
      'text',
      'html',
      'attrs',
      'styles',
      'dataset',
      'events',
      'children',
      'value',
      'sanitize',
    ];
    for (const [key, cfgValue] of Object.entries(cfg)) {
      if (standardKeys.includes(key)) continue;
      if (cfgValue === false || cfgValue == null) continue;
      let safeKey = typeof key === 'string' ? key.trim() : '';
      if (!safeKey || /[\s<>]/.test(safeKey)) {
        console.warn(`Invalid non-standard attribute key "${key}"; skipping.`);
        continue;
      }
      let safeValue = cfgValue === true ? '' : String(cfgValue);
      if (
        configSanitize &&
        ['href', 'src', 'action', 'formaction'].some((prop) =>
          safeKey.toLowerCase().includes(prop)
        ) &&
        /(javascript|vbscript|data\s*:\s*text\/html)/i.test(safeValue)
      ) {
        console.warn(
          `Sanitizing dangerous non-standard attribute "${safeKey}": "${safeValue}" removed.`
        );
        safeValue = '';
      }
      el.setAttribute(safeKey, safeValue);
    }

    for (let [key, styleValue] of Object.entries(styles as Record<string, unknown>)) {
      if (typeof key !== 'string' || !key.trim() || /[\s]/.test(key)) {
        console.warn(`Invalid style key "${key}"; skipping.`);
        continue;
      }
      key = key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
      if (typeof styleValue === 'string' || typeof styleValue === 'number') {
        (el.style as unknown as Record<string, unknown>)[key] = styleValue;
      } else {
        console.warn(`Invalid style value for "${key}": "${styleValue}"; skipping.`);
      }
    }

    for (const [key, dsValue] of Object.entries(dataset as Record<string, unknown>)) {
      if (typeof key !== 'string' || !key.trim() || /[\s]/.test(key)) {
        console.warn(`Invalid dataset key "${key}"; skipping.`);
        continue;
      }
      el.dataset[key] = String(dsValue);
    }

    for (const [event, handler] of Object.entries(events as Record<string, unknown>)) {
      if (
        typeof event !== 'string' ||
        !event.trim() ||
        event.toLowerCase().startsWith('on')
      ) {
        console.warn(`Invalid event name "${event}"; skipping.`);
        continue;
      }
      if (typeof handler !== 'function') {
        console.warn(`Invalid handler for event "${event}"; skipping.`);
        continue;
      }
      el.addEventListener(event, handler as EventListener);
    }

    const fragment = document.createDocumentFragment();
    const normalizedChildren = Array.isArray(children) ? children : [children];
    for (const child of normalizedChildren) {
      if (recursionDepth >= 100) {
        console.warn('Maximum recursion depth exceeded; skipping child processing.');
        break;
      }
      if (child instanceof Node) {
        fragment.appendChild(child);
      } else if (
        typeof child === 'string' ||
        typeof child === 'number' ||
        typeof child === 'boolean'
      ) {
        fragment.appendChild(document.createTextNode(String(child)));
      } else if (typeof child === 'object' && child !== null) {
        const childEls = DomUnify.createElementFromConfig(
          child,
          null,
          configSanitize,
          recursionDepth + 1
        );
        childEls.forEach((c) => fragment.appendChild(c));
      } else {
        console.warn(`Invalid child type "${typeof child}"; skipping.`);
      }
    }
    el.appendChild(fragment);

    if (parent) {
      if (!(parent instanceof Node)) {
        console.warn('Invalid parent: must be a DOM Node; skipping append.');
      } else {
        parent.appendChild(el);
      }
    }

    return [el];
  }

  // --- Helper: find elements not inside nested data-containers ---
  static _findDirectElements(container: Element, selector: string): Element[] {
    const all = container.querySelectorAll(selector);
    return Array.from(all).filter((el) => {
      let parent = el.parentElement;
      while (parent && parent !== container) {
        if (parent.hasAttribute('data-container')) return false;
        parent = parent.parentElement;
      }
      return true;
    });
  }

  // --- Helper: get value from element for flat/nested modes ---
  static _getElementValueByKey(el: Element): string | string[] | null {
    if ((el as HTMLElement).matches('input,select,textarea')) {
      const inputEl = el as HTMLInputElement;
      if (inputEl.type === 'checkbox' || inputEl.type === 'radio') {
        return inputEl.checked ? inputEl.value : null;
      }
      const selectEl = el as HTMLSelectElement;
      if (selectEl.tagName === 'SELECT' && selectEl.multiple) {
        return Array.from(selectEl.selectedOptions).map((opt) => opt.value);
      }
      return (el as HTMLInputElement | HTMLTextAreaElement).value;
    }
    return el.textContent ?? '';
  }

  // --- Helper: set value on a single target element ---
  static _setElementValue(target: Element, value: unknown): void {
    if ((target as HTMLElement).matches('input,select,textarea')) {
      const inputEl = target as HTMLInputElement;
      if (inputEl.type === 'radio') {
        inputEl.checked = String(value) === inputEl.value;
      } else if (inputEl.type === 'checkbox') {
        if (Array.isArray(value)) {
          inputEl.checked = value.includes(inputEl.value);
        } else if (typeof value === 'boolean') {
          inputEl.checked = value;
        } else {
          inputEl.checked = String(value) === inputEl.value;
        }
      } else if (
        (target as HTMLSelectElement).tagName === 'SELECT' &&
        (target as HTMLSelectElement).multiple
      ) {
        const vals = Array.isArray(value)
          ? value.map(String)
          : [String(value)];
        Array.from((target as HTMLSelectElement).options).forEach((opt) => {
          opt.selected = vals.includes(opt.value);
        });
      } else {
        const v = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
        (target as HTMLInputElement | HTMLTextAreaElement).value = String(v);
        if ((target as HTMLElement).tagName === 'TEXTAREA')
          (target as HTMLTextAreaElement).textContent = String(v);
      }
    } else {
      target.textContent = String(value ?? '');
    }
  }

  // --- Core recursive fill logic (data → DOM) ---
  static _fillElement(
    container: Element,
    data: Record<string, unknown>,
    options: CollectOptions = {}
  ): void {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;

      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        const sub = container.querySelector(`[data-container="${key}"]`);
        if (sub) DomUnify._fillElement(sub, value as Record<string, unknown>, options);
        continue;
      }

      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'object'
      ) {
        continue;
      }

      const targets = new Set<Element>();
      DomUnify._findDirectElements(container, `[data-key="${key}"]`).forEach(
        (el) => targets.add(el)
      );
      DomUnify._findDirectElements(container, `[name="${key}"]`).forEach(
        (el) => targets.add(el)
      );
      if (targets.size === 0) {
        const byId = container.querySelector(`[id="${key}"]`);
        if (byId) targets.add(byId);
      }

      for (const target of targets) {
        DomUnify._setElementValue(target, value);
      }
    }
  }

  // --- Collect flat data from container ---
  static _collectFlat(
    container: Element,
    options: CollectOptions = {}
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const selector = '[data-key], input, select, textarea';
    const elements = container.querySelectorAll(selector);
    const seen = new Set<Element>();

    for (const el of elements) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (!options.includeDisabled && (el as HTMLInputElement).disabled) continue;

      const key =
        el.getAttribute('data-key') ||
        el.getAttribute('name') ||
        (el as HTMLElement).id;
      if (!key) continue;

      const value = DomUnify._getElementValueByKey(el);
      if (value === null) continue;
      if (options.excludeEmpty && value === '') continue;

      if (result.hasOwnProperty(key)) {
        if (!Array.isArray(result[key])) result[key] = [result[key]];
        (result[key] as unknown[]).push(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  // --- Collect nested data from container (respects data-container hierarchy) ---
  static _collectNested(
    container: Element,
    options: CollectOptions = {}
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    const selector = '[data-key], input[name], select[name], textarea[name]';
    const directEls = DomUnify._findDirectElements(container, selector);
    const seen = new Set<Element>();

    for (const el of directEls) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (!options.includeDisabled && (el as HTMLInputElement).disabled) continue;

      const key =
        el.getAttribute('data-key') ||
        el.getAttribute('name') ||
        (el as HTMLElement).id;
      if (!key) continue;

      const value = DomUnify._getElementValueByKey(el);
      if (value === null) continue;
      if (options.excludeEmpty && value === '') continue;

      if (result.hasOwnProperty(key)) {
        if (!Array.isArray(result[key])) result[key] = [result[key]];
        (result[key] as unknown[]).push(value);
      } else {
        result[key] = value;
      }
    }

    const containers = DomUnify._findDirectElements(
      container,
      '[data-container]'
    );
    const groups: Record<string, Element[]> = {};
    for (const c of containers) {
      const name = c.getAttribute('data-container')!;
      if (!groups[name]) groups[name] = [];
      groups[name].push(c);
    }

    for (const [name, group] of Object.entries(groups)) {
      if (group.length === 1) {
        result[name] = DomUnify._collectNested(group[0], options);
      } else {
        result[name] = group.map((c) => DomUnify._collectNested(c, options));
      }
    }

    return result;
  }

  // --- Extract element creation logic for reuse ---
  static _createFromConfig(
    config: unknown,
    fragment: DocumentFragment
  ): (Element | Node)[] {
    const created: (Element | Node)[] = [];
    if (config instanceof DomUnify) {
      const sourceEls = config.lastAdded.length
        ? config.lastAdded
        : config.currentElements;
      sourceEls.forEach((el) =>
        fragment.appendChild(DomUnify._cloneWithState(el as Element))
      );
      created.push(...Array.from(fragment.childNodes));
    } else if (typeof config === 'string') {
      try {
        const parsed = JSON.parse(config);
        const els = Array.isArray(parsed)
          ? parsed.flatMap((cfg: unknown) =>
              DomUnify.createElementFromConfig(cfg, fragment)
            )
          : DomUnify.createElementFromConfig(parsed, fragment);
        created.push(...els);
      } catch {
        const els = DomUnify.safeHTMLToElements(config);
        els.forEach((el) => fragment.appendChild(el));
        created.push(...els);
      }
    } else if (Array.isArray(config)) {
      config.forEach((cfg: unknown) => {
        const els = DomUnify.createElementFromConfig(cfg, fragment);
        created.push(...els);
      });
    } else if (config instanceof Node) {
      const clone = DomUnify._cloneWithState(config as Element);
      fragment.appendChild(clone);
      created.push(clone);
    } else if (typeof config === 'object' && config !== null) {
      const els = DomUnify.createElementFromConfig(config, fragment);
      created.push(...els);
    }
    return created;
  }

  // --- Clone element preserving form state (value, checked, selected) ---
  static _cloneWithState(el: Element | DocumentFragment): Element | DocumentFragment {
    const clone = el.cloneNode(true) as Element | DocumentFragment;
    const origInputs = 'querySelectorAll' in el
      ? el.querySelectorAll('input, textarea, select')
      : [];
    const cloneInputs = 'querySelectorAll' in clone
      ? (clone as Element).querySelectorAll('input, textarea, select')
      : [];
    for (let i = 0; i < origInputs.length; i++) {
      const orig = origInputs[i] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const copy = cloneInputs[i] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (!copy) continue;
      if (orig.tagName === 'SELECT') {
        for (let j = 0; j < (orig as HTMLSelectElement).options.length; j++) {
          if ((copy as HTMLSelectElement).options[j])
            (copy as HTMLSelectElement).options[j].selected = (orig as HTMLSelectElement).options[j].selected;
        }
      } else if (
        (orig as HTMLInputElement).type === 'checkbox' ||
        (orig as HTMLInputElement).type === 'radio'
      ) {
        (copy as HTMLInputElement).checked = (orig as HTMLInputElement).checked;
      } else if (orig.tagName === 'TEXTAREA') {
        (copy as HTMLTextAreaElement).value = (orig as HTMLTextAreaElement).value;
        (copy as HTMLTextAreaElement).textContent = (orig as HTMLTextAreaElement).value;
      } else {
        (copy as HTMLInputElement).value = (orig as HTMLInputElement).value;
      }
    }
    if (
      (el as Element).matches &&
      (el as Element).matches('input, textarea, select')
    ) {
      if ((el as Element).tagName === 'SELECT') {
        for (let j = 0; j < (el as HTMLSelectElement).options.length; j++) {
          if ((clone as unknown as HTMLSelectElement).options[j])
            (clone as unknown as HTMLSelectElement).options[j].selected =
              (el as HTMLSelectElement).options[j].selected;
        }
      } else if (
        (el as HTMLInputElement).type === 'checkbox' ||
        (el as HTMLInputElement).type === 'radio'
      ) {
        (clone as unknown as HTMLInputElement).checked = (el as HTMLInputElement).checked;
      } else if ((el as Element).tagName === 'TEXTAREA') {
        (clone as unknown as HTMLTextAreaElement).value = (el as HTMLTextAreaElement).value;
        (clone as unknown as HTMLTextAreaElement).textContent = (el as HTMLTextAreaElement).value;
      } else {
        (clone as unknown as HTMLInputElement).value = (el as HTMLInputElement).value;
      }
    }
    return clone;
  }

  // --- IndexedDB helpers for .sync() ---
  static _idbOpen(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('dom-unify-sync', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('data');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  static async _idbGet(key: string): Promise<unknown> {
    const db = await DomUnify._idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('data', 'readonly');
      const req = tx.objectStore('data').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  static async _idbSet(key: string, value: unknown): Promise<void> {
    const db = await DomUnify._idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('data', 'readwrite');
      tx.objectStore('data').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static addToElements(
    targets: (Element | DocumentFragment)[],
    config: unknown,
    data?: Record<string, unknown> | Record<string, unknown>[],
    options?: AddDataOptions
  ): Element[] {
    const elements: Element[] = [];

    if (Array.isArray(data)) {
      if (data.length === 0) return elements;
      for (const target of targets) {
        for (const item of data) {
          const fragment = document.createDocumentFragment();
          const created = DomUnify._createFromConfig(config, fragment);
          target.appendChild(fragment);
          if (item && typeof item === 'object') {
            for (const el of created) {
              if ((el as Element).nodeType === 1)
                DomUnify._fillElement(el as Element, item as Record<string, unknown>);
            }
          }
          elements.push(...(created.filter((n) => n.nodeType === 1) as Element[]));
        }
      }
      return elements;
    }

    for (const target of targets) {
      const fragment = document.createDocumentFragment();
      const created = DomUnify._createFromConfig(config, fragment);
      elements.push(...(created.filter((n) => n.nodeType === 1) as Element[]));
      target.appendChild(fragment);
    }
    if (data) {
      const allElements = [...targets, ...elements] as Element[];
      new DomUnify(allElements)._applyDataToElements(
        allElements,
        data as Record<string, unknown>,
        options
      );
    }
    return elements;
  }

  add(
    config: unknown,
    data?: Record<string, unknown> | Record<string, unknown>[],
    options?: AddDataOptions
  ): this {
    const els = DomUnify.addToElements(this.currentElements, config, data, options);
    this.lastAdded = els;
    this._logStep('add');
    return this;
  }

  set(
    props: SetProps = {},
    data?: Record<string, unknown>,
    options?: AddDataOptions
  ): this {
    for (const el of this.currentElements) {
      if (!(el instanceof Element)) continue;
      if (props.text !== undefined) el.textContent = props.text;
      if (props.html !== undefined) (el as HTMLElement).innerHTML = props.html;
      if (props.class !== undefined) {
        const classVal = String(props.class).trim();
        if (
          classVal &&
          (classVal[0] === '+' || classVal[0] === '-' || classVal[0] === '!')
        ) {
          const parts = classVal.split(/\s+/);
          for (const part of parts) {
            const op = part[0];
            const cls = part.slice(1);
            if (!cls) continue;
            if (op === '+') el.classList.add(cls);
            else if (op === '-') el.classList.remove(cls);
            else if (op === '!') el.classList.toggle(cls);
          }
        } else {
          (el as HTMLElement).className = classVal;
        }
      }
      if (props.id !== undefined) el.id = props.id;
      if (props.style) Object.assign((el as HTMLElement).style, props.style);
      if (props.attr) {
        for (const key in props.attr) {
          const value = props.attr[key];
          if (value === false || value == null) continue;
          el.setAttribute(key, value === true ? '' : String(value));
        }
      }
      if (props.dataset) {
        for (const key in props.dataset) {
          (el as HTMLElement).dataset[key] = props.dataset[key];
        }
      }
    }
    if (data) {
      this._applyDataToElements(
        this.currentElements as Element[],
        data,
        options
      );
    }
    this._logStep('set');
    return this;
  }

  fill(
    data: Record<string, unknown> | Record<string, unknown>[] | null | undefined,
    options?: CollectOptions
  ): this {
    if (!data) return this;
    if (Array.isArray(data)) {
      const len = Math.min(this.currentElements.length, data.length);
      for (let i = 0; i < len; i++) {
        if (data[i] && typeof data[i] === 'object') {
          DomUnify._fillElement(
            this.currentElements[i] as Element,
            data[i] as Record<string, unknown>,
            options
          );
        }
      }
    } else if (typeof data === 'object') {
      for (const el of this.currentElements) {
        DomUnify._fillElement(el as Element, data, options);
      }
    }
    this._logStep('fill');
    return this;
  }

  _applyDataToElements(
    elements: (Element | DocumentFragment)[],
    data: Record<string, unknown>,
    options: AddDataOptions = {}
  ): void {
    if (!data || typeof data !== 'object') return;
    const clearMissing = options.clearMissing ?? false;
    const selector = 'input,select,textarea';
    const keyAttr = 'name';
    const formEls: Element[] = [];
    for (const el of elements) {
      if (el.querySelectorAll) formEls.push(...Array.from(el.querySelectorAll(selector)));
      if ((el as Element).matches && (el as Element).matches(selector))
        formEls.push(el as Element);
    }
    for (const fel of formEls) {
      const key = fel.getAttribute(keyAttr);
      if (key && data.hasOwnProperty(key)) {
        let value = data[key];
        const inputEl = fel as HTMLInputElement;
        if (inputEl.type === 'radio') {
          inputEl.checked = value === inputEl.value;
        } else if (inputEl.type === 'checkbox') {
          inputEl.checked = Array.isArray(value)
            ? value.includes(inputEl.value)
            : value === inputEl.value;
        } else if (
          (fel as HTMLSelectElement).tagName === 'SELECT' &&
          (fel as HTMLSelectElement).multiple
        ) {
          Array.from((fel as HTMLSelectElement).options).forEach((opt) => {
            opt.selected = Array.isArray(value)
              ? value.includes(opt.value)
              : value === opt.value;
          });
        } else {
          if (Array.isArray(value)) {
            value = value[0] || '';
          }
          (fel as HTMLInputElement | HTMLTextAreaElement).value =
            (value as string) || '';
          if (fel.tagName === 'TEXTAREA')
            (fel as HTMLTextAreaElement).textContent = (value as string) || '';
        }
      } else if (clearMissing) {
        const inputEl = fel as HTMLInputElement;
        if (inputEl.type === 'radio' || inputEl.type === 'checkbox') {
          inputEl.checked = false;
        } else if (
          (fel as HTMLSelectElement).tagName === 'SELECT' &&
          (fel as HTMLSelectElement).multiple
        ) {
          Array.from((fel as HTMLSelectElement).options).forEach(
            (opt) => (opt.selected = false)
          );
        } else {
          (fel as HTMLInputElement | HTMLTextAreaElement).value = '';
          if (fel.tagName === 'TEXTAREA')
            (fel as HTMLTextAreaElement).textContent = '';
        }
      }
    }
  }

  copy(): this {
    this.buffer = this.currentElements.map((el) =>
      DomUnify._cloneWithState(el as Element)
    );
    this._logStep('copy');
    return this;
  }

  paste(position: string | number = 'append'): this {
    if (!this.buffer || !this.buffer.length) return this;
    const pasted: Element[] = [];

    this.currentElements.forEach((ctx) => {
      const frag = document.createDocumentFragment();
      const clones = this.buffer!.map((el) =>
        DomUnify._cloneWithState(el as Element)
      );
      clones.forEach((el) => frag.appendChild(el));
      pasted.push(...(clones as Element[]));

      if (position === 'before') {
        if ((ctx as Element).parentNode)
          (ctx as Element).parentNode!.insertBefore(frag, ctx as Element);
      } else if (position === 'after') {
        if ((ctx as Element).parentNode)
          (ctx as Element).parentNode!.insertBefore(
            frag,
            (ctx as Element).nextSibling
          );
      } else if (position === 'prepend' || position === 'start') {
        (ctx as Element).insertBefore(frag, ctx.firstChild);
      } else if (typeof position === 'number') {
        const children = Array.from(ctx.childNodes);
        const index = position < 0 ? children.length + position : position;
        const ref = children[index] || null;
        (ctx as Element).insertBefore(frag, ref);
      } else {
        ctx.appendChild(frag);
      }
    });

    this.lastAdded = pasted;
    this._logStep('paste');
    return this;
  }

  duplicate(position: 'append' | 'prepend' = 'append'): this {
    const duplicated: Element[] = [];
    this.currentElements.forEach((orig) => {
      const clone = DomUnify._cloneWithState(orig as Element) as Element;
      const parent = (orig as Element).parentNode;
      if (!parent) return;
      if (position === 'prepend') {
        parent.insertBefore(clone, orig as Element);
      } else {
        parent.insertBefore(clone, (orig as Element).nextSibling);
      }
      duplicated.push(clone);
    });
    this.lastAdded = duplicated;
    this._logStep('duplicate');
    return this;
  }

  enter(index?: number | string): this {
    this.elementHistory.push([...this.currentElements]);
    let entered: Element[] = [];

    for (const el of this.currentElements) {
      const children = Array.from((el as Element).children);
      if (typeof index === 'number') {
        const i = index >= 0 ? index : children.length + index;
        if (children[i]) entered.push(children[i]);
      } else if (typeof index === 'string') {
        entered.push(...children.filter((c) => c.matches(index)));
      } else if (this.lastAdded.length) {
        entered.push(...this.lastAdded);
        this.lastAdded = [];
      } else if (children.length) {
        entered.push(...children);
      }
    }

    if (entered.length === 0) {
      entered = [...this.currentElements] as Element[];
    }

    this.currentElements = entered;
    this._logStep('enter');
    return this;
  }

  up(selector?: string | number): this {
    this.elementHistory.push([...this.currentElements]);
    const result: Element[] = [];

    if (selector === undefined) {
      for (const el of this.currentElements) {
        const parent = (el as Element).parentElement;
        if (parent && !result.includes(parent)) result.push(parent);
      }
    } else if (typeof selector === 'number') {
      const levels = Math.abs(selector);
      for (const el of this.currentElements) {
        let parent: Element = el as Element;
        if (selector < 0) {
          while (parent.parentElement && parent !== document.body) {
            parent = parent.parentElement;
          }
        } else {
          for (let i = 0; i < levels && parent.parentElement; i++) {
            parent = parent.parentElement;
          }
        }
        if (parent && !result.includes(parent)) result.push(parent);
      }
    } else {
      for (const el of this.currentElements) {
        const parent = (el as Element).closest(selector);
        if (parent && !result.includes(parent)) result.push(parent);
      }
    }

    this.currentElements = result;
    this.lastAdded = [];
    this._logStep('up');
    return this;
  }

  back(steps = 1): this {
    if (this.currentElements.length === 0 && this.lastParents.length > 0) {
      this.currentElements = this.lastParents;
      this.lastParents = [];
      this.lastAdded = [];
      return this;
    }

    if (this.elementHistory.length === 0) return this;

    let index: number;
    if (steps >= 0) {
      index = Math.max(0, this.elementHistory.length - steps);
    } else {
      index = Math.max(0, Math.abs(steps) - 1);
    }

    if (index >= this.elementHistory.length) return this;

    this.currentElements = [...this.elementHistory[index]];
    this.elementHistory = this.elementHistory.slice(0, index);
    this.lastAdded = [];
    this._logStep('back');
    return this;
  }

  mark(name: string): this {
    if (typeof name !== 'string' || name.trim() === '') return this;

    const toSave =
      this.lastAdded.length > 0
        ? [...this.lastAdded]
        : [...this.currentElements];
    this.markedElements = this.markedElements.filter(
      (ctx) => ctx.name !== name
    );
    this.markedElements.push({
      elements: toSave as (Element | DocumentFragment)[],
      name,
    });
    this._logStep('mark');
    return this;
  }

  getMark(name: string): this {
    if (typeof name !== 'string' || name.trim() === '') return this;

    const context = [...this.markedElements]
      .reverse()
      .find((ctx) => ctx.name === name);
    if (context) {
      this.currentElements = [...context.elements];
    }
    this._logStep('getMark');
    return this;
  }

  delete(): this {
    this.elementHistory.push([...this.currentElements]);
    this.lastParents = (this.currentElements as HTMLElement[])
      .map((el) => el.parentElement)
      .filter(
        (el, i, arr): el is HTMLElement => el != null && arr.indexOf(el) === i
      ) as Element[];
    for (const el of this.currentElements) (el as Element).remove();
    this.currentElements = [];
    this.lastAdded = [];
    this._logStep('delete');
    return this;
  }

  cut(): this {
    this.elementHistory.push([...this.currentElements]);
    this.buffer = this.currentElements.map((el) => el);
    this.lastParents = (this.currentElements as HTMLElement[])
      .map((el) => el.parentElement)
      .filter(
        (el, i, arr): el is HTMLElement => el != null && arr.indexOf(el) === i
      ) as Element[];
    for (const el of this.currentElements) (el as Element).remove();
    this.currentElements = [];
    this.lastAdded = [];
    this._logStep('cut');
    return this;
  }

  find(selector?: string): this {
    if (!selector) {
      this.elementHistory.push([...this.currentElements]);
      this.currentElements = [];
      this.lastAdded = [];
      return this;
    }

    this.elementHistory.push([...this.currentElements]);
    const results: Element[] = [];

    if (selector === '*') {
      for (const el of this.currentElements) {
        results.push(...Array.from((el as Element).children));
      }
    } else {
      for (const el of this.currentElements) {
        results.push(...Array.from((el as Element).querySelectorAll(selector)));
      }
    }

    this.currentElements = results;
    this.lastAdded = [];
    this._logStep('find');
    return this;
  }

  on(event: string, handler: Function | string, ...args: unknown[]): this {
    if (typeof event !== 'string' || !event.trim()) return this;
    let resolvedHandler = handler;
    if (typeof handler === 'string') {
      resolvedHandler = (window as unknown as Record<string, unknown>)[handler] as Function;
      if (typeof resolvedHandler !== 'function') return this;
    }
    if (typeof resolvedHandler !== 'function') return this;

    const targets = this.lastAdded.length
      ? this.lastAdded
      : this.currentElements;
    for (const element of targets) {
      let handlers = this._eventHandlers.get(element as Element);
      if (!handlers) {
        handlers = {};
        this._eventHandlers.set(element as Element, handlers);
      }
      if (!handlers[event]) {
        handlers[event] = [];
      }
      const wrappedHandler = ((e: Event) =>
        (resolvedHandler as Function)(...args, e)) as EventListener;
      (element as Element).addEventListener(event, wrappedHandler);
      handlers[event].push({
        handler: resolvedHandler as Function,
        wrappedHandler,
      });
    }

    this._logStep('on');
    return this;
  }

  off(event: string, handler?: Function | string): this {
    if (typeof event !== 'string' || !event.trim()) return this;

    const targets = this.lastAdded.length
      ? this.lastAdded
      : this.currentElements;
    for (const element of targets) {
      const handlers = this._eventHandlers.get(element as Element);
      if (!handlers || !handlers[event]) continue;

      if (!handler) {
        handlers[event].forEach(({ wrappedHandler }) => {
          (element as Element).removeEventListener(event, wrappedHandler);
        });
        handlers[event] = [];
      } else {
        let resolvedHandler = handler;
        if (typeof handler === 'string') {
          resolvedHandler = (window as unknown as Record<string, unknown>)[handler] as Function;
          if (typeof resolvedHandler !== 'function') return this;
        }
        if (typeof resolvedHandler !== 'function') return this;

        handlers[event] = handlers[event].filter(
          ({ handler: h, wrappedHandler }) => {
            if (h === resolvedHandler) {
              (element as Element).removeEventListener(event, wrappedHandler);
              return false;
            }
            return true;
          }
        );
      }
    }

    this._logStep('off');
    return this;
  }

  get(): (Element | DocumentFragment)[];
  get(index: number): Element | null;
  get(mode: 'flat'): Record<string, unknown>[];
  get(mode: 'nested'): Record<string, unknown>[];
  get(options: GetOptions): unknown[];
  get(
    arg?: number | string | GetOptions
  ): (Element | DocumentFragment)[] | Element | Record<string, unknown>[] | unknown[] | null {
    if (arg === undefined) {
      return [...this.currentElements];
    }

    if (typeof arg === 'number') {
      const len = this.currentElements.length;
      if (len === 0) return null;
      const index = arg >= 0 ? arg : len + arg;
      return index >= 0 && index < len
        ? (this.currentElements[index] as Element)
        : null;
    }

    if (typeof arg === 'string') {
      if (arg === 'flat') {
        return this.currentElements.map((el) =>
          DomUnify._collectFlat(el as Element)
        );
      }
      if (arg === 'nested') {
        return this.currentElements.map((el) =>
          DomUnify._collectNested(el as Element)
        );
      }
      console.warn(`get(): unknown mode "${arg}"`);
      return null;
    }

    if (typeof arg === 'object' && arg !== null) {
      const options = arg as GetOptions;

      if (options.mode === 'flat') {
        return this.currentElements.map((el) =>
          DomUnify._collectFlat(el as Element, options)
        );
      }
      if (options.mode === 'nested') {
        return this.currentElements.map((el) =>
          DomUnify._collectNested(el as Element, options)
        );
      }

      const formOptions = options as FormModeConfig;
      const modeConfig =
        DomUnify.config.modes[formOptions.mode as keyof typeof DomUnify.config.modes] || {};
      const config = { ...modeConfig, ...formOptions };

      const results: Record<string, unknown>[] = [];

      for (const ctx of this.currentElements) {
        const data: Record<string, unknown> = {};
        let elements = Array.from(
          (ctx as Element).querySelectorAll(config.selector || 'input,select,textarea')
        );

        if (config.includeButtons) {
          elements = elements.concat(
            Array.from((ctx as Element).querySelectorAll('button[name]'))
          );
        }

        for (const el of elements) {
          if (!config.includeDisabled && (el as HTMLInputElement).disabled) continue;
          if (config.exclude?.ids?.includes(el.id)) continue;
          if (
            config.exclude?.classes?.some((cls: string) =>
              el.classList.contains(cls)
            )
          )
            continue;
          if (
            config.exclude?.names?.includes(
              el.getAttribute(config.keyAttr || 'name') ?? ''
            )
          )
            continue;
          if (config.exclude?.types?.includes((el as HTMLInputElement).type))
            continue;
          for (const [dataKey, dataVal] of Object.entries(
            config.exclude?.data || {}
          )) {
            if ((el as HTMLElement).dataset[dataKey] === dataVal) continue;
          }

          const key = el.getAttribute(config.keyAttr || 'name');
          if (!key) continue;

          let value: unknown = this._getElementValue(
            el as HTMLElement,
            config
          );
          if (
            value === null ||
            value === undefined ||
            (config.excludeEmpty &&
              (value === '' ||
                (Array.isArray(value) && value.length === 0)))
          )
            continue;

          if (config.transformValue)
            value = config.transformValue(value, el);
          const transformedKey = config.transformKey
            ? config.transformKey(key)
            : key;

          this._setDataValue(
            data,
            transformedKey,
            value,
            config.handleDuplicates || 'array'
          );
        }

        results.push(data);
      }

      return results;
    }

    console.warn('get(): invalid argument', arg);
    return null;
  }

  _getElementValue(
    el: HTMLElement,
    config: { fileHandling?: string }
  ): unknown {
    if (el.tagName === 'BUTTON') return (el as HTMLButtonElement).value;
    if (
      (el as HTMLInputElement).type === 'checkbox' ||
      (el as HTMLInputElement).type === 'radio'
    )
      return (el as HTMLInputElement).checked
        ? (el as HTMLInputElement).value
        : null;
    if (
      el.tagName === 'SELECT' &&
      (el as HTMLSelectElement).multiple
    )
      return Array.from((el as HTMLSelectElement).selectedOptions).map(
        (opt) => opt.value
      );
    if ((el as HTMLInputElement).type === 'file') {
      if (config.fileHandling === 'none') return null;
      const files = Array.from((el as HTMLInputElement).files || []);
      if (config.fileHandling === 'meta') {
        return files.map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
        }));
      }
      return files.map((file) => file.name);
    }
    return (el as HTMLInputElement).value;
  }

  _setDataValue(
    data: Record<string, unknown>,
    key: string,
    value: unknown,
    handleDuplicates: string
  ): void {
    if (value === null) return;
    if (!data.hasOwnProperty(key)) {
      data[key] = value;
      return;
    }
    if (handleDuplicates === 'last') {
      data[key] = value;
    } else if (handleDuplicates === 'first') {
      // keep first
    } else if (handleDuplicates === 'error') {
      throw new Error(`Duplicate key: ${key}`);
    } else {
      if (!Array.isArray(data[key])) data[key] = [data[key]];
      if (Array.isArray(value)) (data[key] as unknown[]).push(...value);
      else (data[key] as unknown[]).push(value);
    }
  }

  downloadFile(content: unknown, options: DownloadOptions = {}): this {
    const {
      filename = 'file.txt',
      mimeType = 'text/plain',
      format = null,
    } = options;
    let formattedContent: unknown;
    try {
      formattedContent = format ? format(content) : content;
    } catch (err) {
      console.error('Download format error:', err);
      return this;
    }
    const blobContent =
      formattedContent instanceof Blob
        ? formattedContent
        : new Blob([formattedContent as BlobPart], { type: mimeType });
    const url = URL.createObjectURL(blobContent);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return this;
  }

  loadFile(
    inputSelector: string,
    callback: (result: unknown) => void,
    options: LoadFileOptions = {}
  ): this {
    const {
      readAs = 'text',
      parse = null,
      onError = (err: Error) => console.error('File load error:', err),
    } = options;
    const input = document.querySelector(inputSelector) as HTMLInputElement | null;
    if (!input) {
      onError(new Error('File input not found'));
      return this;
    }
    const handler = () => {
      if (input.files && input.files.length) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const result = parse
              ? parse(e.target!.result)
              : e.target!.result;
            callback(result);
            input.value = '';
          } catch (err) {
            onError(err as Error);
          }
        };
        reader.onerror = () => {
          onError(new Error('File read error'));
        };
        const methodName = ('readAs' +
          readAs.charAt(0).toUpperCase() +
          readAs.slice(1)) as keyof FileReader;
        (reader[methodName] as Function).call(reader, file);
      }
    };
    input.addEventListener('change', handler, { once: true });
    return this;
  }

  // --- Save: collect data from DOM and download as file ---
  save(options: SaveOptions = {}): this {
    const {
      filename = 'data.json',
      mode = 'nested',
      format = 'json',
      space = 2,
      transform = null,
    } = options;

    let data: unknown;
    if (mode === 'flat') {
      data = this.currentElements.map((el) =>
        DomUnify._collectFlat(el as Element)
      );
    } else if (mode === 'nested') {
      data = this.currentElements.map((el) =>
        DomUnify._collectNested(el as Element)
      );
    } else {
      data = this.get({ mode } as GetOptions);
    }
    if (Array.isArray(data) && data.length === 1) data = data[0];
    if (transform) data = transform(data);

    let content: string;
    let mimeType: string;
    if (format === 'json') {
      content = JSON.stringify(data, null, space);
      mimeType = 'application/json';
    } else if (format === 'csv') {
      const esc = (v: unknown) =>
        '"' + String(v ?? '').replace(/"/g, '""') + '"';
      if (Array.isArray(data)) {
        const keys = [
          ...new Set(
            data.flatMap((d: unknown) => Object.keys(d as object))
          ),
        ];
        content =
          keys.map(esc).join(',') +
          '\n' +
          data
            .map((row: unknown) =>
              keys.map((k) => esc((row as Record<string, unknown>)[k])).join(',')
            )
            .join('\n');
      } else if (data && typeof data === 'object') {
        const keys = Object.keys(data);
        content =
          keys.map(esc).join(',') +
          '\n' +
          keys
            .map((k) => esc((data as Record<string, unknown>)[k]))
            .join(',');
      } else {
        content = String(data ?? '');
      }
      mimeType = 'text/csv';
    } else {
      content =
        typeof data === 'string' ? data : JSON.stringify(data);
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    this._logStep('save');
    return this;
  }

  // --- Load: read file and fill DOM ---
  load(
    selector: string | HTMLInputElement,
    options: LoadOptions = {}
  ): this {
    const {
      parse = 'json',
      fill = true,
      onLoad = null,
      onError = (err: Error) => console.error('[dom-unify] load error:', err),
    } = options;

    const input =
      typeof selector === 'string'
        ? (document.querySelector(selector) as HTMLInputElement | null)
        : selector;
    if (!input) {
      if (onError) onError(new Error('File input not found'));
      return this;
    }

    const targets = [...this.currentElements] as Element[];
    const handler = () => {
      if (!input.files || !input.files.length) return;
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let data: unknown = e.target!.result;
          if (parse === 'json') data = JSON.parse(data as string);
          else if (typeof parse === 'function') data = parse(data as string);

          if (fill && data && typeof data === 'object') {
            if (Array.isArray(data)) {
              const len = Math.min(targets.length, data.length);
              for (let i = 0; i < len; i++) {
                if (data[i] && typeof data[i] === 'object') {
                  DomUnify._fillElement(targets[i], data[i] as Record<string, unknown>);
                }
              }
            } else {
              for (const el of targets)
                DomUnify._fillElement(el, data as Record<string, unknown>);
            }
          }
          if (onLoad) onLoad(data);
          input.value = '';
        } catch (err) {
          if (onError) onError(err as Error);
        }
      };
      reader.onerror = () => {
        if (onError) onError(new Error('File read error'));
      };
      reader.readAsText(file);
    };

    input.addEventListener('change', handler, { once: true });
    this._logStep('load');
    return this;
  }

  // --- Sync: bidirectional DOM ↔ storage ---
  sync(key: string, options: SyncOptions = {}): this {
    if (!key || typeof key !== 'string') return this;

    const {
      storage = 'local',
      debounce: debounceMs = 300,
      mode = 'nested',
      onSync = null,
    } = options;

    const targets = [...this.currentElements] as Element[];
    const collectData = () => {
      const data =
        mode === 'flat'
          ? targets.map((el) => DomUnify._collectFlat(el))
          : targets.map((el) => DomUnify._collectNested(el));
      return data.length === 1 ? data[0] : data;
    };

    if (storage === 'indexeddb' && typeof indexedDB !== 'undefined') {
      DomUnify._idbGet(key)
        .then((data) => {
          if (data)
            for (const el of targets)
              DomUnify._fillElement(el, data as Record<string, unknown>);
        })
        .catch(() => {});
    } else {
      const store =
        storage === 'session' ? sessionStorage : localStorage;
      const raw = store.getItem(key);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          for (const el of targets) DomUnify._fillElement(el, data);
        } catch {
          // ignore invalid JSON
        }
      }
    }

    let timeout: ReturnType<typeof setTimeout>;
    const onChange = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const data = collectData();
        if (storage === 'indexeddb' && typeof indexedDB !== 'undefined') {
          DomUnify._idbSet(key, data).catch(() => {});
        } else {
          const store =
            storage === 'session' ? sessionStorage : localStorage;
          store.setItem(key, JSON.stringify(data));
        }
        if (onSync) onSync(data);
      }, debounceMs);
    };

    for (const el of targets) {
      el.addEventListener('input', onChange);
      el.addEventListener('change', onChange);
    }

    if (!this._syncCleanup) this._syncCleanup = new Map();
    this._syncCleanup.set(key, () => {
      clearTimeout(timeout);
      for (const el of targets) {
        el.removeEventListener('input', onChange);
        el.removeEventListener('change', onChange);
      }
    });

    this._logStep('sync');
    return this;
  }

  unsync(key: string): this {
    if (this._syncCleanup && this._syncCleanup.has(key)) {
      this._syncCleanup.get(key)!();
      this._syncCleanup.delete(key);
    }
    this._logStep('unsync');
    return this;
  }
}

function dom(root?: DomRoot): DomUnify {
  return new DomUnify(root);
}

export { DomUnify, dom };
