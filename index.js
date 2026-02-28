class DomUnify {
  static config = {
    modes: {
      form: {
        selector: 'input,select,textarea',
        keyAttr: 'name',
        includeDisabled: false,
        excludeEmpty: false,
        includeButtons: false,
        handleDuplicates: 'array',
        exclude: {
          classes: [],
          ids: [],
          names: [],
          types: [],
          data: {}
        },
        transformKey: null,
        transformValue: null,
        fileHandling: 'names'
      }
    }
  };

  constructor(root) {
    this.currentElements = root === null ? [document.createDocumentFragment()] : this._normalizeElements(root);
    this.lastAdded = [];
    this.markedElements = [];
    this.lastParents = [];
    this.buffer = null;
    this.elementHistory = [];
    this._eventHandlers = new WeakMap();
    this._debugMode = false;
    this.markedElements.push({ elements: [...this.currentElements], name: 'root' });
  }

  _normalizeElements(input) {
    if (!input) return [document.body];
    if (typeof input === 'string') {
      try {
        return Array.from(document.querySelectorAll(input)).filter(el => el instanceof Element);
      } catch (error) {
        console.warn(`Invalid selector "${input}": ${error.message}`);
        return [];
      }
    }
    if (input instanceof HTMLElement || input instanceof DocumentFragment) return [input];
    if (input instanceof Document) return [input.body];
    if (input instanceof ShadowRoot) return []; // ShadowRoot is not directly manipulable as HTMLElement
    if (NodeList.prototype.isPrototypeOf(input) || Array.isArray(input)) {
      return Array.from(input).filter(el => el instanceof Element || el instanceof DocumentFragment);
    }
    return [];
  }

  _describeElements(els) {
    return els.map(el => {
      if (el instanceof DocumentFragment) return '#fragment';
      let s = el.tagName?.toLowerCase() || '?';
      if (el.id) s += '#' + el.id;
      if (el.className && typeof el.className === 'string') {
        s += '.' + el.className.trim().split(/\s+/).join('.');
      }
      return s;
    });
  }

  _logStep(method) {
    if (!this._debugMode) return;
    console.log(`[dom-unify] .${method}()`, {
      current: this._describeElements(this.currentElements),
      lastAdded: this._describeElements(this.lastAdded),
      history: this.elementHistory.length,
      buffer: this.buffer ? this.buffer.length : 0
    });
  }

  debug(mode) {
    if (mode === false) {
      this._debugMode = false;
      return this;
    }
    if (mode === 'steps') {
      this._debugMode = true;
      return this;
    }
    // Print current state snapshot
    const state = {
      currentElements: this._describeElements(this.currentElements),
      lastAdded: this._describeElements(this.lastAdded),
      historyDepth: this.elementHistory.length,
      marks: this.markedElements.map(m => m.name),
      buffer: this.buffer ? this.buffer.length + ' element(s)' : 'empty'
    };
    console.log('[dom-unify] state:', state);
    if (this.currentElements.length === 0) {
      console.warn('[dom-unify] ⚠ EMPTY CONTEXT');
    }
    return this;
  }

  static safeHTMLToElements(htmlString) {
    if (htmlString == null) return [];
    htmlString = String(htmlString);

    // Basic sanitization: remove <script> tags and on* event attributes
    let cleaned = htmlString
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
      .replace(/\son\w+\s*=\s*[^\s>]+/gi, '');

    // For untrusted HTML, use a dedicated library like DOMPurify
    const container = document.createElement('div');
    container.innerHTML = cleaned;
    return Array.from(container.childNodes);
  }

  /**
   * Creates a DOM element from a configuration object and optionally appends it to a parent.
   * @param {Object|null} config - Configuration object for the element.
   * @param {Node} [parent] - Parent node to append the created element to.
   * @param {boolean} [sanitize=true] - Whether to sanitize HTML and attributes to prevent XSS.
   * @param {number} [recursionDepth=0] - Internal recursion depth to prevent stack overflow.
   * @returns {Node[]} Array containing the created element, or empty array if config is invalid.
   */
  static createElementFromConfig(config, parent, sanitize = true, recursionDepth = 0) {
    // Prevent stack overflow for deeply nested children
    if (recursionDepth > 100) {
      console.warn('Maximum recursion depth exceeded; skipping child processing.');
      return [];
    }

    // Validate config
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      console.warn('Invalid config: must be a non-null object, not an array; returning empty array.');
      return [];
    }

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
      sanitize: configSanitize = sanitize
    } = config;

    // Validate tag per HTML spec
    let safeTag = tag ? tag.toString().trim().toLowerCase() : 'div';
    const tagRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/i;
    const forbiddenTags = ['script', 'style', 'iframe', 'object', 'embed'];
    if (!tagRegex.test(safeTag) || forbiddenTags.includes(safeTag)) {
      console.warn(`Invalid tag "${tag}"; defaulting to "div".`);
      safeTag = 'div';
    }

    let el;
    try {
      el = document.createElement(safeTag);
    } catch (e) {
      console.warn(`Failed to create element for tag "${safeTag}": ${e.message}; defaulting to "div".`);
      el = document.createElement('div');
    }

    // Set class
    if (className !== undefined) {
      if (typeof className === 'string') {
        el.className = className.trim();
      } else {
        console.warn(`Invalid class "${className}"; skipping.`);
      }
    }

    // Set ID
    if (id !== undefined) {
      if (typeof id === 'string') {
        el.id = id.trim();
      } else {
        console.warn(`Invalid id "${id}"; skipping.`);
      }
    }

    // Handle text and html (prioritize text for safety)
    if (text !== undefined && html !== undefined) {
      console.warn('Both "text" and "html" provided; prioritizing "text" for security.');
    }
    if (text !== undefined) {
      el.textContent = String(text);
    } else if (html !== undefined) {
      if (configSanitize) {
        const safeNodes = DomUnify.safeHTMLToElements(html);
        safeNodes.forEach(node => el.appendChild(node));
      } else {
        console.warn('Sanitization disabled; using raw HTML. Ensure content is trusted to avoid XSS.');
        el.innerHTML = html;
      }
    }

    // Handle value for form elements
    if (value !== undefined) {
      const safeValue = (typeof value === 'string' || typeof value === 'number') ? String(value) : '';
      const lowerTag = safeTag.toLowerCase();
      if (lowerTag === 'input') {
        el.value = safeValue;
        el.setAttribute('value', safeValue);
      } else if (lowerTag === 'select') {
        if (!children.length && safeValue) {
          const option = document.createElement('option');
          option.value = safeValue;
          option.textContent = safeValue;
          el.appendChild(option);
        }
        el.value = safeValue;
        el.setAttribute('value', safeValue);
      } else if (lowerTag === 'textarea') {
        el.value = safeValue;
        el.textContent = safeValue;
        el.setAttribute('value', safeValue);
      } else {
        el.setAttribute('value', safeValue);
      }
    }

    // Handle attributes with sanitization
    for (const [key, value] of Object.entries(attrs)) {
      if (value === false || value == null) continue;
      let safeKey = typeof key === 'string' ? key.trim() : '';
      if (!safeKey || /[\s<>]/.test(safeKey)) {
        console.warn(`Invalid attribute key "${key}"; skipping.`);
        continue;
      }
      let safeValue = value === true ? '' : String(value);
      if (configSanitize && ['href', 'src', 'action', 'formaction'].some(prop => safeKey.toLowerCase().includes(prop)) &&
          /(javascript|vbscript|data\s*:\s*text\/html)/i.test(safeValue)) {
        console.warn(`Sanitizing dangerous attribute "${safeKey}": "${safeValue}" removed to prevent XSS.`);
        safeValue = '';
      }
      el.setAttribute(safeKey, safeValue);
    }

    // Handle non-standard config keys as attributes
    const standardKeys = ['tag', 'class', 'id', 'text', 'html', 'attrs', 'styles', 'dataset', 'events', 'children', 'value', 'sanitize'];
    for (const [key, value] of Object.entries(config)) {
      if (standardKeys.includes(key)) continue;
      if (value === false || value == null) continue;
      let safeKey = typeof key === 'string' ? key.trim() : '';
      if (!safeKey || /[\s<>]/.test(safeKey)) {
        console.warn(`Invalid non-standard attribute key "${key}"; skipping.`);
        continue;
      }
      let safeValue = value === true ? '' : String(value);
      if (configSanitize && ['href', 'src', 'action', 'formaction'].some(prop => safeKey.toLowerCase().includes(prop)) &&
          /(javascript|vbscript|data\s*:\s*text\/html)/i.test(safeValue)) {
        console.warn(`Sanitizing dangerous non-standard attribute "${safeKey}": "${safeValue}" removed.`);
        safeValue = '';
      }
      el.setAttribute(safeKey, safeValue);
    }

    // Handle styles with kebab-case to camelCase conversion
    for (let [key, value] of Object.entries(styles)) {
      if (typeof key !== 'string' || !key.trim() || /[\s]/.test(key)) {
        console.warn(`Invalid style key "${key}"; skipping.`);
        continue;
      }
      key = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (typeof value === 'string' || typeof value === 'number') {
        el.style[key] = value;
      } else {
        console.warn(`Invalid style value for "${key}": "${value}"; skipping.`);
      }
    }

    // Handle dataset
    for (const [key, value] of Object.entries(dataset)) {
      if (typeof key !== 'string' || !key.trim() || /[\s]/.test(key)) {
        console.warn(`Invalid dataset key "${key}"; skipping.`);
        continue;
      }
      el.dataset[key] = String(value);
    }

    // Handle events
    for (const [event, handler] of Object.entries(events)) {
      if (typeof event !== 'string' || !event.trim() || event.toLowerCase().startsWith('on')) {
        console.warn(`Invalid event name "${event}"; skipping.`);
        continue;
      }
      if (typeof handler !== 'function') {
        console.warn(`Invalid handler for event "${event}"; skipping.`);
        continue;
      }
      el.addEventListener(event, handler);
    }

    // Handle children using DocumentFragment
    const fragment = document.createDocumentFragment();
    const normalizedChildren = Array.isArray(children) ? children : [children];
    for (const child of normalizedChildren) {
      // Check recursion depth before processing child
      if (recursionDepth >= 100) {
        console.warn('Maximum recursion depth exceeded; skipping child processing.');
        break;
      }
      if (child instanceof Node) {
        fragment.appendChild(child);
      } else if (typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean') {
        fragment.appendChild(document.createTextNode(String(child)));
      } else if (typeof child === 'object' && child !== null) {
        const childEls = DomUnify.createElementFromConfig(child, null, configSanitize, recursionDepth + 1);
        childEls.forEach(c => fragment.appendChild(c));
      } else {
        console.warn(`Invalid child type "${typeof child}"; skipping.`);
      }
    }
    el.appendChild(fragment);

    // Append to parent if valid
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
  static _findDirectElements(container, selector) {
    const all = container.querySelectorAll(selector);
    return Array.from(all).filter(el => {
      let parent = el.parentElement;
      while (parent && parent !== container) {
        if (parent.hasAttribute('data-container')) return false;
        parent = parent.parentElement;
      }
      return true;
    });
  }

  // --- Helper: get value from element for flat/nested modes ---
  static _getElementValueByKey(el) {
    if (el.matches('input,select,textarea')) {
      if (el.type === 'checkbox' || el.type === 'radio') {
        return el.checked ? el.value : null;
      }
      if (el.tagName === 'SELECT' && el.multiple) {
        return Array.from(el.selectedOptions).map(opt => opt.value);
      }
      return el.value;
    }
    return el.textContent;
  }

  // --- Helper: set value on a single target element ---
  static _setElementValue(target, value) {
    if (target.matches('input,select,textarea')) {
      if (target.type === 'radio') {
        target.checked = (String(value) === target.value);
      } else if (target.type === 'checkbox') {
        if (Array.isArray(value)) {
          target.checked = value.includes(target.value);
        } else if (typeof value === 'boolean') {
          target.checked = value;
        } else {
          target.checked = (String(value) === target.value);
        }
      } else if (target.tagName === 'SELECT' && target.multiple) {
        const vals = Array.isArray(value) ? value.map(String) : [String(value)];
        Array.from(target.options).forEach(opt => {
          opt.selected = vals.includes(opt.value);
        });
      } else {
        const v = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
        target.value = String(v);
        if (target.tagName === 'TEXTAREA') target.textContent = String(v);
      }
    } else {
      target.textContent = String(value ?? '');
    }
  }

  // --- Core recursive fill logic (data → DOM) ---
  static _fillElement(container, data, options = {}) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;

      // Nested object → recurse into data-container
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const sub = container.querySelector(`[data-container="${key}"]`);
        if (sub) DomUnify._fillElement(sub, value, options);
        continue;
      }

      // Array of objects → skip (handled by .add(config, array))
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        continue;
      }

      // Find target elements by data-key → name → id
      const targets = new Set();
      DomUnify._findDirectElements(container, `[data-key="${key}"]`).forEach(el => targets.add(el));
      DomUnify._findDirectElements(container, `[name="${key}"]`).forEach(el => targets.add(el));
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
  static _collectFlat(container, options = {}) {
    const result = {};
    const selector = '[data-key], input, select, textarea';
    const elements = container.querySelectorAll(selector);
    const seen = new Set();

    for (const el of elements) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (!options.includeDisabled && el.disabled) continue;

      const key = el.getAttribute('data-key') || el.getAttribute('name') || el.id;
      if (!key) continue;

      const value = DomUnify._getElementValueByKey(el);
      if (value === null) continue;
      if (options.excludeEmpty && value === '') continue;

      if (result.hasOwnProperty(key)) {
        if (!Array.isArray(result[key])) result[key] = [result[key]];
        result[key].push(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  // --- Collect nested data from container (respects data-container hierarchy) ---
  static _collectNested(container, options = {}) {
    const result = {};

    // Collect direct keyed elements (not inside nested containers)
    const selector = '[data-key], input[name], select[name], textarea[name]';
    const directEls = DomUnify._findDirectElements(container, selector);
    const seen = new Set();

    for (const el of directEls) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (!options.includeDisabled && el.disabled) continue;

      const key = el.getAttribute('data-key') || el.getAttribute('name') || el.id;
      if (!key) continue;

      const value = DomUnify._getElementValueByKey(el);
      if (value === null) continue;
      if (options.excludeEmpty && value === '') continue;

      if (result.hasOwnProperty(key)) {
        if (!Array.isArray(result[key])) result[key] = [result[key]];
        result[key].push(value);
      } else {
        result[key] = value;
      }
    }

    // Collect data-containers (direct, not nested)
    const containers = DomUnify._findDirectElements(container, '[data-container]');
    const groups = {};
    for (const c of containers) {
      const name = c.getAttribute('data-container');
      if (!groups[name]) groups[name] = [];
      groups[name].push(c);
    }

    for (const [name, group] of Object.entries(groups)) {
      if (group.length === 1) {
        result[name] = DomUnify._collectNested(group[0], options);
      } else {
        result[name] = group.map(c => DomUnify._collectNested(c, options));
      }
    }

    return result;
  }

  // --- Extract element creation logic for reuse ---
  static _createFromConfig(config, fragment) {
    const created = [];
    if (config instanceof DomUnify) {
      const sourceEls = config.lastAdded.length ? config.lastAdded : config.currentElements;
      sourceEls.forEach(el => fragment.appendChild(DomUnify._cloneWithState(el)));
      created.push(...Array.from(fragment.childNodes));
    } else if (typeof config === 'string') {
      try {
        const parsed = JSON.parse(config);
        const els = Array.isArray(parsed)
          ? parsed.flatMap(cfg => DomUnify.createElementFromConfig(cfg, fragment))
          : DomUnify.createElementFromConfig(parsed, fragment);
        created.push(...els);
      } catch {
        const els = DomUnify.safeHTMLToElements(config);
        els.forEach(el => fragment.appendChild(el));
        created.push(...els);
      }
    } else if (Array.isArray(config)) {
      config.forEach(cfg => {
        const els = DomUnify.createElementFromConfig(cfg, fragment);
        created.push(...els);
      });
    } else if (config instanceof Node) {
      const clone = DomUnify._cloneWithState(config);
      fragment.appendChild(clone);
      created.push(clone);
    } else if (typeof config === 'object' && config !== null) {
      const els = DomUnify.createElementFromConfig(config, fragment);
      created.push(...els);
    }
    return created;
  }

  // --- Clone element preserving form state (value, checked, selected) ---
  static _cloneWithState(el) {
    const clone = el.cloneNode(true);
    const origInputs = el.querySelectorAll ? el.querySelectorAll('input, textarea, select') : [];
    const cloneInputs = clone.querySelectorAll ? clone.querySelectorAll('input, textarea, select') : [];
    for (let i = 0; i < origInputs.length; i++) {
      const orig = origInputs[i];
      const copy = cloneInputs[i];
      if (!copy) continue;
      if (orig.tagName === 'SELECT') {
        for (let j = 0; j < orig.options.length; j++) {
          if (copy.options[j]) copy.options[j].selected = orig.options[j].selected;
        }
      } else if (orig.type === 'checkbox' || orig.type === 'radio') {
        copy.checked = orig.checked;
      } else if (orig.tagName === 'TEXTAREA') {
        copy.value = orig.value;
        copy.textContent = orig.value;
      } else {
        copy.value = orig.value;
      }
    }
    if (el.matches && el.matches('input, textarea, select')) {
      if (el.tagName === 'SELECT') {
        for (let j = 0; j < el.options.length; j++) {
          if (clone.options[j]) clone.options[j].selected = el.options[j].selected;
        }
      } else if (el.type === 'checkbox' || el.type === 'radio') {
        clone.checked = el.checked;
      } else if (el.tagName === 'TEXTAREA') {
        clone.value = el.value;
        clone.textContent = el.value;
      } else {
        clone.value = el.value;
      }
    }
    return clone;
  }

  // --- IndexedDB helpers for .sync() ---
  static _idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('dom-unify-sync', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('data');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  static async _idbGet(key) {
    const db = await DomUnify._idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('data', 'readonly');
      const req = tx.objectStore('data').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  static async _idbSet(key, value) {
    const db = await DomUnify._idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('data', 'readwrite');
      tx.objectStore('data').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static addToElements(targets, config, data, options) {
    const elements = [];

    // Array data: create one copy per data item, fill each
    if (Array.isArray(data)) {
      if (data.length === 0) return elements;
      for (const target of targets) {
        for (const item of data) {
          const fragment = document.createDocumentFragment();
          const created = DomUnify._createFromConfig(config, fragment);
          target.appendChild(fragment);
          if (item && typeof item === 'object') {
            for (const el of created) {
              if (el.nodeType === 1) DomUnify._fillElement(el, item);
            }
          }
          elements.push(...created);
        }
      }
      return elements;
    }

    // Non-array data: existing behavior
    for (const target of targets) {
      const fragment = document.createDocumentFragment();
      const created = DomUnify._createFromConfig(config, fragment);
      elements.push(...created);
      target.appendChild(fragment);
    }
    if (data) {
      // Apply data to all form elements in targets (including pre-existing ones)
      const allElements = [...targets, ...elements];
      new DomUnify(allElements)._applyDataToElements(allElements, data, options);
    }
    return elements;
  }

  add(config, data, options) {
    const els = DomUnify.addToElements(this.currentElements, config, data, options);
    this.lastAdded = els;
    this._logStep('add');
    return this;
  }

  set(props = {}, data, options) {
    for (const el of this.currentElements) {
      if (props.text !== undefined) el.textContent = props.text;
      if (props.html !== undefined) el.innerHTML = props.html;
      if (props.class !== undefined) {
        const classVal = String(props.class).trim();
        if (classVal && (classVal[0] === '+' || classVal[0] === '-' || classVal[0] === '!')) {
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
          el.className = classVal;
        }
      }
      if (props.id !== undefined) el.id = props.id;
      if (props.style) Object.assign(el.style, props.style);
      if (props.attr) {
        for (const key in props.attr) {
          const value = props.attr[key];
          if (value === false || value == null) continue;
          el.setAttribute(key, value === true ? '' : value);
        }
      }
      if (props.dataset) {
        for (const key in props.dataset) {
          el.dataset[key] = props.dataset[key];
        }
      }
    }
    if (data) {
      this._applyDataToElements(this.currentElements, data, options);
    }
    this._logStep('set');
    return this;
  }

  fill(data, options) {
    if (!data) return this;
    if (Array.isArray(data)) {
      // Distribute: currentElements[i] ← data[i]
      const len = Math.min(this.currentElements.length, data.length);
      for (let i = 0; i < len; i++) {
        if (data[i] && typeof data[i] === 'object') {
          DomUnify._fillElement(this.currentElements[i], data[i], options);
        }
      }
    } else if (typeof data === 'object') {
      for (const el of this.currentElements) {
        DomUnify._fillElement(el, data, options);
      }
    }
    this._logStep('fill');
    return this;
  }

  _applyDataToElements(elements, data, options = {}) {
    if (!data || typeof data !== 'object') return;
    const clearMissing = options.clearMissing ?? false;
    const selector = 'input,select,textarea';
    const keyAttr = 'name';
    const formEls = [];
    for (const el of elements) {
      if (el.querySelectorAll) formEls.push(...el.querySelectorAll(selector));
      if (el.matches && el.matches(selector)) formEls.push(el);
    }
    for (const fel of formEls) {
      const key = fel.getAttribute(keyAttr);
      if (key && data.hasOwnProperty(key)) {
        let value = data[key];
        if (fel.type === 'radio') {
          fel.checked = value === fel.value;
        } else if (fel.type === 'checkbox') {
          fel.checked = Array.isArray(value) ? value.includes(fel.value) : value === fel.value;
        } else if (fel.tagName === 'SELECT' && fel.multiple) {
          Array.from(fel.options).forEach(opt => {
            opt.selected = Array.isArray(value) ? value.includes(opt.value) : value === opt.value;
          });
        } else {
          if (Array.isArray(value)) {
            value = value[0] || '';
          }
          fel.value = value || '';
          if (fel.tagName === 'TEXTAREA') fel.textContent = value || '';
        }
      } else if (clearMissing) {
        if (fel.type === 'radio' || fel.type === 'checkbox') {
          fel.checked = false;
        } else if (fel.tagName === 'SELECT' && fel.multiple) {
          Array.from(fel.options).forEach(opt => opt.selected = false);
        } else {
          fel.value = '';
          if (fel.tagName === 'TEXTAREA') fel.textContent = '';
        }
      }
    }
  }

  copy() {
    this.buffer = this.currentElements.map(el => DomUnify._cloneWithState(el));
    this._logStep('copy');
    return this;
  }

  paste(position = 'append') {
    if (!this.buffer || !this.buffer.length) return this;
    const pasted = [];

    this.currentElements.forEach(ctx => {
      const frag = document.createDocumentFragment();
      const clones = this.buffer.map(el => DomUnify._cloneWithState(el));
      clones.forEach(el => frag.appendChild(el));
      pasted.push(...clones);

      if (position === 'before') {
        if (ctx.parentNode) ctx.parentNode.insertBefore(frag, ctx);
      } else if (position === 'after') {
        if (ctx.parentNode) ctx.parentNode.insertBefore(frag, ctx.nextSibling);
      } else if (position === 'prepend' || position === 'start') {
        ctx.insertBefore(frag, ctx.firstChild);
      } else if (typeof position === 'number') {
        const children = Array.from(ctx.childNodes);
        const index = position < 0 ? children.length + position : position;
        const ref = children[index] || null;
        ctx.insertBefore(frag, ref);
      } else { // 'append', 'end', default
        ctx.appendChild(frag);
      }
    });

    this.lastAdded = pasted;
    this._logStep('paste');
    return this;
  }

  duplicate(position = 'append') {
    const duplicated = [];
    this.currentElements.forEach(orig => {
      const clone = DomUnify._cloneWithState(orig);
      const parent = orig.parentNode;
      if (!parent) return;
      if (position === 'prepend') {
        parent.insertBefore(clone, orig);
      } else {
        parent.insertBefore(clone, orig.nextSibling);
      }
      duplicated.push(clone);
    });
    this.lastAdded = duplicated;
    this._logStep('duplicate');
    return this;
  }

  enter(index) {
    this.elementHistory.push([...this.currentElements]);
    let entered = [];

    for (const el of this.currentElements) {
      const children = Array.from(el.children);
      if (typeof index === 'number') {
        const i = index >= 0 ? index : children.length + index;
        if (children[i]) entered.push(children[i]);
      } else if (typeof index === 'string') {
        entered.push(...children.filter(c => c.matches(index)));
      } else if (this.lastAdded.length) {
        entered.push(...this.lastAdded);
        this.lastAdded = [];
      } else if (children.length) {
        entered.push(...children);
      }
    }

    if (entered.length === 0) {
      entered = [...this.currentElements];
    }

    this.currentElements = entered;
    this._logStep('enter');
    return this;
  }

  up(selector) {
    this.elementHistory.push([...this.currentElements]);
    const result = [];

    if (selector === undefined) {
      for (const el of this.currentElements) {
        const parent = el.parentElement;
        if (parent && !result.includes(parent)) result.push(parent);
      }
    } else if (typeof selector === 'number') {
      const levels = Math.abs(selector);
      for (const el of this.currentElements) {
        let parent = el;
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
        const parent = el.closest(selector);
        if (parent && !result.includes(parent)) result.push(parent);
      }
    }

    this.currentElements = result;
    this.lastAdded = [];
    this._logStep('up');
    return this;
  }

  back(steps = 1) {
    if (this.currentElements.length === 0 && this.lastParents.length > 0) {
      this.currentElements = this.lastParents;
      this.lastParents = [];
      this.lastAdded = [];
      return this;
    }

    if (this.elementHistory.length === 0) return this;

    let index;
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

  mark(name) {
    if (typeof name !== 'string' || name.trim() === '') return this;

    const toSave = this.lastAdded.length > 0 ? [...this.lastAdded] : [...this.currentElements];
    this.markedElements = this.markedElements.filter(ctx => ctx.name !== name);
    this.markedElements.push({ elements: toSave, name });
    this._logStep('mark');
    return this;
  }

  getMark(name) {
    if (typeof name !== 'string' || name.trim() === '') return this;

    const context = [...this.markedElements].reverse().find(ctx => ctx.name === name);
    if (context) {
      this.currentElements = [...context.elements];
    }
    this._logStep('getMark');
    return this;
  }

  delete() {
    this.elementHistory.push([...this.currentElements]);
    this.lastParents = this.currentElements
      .map(el => el.parentElement)
      .filter((el, i, arr) => el && arr.indexOf(el) === i);
    for (const el of this.currentElements) el.remove();
    this.currentElements = [];
    this.lastAdded = [];
    this._logStep('delete');
    return this;
  }

  cut() {
    this.elementHistory.push([...this.currentElements]);
    this.buffer = this.currentElements.map(el => el);
    this.lastParents = this.currentElements
      .map(el => el.parentElement)
      .filter((el, i, arr) => el && arr.indexOf(el) === i);
    for (const el of this.currentElements) el.remove();
    this.currentElements = [];
    this.lastAdded = [];
    this._logStep('cut');
    return this;
  }

  find(selector) {
    if (!selector) {
      this.elementHistory.push([...this.currentElements]);
      this.currentElements = [];
      this.lastAdded = [];
      return this;
    }

    this.elementHistory.push([...this.currentElements]);
    const results = [];

    if (selector === '*') {
      for (const el of this.currentElements) {
        results.push(...Array.from(el.children));
      }
    } else {
      for (const el of this.currentElements) {
        results.push(...Array.from(el.querySelectorAll(selector)));
      }
    }

    this.currentElements = results;
    this.lastAdded = [];
    this._logStep('find');
    return this;
  }

  on(event, handler, ...args) {
    if (typeof event !== 'string' || !event.trim()) return this;
    let resolvedHandler = handler;
    if (typeof handler === 'string') {
      resolvedHandler = window[handler];
      if (typeof resolvedHandler !== 'function') return this;
    }
    if (typeof resolvedHandler !== 'function') return this;

    const targets = this.lastAdded.length ? this.lastAdded : this.currentElements;
    for (const element of targets) {
      let handlers = this._eventHandlers.get(element);
      if (!handlers) {
        handlers = {};
        this._eventHandlers.set(element, handlers);
      }
      if (!handlers[event]) {
        handlers[event] = [];
      }
      const wrappedHandler = (e) => resolvedHandler(...args, e);
      element.addEventListener(event, wrappedHandler);
      handlers[event].push({ handler: resolvedHandler, wrappedHandler });
    }

    this._logStep('on');
    return this;
  }

  off(event, handler) {
    if (typeof event !== 'string' || !event.trim()) return this;

    const targets = this.lastAdded.length ? this.lastAdded : this.currentElements;
    for (const element of targets) {
      const handlers = this._eventHandlers.get(element);
      if (!handlers || !handlers[event]) continue;

      if (!handler) {
        handlers[event].forEach(({ wrappedHandler }) => {
          element.removeEventListener(event, wrappedHandler);
        });
        handlers[event] = [];
      } else {
        let resolvedHandler = handler;
        if (typeof handler === 'string') {
          resolvedHandler = window[handler];
          if (typeof resolvedHandler !== 'function') return this;
        }
        if (typeof resolvedHandler !== 'function') return this;

        handlers[event] = handlers[event].filter(({ handler: h, wrappedHandler }) => {
          if (h === resolvedHandler) {
            element.removeEventListener(event, wrappedHandler);
            return false;
          }
          return true;
        });
      }
    }

    this._logStep('off');
    return this;
  }

  get(arg) {
    if (arg === undefined) {
      return [...this.currentElements];
    }

    if (typeof arg === 'number') {
      const len = this.currentElements.length;
      if (len === 0) return null;
      const index = arg >= 0 ? arg : len + arg;
      return index >= 0 && index < len ? this.currentElements[index] : null;
    }

    // String shorthand: 'flat' or 'nested'
    if (typeof arg === 'string') {
      if (arg === 'flat') {
        return this.currentElements.map(el => DomUnify._collectFlat(el));
      }
      if (arg === 'nested') {
        return this.currentElements.map(el => DomUnify._collectNested(el));
      }
      console.warn(`get(): unknown mode "${arg}"`);
      return null;
    }

    if (typeof arg === 'object' && arg !== null) {
      const options = arg;

      // Support flat/nested via object syntax
      if (options.mode === 'flat') {
        return this.currentElements.map(el => DomUnify._collectFlat(el, options));
      }
      if (options.mode === 'nested') {
        return this.currentElements.map(el => DomUnify._collectNested(el, options));
      }

      const modeConfig = DomUnify.config.modes[options.mode] || {};
      const config = { ...modeConfig, ...options };

      const results = [];

      for (const ctx of this.currentElements) {
        const data = {};
        let elements = Array.from(ctx.querySelectorAll(config.selector || 'input,select,textarea'));
        
        if (config.includeButtons) {
          elements = elements.concat(Array.from(ctx.querySelectorAll('button[name]')));
        }

        for (const el of elements) {
          if (!config.includeDisabled && el.disabled) continue;
          if (config.exclude.ids.includes(el.id)) continue;
          if (config.exclude.classes.some(cls => el.classList.contains(cls))) continue;
          if (config.exclude.names.includes(el.getAttribute(config.keyAttr))) continue;
          if (config.exclude.types.includes(el.type)) continue;
          for (const [dataKey, dataVal] of Object.entries(config.exclude.data || {})) {
            if (el.dataset[dataKey] === dataVal) continue;
          }

          const key = el.getAttribute(config.keyAttr);
          if (!key) continue;

          let value = this._getElementValue(el, config);
          if (value === null || value === undefined || (config.excludeEmpty && (value === '' || (Array.isArray(value) && value.length === 0)))) continue;

          if (config.transformValue) value = config.transformValue(value, el);
          let transformedKey = config.transformKey ? config.transformKey(key) : key;

          this._setDataValue(data, transformedKey, value, config.handleDuplicates);
        }

        results.push(data);
      }

      return results;
    }

    console.warn('get(): invalid argument', arg);
    return null;
  }

  _getElementValue(el, config) {
    if (el.tagName === 'BUTTON') return el.value;
    if (el.type === 'checkbox' || el.type === 'radio') return el.checked ? el.value : null;
    if (el.tagName === 'SELECT' && el.multiple) return Array.from(el.selectedOptions).map(opt => opt.value);
    if (el.type === 'file') {
      if (config.fileHandling === 'none') return null;
      const files = Array.from(el.files);
      if (config.fileHandling === 'meta') {
        return files.map(file => ({ name: file.name, type: file.type, size: file.size }));
      }
      return files.map(file => file.name);
    }
    return el.value;
  }

  _setDataValue(data, key, value, handleDuplicates) {
    if (value === null) return;
    if (!data.hasOwnProperty(key)) {
      data[key] = value;
      return;
    }
    if (handleDuplicates === 'last') {
      data[key] = value;
    } else if (handleDuplicates === 'first') {
    } else if (handleDuplicates === 'error') {
      throw new Error(`Duplicate key: ${key}`);
    } else {
      if (!Array.isArray(data[key])) data[key] = [data[key]];
      if (Array.isArray(value)) data[key].push(...value);
      else data[key].push(value);
    }
  }

  downloadFile(content, options = {}) {
    const { filename = 'file.txt', mimeType = 'text/plain', format = null } = options;
    let formattedContent;
    try {
      formattedContent = format ? format(content) : content;
    } catch (err) {
      console.error('Download format error:', err);
      return this;
    }
    const blobContent = formattedContent instanceof Blob ? formattedContent : new Blob([formattedContent], { type: mimeType });
    const url = URL.createObjectURL(blobContent);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return this;
  }

  loadFile(inputSelector, callback, options = {}) {
    const { readAs = 'text', parse = null, onError = err => console.error('File load error:', err) } = options;
    const input = document.querySelector(inputSelector);
    if (!input) {
      onError(new Error('File input not found'));
      return this;
    }
    const handler = () => {
      if (input.files.length) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const result = parse ? parse(e.target.result) : e.target.result;
            callback(result);
            input.value = '';
          } catch (err) {
            onError(err);
          }
        };
        reader.onerror = () => {
          onError(new Error('File read error'));
        };
        reader['readAs' + readAs.charAt(0).toUpperCase() + readAs.slice(1)](file);
      }
    };
    input.addEventListener('change', handler, { once: true });
    return this;
  }

  // --- Save: collect data from DOM and download as file ---
  save(options = {}) {
    const {
      filename = 'data.json',
      mode = 'nested',
      format = 'json',
      space = 2,
      transform = null
    } = options;

    let data;
    if (mode === 'flat') {
      data = this.currentElements.map(el => DomUnify._collectFlat(el));
    } else if (mode === 'nested') {
      data = this.currentElements.map(el => DomUnify._collectNested(el));
    } else {
      data = this.get({ mode });
    }
    if (data && data.length === 1) data = data[0];
    if (transform) data = transform(data);

    let content, mimeType;
    if (format === 'json') {
      content = JSON.stringify(data, null, space);
      mimeType = 'application/json';
    } else if (format === 'csv') {
      const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      if (Array.isArray(data)) {
        const keys = [...new Set(data.flatMap(d => Object.keys(d)))];
        content = keys.map(esc).join(',') + '\n' + data.map(row => keys.map(k => esc(row[k])).join(',')).join('\n');
      } else if (data && typeof data === 'object') {
        const keys = Object.keys(data);
        content = keys.map(esc).join(',') + '\n' + keys.map(k => esc(data[k])).join(',');
      } else {
        content = String(data ?? '');
      }
      mimeType = 'text/csv';
    } else {
      content = typeof data === 'string' ? data : JSON.stringify(data);
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
  load(selector, options = {}) {
    const {
      parse = 'json',
      fill = true,
      onLoad = null,
      onError = err => console.error('[dom-unify] load error:', err)
    } = options;

    const input = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!input) {
      if (onError) onError(new Error('File input not found'));
      return this;
    }

    const targets = [...this.currentElements];
    const handler = () => {
      if (!input.files.length) return;
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let data = e.target.result;
          if (parse === 'json') data = JSON.parse(data);
          else if (typeof parse === 'function') data = parse(data);

          if (fill && data && typeof data === 'object') {
            if (Array.isArray(data)) {
              const len = Math.min(targets.length, data.length);
              for (let i = 0; i < len; i++) {
                if (data[i] && typeof data[i] === 'object') {
                  DomUnify._fillElement(targets[i], data[i]);
                }
              }
            } else {
              for (const el of targets) DomUnify._fillElement(el, data);
            }
          }
          if (onLoad) onLoad(data);
          input.value = '';
        } catch (err) {
          if (onError) onError(err);
        }
      };
      reader.onerror = () => { if (onError) onError(new Error('File read error')); };
      reader.readAsText(file);
    };

    input.addEventListener('change', handler, { once: true });
    this._logStep('load');
    return this;
  }

  // --- Sync: bidirectional DOM ↔ storage ---
  sync(key, options = {}) {
    if (!key || typeof key !== 'string') return this;

    const {
      storage = 'local',
      debounce: debounceMs = 300,
      mode = 'nested',
      onSync = null
    } = options;

    const targets = [...this.currentElements];
    const collectData = () => {
      const data = mode === 'flat'
        ? targets.map(el => DomUnify._collectFlat(el))
        : targets.map(el => DomUnify._collectNested(el));
      return data.length === 1 ? data[0] : data;
    };

    // Initial fill from storage
    if (storage === 'indexeddb' && typeof indexedDB !== 'undefined') {
      DomUnify._idbGet(key).then(data => {
        if (data) for (const el of targets) DomUnify._fillElement(el, data);
      }).catch(() => {});
    } else {
      const store = storage === 'session' ? sessionStorage : localStorage;
      const raw = store.getItem(key);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          for (const el of targets) DomUnify._fillElement(el, data);
        } catch {}
      }
    }

    // Listen for changes with debounce
    let timeout;
    const onChange = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const data = collectData();
        if (storage === 'indexeddb' && typeof indexedDB !== 'undefined') {
          DomUnify._idbSet(key, data).catch(() => {});
        } else {
          const store = storage === 'session' ? sessionStorage : localStorage;
          store.setItem(key, JSON.stringify(data));
        }
        if (onSync) onSync(data);
      }, debounceMs);
    };

    for (const el of targets) {
      el.addEventListener('input', onChange);
      el.addEventListener('change', onChange);
    }

    // Store cleanup function
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

  unsync(key) {
    if (this._syncCleanup && this._syncCleanup.has(key)) {
      this._syncCleanup.get(key)();
      this._syncCleanup.delete(key);
    }
    this._logStep('unsync');
    return this;
  }
}

function dom(root) {
  return new DomUnify(root);
}

export { DomUnify, dom };