import { Link, ReactRefresh, Script } from "vite-ssr-components/react";
import { assetPath } from "@/_shared/lib/assets/path";

export const layoutHtml = (
  <html lang="ja">
    <head>
      <meta charSet="utf-8" />
      <meta content="width=device-width, initial-scale=1" name="viewport" />
      <title>Remotion Admin Template</title>
      <meta
        content="Template app for VoiSona-driven video editing and Remotion rendering"
        name="description"
      />
      <link href={assetPath("favicon.svg")} rel="icon" type="image/svg+xml" />
      <ReactRefresh />
      <Link href="/src/app/globals.css" rel="stylesheet" />
      <Script src="/src/app/core/client.tsx" />
    </head>
    <body>
      <div id="root" />
    </body>
  </html>
);
