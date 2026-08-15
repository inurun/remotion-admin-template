import { useCallback, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useFormContext } from "react-hook-form";
import { isDraftContentPage, type DraftProject } from "@/_schemas";
import { useSelectedPage } from "@/app/features/page";
import { useSettings } from "@/app/features/settings";
import { applyZenPage, createAliasMap, parseZenScript, serializeZenPage } from "@/app/features/zen";
import type { ZenCompletionAlias } from "@/app/features/zen/components/zen-editor/zen-completion";

const EMPTY_SOURCE = "";

export function useZenDialog() {
  const { getValues, setValue } = useFormContext<DraftProject>();
  const { selectedPageIndex } = useSelectedPage();
  const { voices, voiceSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(EMPTY_SOURCE);

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

      if (nextOpen) {
        const page = getValues(`pages.${selectedPageIndex}`);
        if (page && isDraftContentPage(page) && page.type === "main") {
          setSource(serializeZenPage(page, aliases));
        }
      }

      setOpen(nextOpen);
    },
    [aliases, getValues, selectedPageIndex],
  );

  const apply = useCallback(() => {
    if (parsed.errors.length > 0 || parsed.pages.length !== 1) {
      return;
    }

    const nextPage = parsed.pages[0];
    const current = getValues(`pages.${selectedPageIndex}`);
    if (!nextPage || !current || !isDraftContentPage(current) || current.type !== "main") {
      return;
    }

    const next = applyZenPage(current, nextPage, aliases);
    setValue(`pages.${selectedPageIndex}.title`, next.title, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`pages.${selectedPageIndex}.meta.tags`, next.meta.tags, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`pages.${selectedPageIndex}.tts`, next.tts, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setOpen(false);
  }, [aliases, getValues, parsed.errors.length, parsed.pages, selectedPageIndex, setValue]);

  return {
    open,
    source,
    setSource,
    aliases,
    completionAliases,
    errors: parsed.errors,
    pageCount: parsed.pages.length,
    ttsCount: parsed.pages.reduce((count, page) => count + page.tts.length, 0),
    canApply: parsed.errors.length === 0 && parsed.pages.length === 1,
    close,
    handleOpenChange,
    apply,
  };
}
