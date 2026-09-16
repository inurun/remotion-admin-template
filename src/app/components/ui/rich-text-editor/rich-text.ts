type RichTextElementTag =
  | "em"
  | "h1"
  | "h2"
  | "img"
  | "li"
  | "mark"
  | "ol"
  | "p"
  | "strong"
  | "ul"
  | "video";

type RichTextNode =
  | {
      children: RichTextNode[];
      type: "root";
    }
  | {
      attributes: Record<string, string>;
      children: RichTextNode[];
      tagName: RichTextElementTag;
      type: "element";
    }
  | {
      text: string;
      type: "text";
    };

function isWhitespaceText(node: RichTextNode) {
  return node.type === "text" && !node.text.trim();
}

function getMeaningfulChildren(node: Extract<RichTextNode, { type: "root" | "element" }>) {
  return node.children.filter((child) => !isWhitespaceText(child));
}

function isSingleImageRichTextNode(node: RichTextNode): boolean {
  const onlyChild = getOnlyMeaningfulChild(node);
  if (!onlyChild) {
    return false;
  }

  return onlyChild.type === "element" && onlyChild.tagName === "img";
}

export function isSingleImageRichText(html: string) {
  return isSingleImageRichTextNode(parseRichText(html));
}

const ALLOWED_TAGS = new Set<RichTextElementTag>([
  "em",
  "h1",
  "h2",
  "img",
  "li",
  "mark",
  "ol",
  "p",
  "strong",
  "ul",
  "video",
]);

function decodeHtml(value: string) {
  return value
    .replaceAll(/&nbsp;/gi, " ")
    .replaceAll(/&amp;/gi, "&")
    .replaceAll(/&lt;/gi, "<")
    .replaceAll(/&gt;/gi, ">")
    .replaceAll(/&quot;/gi, '"')
    .replaceAll(/&#39;/gi, "'");
}

function parseTagAttributes(source: string) {
  const attributes: Record<string, string> = {};
  const attributePattern = /([^\s=]+)\s*=\s*"([^"]*)"/g;

  for (const match of source.matchAll(attributePattern)) {
    const [, key, value] = match;
    if (!key) {
      continue;
    }
    attributes[key] = decodeHtml(value ?? "");
  }

  return attributes;
}

function getOpeningTagSource(token: string) {
  return token.slice(1, -1).trim();
}

function normalizeOpeningTag(openingTag: string) {
  return openingTag.endsWith("/") ? openingTag.slice(0, -1).trim() : openingTag;
}

function getTagName(cleanedTag: string) {
  const spaceIndex = cleanedTag.search(/\s/);
  const tagSource = spaceIndex === -1 ? cleanedTag : cleanedTag.slice(0, spaceIndex);
  return tagSource.toLowerCase();
}

function getTagAttributesSource(cleanedTag: string) {
  const spaceIndex = cleanedTag.search(/\s/);
  return spaceIndex === -1 ? "" : cleanedTag.slice(spaceIndex + 1);
}

type RichTextElementNode = Extract<RichTextNode, { type: "element" }>;

function createElementNode(token: string): RichTextElementNode | null {
  const cleanedTag = normalizeOpeningTag(getOpeningTagSource(token));
  const rawTagName = getTagName(cleanedTag);

  if (!ALLOWED_TAGS.has(rawTagName as RichTextElementTag)) {
    return null;
  }

  return {
    attributes: parseTagAttributes(getTagAttributesSource(cleanedTag)),
    children: [],
    tagName: rawTagName as RichTextElementTag,
    type: "element",
  };
}

function appendChild(parent: RichTextNode, child: RichTextNode) {
  if (parent.type === "element" || parent.type === "root") {
    parent.children.push(child);
  }
}

function handleClosingTag(token: string, stack: RichTextNode[]) {
  const tagName = token.slice(2, -1).trim().toLowerCase();
  if (ALLOWED_TAGS.has(tagName as RichTextElementTag) && stack.length > 1) {
    stack.pop();
  }
}

function handleOpeningTag(token: string, stack: RichTextNode[]) {
  const node = createElementNode(token);
  if (!node) {
    return;
  }

  appendChild(stack[stack.length - 1]!, node);

  if (isSelfContainedElement(token, node)) {
    return;
  }

  stack.push(node);
}

function isSelfContainedElement(token: string, node: RichTextElementNode) {
  return token.endsWith("/>") || node.tagName === "img" || node.tagName === "video";
}

function handleTextToken(token: string, stack: RichTextNode[]) {
  const text = decodeHtml(token);
  if (text) {
    appendChild(stack[stack.length - 1]!, { text, type: "text" });
  }
}

function getOnlyMeaningfulChild(node: RichTextNode) {
  if (node.type === "text") {
    return null;
  }

  const children = getMeaningfulChildren(node);
  if (children.length !== 1) {
    return null;
  }

  return children[0] ?? null;
}

function handleToken(token: string, stack: RichTextNode[]) {
  if (token.startsWith("</")) {
    handleClosingTag(token, stack);
    return;
  }

  if (token.startsWith("<")) {
    handleOpeningTag(token, stack);
    return;
  }

  handleTextToken(token, stack);
}

function parseRichText(html: string): RichTextNode {
  const root: RichTextNode = { children: [], type: "root" };
  const stack: RichTextNode[] = [root];
  const tokenPattern = /<\/?[^>]+>|[^<]+/g;

  for (const match of html.matchAll(tokenPattern)) {
    const token = match[0];
    if (!token) {
      continue;
    }

    handleToken(token, stack);
  }

  return root;
}
