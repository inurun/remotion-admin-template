import { usePageFormScope } from "@/app/features/page/context/page-form-context";
import { useSaveProjectChanges } from "@/app/features/editor/lib/use-save-project-changes";
import { schedulePageZenApply } from "@/app/features/zen/schedule-page-zen-apply";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useFormContext } from "react-hook-form";
import { useSettings } from "@/app/features/settings";
import { applyZenPage, createAliasMap, parseZenScript, serializeZenPage } from "@/app/features/zen";
import type { ZenCompletionAlias } from "@/app/features/zen/components/zen-editor/zen-completion";

const EMPTY_SOURCE = "";

export function useZenDialog() {
  const { getValues, setValue } = useFormContext<PageFormValues>();
  const { voices, voiceSettings } = useSettings();
  const { pageId, isReady } = usePageFormScope();
  const { save } = useSaveProjectChanges();
  const [appliedSource, setAppliedSource] = useState(EMPTY_SOURCE);
  const openedPageId = useRef<string | null>(null);
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
        const page = getValues();
        if (page.type === "main" || page.type === "intro") {
          const initial = serializeZenPage(page, aliases);
          setSource(initial);
          setAppliedSource(initial);
          openedPageId.current = page.id;
        }
      }

      setOpen(nextOpen);
    },
    [aliases, getValues],
  );

  const applyToForm = useCallback(() => {
    if (parsed.errors.length > 0 || parsed.pages.length !== 1) {
      return;
    }

    const nextPage = parsed.pages[0];
    const current = getValues();
    if (
      !nextPage ||
      !isReady ||
      current.id !== openedPageId.current ||
      (current.type !== "main" && current.type !== "intro")
    ) {
      return;
    }

    const next = applyZenPage(current, nextPage, aliases);
    setValue("title", next.title, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("meta.tags", next.meta.tags, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("tts", next.tts, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setAppliedSource(source);
    return true;
  }, [aliases, getValues, parsed.errors.length, parsed.pages, setValue, source, isReady]);

  const apply = useCallback(() => {
    if (applyToForm()) setOpen(false);
  }, [applyToForm]);

  useEffect(() => {
    setOpen(false);
  }, [pageId]);

  const latest = useRef({ applyToForm, save });
  latest.current = { applyToForm, save };
  useEffect(() => {
    return schedulePageZenApply({
      enabled: open && isReady && openedPageId.current === pageId,
      source,
      appliedSource,
      parsed,
      apply: () => latest.current.applyToForm(),
      save: () => latest.current.save({ automatic: true }),
    });
  }, [open, isReady, pageId, source, appliedSource, parsed]);

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
