import { Node, mergeAttributes } from "@tiptap/react";

type OgCardAttrs = {
  url: string;
  title: string;
  description: string;
  image: string | null;
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readOgCardAttrs(attributes: Record<string, unknown>): OgCardAttrs {
  const url = asString(attributes.url);
  return {
    url,
    title: asString(attributes.title, url),
    description: asString(attributes.description),
    image: typeof attributes.image === "string" ? attributes.image : null,
  };
}

function buildOgCardRenderSpec(attrs: OgCardAttrs) {
  const body = [
    "div",
    { class: "og-card-body" },
    ["strong", {}, attrs.title],
    ["p", {}, attrs.description],
  ] as const;

  const content = attrs.image
    ? ([["img", { src: attrs.image, alt: attrs.title }], body] as const)
    : ([body] as const);

  return [
    "div",
    mergeAttributes({
      "data-type": "og-card",
      "data-url": attrs.url,
      "data-title": attrs.title,
      "data-description": attrs.description,
      "data-image": attrs.image,
      class: "og-card",
    }),
    ["div", { class: "og-card-content" }, ...content],
  ] as const;
}

export const TiptapOgCard = Node.create({
  name: "ogCard",
  group: "block",
  draggable: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      url: {
        default: null,
      },
      title: {
        default: null,
      },
      description: {
        default: null,
      },
      image: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="og-card"]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) {
            return false;
          }

          return {
            url: element.getAttribute("data-url"),
            title: element.getAttribute("data-title"),
            description: element.getAttribute("data-description"),
            image: element.getAttribute("data-image"),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return buildOgCardRenderSpec(readOgCardAttrs(HTMLAttributes));
  },
});
