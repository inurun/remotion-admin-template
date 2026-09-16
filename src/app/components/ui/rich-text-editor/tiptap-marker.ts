import { Mark, mergeAttributes } from "@tiptap/react";

export const TiptapMarker = Mark.create({
  name: "marker",

  parseHTML() {
    return [{ tag: "mark" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(HTMLAttributes), 0];
  },
});
