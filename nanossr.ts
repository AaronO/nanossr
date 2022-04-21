export * from "https://deno.land/x/nano_jsx@v0.0.30/mod.ts";

import {
  Helmet,
  renderSSR as nanoRender,
} from "https://deno.land/x/nano_jsx@v0.0.30/mod.ts";

import { setup } from "https://esm.sh/twind@0.16.16";

import {
  Configuration,
  getStyleTag,
  shim,
  TW,
  VirtualSheet,
  virtualSheet,
} from "https://esm.sh/twind@0.16.16/shim/server";

import typography from "https://cdn.skypack.dev/@twind/typography@0.0.2";

let SHEET_SINGLETON: VirtualSheet | null = null;

function createSheet(twOptions = {}) {
  return SHEET_SINGLETON ??= setupSheet(twOptions);
}

// Setup TW sheet singleton
function setupSheet(twOptions: Configuration) {
  const sheet = virtualSheet();
  setup({ ...twOptions, sheet, plugins: { ...typography() } });
  return sheet;
}

export type HtmlProps = {
  body: string;
  head: string[];
  footer: string[];
  styleTag: string;
  attributes: {
    html: Map<string, string>;
    body: Map<string, string>;
  };
};

const html = (
  { body, head, footer, styleTag, attributes }: HtmlProps,
) => (`\
<!DOCTYPE html>
<html${attributes.html.size ? ` ${attributes.html}` : ""}>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">\
    ${head.length ? `\n    ${head.join("")}` : ""}
    ${styleTag}
  </head>
  <body${attributes.body.size ? ` ${attributes.body}` : ""}>
    ${body}\
    ${footer.length ? `\n    ${footer.join("")}` : ""}
  </body>
<html>\
`);

export interface SSRSettings {
  pathname?: string;
  clearState?: boolean;
  tw?: TW;
}

export function ssr(render: CallableFunction, options?: SSRSettings) {
  const sheet = createSheet(options?.tw ?? {});
  sheet.reset();

  const app = nanoRender(render, options);
  shim(app, { tw: options?.tw });
  const { body, head, footer, attributes } = Helmet.SSR(app);

  if (!attributes.html.has("lang")) {
    attributes.html.set("lang", "en");
  }

  const styleTag = getStyleTag(sheet);
  return new Response(
    html({ body, head, footer, styleTag, attributes }),
    { headers: { "content-type": "text/html" } },
  );
}

export function memoizedSSR(render: CallableFunction, options?: SSRSettings) {
  let mresp: Response | null = null;
  return () => {
    const resp = mresp ?? (mresp = ssr(render, options));
    return resp.clone();
  };
}
