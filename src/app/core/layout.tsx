import { Link, ReactRefresh, Script } from "vite-ssr-components/react";

export const layoutHtml = (
  <html lang="ja">
    <head>
      <meta charSet="utf-8" />
      <meta content="width=device-width, initial-scale=1" name="viewport" />
      <title>Remotion + VoiSona Template</title>
      <meta
        content="Template app for VoiSona-driven video editing and Remotion rendering"
        name="description"
      />
      <ReactRefresh />
      <Link href="/src/app/globals.css" rel="stylesheet" />
      <Script src="/src/app/core/client.tsx" />
    </head>
    <body>
      <div id="root" />
    </body>
  </html>
);
