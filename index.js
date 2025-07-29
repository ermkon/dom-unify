class DomUnify {
  constructor(root) {
    this.currentElements = this._normalizeElements(root)
    this.lastAdded = []
    this.markedContexts = []
    this.lastParents = []
    this.buffer = null
  }

  _normalizeElements(input) {
    if (!input) return [document.body]
    if (input instanceof HTMLElement) return [input]
    if (input instanceof Document) return [input.body]
    if (NodeList.prototype.isPrototypeOf(input) || Array.isArray(input)) {
      return Array.from(input).filter(el => el instanceof HTMLElement)
    }
    return []
  }

  static safeHTMLToElements(htmlString) {
    const cleaned = htmlString
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')

    const container = document.createElement('div')
    container.innerHTML = cleaned
    return Array.from(container.childNodes)
  }

  static createElementFromConfig(config, parent) {
    if (typeof config !== 'object' || config === null) return []

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
      children = []
    } = config

    const el = document.createElement(tag)

    if (className) el.className = className
    if (id) el.id = id
    if (text) el.textContent = text
    if (html) el.innerHTML = html

    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue
      el.setAttribute(k, v === true ? '' : v)
    }

    for (const [k, v] of Object.entries(styles)) {
      el.style[k] = v
    }

    for (const [k, v] of Object.entries(dataset)) {
      el.dataset[k] = v
    }

    for (const [event, handler] of Object.entries(events)) {
      el.addEventListener(event, handler)
    }

    for (const child of children) {
      if (child instanceof HTMLElement) {
        el.appendChild(child)
      } else if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child))
      } else if (typeof child === 'object' && child !== null) {
        const childEls = DomUnify.createElementFromConfig(child)
        childEls.forEach(el.appendChild.bind(el))
      }
    }

    if (parent) parent.appendChild(el)

    return [el]
  }

  static addToElements(targets, config) {
    const elements = []

    for (const target of targets) {
      const fragment = document.createDocumentFragment()

      if (typeof config === 'string') {
        let parsed
        try {
          parsed = JSON.parse(config)
          const els = Array.isArray(parsed)
            ? parsed.flatMap(cfg => DomUnify.createElementFromConfig(cfg, fragment))
            : DomUnify.createElementFromConfig(parsed, fragment)
          elements.push(...els)
        } catch {
          const els = DomUnify.safeHTMLToElements(config)
          els.forEach(el => fragment.appendChild(el))
          elements.push(...els)
        }
      } else if (Array.isArray(config)) {
        config.forEach(cfg => {
          const els = DomUnify.createElementFromConfig(cfg, fragment)
          elements.push(...els)
        })
      } else if (typeof config === 'object' && config !== null) {
        const els = DomUnify.createElementFromConfig(config, fragment)
        elements.push(...els)
      }

      target.appendChild(fragment)
    }

    return elements
  }

  add(config) {
    const els = DomUnify.addToElements(this.currentElements, config)
    this.lastAdded = els
    return this
  }

  set(props = {}) {
    for (const el of this.currentElements) {
      if (props.text !== undefined) el.textContent = props.text
      if (props.html !== undefined) el.innerHTML = props.html
      if (props.class !== undefined) el.className = props.class
      if (props.id !== undefined) el.id = props.id
      if (props.style) Object.assign(el.style, props.style)
      if (props.attr) {
        for (const key in props.attr) {
          const value = props.attr[key]
          if (value === false || value == null) continue
          el.setAttribute(key, value === true ? '' : value)
        }
      }
      if (props.dataset) {
        for (const key in props.dataset) {
          el.dataset[key] = props.dataset[key]
        }
      }
    }
    return this
  }

  copy() {
    this.buffer = this.currentElements.map(el => el.cloneNode(true))
    return this
  }

  paste(position = 'append') {
    if (!this.buffer || !this.buffer.length) return this

    this.currentElements.forEach(ctx => {
      const frag = document.createDocumentFragment()
      this.buffer.forEach(el => frag.appendChild(el.cloneNode(true)))

      if (position === 'append' || position === undefined) {
        ctx.appendChild(frag)
      } else if (position === 'prepend') {
        ctx.insertBefore(frag, ctx.firstChild)
      } else if (typeof position === 'number') {
        const children = Array.from(ctx.childNodes)
        const index = position < 0 ? children.length + position : position
        const ref = children[index] || null
        ctx.insertBefore(frag, ref)
      }
    })

    return this
  }

  duplicate(position = 'append') {
    this.currentElements.forEach(orig => {
      const clone = orig.cloneNode(true)
      const parent = orig.parentNode
      if (!parent) return
      if (position === 'prepend') {
        parent.insertBefore(clone, orig)
      } else {
        parent.insertBefore(clone, orig.nextSibling)
      }
    })
    return this
  }

  enter(index) {
    const entered = []

    for (const el of this.currentElements) {
      const children = Array.from(el.children)
      if (typeof index === 'number') {
        const i = index >= 0 ? index : children.length + index
        if (children[i]) entered.push(children[i])
      } else if (this.lastAdded.length) {
        entered.push(...this.lastAdded)
      } else if (children.length) {
        entered.push(...children)
      }
    }

    this.currentElements = entered
    return this
  }

  back(arg = 1) {
    if (this.currentElements.length === 0 && this.lastParents.length > 0) {
      this.currentElements = this.lastParents
      this.lastParents = []
      return this
    }
    
    const result = []

    for (const el of this.currentElements) {
      if (typeof arg === 'string') {
        const found = el.closest(arg)
        if (found) result.push(found)
      } else {
        let parent = el
        const steps = Math.abs(arg)
        for (let i = 0; i < steps; i++) {
          if (!parent.parentElement) break
          parent = parent.parentElement
        }
        if (parent && parent !== el) result.push(parent)
      }
    }

    this.currentElements = result
    return this
  }


  delete() {
    this.lastParents = this.currentElements
      .map(el => el.parentElement)
      .filter((el, i, arr) => el && arr.indexOf(el) === i)
    for (const el of this.currentElements) el.remove()
    this.currentElements = []
    return this
  }

  cut() {
    this.buffer = this.currentElements.map(el => el)
    this.lastParents = this.currentElements
      .map(el => el.parentElement)
      .filter((el, i, arr) => el && arr.indexOf(el) === i)
    for (const el of this.currentElements) el.remove()
    this.currentElements = []
    return this
  }

  find(selector) {
    if (!selector) {
      this.currentElements = []
      return this
    }

    if (!this._findCache) this._findCache = new WeakMap()

    const results = []

    for (const el of this.currentElements) {
      if (selector === '*') {
        results.push(...Array.from(el.children))
      } else {
        let cacheForEl = this._findCache.get(el)
        if (!cacheForEl) {
          cacheForEl = new Map()
          this._findCache.set(el, cacheForEl)
        }
        if (!cacheForEl.has(selector)) {
          const found = Array.from(el.querySelectorAll(selector))
          cacheForEl.set(selector, found)
        }
        results.push(...cacheForEl.get(selector))
      }
    }

    this.currentElements = results
    return this
  }


}

function dom(root) {
  return new DomUnify(root)
}

export { dom }
