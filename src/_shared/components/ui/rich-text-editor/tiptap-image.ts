import { Node, mergeAttributes } from "@tiptap/react";

export const TiptapImage = Node.create({
  name: "image",
  group: "block",
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      alt: {
        default: null,
      },
      src: {
        default: null,
      },
      title: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]:not([src^="data:"])' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },
});
