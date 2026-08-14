import { useCallback, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useEditor } from "@/app/features/editor";
import { usePage } from "@/app/features/page";
import { useSettings } from "@/app/features/settings";
import { useTts } from "@/app/features/tts";
import { createAliasMap, parseZenScript } from "@/app/features/zen";
import type { ZenCompletionAlias } from "@/app/components/app-editor/editor-card/zen-dialog/zen-editor/zen-completion";

const EMPTY_SOURCE = "";

export function useZenDialog() {
  const { pageFields, appendPage, setSelectedPageIndex } = usePage();
  const { clearSelection } = useTts();
  const { save, isPending } = useEditor();
  const { voices, voiceSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(EMPTY_SOURCE);
  const [isInserting, setIsInserting] = useState(false);

  const { aliases, aliasErrors } = useMemo(() => {
    const result = createAliasMap(voices, voiceSettings);
    return {
      aliases: result.aliases,
      aliasErrors: result.errors,
    };
  }, [voiceSettings, voices]);

  const completionAliases = useMemo<ZenCompletionAlias[]>(
    () =>
      [...aliases.entries()].map(([alias, target]) => ({
        alias,
        avatarType: target.avatarType,
      })),
    [aliases],
  );

  const parsed = useMemo(() => {
    if (!source.trim()) {
      return { pages: [], errors: aliasErrors };
    }

    const result = parseZenScript(source, { aliases });
    return {
      pages: result.pages,
      errors: [...aliasErrors, ...result.errors],
    };
  }, [aliasErrors, aliases, source]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean, eventDetails: Dialog.Root.ChangeEventDetails) => {
      if (!nextOpen && eventDetails.reason === "escape-key") {
        eventDetails.cancel();
        return;
      }

      setOpen(nextOpen);
    },
    [],
  );

  const insert = useCallback(async () => {
    if (parsed.errors.length > 0 || parsed.pages.length === 0 || isInserting) {
      return;
    }

    setIsInserting(true);
    try {
      const startIndex = pageFields.length;
      setSelectedPageIndex(startIndex);
      clearSelection();
      for (const page of parsed.pages) {
        appendPage(page);
      }
      await save();
      setSource(EMPTY_SOURCE);
      setOpen(false);
    } finally {
      setIsInserting(false);
    }
  }, [
    appendPage,
    clearSelection,
    isInserting,
    pageFields.length,
    parsed.errors.length,
    parsed.pages,
    save,
    setSelectedPageIndex,
  ]);

  return {
    open,
    source,
    setSource,
    completionAliases,
    errors: parsed.errors,
    pageCount: parsed.pages.length,
    ttsCount: parsed.pages.reduce((count, page) => count + page.tts.length, 0),
    canInsert: parsed.errors.length === 0 && parsed.pages.length > 0 && !isInserting && !isPending,
    isInserting: isInserting || isPending,
    close,
    handleOpenChange,
    insert,
  };
}
