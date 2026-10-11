/* Minimal DOM helpers. Everything renders as real nodes — no innerHTML with
   interpolated data, so market strings can never inject markup. */

/** Create an element: el('div', { class: 'card' }, [child, 'text']). */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  applyAttrs(node, attrs);
  appendChildren(node, children);
  return node;
}

/** SVG namespace element creator, same signature as el(). */
export function svg(tag, attrs = {}, children = []) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    node.setAttribute(key, String(value));
  }
  appendChildren(node, children);
  return node;
}

function applyAttrs(node, attrs) {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, String(value));
  }
}

function appendChildren(node, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Replace every child of a mount point with the given nodes. */
export function mount(target, children) {
  target.replaceChildren();
  appendChildren(target, children);
  return target;
}

/** Remove every child of a node. */
export function clear(target) {
  target.replaceChildren();
}

/** querySelector shorthand scoped to a root. */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/** querySelectorAll shorthand returning a real array. */
export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}
