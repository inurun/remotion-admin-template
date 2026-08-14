import { Node, mergeAttributes } from "@tiptap/react";

export const TiptapVideo = Node.create({
  name: "video",
  group: "block",
  draggable: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "video[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        controls: "true",
        preload: "metadata",
      }),
    ];
  },
});
