import { useState } from "react";
import type { Editor } from "@tiptap/react";
import type { OgpResult } from "@/app/features/ogp";

export type FetchOgp = (url: string) => Promise<OgpResult>;

export function useRichTextOgpInsert({
  editor,
  fetchOgp,
}: {
  editor: Editor | null;
  fetchOgp: FetchOgp;
}) {
  const [ogpError, setOgpError] = useState<string | null>(null);
  const [fetchingOgp, setFetchingOgp] = useState(false);

  const insertOgpCard = () => {
    if (!editor || fetchingOgp) {
      return;
    }

    const rawUrl = window.prompt("URL");
    if (!rawUrl?.trim()) {
      return;
    }

    setFetchingOgp(true);
    setOgpError(null);

    void fetchOgp(rawUrl.trim())
      .then((ogp) => {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "ogCard",
            attrs: {
              url: ogp.url,
              title: ogp.title,
              description: ogp.description,
              image: ogp.image,
            },
          })
          .run();
      })
      .catch((error: unknown) => {
        setOgpError(error instanceof Error ? error.message : "Failed to fetch OGP");
      })
      .finally(() => {
        setFetchingOgp(false);
      });
  };

  return {
    fetchingOgp,
    insertOgpCard,
    ogpError,
  };
}
