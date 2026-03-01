import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { DomUnify } from '../index.js';

describe('safeHTMLToElements', () => {
  beforeEach(() => {
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(document, 'write').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful parsing cases', () => {
    it('should create elements from safe HTML with multiple tags', () => {
      const html = '<div class="test">Hello</div><span>World</span><p>Paragraph</p>';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(3);
      expect(result[0].tagName).toBe('DIV');
      expect(result[0].className).toBe('test');
      expect(result[0].textContent).toBe('Hello');
      expect(result[1].tagName).toBe('SPAN');
      expect(result[1].textContent).toBe('World');
      expect(result[2].tagName).toBe('P');
      expect(result[2].textContent).toBe('Paragraph');
    });

    it('should handle plain text without tags', () => {
      const html = 'Plain text content';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      expect(result[0].nodeType).toBe(Node.TEXT_NODE);
      expect(result[0].textContent).toBe('Plain text content');
    });

    it('should handle comments and preserve them (empty if script inside due to cleaning)', () => {
      const html = '<!-- <script>alert(1)</script> --><div>Test</div>';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(2);
      expect(result[0].nodeType).toBe(Node.COMMENT_NODE);
      expect(result[0].textContent).toBe('  ');
      expect(result[1].tagName).toBe('DIV');
      expect(result[1].textContent).toBe('Test');
    });

    it('should handle self-closing tags like img and br', () => {
      const html = '<img src="safe.jpg" alt="image"><br><hr>';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(3);
      expect(result[0].tagName).toBe('IMG');
      expect(result[0].getAttribute('src')).toBe('safe.jpg');
      expect(result[0].getAttribute('alt')).toBe('image');
      expect(result[1].tagName).toBe('BR');
      expect(result[2].tagName).toBe('HR');
    });

    it('should handle nested elements', () => {
      const html = '<div><span>Nested</span><p>Content</p></div>';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      const div = result[0];
      expect(div.tagName).toBe('DIV');
      expect(div.children).toHaveLength(2);
      expect(div.children[0].tagName).toBe('SPAN');
      expect(div.children[0].textContent).toBe('Nested');
      expect(div.children[1].tagName).toBe('P');
      expect(div.children[1].textContent).toBe('Content');
    });

    it('should handle SVG elements safely (lowercase tagName in jsdom)', () => {
      const html = '<svg><circle cx="10" cy="10" r="5"></circle></svg>';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      const svg = result[0];
      expect(svg.tagName).toBe('svg');
      expect(svg.children).toHaveLength(1);
      expect(svg.children[0].tagName).toBe('circle');
      expect(svg.children[0].getAttribute('cx')).toBe('10');
    });

    it('should handle entities and decode them correctly', () => {
      const html = '<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      const div = result[0];
      expect(div.tagName).toBe('DIV');
      expect(div.innerHTML).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(div.textContent).toBe('<script>alert(1)</script>');
    });
  });

  describe('script removal cases', () => {
    it('should remove inline script tags', () => {
      const html = '<div><script>alert("xss");</script></div>';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      const div = result[0];
      expect(div.tagName).toBe('DIV');
      expect(div.querySelector('script')).toBeNull();
      expect(div.innerHTML).toBe('');
    });

    it('should remove script tags with src attribute', () => {
      const html = '<div><script src="evil.js"></script></div>';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      const div = result[0];
      expect(div.querySelector('script')).toBeNull();
      expect(div.innerHTML).toBe('');
    });

    it('should remove script tags with type attribute (case-insensitive)', () => {
      const html = '<div><SCRIPT type="text/javascript">alert(1)</SCRIPT><script Type="application/javascript">xss</script></div>';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      const div = result[0];
      expect(div.querySelector('script')).toBeNull();
      expect(div.innerHTML).toBe('');
    });

    it('should remove script in SVG context (lowercase tagName)', () => {
      const html = '<svg><script>alert("svg xss")</script><circle r="5"></circle></svg>';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      const svg = result[0];
      expect(svg.tagName).toBe('svg');
      expect(svg.querySelector('script')).toBeNull();
      expect(svg.children).toHaveLength(1);
      expect(svg.children[0].tagName).toBe('circle');
    });

    it('should remove script tags in comments (empties comment)', () => {
      const html = '<!-- <script>alert(1)</script> --><div>Test</div>';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(2);
      expect(result[0].nodeType).toBe(Node.COMMENT_NODE);
      expect(result[0].textContent).toBe('  ');
      expect(result[1].tagName).toBe('DIV');
    });

    // CDATA removal test removed — simplified sanitizer only handles scripts and on* attrs
  });

  describe('event handler removal cases', () => {
    it('should remove onclick and other on* attributes (double quotes)', () => {
      const html = '<div onclick="alert(1)" onmouseover="hover()" onload="load()">Test</div>';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      const div = result[0];
      expect(div.getAttribute('onclick')).toBeNull();
      expect(div.getAttribute('onmouseover')).toBeNull();
      expect(div.getAttribute('onload')).toBeNull();
      expect(div.textContent).toBe('Test');
    });

    it('should remove on* attributes with single quotes', () => {
      const html = '<img src="img.jpg" onclick=\'alert("xss")\' onfocus=\'focus()\' />';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      const img = result[0];
      expect(img.tagName).toBe('IMG');
      expect(img.getAttribute('onclick')).toBeNull();
      expect(img.getAttribute('onfocus')).toBeNull();
      expect(img.getAttribute('src')).toBe('img.jpg');
    });

    // javascript:/vbscript: neutralization tests removed — use DOMPurify for untrusted HTML
  });

  // Advanced dangerous content handling tests removed — simplified sanitizer only handles scripts and on* attrs
  // For iframe/object/embed/meta/base/style expression/data:javascript: — use DOMPurify

  describe('edge cases and user errors', () => {
    it('should return empty array for empty string', () => {
      const result = DomUnify.safeHTMLToElements('');
      expect(result).toEqual([]);
    });

    it('should handle malformed/unclosed HTML (auto-corrected by parser)', () => {
      const html = '<div class="test" unclosed><p>Malformed';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      const div = result[0];
      expect(div.tagName).toBe('DIV');
      expect(div.className).toBe('test');
      expect(div.children).toHaveLength(1);
      expect(div.children[0].tagName).toBe('P');
      expect(div.children[0].textContent).toBe('Malformed');
    });

    it('should handle non-string input by converting to string', () => {
      const html = 123;
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      expect(result[0].nodeType).toBe(Node.TEXT_NODE);
      expect(result[0].textContent).toBe('123');
    });

    it('should handle null/undefined as empty string', () => {
      const result1 = DomUnify.safeHTMLToElements(null);
      const result2 = DomUnify.safeHTMLToElements(undefined);
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });

    it('should handle object input by coercing to string (e.g., user error)', () => {
      const html = { toString: () => '<div>Safe</div>' };
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      expect(result[0].tagName).toBe('DIV');
      expect(result[0].textContent).toBe('Safe');
    });

    it('should handle Symbol input by coercing to string (user error)', () => {
      const html = Symbol('test');
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      expect(result[0].nodeType).toBe(Node.TEXT_NODE);
      expect(result[0].textContent).toBe('Symbol(test)');
    });

    // Long input warning test removed — no artificial length limit

    it('should handle NaN input by coercing to string (user error)', () => {
      const html = NaN;
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      expect(result[0].nodeType).toBe(Node.TEXT_NODE);
      expect(result[0].textContent).toBe('NaN');
    });
  });

  describe('failure scenarios (sanitization should prevent execution)', () => {
    it('should prevent script execution from removed tags', () => {
      const html = '<script>alert("direct xss")</script>';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toEqual([]);
      expect(window.alert).not.toHaveBeenCalled();
    });

    it('should prevent event handler execution', () => {
      const html = '<button onclick="alert(\'event xss\')">Click</button>';
      const result = DomUnify.safeHTMLToElements(html);
      expect(result).toHaveLength(1);
      const button = result[0];
      button.click();
      expect(button.getAttribute('onclick')).toBeNull();
      expect(window.alert).not.toHaveBeenCalled();
    });

    // javascript: link neutralization, nested dangerous content, encoded XSS warning,
    // and ReDoS long input tests removed — simplified sanitizer only handles scripts and on* attrs
    // For full XSS protection, use DOMPurify
  });
});