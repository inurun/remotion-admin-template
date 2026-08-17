import { useCallback, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { resolveInsertPageIndex } from "@/app/features/page";
import { useEditorSession } from "@/app/features/editor";
import {
  useProjectRoute,
  useSelectedPageId,
} from "@/app/features/project/context/project-route-context";
import { getProjectPageHref } from "@/app/features/project/lib/project-route";
import { useSettings } from "@/app/features/settings";
import { createAliasMap, parseZenScript } from "@/app/features/zen";
import type { ZenCompletionAlias } from "@/app/features/zen/components/zen-editor/zen-completion";

const EMPTY_SOURCE = "";

export function useZenDialog() {
  const insertSequenceItem = useEditorSession((state) => state.insertSequenceItem);
  const sequenceOrder = useEditorSession((state) => state.sequenceOrder);
  const selectedPageId = useSelectedPageId();
  const { projectPath, navigate } = useProjectRoute();
  const { voices, voiceSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(EMPTY_SOURCE);
  const selectedPageIndex = selectedPageId ? sequenceOrder.indexOf(selectedPageId) : -1;

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

  const insert = useCallback(() => {
    if (parsed.errors.length > 0 || parsed.pages.length === 0) {
      return;
    }

    const startIndex = resolveInsertPageIndex(
      selectedPageIndex === -1 ? null : selectedPageIndex,
      sequenceOrder.length,
    );
    parsed.pages.forEach((page, index) => {
      insertSequenceItem(page, startIndex + index);
    });
    const firstPage = parsed.pages[0];
    if (projectPath && firstPage) {
      navigate(getProjectPageHref(projectPath, firstPage.id));
    }
    setSource(EMPTY_SOURCE);
    setOpen(false);
  }, [
    insertSequenceItem,
    navigate,
    parsed.errors.length,
    parsed.pages,
    projectPath,
    selectedPageIndex,
    sequenceOrder.length,
  ]);

  return {
    open,
    source,
    setSource,
    aliases,
    completionAliases,
    errors: parsed.errors,
    pageCount: parsed.pages.length,
    ttsCount: parsed.pages.reduce((count, page) => count + page.tts.length, 0),
    canInsert: parsed.errors.length === 0 && parsed.pages.length > 0,
    close,
    handleOpenChange,
    insert,
  };
}
