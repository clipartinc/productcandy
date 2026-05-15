import { Node } from "@tiptap/core";

/**
 * Tiptap node for plain <div> elements with optional inline style + class.
 *
 * Tiptap's default StarterKit doesn't include divs at all, so any HTML
 * containing <div style="display:flex;...">…</div> is silently stripped
 * on parse — that's why the two-column starter rendered as a single
 * column. Registering this node tells Tiptap to keep them.
 *
 * Divs are in the `block` group and can contain other blocks (including
 * other divs), so nested column layouts work.
 */
export const Div = Node.create({
  name: "div",
  group: "block",
  content: "block+",
  defining: false,

  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (el) => el.getAttribute("style"),
        renderHTML: (attrs) => (attrs.style ? { style: attrs.style } : {}),
      },
      class: {
        default: null,
        parseHTML: (el) => el.getAttribute("class"),
        renderHTML: (attrs) => (attrs.class ? { class: attrs.class } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes, 0];
  },
});
