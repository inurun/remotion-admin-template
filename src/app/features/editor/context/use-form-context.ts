import { useCallback, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, useFieldArray, useForm } from "react-hook-form";
import {
  draftProjectSchema,
  isDraftContentPage,
  isSavedContentPage,
  type DraftProject,
  type DraftSequenceItem,
  type DraftTts,
  type SavedProject,
  type VoiceOption,
} from "@/_schemas";
import { toDraftTts } from "@/app/features/editor/lib/project-draft-conversion";
import { normalizeProjectMeta } from "@/_shared/project/project-meta";

function toDraftPages(project: SavedProject): DraftSequenceItem[] {
  return project.pages.map((item) => {
    if (!isSavedContentPage(item)) {
      return {
        id: item.id,
        type: "transition" as const,
        variant: item.variant,
      };
    }

    const tts = item.tts.map(toDraftTts);
    if (item.type === "outro") {
      return {
        id: item.id,
        title: item.title,
        type: "outro" as const,
        meta: item.meta,
        padBeforeSec: item.padBeforeSec,
        padAfterSec: item.padAfterSec,
        richText: item.richText,
        tts,
      };
    }

    return {
      id: item.id,
      title: item.title,
      type: item.type,
      meta: item.meta,
      padBeforeSec: item.padBeforeSec,
      padAfterSec: item.padAfterSec,
      richText: item.richText,
      tts,
    };
  });
}

export function getVoiceValue(item: {
  provider: string;
  voiceName: string;
  voiceVersion?: string;
}) {
  return `${item.provider}::${item.voiceName}::${item.voiceVersion ?? ""}`;
}

type FormContextValue = {
  pageFields: Array<DraftSequenceItem & { fieldKey: string }>;
  appendPage: (page: DraftSequenceItem) => void;
  movePage: (fromIndex: number, toIndex: number) => void;
  removePage: (index: number) => void;
  appendTtsToPage: (pageIndex: number, tts: DraftTts) => number | null;
};

export function useFormProviderValue({
  initialProject,
  voiceOptions,
}: {
  initialProject: SavedProject;
  voiceOptions: VoiceOption[];
}) {
  const form = useForm<DraftProject>({
    resolver: zodResolver(draftProjectSchema) as Resolver<DraftProject>,
    defaultValues: {
      meta: normalizeProjectMeta(initialProject.meta),
      pages: toDraftPages(initialProject),
      bgm: initialProject.bgm,
    },
  });

  const pageFieldArray = useFieldArray({
    control: form.control,
    keyName: "fieldKey",
    name: "pages",
  });
  const { append, move, remove } = pageFieldArray;

  useEffect(() => {
    form.reset({
      meta: normalizeProjectMeta(initialProject.meta),
      pages: toDraftPages(initialProject),
      bgm: initialProject.bgm,
    });
  }, [form, initialProject]);

  useEffect(() => {
    if (voiceOptions.length === 0) {
      return;
    }

    const fallback = voiceOptions[0];
    if (!fallback) {
      return;
    }

    form.getValues("pages").forEach((item, pageIndex) => {
      if (!isDraftContentPage(item)) {
        return;
      }

      item.tts.forEach((ttsItem, ttsIndex) => {
        if (ttsItem.voiceName) {
          return;
        }

        form.setValue(`pages.${pageIndex}.tts.${ttsIndex}.voiceName`, fallback.voiceName, {
          shouldDirty: false,
          shouldTouch: false,
        });
        form.setValue(`pages.${pageIndex}.tts.${ttsIndex}.provider`, fallback.provider, {
          shouldDirty: false,
          shouldTouch: false,
        });
        form.setValue(
          `pages.${pageIndex}.tts.${ttsIndex}.voiceVersion`,
          fallback.voiceVersion ?? "",
          {
            shouldDirty: false,
            shouldTouch: false,
          },
        );
      });
    });
  }, [form, voiceOptions]);

  const appendPage = useCallback(
    (page: DraftSequenceItem) => {
      append(page);
    },
    [append],
  );

  const movePage = useCallback(
    (fromIndex: number, toIndex: number) => {
      move(fromIndex, toIndex);
    },
    [move],
  );

  const removePage = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove],
  );

  const appendTtsToPage = useCallback(
    (pageIndex: number, tts: DraftTts): number | null => {
      const page = form.getValues(`pages.${pageIndex}`);
      if (!page || !isDraftContentPage(page)) {
        return null;
      }

      const nextTtsIndex = page.tts.length;
      form.setValue(`pages.${pageIndex}.tts`, [...page.tts, tts], {
        shouldDirty: true,
      });
      return nextTtsIndex;
    },
    [form],
  );

  const value: FormContextValue = {
    pageFields: pageFieldArray.fields,
    appendPage,
    movePage,
    removePage,
    appendTtsToPage,
  };

  return {
    form,
    value,
  };
}
