import { marked } from "marked";
import sanitizeHtml, { type IOptions } from "sanitize-html";

marked.setOptions({
  gfm: true,
  breaks: true,
});

const allowedTags = [
  ...sanitizeHtml.defaults.allowedTags,
  "img",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "div",
  "style",
];

export function renderMarkdownSafe(
  markdown: string | null | undefined,
): string {
  if (!markdown) {
    return "";
  }

  const rawHtml = marked.parse(markdown, { async: false });
  const html = typeof rawHtml === "string" ? rawHtml : "";

  const options: IOptions = {
    allowVulnerableTags: true,
    allowedTags,
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["style", "class"],
      a: ["href", "name", "target", "rel", "style"],
      img: ["src", "alt", "title", "width", "height", "loading", "style"],
      style: ["type", "media"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel", "data"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
    allowedStyles: {
      "*": {
        color: [/^[#(),.%\w\s-]+$/],
        "background-color": [/^[#(),.%\w\s-]+$/],
        "font-weight": [/^\d+$/, /^(normal|bold|lighter|bolder)$/],
        "font-style": [/^(normal|italic|oblique)$/],
        "text-decoration": [/^[\w\s-]+$/],
        "text-align": [/^(left|right|center|justify)$/],
        "margin-left": [/^[\d.%rempx\s-]+$/],
        "margin-right": [/^[\d.%rempx\s-]+$/],
        "padding-left": [/^[\d.%rempx\s-]+$/],
        "padding-right": [/^[\d.%rempx\s-]+$/],
        "border-radius": [/^[\d.%rempx\s-]+$/],
      },
    },
    transformTags: {
      a: (tagName: string, attribs: Record<string, string>) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: "noopener noreferrer",
        },
      }),
    },
  };

  return sanitizeHtml(html, options);
}
