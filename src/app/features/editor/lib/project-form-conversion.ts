import {
  DEFAULT_VOICE_PRESETS,
  copyVoiceIdentity,
  toVoiceIdentity,
  type SavedPage,
  type SavedProject,
  type SavedSequenceItem,
  type SavedTts,
} from "@/_schemas";
import type { PageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TransitionFormValues } from "@/app/features/page/model/transition-form-schema";
import type { ProjectSettingsFormValues } from "@/app/features/project/model/project-settings-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { normalizeProjectMeta } from "@/app/features/project/lib/normalize-project-meta";

export function toTtsFormValues(item: SavedTts): TtsFormValues {
  const identity = toVoiceIdentity(item);
  return {
    id: item.id,
    text: item.text,
    readText: item.readText,
    padBeforeSec: item.padBeforeSec,
    padAfterSec: item.padAfterSec,
    volume: item.volume,
    ...(identity ? copyVoiceIdentity(identity) : { provider: item.provider, voiceName: "" }),
    ...(item.synthesisSettings ? { synthesisSettings: item.synthesisSettings } : {}),
    ...(item.avatar ? { avatar: item.avatar } : {}),
    speech: item.speech.g2p ? { g2p: item.speech.g2p } : {},
  } as TtsFormValues;
}

export function toPageFormValues(page: SavedPage): PageFormValues {
  const tts = page.tts.map(toTtsFormValues);
  if (page.type === "outro") {
    return {
      id: page.id,
      title: page.title,
      type: "outro",
      meta: page.meta,
      padBeforeSec: page.padBeforeSec,
      padAfterSec: page.padAfterSec,
      richText: page.richText,
      tts,
    };
  }

  if (page.type === "endcard") {
    return {
      id: page.id,
      title: page.title,
      type: "endcard",
      meta: page.meta,
      padBeforeSec: page.padBeforeSec,
      padAfterSec: page.padAfterSec,
      richText: page.richText,
      tts,
    };
  }

  if (page.type === "comments") {
    return {
      id: page.id,
      title: page.title,
      type: "comments",
      meta: page.meta,
      comments: page.comments,
      commentGroups: page.commentGroups,
      padBeforeSec: page.padBeforeSec,
      padAfterSec: page.padAfterSec,
      richText: null,
      tts,
    };
  }

  return {
    id: page.id,
    title: page.title,
    type: page.type,
    meta: page.meta,
    padBeforeSec: page.padBeforeSec,
    padAfterSec: page.padAfterSec,
    richText: page.richText,
    tts,
  };
}

export function mergeSavedSpeechIntoPageForm(
  current: PageFormValues,
  savedFormPage: PageFormValues,
): PageFormValues {
  const g2pById = new Map(
    savedFormPage.tts.flatMap((item) =>
      item.speech?.g2p ? [[item.id, item.speech.g2p] as const] : [],
    ),
  );
  if (g2pById.size === 0) {
    return current;
  }

  let changed = false;
  const tts = current.tts.map((item) => {
    const g2p = g2pById.get(item.id);
    if (!g2p || item.speech?.g2p === g2p) {
      return item;
    }
    changed = true;
    return {
      ...item,
      speech: {
        ...item.speech,
        g2p,
      },
    };
  });

  return changed ? { ...current, tts } : current;
}

export function mergeUneditedSavedSpeechIntoPageForm(
  current: PageFormValues,
  previousSavedPage: SavedSequenceItem | undefined,
  nextSavedPage: SavedPage,
): PageFormValues {
  const previousTts =
    previousSavedPage && previousSavedPage.type !== "transition"
      ? new Map(previousSavedPage.tts.map((item) => [item.id, item]))
      : new Map();
  const nextById = new Map(nextSavedPage.tts.map((item) => [item.id, item]));

  let changed = false;
  const tts = current.tts.map((item) => {
    const nextG2p = nextById.get(item.id)?.speech.g2p;
    if (!nextG2p) {
      return item;
    }

    const currentKana = item.speech?.g2p?.kana;
    const previousKana = previousTts.get(item.id)?.speech.g2p?.kana;
    if (currentKana !== previousKana || currentKana === nextG2p.kana) {
      return item;
    }

    changed = true;
    return {
      ...item,
      speech: {
        ...item.speech,
        g2p: nextG2p,
      },
    };
  });

  return changed ? { ...current, tts } : current;
}

export function toSequenceFormItem(item: SavedProject["pages"][number]) {
  if (item.type === "transition") {
    return {
      id: item.id,
      type: "transition" as const,
      variant: item.variant,
    } satisfies TransitionFormValues;
  }

  return toPageFormValues(item);
}

export function toProjectSettingsFormValues(project: SavedProject): ProjectSettingsFormValues {
  return {
    meta: normalizeProjectMeta(project.meta),
    bgm: project.bgm,
    voicePresets: project.voicePresets ?? DEFAULT_VOICE_PRESETS,
  };
}
